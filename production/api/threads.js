const express = require('express');
const db = require('../database.js');
const { OpenAI } = require('openai');
const a2aLogger = require('../utils/a2a-interaction-logger.js');
const router = express.Router();

// Cache for threads API to reduce DB load
let threadsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 1000; // 30 seconds

/**
 * GET /api/threads
 * Fetches all conversations and partitions them into time-based buckets
 */
router.get('/threads', async (req, res) => {
  const startTime = Date.now();
  
  // Add request counter for debugging multiple calls
  if (!router.requestCount) router.requestCount = 0;
  router.requestCount++;
  const requestId = router.requestCount;
  
  console.log(`🔄 [Request #${requestId}] GET /api/threads called`);
  console.log(`📊 [Request #${requestId}] User Agent: ${req.get('User-Agent')?.substring(0, 50)}...`);
  console.log(`📊 [Request #${requestId}] Request source: ${req.get('Referer') || 'Direct'}`);
  
  try {
    const userId = req.user?.id || req.session?.userId || 1; // Fallback for testing
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;// Check cache first using A2A cache system
    const cacheKey = `threads_${userId}_${page}_${limit}`;
    const cachedData = await a2aLogger.getCachedThreadData(cacheKey, userId);
    
    if (cachedData) {
      console.log('📦 Returning cached threads data from A2A cache');
      return res.json(cachedData);
    }

    console.log('🔄 Fetching fresh threads data from database');    // SQL query to fetch conversations with metadata
    const query = `
      WITH thread_data AS (
        SELECT 
          s.id,
          COALESCE(tp.custom_title, s.title, s.session_name, 
            CASE 
              WHEN s.agent_type = 'orchestrator' THEN 'General Chat'
              WHEN s.agent_type = 'finance' THEN 'Finance Discussion'
              WHEN s.agent_type = 'legal' THEN 'Legal Consultation'
              WHEN s.agent_type = 'revenue' THEN 'Revenue Services'
              ELSE 'Untitled Chat'
            END
          ) as title,
          COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_active_at,
          COALESCE(tp.is_pinned, s.is_pinned, false) as is_pinned,
          COALESCE(tp.custom_avatar_url, s.avatar_url, 
            CASE s.agent_type
              WHEN 'finance' THEN '/images/agent-finance.png'
              WHEN 'legal' THEN '/images/agent-legal.png'
              WHEN 'revenue' THEN '/images/agent-revenue.png'
              ELSE '/images/agent-orchestrator.png'
            END
          ) as avatar_url,
          COALESCE(s.unread_count, 0) as unread_count,
          s.agent_type,
          s.is_active,
          ta.total_messages,
          ta.last_message_at,
          s.created_at,          -- Get last message content
          (SELECT message_content FROM a2a_chat_messages cm 
           WHERE cm.session_id = s.id 
           ORDER BY cm.created_at DESC 
           LIMIT 1) as last_message,
          -- Calculate days difference for bucketing
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(s.last_active_at, s.updated_at, s.created_at))) / 86400 as days_since_active
        FROM a2a_chat_sessions s
        LEFT JOIN a2a_thread_preferences tp ON s.id = tp.session_id AND tp.user_id = $1
        LEFT JOIN a2a_thread_analytics ta ON s.id = ta.session_id
        WHERE s.user_id = $1 
          AND s.is_active = true
          AND (tp.is_archived IS NULL OR tp.is_archived = false)
        ORDER BY 
          CASE WHEN COALESCE(tp.is_pinned, s.is_pinned, false) THEN 0 ELSE 1 END,
          COALESCE(s.last_active_at, s.updated_at, s.created_at) DESC
        LIMIT $2 OFFSET $3
      )
      SELECT * FROM thread_data;
    `;

    const result = await db.query(query, [userId, limit, offset]);
    const threads = result.rows;

    // Partition threads into buckets
    const buckets = {
      pinned: [],
      today: [],
      yesterday: [],
      last7Days: []
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000); // 24 hours ago
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 86400000); // 7 days ago

    threads.forEach(thread => {
      // Always add pinned threads to pinned bucket first
      if (thread.is_pinned) {
        buckets.pinned.push(formatThread(thread));
        return;
      }

      const lastActive = new Date(thread.last_active_at);
      
      if (lastActive >= todayStart) {
        buckets.today.push(formatThread(thread));
      } else if (lastActive >= yesterdayStart) {
        buckets.yesterday.push(formatThread(thread));
      } else if (lastActive >= sevenDaysAgo) {
        buckets.last7Days.push(formatThread(thread));
      }
      // Threads older than 7 days are not included in these buckets
    });

    // Ensure each bucket is sorted by last_active_at descending
    Object.keys(buckets).forEach(bucketName => {
      buckets[bucketName].sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));
    });    const response = {
      ...buckets,
      totalThreads: threads.length,
      page,
      hasMore: threads.length === limit,
      cacheTimestamp: Date.now()
    };

    // Cache the response using A2A cache system
    await a2aLogger.cacheThreadData(cacheKey, userId, response, 30);

    // Log the interaction
    await a2aLogger.logInteraction({
      userId,
      taskId: `fetch_threads_${Date.now()}`,
      interactionId: `threads_${userId}_${Date.now()}`,
      interactionType: 'data_fetch',
      fromAgent: 'threads_api',
      success: true,
      responseTimeMs: Date.now() - startTime,
      contextPassed: {
        page,
        limit,
        totalThreads: threads.length,
        bucketsCount: {
          pinned: buckets.pinned.length,
          today: buckets.today.length,
          yesterday: buckets.yesterday.length,
          last7Days: buckets.last7Days.length
        }
      },
      outcome: 'threads_fetched'
    });

    // Update session context for this session
    await a2aLogger.updateSessionContext({
      userId,
      sessionId: threads[0]?.id?.toString() || `threads_${userId}`,
      conversationHistory: threads.slice(0, 10).map(thread => ({
        id: thread.id,
        title: thread.title,
        agent_type: thread.agent_type,
        last_active: thread.last_active_at,
        message_count: thread.total_messages || 0
      })),
      sharedContext: {
        threadsLoaded: true,
        totalThreadsCount: threads.length,
        loadTimestamp: new Date().toISOString(),
        bucketsDistribution: {
          pinned: buckets.pinned.length,
          today: buckets.today.length,
          yesterday: buckets.yesterday.length,
          last7Days: buckets.last7Days.length
        }
      },
      userPreferences: {
        preferredView: 'bucketed',
        cacheEnabled: true,
        lastPageRequested: page,
        limitPreference: limit
      },
      currentAgent: 'threads_api',
      sessionState: 'active',
      sessionMetadata: {
        apiEndpoint: '/api/threads',
        requestType: 'thread_fetch',
        cacheUsed: !!cachedData,
        responseTime: Date.now() - startTime
      }
    });    console.log(`✅ [Request #${requestId}] Threads data fetched and cached:`, {
      pinned: buckets.pinned.length,
      today: buckets.today.length,
      yesterday: buckets.yesterday.length,
      last7Days: buckets.last7Days.length,
      responseTime: Date.now() - startTime
    });

    res.json(response);
  } catch (error) {
    console.error(`❌ [Request #${requestId}] Error fetching threads:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch threads',
      details: error.message 
    });
  }
});

/**
 * POST /api/threads
 * Create a new chat thread/session
 */
router.post('/threads', async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user?.id || req.session?.userId || 1;
    const { title, agentType = 'orchestrator' } = req.body;

    const query = `
      INSERT INTO a2a_chat_sessions (
        user_id, 
        session_name, 
        title,
        agent_type, 
        created_at, 
        updated_at, 
        last_active_at,
        is_active,
        unread_count
      ) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW(), true, 0)
      RETURNING id, title, session_name, agent_type, created_at, last_active_at;
    `;

    const result = await db.query(query, [
      userId, 
      title || 'New Chat', 
      title || 'New Chat',
      agentType
    ]);

    const newThread = result.rows[0];

    // Clear cache since we have new data
    threadsCache = null;
    cacheTimestamp = null;

    // Initialize analytics for the new thread
    try {
      await db.query(`
        INSERT INTO a2a_thread_analytics (
          session_id, user_id, total_messages, last_message_at, 
          average_response_time, agent_switches, created_at
        ) VALUES ($1, $2, 0, NOW(), 0, 0, NOW())
      `, [newThread.id, userId]);
    } catch (analyticsError) {
      console.warn('⚠️ Failed to initialize thread analytics:', analyticsError.message);
    }

    // Log the thread creation interaction
    await a2aLogger.logInteraction({
      userId,
      taskId: `create_thread_${newThread.id}`,
      interactionId: `thread_create_${userId}_${Date.now()}`,
      interactionType: 'thread_creation',
      fromAgent: 'threads_api',
      toAgent: agentType,
      responseTimeMs: Date.now() - startTime,
      success: true,
      contextPassed: {
        threadId: newThread.id,
        title: title || 'New Chat',
        agentType,
        sessionName: newThread.session_name
      },
      outcome: 'thread_created',
      nextActions: ['initialize_conversation', 'await_user_input']
    });

    // Log agent transition if not using default orchestrator
    if (agentType !== 'orchestrator') {
      await a2aLogger.logTransition({
        userId,
        sessionId: newThread.id,
        fromAgent: 'orchestrator',
        toAgent: agentType,
        transitionType: 'delegation',
        reason: 'initial_agent_selection',
        success: true,
        contextPassed: {
          threadId: newThread.id,
          initialSetup: true
        }
      });
    }

    console.log('✅ New thread created with A2A logging:', newThread.id);

    res.status(201).json({
      id: newThread.id,
      title: newThread.title,
      lastActiveAt: newThread.last_active_at,
      isPinned: false,
      avatarUrl: getAgentAvatarUrl(newThread.agent_type),
      unreadCount: 0,
      agentType: newThread.agent_type
    });

  } catch (error) {
    console.error('❌ Error creating thread:', error);
    
    // Log the failed interaction
    try {
      await a2aLogger.logInteraction({
        userId: req.user?.id || req.session?.userId || 1,
        taskId: `create_thread_failed_${Date.now()}`,
        interactionId: `thread_create_error_${Date.now()}`,
        interactionType: 'thread_creation',
        fromAgent: 'threads_api',
        responseTimeMs: Date.now() - startTime,
        success: false,
        contextPassed: {
          title: req.body.title,
          agentType: req.body.agentType,
          error: error.message
        },
        outcome: 'thread_creation_failed'
      });
    } catch (logError) {
      console.warn('⚠️ Failed to log error interaction:', logError.message);
    }
    
    res.status(500).json({ 
      error: 'Failed to create thread',
      details: error.message 
    });
  }
});

/**
 * PUT /api/threads/:id/pin
 * Toggle pin status of a thread
 */
router.put('/threads/:id/pin', async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user?.id || req.session?.userId || 1;
    const threadId = parseInt(req.params.id);
    const { isPinned } = req.body;

    // Update or insert thread preferences
    const query = `
      INSERT INTO a2a_thread_preferences (user_id, session_id, is_pinned, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, session_id) 
      DO UPDATE SET is_pinned = $3, updated_at = NOW()
      RETURNING is_pinned;
    `;

    const result = await db.query(query, [userId, threadId, isPinned]);

    // Clear cache
    threadsCache = null;
    cacheTimestamp = null;

    // Log the preference change interaction
    await a2aLogger.logInteraction({
      userId,
      taskId: `pin_thread_${threadId}`,
      interactionId: `pin_toggle_${userId}_${threadId}_${Date.now()}`,
      interactionType: 'preference_update',
      fromAgent: 'threads_api',
      responseTimeMs: Date.now() - startTime,
      success: true,
      contextPassed: {
        threadId,
        isPinned,
        action: isPinned ? 'pin' : 'unpin'
      },
      outcome: `thread_${isPinned ? 'pinned' : 'unpinned'}`
    });

    console.log('✅ Thread pin status updated with A2A logging:', { threadId, isPinned });

    res.json({ 
      success: true, 
      isPinned: result.rows[0].is_pinned 
    });

  } catch (error) {
    console.error('❌ Error updating pin status:', error);
    res.status(500).json({ 
      error: 'Failed to update pin status',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/threads/:id
 * Delete/archive a thread
 */
router.delete('/threads/:id', async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId || 1;
    const threadId = parseInt(req.params.id);

    // Mark as inactive instead of deleting
    const query = `
      UPDATE a2a_chat_sessions 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id;
    `;

    const result = await db.query(query, [threadId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Clear cache
    threadsCache = null;
    cacheTimestamp = null;

    console.log('✅ Thread deleted/archived:', threadId);

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error deleting thread:', error);
    res.status(500).json({ 
      error: 'Failed to delete thread',
      details: error.message 
    });
  }
});

/**
 * GET /api/threads/search
 * Search threads by title/content
 */
router.get('/threads/search', async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user?.id || req.session?.userId || 1;
    const { q: searchQuery, limit = 20 } = req.query;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.json({ 
        success: true, 
        data: { 
          conversations: [], 
          totalCount: 0,
          query: searchQuery || '' 
        } 
      });
    }

    const query = `
      WITH thread_search AS (
        SELECT DISTINCT
          s.id,
          COALESCE(tp.custom_title, s.title, s.session_name, 'Untitled Chat') as title,
          s.session_name as group_name,
          COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_active_at,
          COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_message_time,
          s.updated_at,
          COALESCE(tp.is_pinned, s.is_pinned, false) as is_pinned,
          COALESCE(tp.custom_avatar_url, s.avatar_url) as avatar_url,
          s.agent_type,
          COALESCE(s.unread_count, 0) as unread_count,
          s.created_at,
          -- Get last message content
          (SELECT m.message_content FROM a2a_chat_messages m 
           WHERE m.session_id = s.id 
           ORDER BY m.created_at DESC 
           LIMIT 1) as last_message,
          -- Calculate relevance score for better ranking
          (
            CASE WHEN COALESCE(tp.custom_title, s.title, s.session_name, '') ILIKE $2 THEN 10 ELSE 0 END +            CASE WHEN EXISTS (
              SELECT 1 FROM a2a_chat_messages m 
              WHERE m.session_id = s.id 
              AND m.message_content ILIKE $2
            ) THEN 5 ELSE 0 END
          ) as relevance_score
        FROM a2a_chat_sessions s
        LEFT JOIN a2a_thread_preferences tp ON s.id = tp.session_id AND tp.user_id = $1
        WHERE s.user_id = $1 
          AND s.is_active = true
          AND (tp.is_archived IS NULL OR tp.is_archived = false)
          AND (
            COALESCE(tp.custom_title, s.title, s.session_name, '') ILIKE $2            OR EXISTS (
              SELECT 1 FROM a2a_chat_messages m 
              WHERE m.session_id = s.id 
              AND m.message_content ILIKE $2
            )
          )
      ),
      total_count AS (
        SELECT COUNT(*) as count FROM thread_search WHERE relevance_score > 0
      )
      SELECT 
        ts.*,
        tc.count as total_count
      FROM thread_search ts
      CROSS JOIN total_count tc
      WHERE ts.relevance_score > 0
      ORDER BY ts.relevance_score DESC, ts.last_active_at DESC
      LIMIT $3;
    `;

    const searchPattern = `%${searchQuery.trim()}%`;
    const result = await db.query(query, [userId, searchPattern, limit]);

    const conversations = result.rows.map(thread => ({
      id: thread.id,
      title: thread.title,
      group_name: thread.group_name,
      last_active_at: thread.last_active_at,
      last_message_time: thread.last_message_time,
      updated_at: thread.updated_at,
      is_pinned: thread.is_pinned,
      avatar_url: thread.avatar_url || getAgentAvatarUrl(thread.agent_type),
      agent_type: thread.agent_type,
      unread_count: thread.unread_count,
      created_at: thread.created_at,
      last_message: thread.last_message || 'No messages yet',
      relevance_score: thread.relevance_score
    }));

    const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;

    // Log the search interaction
    await a2aLogger.logInteraction({
      userId,
      taskId: `search_threads_${Date.now()}`,
      interactionId: `search_${userId}_${Date.now()}`,
      interactionType: 'search',
      fromAgent: 'threads_api',
      responseTimeMs: Date.now() - startTime,
      success: true,
      contextPassed: {
        searchQuery: searchQuery.trim(),
        resultsCount: conversations.length,
        totalMatches: totalCount
      },
      outcome: `search_completed_${conversations.length}_results`
    });

    console.log('🔍 Thread search completed:', { 
      query: searchQuery, 
      results: conversations.length,
      totalMatches: totalCount 
    });

    res.json({ 
      success: true,
      data: {
        conversations,
        totalCount: parseInt(totalCount),
        query: searchQuery.trim(),
        hasMore: totalCount > limit
      }
    });

  } catch (error) {
    console.error('❌ Error searching threads:', error);
    
    // Log the failed search
    try {
      await a2aLogger.logInteraction({
        userId: req.user?.id || req.session?.userId || 1,
        taskId: `search_threads_error_${Date.now()}`,
        interactionId: `search_error_${Date.now()}`,
        interactionType: 'search',
        fromAgent: 'threads_api',
        responseTimeMs: Date.now() - startTime,
        success: false,
        contextPassed: {
          searchQuery: req.query.q,
          error: error.message
        },
        outcome: 'search_failed'
      });
    } catch (logError) {
      console.warn('Failed to log search error:', logError);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Search failed',
      details: error.message 
    });
  }
});

/**
 * PUT /api/threads/:id/title
 * Update conversation title
 */
router.put('/threads/:id/title', async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId || 1;
    const threadId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Title is required',
        details: 'Title cannot be empty' 
      });
    }

    if (title.length > 200) {
      return res.status(400).json({ 
        error: 'Title too long',
        details: 'Title must be 200 characters or less' 
      });
    }

    // Update the conversation title
    const query = `
      UPDATE a2a_chat_sessions 
      SET title = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING id, title, updated_at;
    `;

    const result = await db.query(query, [title.trim(), threadId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Thread not found',
        details: 'Thread does not exist or you do not have permission to update it' 
      });
    }

    // Clear cache since we have updated data
    threadsCache = null;
    cacheTimestamp = null;

    console.log('✅ Thread title updated:', { threadId, title: title.trim() });

    res.json({ 
      success: true, 
      title: result.rows[0].title,
      updated_at: result.rows[0].updated_at
    });

  } catch (error) {
    console.error('❌ Error updating thread title:', error);
    res.status(500).json({ 
      error: 'Failed to update thread title',
      details: error.message 
    });
  }
});

/**
 * POST /api/ai/summarize-title
 * Generate a conversation title from the first message
 */
router.post('/ai/summarize-title', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message is required',
        details: 'Message cannot be empty' 
      });
    }

    // Import OpenAI at the top of the file if not already imported
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates brief, descriptive titles for conversations. Create a title that captures the main topic or intent of the message in 3-8 words. Do not use quotes or special formatting. Return only the title text.'
        },
        {
          role: 'user',
          content: `Create a conversation title for this message: "${message}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 20
    });

    const generatedTitle = completion.choices[0].message.content.trim();
    
    // Validate and clean the title
    let title = generatedTitle;
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }

    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '');

    console.log('🤖 Generated conversation title:', title);

    res.json({ 
      success: true, 
      title: title,
      original_message: message.substring(0, 100) // For debugging
    });

  } catch (error) {
    console.error('❌ Error generating title:', error);
    
    // Fallback to a simple truncation
    const fallbackTitle = req.body.message?.length > 50 
      ? req.body.message.substring(0, 50) + '...'
      : req.body.message || 'New Chat';

    res.json({ 
      success: true, 
      title: fallbackTitle,
      fallback: true
    });
  }
});

// Helper functions
function formatThread(thread) {
  return {
    id: thread.id,
    title: thread.title,
    lastActiveAt: thread.last_active_at,
    isPinned: thread.is_pinned,
    avatarUrl: thread.avatar_url || getAgentAvatarUrl(thread.agent_type),
    unreadCount: thread.unread_count || 0,
    agentType: thread.agent_type,
    totalMessages: thread.total_messages || 0,
    createdAt: thread.created_at,
    lastMessage: thread.last_message || 'No messages yet'
  };
}

function getAgentAvatarUrl(agentType) {
  const avatarMap = {
    finance: '/images/agent-finance.png',
    legal: '/images/agent-legal.png',
    revenue: '/images/agent-revenue.png',
    orchestrator: '/images/agent-orchestrator.png'
  };
  return avatarMap[agentType] || avatarMap.orchestrator;
}

// Get messages for a specific thread
router.get('/threads/:id/messages', async (req, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user?.id || req.session?.userId || 1; // Fallback for testing

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // First, verify the thread belongs to the user
    const threadCheck = await db.query(
      'SELECT user_id FROM a2a_chat_sessions WHERE id = $1',
      [threadId]
    );

    if (threadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (threadCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }    // Get messages for the thread
    const messagesResult = await db.query(
      `SELECT 
        m.id,
        m.message_id,
        m.message_content,
        m.content,
        m.sender_type,
        m.agent_type,
        m.created_at,
        m.updated_at,
        s.title as conversation_title 
       FROM a2a_chat_messages m
       JOIN a2a_chat_sessions s ON m.session_id = s.id
       WHERE m.session_id = $1
       ORDER BY m.created_at ASC`,
      [threadId]
    );res.json({
      success: true,
      threadId,
      messages: messagesResult.rows
    });

  } catch (error) {
    console.error('❌ Error fetching thread messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      details: error.message 
    });
  }
});

/**
 * POST /api/threads/:id/send
 * Send a message to a specific thread
 */
router.post('/threads/:threadId/send', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content, replyTo, message_id, sender_type = 'user', agent_type = 'orchestrator' } = req.body;
    const userId = req.user?.id || req.session?.userId || 1; // Fallback for testing

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // First, verify the thread belongs to the user or they have access
    const threadCheck = await db.query(
      'SELECT user_id FROM a2a_chat_sessions WHERE id = $1',
      [threadId]
    );

    if (threadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (threadCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate message_id if not provided
    const finalMessageId = message_id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert the new message
    const messageResult = await db.query(
      `INSERT INTO a2a_chat_messages (session_id, message_id, message_content, content, sender_type, agent_type, created_at, updated_at)
       VALUES ($1, $2, $3, $3, $4, $5, NOW(), NOW())
       RETURNING id, message_id, message_content, content, sender_type, agent_type, created_at, updated_at`,
      [threadId, finalMessageId, content.trim(), sender_type, agent_type]
    );

    const newMessage = messageResult.rows[0];

    // Update the session's last_active_at timestamp
    await db.query(
      'UPDATE a2a_chat_sessions SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1',
      [threadId]
    );

    // Clear threads cache since data has changed
    threadsCache = null;
    cacheTimestamp = null;    console.log('✅ Message sent:', newMessage.id);    res.json({
      success: true,
      message: {
        id: newMessage.id,
        message_id: newMessage.message_id,
        content: newMessage.message_content,
        sender_type: newMessage.sender_type,
        agent_type: newMessage.agent_type,
        session_id: threadId,
        created_at: newMessage.created_at,
        updated_at: newMessage.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message 
    });  }
});

/**
 * PUT /api/threads/messages/:messageId
 * Edit a message by its client-generated message_id
 */
router.put('/threads/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id || req.session?.userId || 1; // Fallback for testing

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Find the message and verify ownership
    const messageCheck = await db.query(
      `SELECT m.id, m.message_id, m.session_id, s.user_id 
       FROM a2a_chat_messages m
       JOIN a2a_chat_sessions s ON m.session_id = s.id
       WHERE m.message_id = $1`,
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const messageData = messageCheck.rows[0];
    
    if (messageData.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update the message content
    const updateResult = await db.query(
      `UPDATE a2a_chat_messages 
       SET message_content = $1, content = $1, updated_at = NOW(), is_edited = true,
           original_content = CASE WHEN original_content IS NULL THEN message_content ELSE original_content END
       WHERE message_id = $2
       RETURNING id, message_id, message_content, content, sender_type, agent_type, created_at, updated_at, is_edited`,
      [content.trim(), messageId]
    );

    const updatedMessage = updateResult.rows[0];

    // Update the session's last_active_at timestamp
    await db.query(
      'UPDATE a2a_chat_sessions SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1',
      [messageData.session_id]
    );

    // Clear threads cache since data has changed
    threadsCache = null;
    cacheTimestamp = null;

    console.log('✅ Message edited:', messageId);

    res.json({
      success: true,
      message: {
        id: updatedMessage.id,
        message_id: updatedMessage.message_id,
        content: updatedMessage.message_content,
        sender_type: updatedMessage.sender_type,
        agent_type: updatedMessage.agent_type,
        session_id: messageData.session_id,
        created_at: updatedMessage.created_at,
        updated_at: updatedMessage.updated_at,
        is_edited: updatedMessage.is_edited
      }
    });

  } catch (error) {
    console.error('❌ Error editing message:', error);
    res.status(500).json({ 
      error: 'Failed to edit message',
      details: error.message 
    });
  }
});

// Clear cache endpoint for debugging
router.post('/threads/clear-cache', (req, res) => {
  threadsCache = null;
  cacheTimestamp = null;
  console.log('🗑️ Threads cache cleared');
  res.json({ success: true, message: 'Cache cleared' });
});

module.exports = router;
