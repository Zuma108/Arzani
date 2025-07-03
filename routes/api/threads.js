// API endpoint for fetching user conversation threads with bucketing and caching
// File: routes/api/threads.js

import express from 'express';
import pool from '../../db.js';
import { authenticateToken } from '../../middleware/auth.js';
import a2aLogger from '../../utils/a2a-interaction-logger.js';
const router = express.Router();

/**
 * GET /api/threads
 * Fetches user conversation threads organized into buckets (pinned, today, yesterday, last7Days, older)
 * with pagination and 30-second caching
 * 
 * Query Parameters:
 * - limit: Number of items per bucket (default: 20, max: 50)
 * - offset: Pagination offset (default: 0)
 * - nocache: Skip cache lookup (default: false)
 * 
 * Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "pinned": [...],
 *     "today": [...],
 *     "yesterday": [...],
 *     "last7Days": [...],
 *     "older": [...],
 *     "metadata": {
 *       "totalCount": 245,
 *       "pinnedCount": 3,
 *       "todayCount": 12,
 *       "yesterdayCount": 8,
 *       "last7DaysCount": 25,
 *       "olderCount": 197,
 *       "limit": 20,
 *       "offset": 0,
 *       "generatedAt": "2024-01-15T10:30:00Z",
 *       "fromCache": false
 *     }
 *   },
 *   "timestamp": "2024-01-15T10:30:00Z"
 * }
 */

/**
 * GET /api/threads/search
 * Search conversations by content, participant names, or business names
 * 
 * Query Parameters:
 * - q: Search query string (required)
 * - limit: Number of results to return (default: 10, max: 50)
 * - offset: Pagination offset (default: 0)
 * 
 * Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "conversations": [...],
 *     "totalCount": 15,
 *     "limit": 10,
 *     "offset": 0,
 *     "query": "search term"
 *   },
 *   "timestamp": "2024-01-15T10:30:00Z"
 * }
 */
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId || req.session?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                timestamp: new Date().toISOString()
            });
        }

        const query = req.query.q?.trim();
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query parameter "q" is required',
                timestamp: new Date().toISOString()
            });
        }

        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);

        // Search A2A chat sessions and messages
        const searchResult = await pool.query(`
            WITH thread_search AS (
                SELECT DISTINCT
                    s.id,
                    COALESCE(s.title, s.session_name, 'Untitled Chat') as title,
                    s.session_name as group_name,
                    COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_active_at,
                    COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_message_time,
                    s.updated_at,
                    COALESCE(s.is_pinned, false) as is_pinned,
                    s.avatar_url,
                    s.agent_type,
                    COALESCE(s.unread_count, 0) as unread_count,
                    s.created_at,
                    -- Get last message content (handle both columns)
                    (SELECT COALESCE(m.message_content, m.content) FROM a2a_chat_messages m 
                     WHERE m.session_id = s.id 
                     ORDER BY m.created_at DESC 
                     LIMIT 1) as last_message,
                    -- Calculate relevance score for better ranking
                    (
                        CASE WHEN COALESCE(s.title, s.session_name, '') ILIKE $2 THEN 10 ELSE 0 END +
                        CASE WHEN EXISTS (
                            SELECT 1 FROM a2a_chat_messages m 
                            WHERE m.session_id = s.id 
                            AND (m.message_content ILIKE $2 OR m.content ILIKE $2)
                        ) THEN 5 ELSE 0 END
                    ) as relevance_score
                FROM a2a_chat_sessions s
                WHERE s.user_id = $1 
                  AND s.is_active = true
                  AND (
                      COALESCE(s.title, s.session_name, '') ILIKE $2
                      OR EXISTS (
                          SELECT 1 FROM a2a_chat_messages m 
                          WHERE m.session_id = s.id 
                          AND (m.message_content ILIKE $2 OR m.content ILIKE $2)
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
            LIMIT $3 OFFSET $4
        `, [userId, `%${query}%`, limit, offset]);

        const conversations = searchResult.rows.map(row => ({
            id: row.id,
            title: row.title,
            group_name: row.group_name,
            last_active_at: row.last_active_at,
            last_message_time: row.last_message_time,
            updated_at: row.updated_at,
            is_pinned: row.is_pinned,
            avatar_url: row.avatar_url,
            agent_type: row.agent_type,
            unread_count: row.unread_count,
            created_at: row.created_at,
            last_message: row.last_message || 'No messages yet',
            relevance_score: row.relevance_score
        }));

        const totalCount = searchResult.rows.length > 0 ? searchResult.rows[0].total_count : 0;

        console.log('🔍 Thread search completed:', { 
            query, 
            results: conversations.length,
            totalMatches: totalCount 
        });

        res.json({
            success: true,
            data: {
                conversations,
                totalCount: parseInt(totalCount),
                query,
                hasMore: totalCount > offset + limit
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Thread search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search conversations',
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        // Extract and validate parameters
        const userId = req.user?.userId || req.session?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                timestamp: new Date().toISOString()
            });
        }

        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        const nocache = req.query.nocache === 'true';

        try {
            // Get A2A chat sessions for the user with proper bucketing by date
            const conversationsResult = await pool.query(`
                WITH user_sessions AS (
                    SELECT 
                        s.id,
                        COALESCE(s.title, s.session_name, 'Untitled Chat') as title,
                        s.session_name as group_name,
                        COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_active_at,
                        COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_message_time,
                        s.updated_at,
                        s.created_at,
                        s.agent_type,
                        s.is_pinned,
                        s.avatar_url,
                        s.unread_count,
                        
                        -- Get the last message content
                        last_msg.content AS last_message,
                        
                        -- Calculate time buckets
                        CASE 
                            WHEN COALESCE(s.last_active_at, s.updated_at, s.created_at)::date = CURRENT_DATE THEN 'today'
                            WHEN COALESCE(s.last_active_at, s.updated_at, s.created_at)::date = CURRENT_DATE - INTERVAL '1 day' THEN 'yesterday'
                            WHEN COALESCE(s.last_active_at, s.updated_at, s.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 'last7Days'
                            ELSE 'older'
                        END AS time_bucket
                        
                    FROM a2a_chat_sessions s
                    
                    -- Get last message
                    LEFT JOIN LATERAL (
                        SELECT COALESCE(m.message_content, m.content) as content, m.created_at
                        FROM a2a_chat_messages m
                        WHERE m.session_id = s.id AND m.is_deleted = false
                        ORDER BY m.created_at DESC
                        LIMIT 1
                    ) last_msg ON true
                    
                    WHERE s.user_id = $1 AND s.is_active = true
                    ORDER BY COALESCE(s.last_active_at, s.updated_at, s.created_at) DESC
                ),
                
                bucketed_sessions AS (
                    SELECT 
                        us.*,
                        ROW_NUMBER() OVER (PARTITION BY time_bucket ORDER BY last_message_time DESC) as bucket_row_num
                    FROM user_sessions us
                ),
                
                counts AS (
                    SELECT 
                        COUNT(*) as total_count,
                        COUNT(CASE WHEN is_pinned THEN 1 END) as pinned_count,
                        COUNT(CASE WHEN time_bucket = 'today' THEN 1 END) as today_count,
                        COUNT(CASE WHEN time_bucket = 'yesterday' THEN 1 END) as yesterday_count,
                        COUNT(CASE WHEN time_bucket = 'last7Days' THEN 1 END) as last7days_count,
                        COUNT(CASE WHEN time_bucket = 'older' THEN 1 END) as older_count
                    FROM user_sessions
                )
                
                SELECT 
                    bs.*,
                    c.total_count,
                    c.pinned_count,
                    c.today_count,
                    c.yesterday_count,
                    c.last7days_count,
                    c.older_count
                FROM bucketed_sessions bs
                CROSS JOIN counts c
                WHERE bs.bucket_row_num <= $2
                ORDER BY 
                    CASE 
                        WHEN bs.is_pinned THEN 0
                        WHEN bs.time_bucket = 'today' THEN 1
                        WHEN bs.time_bucket = 'yesterday' THEN 2
                        WHEN bs.time_bucket = 'last7Days' THEN 3
                        WHEN bs.time_bucket = 'older' THEN 4
                    END,
                    bs.last_message_time DESC
            `, [userId, limit]);

            // Process results into buckets
            const result = {
                pinned: [],
                today: [],
                yesterday: [],
                last7Days: [],
                older: [],
                metadata: {
                    totalCount: 0,
                    pinnedCount: 0,
                    todayCount: 0,
                    yesterdayCount: 0,
                    last7DaysCount: 0,
                    olderCount: 0,
                    limit,
                    offset,
                    generatedAt: new Date().toISOString(),
                    fromCache: false
                }
            };

            if (conversationsResult.rows.length > 0) {
                const firstRow = conversationsResult.rows[0];
                result.metadata.totalCount = parseInt(firstRow.total_count) || 0;
                result.metadata.pinnedCount = parseInt(firstRow.pinned_count) || 0;
                result.metadata.todayCount = parseInt(firstRow.today_count) || 0;
                result.metadata.yesterdayCount = parseInt(firstRow.yesterday_count) || 0;
                result.metadata.last7DaysCount = parseInt(firstRow.last7days_count) || 0;
                result.metadata.olderCount = parseInt(firstRow.older_count) || 0;

                // Group sessions by time bucket
                conversationsResult.rows.forEach(row => {
                    const session = {
                        id: row.id,
                        title: row.title,
                        group_name: row.group_name,
                        session_name: row.group_name,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        last_active_at: row.last_active_at,
                        last_message_time: row.last_message_time,
                        agent_type: row.agent_type,
                        is_pinned: row.is_pinned,
                        avatar_url: row.avatar_url,
                        unread_count: row.unread_count,
                        last_message: row.last_message || 'No messages yet',
                        time_bucket: row.time_bucket,
                        // For backward compatibility
                        conversation_id: row.id,
                        is_ai_chat: true
                    };

                    if (row.is_pinned) {
                        result.pinned.push(session);
                    } else {
                        switch (row.time_bucket) {
                            case 'today':
                                result.today.push(session);
                                break;
                            case 'yesterday':
                                result.yesterday.push(session);
                                break;
                            case 'last7Days':
                                result.last7Days.push(session);
                                break;
                            case 'older':
                                result.older.push(session);
                                break;
                        }
                    }
                });
            }

            // Process buckets for pagination
            const processedResult = processBucketsForPagination(result, limit);
            
            // Update session context with current thread access
            const sessionData = {
                lastAccessed: new Date().toISOString(),
                threadAccess: true,
                resultCounts: {
                    pinned: processedResult.pinned.length,
                    today: processedResult.today.length,
                    yesterday: processedResult.yesterday.length,
                    last7Days: processedResult.last7Days.length,
                    older: processedResult.older.length
                }
            };
            await updateSessionContext(userId, sessionData);
            
            // Update thread preferences with current access pattern
            const preferences = {
                lastThreadView: new Date().toISOString(),
                viewPreferences: {
                    limit: limit,
                    offset: offset
                },
                bucketAccess: {
                    pinned: processedResult.pinned.length > 0,
                    today: processedResult.today.length > 0,
                    yesterday: processedResult.yesterday.length > 0,
                    last7Days: processedResult.last7Days.length > 0,
                    older: processedResult.older.length > 0
                }
            };
            await updateThreadPreferences(userId, preferences);

            res.json({
                success: true,
                data: processedResult,
                timestamp: new Date().toISOString()
            });

        } catch (dbError) {
            console.error('Database query failed:', dbError);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch threads',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Thread API error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/threads/:threadId/pin
 * Pin or unpin a conversation thread
 * Note: Pinning feature not yet implemented in conversation tables
 */
router.post('/:threadId/pin', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId || req.session?.userId;
        const threadId = parseInt(req.params.threadId);
        const { pinned = true } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!threadId || isNaN(threadId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid thread ID required'
            });
        }

        // Update the pinned status for the A2A chat session
        const updateResult = await pool.query(`
            UPDATE a2a_chat_sessions 
            SET is_pinned = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING id, is_pinned, updated_at;
        `, [pinned, threadId, userId]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Thread not found or you do not have permission to update it'
            });
        }

        console.log('✅ Thread pin status updated:', threadId, pinned);

        res.json({
            success: true,
            data: {
                threadId,
                pinned: updateResult.rows[0].is_pinned,
                updatedAt: updateResult.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Pin thread error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update thread'
        });
    }
});

/**
 * PUT /api/threads/:threadId/title
 * Update thread title
 */
router.put('/:threadId/title', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId || req.session?.userId;
        const threadId = parseInt(req.params.threadId);
        const { title } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!threadId || isNaN(threadId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid thread ID required'
            });
        }

        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        if (title.length > 200) {
            return res.status(400).json({
                success: false,
                error: 'Title too long',
                details: 'Title must be 200 characters or less'
            });
        }

        const trimmedTitle = title.trim();

        // Update the session title 
        const updateResult = await pool.query(`
            UPDATE a2a_chat_sessions 
            SET title = $1, session_name = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING id, title, session_name, updated_at;
        `, [trimmedTitle, threadId, userId]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Thread not found or you do not have permission to update it'
            });
        }

        console.log('✅ Thread title updated:', threadId, trimmedTitle);

        res.json({
            success: true,
            data: {
                threadId,
                title: trimmedTitle,
                updatedAt: updateResult.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('❌ Update title error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update thread title',
            details: error.message
        });
    }
});

/**
 * DELETE /api/threads/:threadId
 * Archive (soft delete) a conversation thread
 * Note: Currently removes user from conversation_participants
 */
router.delete('/:threadId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId || req.session?.userId;
        const threadId = parseInt(req.params.threadId);

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!threadId || isNaN(threadId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid thread ID required'
            });
        }

        // Soft delete the session (set is_active to false)
        const deleteResult = await pool.query(`
            UPDATE a2a_chat_sessions 
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [threadId, userId]);

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or already removed'
            });
        }

        res.json({
            success: true,
            data: {
                threadId,
                archived: true,
                archivedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Archive thread error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to archive thread'
        });
    }
});

/**
 * GET /api/threads/stats
 * Get thread statistics for the current user
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId || req.session?.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const stats = await pool.query(`
            WITH session_stats AS (
                SELECT 
                    s.id,
                    s.created_at,
                    s.updated_at,
                    s.last_active_at,
                    COALESCE(msg_count.total, 0) as message_count,
                    CASE 
                        WHEN COALESCE(s.last_active_at, s.updated_at) >= (NOW() - INTERVAL '1 day') THEN 1 
                        ELSE 0 
                    END as active_today,
                    CASE 
                        WHEN COALESCE(s.last_active_at, s.updated_at) >= (NOW() - INTERVAL '7 days') THEN 1 
                        ELSE 0 
                    END as active_this_week
                FROM a2a_chat_sessions s
                LEFT JOIN (
                    SELECT session_id, COUNT(*) as total
                    FROM a2a_chat_messages
                    WHERE is_deleted = false OR is_deleted IS NULL
                    GROUP BY session_id
                ) msg_count ON s.id = msg_count.session_id
                WHERE s.user_id = $1 AND s.is_active = true
            )
            SELECT 
                COUNT(*) as total_threads,
                COUNT(CASE WHEN EXISTS(
                    SELECT 1 FROM a2a_chat_sessions s2 
                    WHERE s2.user_id = $1 AND s2.is_pinned = true AND s2.is_active = true
                ) THEN 1 END) as pinned_threads,
                COUNT(CASE WHEN EXISTS(
                    SELECT 1 FROM a2a_chat_sessions s3 
                    WHERE s3.user_id = $1 AND s3.is_active = false
                ) THEN 1 END) as archived_threads,
                SUM(active_today) as active_today,
                SUM(active_this_week) as active_this_week,
                SUM(message_count) as total_messages,
                CASE 
                    WHEN COUNT(*) > 0 THEN ROUND(AVG(message_count), 2)
                    ELSE 0
                END as avg_messages_per_thread
            FROM session_stats
        `, [userId]);

        res.json({
            success: true,
            data: stats.rows[0],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Thread stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch thread statistics'
        });
    }
});

/**
 * POST /api/threads
 * Create a new conversation thread
 * 
 * Request Body:
 * {
 *   "group_name": "Chat Name",
 *   "business_id": 123, // optional
 *   "is_ai_chat": true  // optional, defaults to true
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "id": 456,
 *   "conversation_id": 456,
 *   "group_name": "Chat Name",
 *   "created_at": "2024-01-15T10:30:00Z",
 *   "updated_at": "2024-01-15T10:30:00Z",
 *   "is_ai_chat": true
 * }
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        const { group_name, agent_type = 'orchestrator', title, is_ai_chat = true } = req.body;
        
        console.log(`Creating new A2A chat session for user: ${userId}, agent: ${agent_type}`);

        // Create new session in a2a_chat_sessions table
        const createQuery = `
            INSERT INTO a2a_chat_sessions (
                user_id, 
                session_name, 
                title,
                agent_type, 
                created_at, 
                updated_at, 
                last_active_at,
                is_active
            ) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW(), true)
            RETURNING id, session_name, title, agent_type, created_at, updated_at, last_active_at
        `;
        
        const sessionName = group_name || title || `New ${agent_type} conversation`;
        const sessionResult = await pool.query(createQuery, [
            userId,
            sessionName,
            title || sessionName,
            agent_type
        ]);
        
        const session = sessionResult.rows[0];
        
        console.log(`New A2A chat session created: ${session.id}`);
        
        res.json({
            success: true,
            id: session.id,
            conversation_id: session.id, // For backward compatibility
            session_name: session.session_name,
            title: session.title,
            agent_type: session.agent_type,
            created_at: session.created_at,
            updated_at: session.updated_at,
            last_active_at: session.last_active_at,
            is_ai_chat: true
        });
        
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create conversation' 
        });
    }
});

/**
 * POST /api/threads/:threadId/send
 * Send a message to a specific thread (for AI conversations)
 * 
 * Request Body:
 * {
 *   "content": "Message content",
 *   "sender_type": "user" | "assistant",
 *   "agent_type": "orchestrator" | "finance" | "legal" | "broker"
 * }
 */
router.post('/:threadId/send', authenticateToken, async (req, res) => {
    console.log(`🔥 MESSAGE SEND REQUEST - ThreadId: ${req.params.threadId}, User: ${req.user?.userId}`);
    console.log('🔥 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔥 Auth headers:', req.headers.authorization ? 'Present' : 'Missing');
    
    try {
        const userId = req.user?.userId;
        const threadId = parseInt(req.params.threadId);
        const { content, sender_type = 'user', agent_type = 'orchestrator', message_id, metadata = {} } = req.body;

        console.log(`🔥 Parsed - userId: ${userId}, threadId: ${threadId}, content length: ${content?.length || 0}`);

        if (!userId) {
            console.log('🔥 FAILED: No userId found');
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        if (!threadId || isNaN(threadId)) {
            console.log(`🔥 FAILED: Invalid threadId: ${req.params.threadId}`);
            return res.status(400).json({
                success: false,
                error: 'Valid thread ID required'
            });
        }

        if (!content || content.trim().length === 0) {
            console.log('🔥 FAILED: No content provided');
            return res.status(400).json({
                success: false,
                error: 'Message content is required'
            });
        }

        console.log(`🔥 Checking access to session ${threadId} for user ${userId}`);
        
        // Verify user has access to this A2A chat session
        const accessCheck = await pool.query(`
            SELECT id, agent_type, user_id 
            FROM a2a_chat_sessions 
            WHERE id = $1 AND user_id = $2 AND is_active = true
        `, [threadId, userId]);

        console.log(`🔥 Access check result: ${accessCheck.rows.length} rows`);
        if (accessCheck.rows.length > 0) {
            console.log(`🔥 Session found: ${JSON.stringify(accessCheck.rows[0])}`);
        }

        if (accessCheck.rows.length === 0) {
            console.log(`🔥 FAILED: No access to session ${threadId} for user ${userId}`);
            return res.status(403).json({
                success: false,
                error: 'Access denied to this chat session'
            });
        }

        const session = accessCheck.rows[0];
        console.log(`🔥 Session access confirmed: ${session.id}, agent: ${session.agent_type}`);

        // Handle idempotent message creation (for resending with same message_id)
        if (message_id) {
            console.log(`🔥 Checking for existing message with ID: ${message_id}`);
            // Check if message with this ID already exists
            const existingMessage = await pool.query(`
                SELECT id, message_content, created_at, sender_type, agent_type
                FROM a2a_chat_messages 
                WHERE message_id = $1 AND session_id = $2
            `, [message_id, threadId]);

            if (existingMessage.rows.length > 0) {
                console.log(`🔥 Message with ID ${message_id} already exists, returning existing message`);
                return res.json({
                    success: true,
                    message: {
                        id: existingMessage.rows[0].id,
                        content: existingMessage.rows[0].message_content,
                        created_at: existingMessage.rows[0].created_at,
                        sender_type: existingMessage.rows[0].sender_type,
                        agent_type: existingMessage.rows[0].agent_type
                    }
                });
            }
        }

        console.log(`🔥 Getting next message order for session ${threadId}`);
        // Generate message order
        const orderResult = await pool.query(`
            SELECT COALESCE(MAX(message_order), 0) + 1 as next_order
            FROM a2a_chat_messages 
            WHERE session_id = $1
        `, [threadId]);
        
        const messageOrder = orderResult.rows[0].next_order;
        console.log(`🔥 Next message order: ${messageOrder}`);

        const finalMessageId = message_id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🔥 Using message ID: ${finalMessageId}`);

        console.log(`🔥 Inserting message into a2a_chat_messages table...`);
        console.log(`🔥 Insert params: sessionId=${threadId}, content="${content.substring(0, 50)}...", senderType=${sender_type}, agentType=${agent_type}, order=${messageOrder}, messageId=${finalMessageId}`);
        
        // Insert the message into a2a_chat_messages
        const messageResult = await pool.query(`
            INSERT INTO a2a_chat_messages (
                session_id,
                message_content,
                sender_type,
                agent_type,
                message_order,
                message_id,
                metadata,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id, message_content, sender_type, agent_type, message_order, message_id, created_at, metadata
        `, [
            threadId,
            content.trim(),
            sender_type,
            agent_type,
            messageOrder,
            finalMessageId,
            JSON.stringify(metadata)
        ]);

        const message = messageResult.rows[0];
        console.log(`🔥 Message inserted successfully! ID: ${message.id}, DB message ID: ${message.message_id}`);

        // Update session's last activity
        console.log(`🔥 Updating session ${threadId} last activity...`);
        await pool.query(`
            UPDATE a2a_chat_sessions 
            SET last_active_at = NOW(), updated_at = NOW()
            WHERE id = $1
        `, [threadId]);

        console.log(`🔥 SUCCESS: Message saved to A2A session ${threadId}:`, message.id);

        res.json({
            success: true,
            message: {
                id: message.id,
                session_id: threadId,
                content: message.message_content,
                sender_type: message.sender_type,
                agent_type: message.agent_type,
                message_order: message.message_order,
                message_id: message.message_id,
                metadata: message.metadata,
                created_at: message.created_at
            }
        });

    } catch (error) {
        console.error('🔥 ERROR in message send endpoint:', error);
        console.error('🔥 Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send message',
            details: error.message
        });
    }
});

/**
 * GET /api/threads/:threadId/messages
 * Get messages for a specific thread
 */
router.get('/:threadId/messages', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const threadId = parseInt(req.params.threadId);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        if (!threadId || isNaN(threadId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid thread ID required'
            });
        }

        // Verify user has access to this session
        const accessCheck = await pool.query(`
            SELECT s.id 
            FROM a2a_chat_sessions s
            WHERE s.id = $1 AND s.user_id = $2
        `, [threadId, userId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this session'
            });
        }

        // Get messages for this session
        const messagesResult = await pool.query(`
            SELECT 
                m.id,
                COALESCE(m.message_content, m.content) as content,
                m.sender_type,
                m.agent_type,
                m.created_at,
                m.updated_at,
                m.is_edited,
                m.message_id,
                m.message_order,
                m.metadata
            FROM a2a_chat_messages m
            WHERE m.session_id = $1 AND (m.is_deleted = false OR m.is_deleted IS NULL)
            ORDER BY m.created_at ASC
            LIMIT $2 OFFSET $3
        `, [threadId, limit, offset]);

        res.json({
            success: true,
            messages: messagesResult.rows
        });

    } catch (error) {
        console.error('Error getting thread messages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get messages' 
        });
    }
});

/**
 * GET /api/threads/:id/preview
 * Get thread preview information for sidebar updates
 * Used by ArzaniA2AClient to update conversation previews in real-time
 */
router.get('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const threadId = req.params.id;

    if (!threadId) {
      return res.status(400).json({
        success: false,
        error: 'Thread ID is required'
      });
    }

    console.log(`Fetching thread preview for thread ${threadId}, user ${userId}`);

    // Check if it's an A2A session or regular conversation
    let threadPreview = null;
    
    // First try A2A sessions
    const a2aSessionResult = await pool.query(`
      SELECT 
        s.id,
        s.session_name as title,
        s.agent_type,
        s.last_active_at,
        s.updated_at,
        (
          SELECT COALESCE(m.message_content, m.content)
          FROM a2a_chat_messages m 
          WHERE m.session_id = s.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m.sender_type 
          FROM a2a_chat_messages m 
          WHERE m.session_id = s.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_sender,
        (
          SELECT COUNT(*) 
          FROM a2a_chat_messages m 
          WHERE m.session_id = s.id
        ) as message_count,
        'a2a' as thread_type
      FROM a2a_chat_sessions s
      WHERE s.id = $1 AND s.user_id = $2 AND s.is_active = true
    `, [threadId, userId]);

    if (a2aSessionResult.rows.length > 0) {
      threadPreview = a2aSessionResult.rows[0];
    }

    if (!threadPreview) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found or access denied'
      });
    }

    // Format the preview data
    const preview = {
      id: threadPreview.id,
      title: threadPreview.title,
      lastMessage: threadPreview.last_message || '',
      lastSender: threadPreview.last_sender || 'System',
      messageCount: parseInt(threadPreview.message_count) || 0,
      lastActiveAt: threadPreview.last_active_at,
      updatedAt: threadPreview.updated_at,
      threadType: threadPreview.thread_type,
      agentType: threadPreview.agent_type || null
    };

    // Store preview in thread_previews table for future reference
    try {
      await pool.query(`
        INSERT INTO thread_previews (
          thread_id, user_id, last_message, last_message_at, updated_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (thread_id, user_id) DO UPDATE SET
          last_message = EXCLUDED.last_message,
          last_message_at = EXCLUDED.last_message_at,
          updated_at = NOW()
      `, [
        preview.id, userId, preview.lastMessage, preview.lastActiveAt
      ]);
    } catch (dbError) {
      console.log('Non-critical error updating thread preview cache:', dbError.message);
    }

    console.log(`✅ Thread preview fetched for ${threadId}: ${preview.title}`);

    res.json({
      success: true,
      preview: preview,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching thread preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thread preview',
      details: error.message
    });
  }
});

/**
 * POST /api/threads/previews/bulk
 * Get multiple thread previews at once for efficient sidebar updates
 */
router.post('/previews/bulk', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { threadIds } = req.body;

    if (!threadIds || !Array.isArray(threadIds)) {
      return res.status(400).json({
        success: false,
        error: 'Thread IDs array is required'
      });
    }

    console.log(`Fetching bulk previews for ${threadIds.length} threads, user ${userId}`);

    const previews = [];

    // Process each thread ID
    for (const threadId of threadIds) {
      try {
        // Check A2A sessions first
        const a2aResult = await pool.query(`
          SELECT 
            s.id,
            s.session_name as title,
            s.agent_type,
            s.last_active_at,
            s.updated_at,
            (SELECT COALESCE(m.message_content, m.content) FROM a2a_chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
            (SELECT m.sender_type FROM a2a_chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_sender,
            (SELECT COUNT(*) FROM a2a_chat_messages m WHERE m.session_id = s.id) as message_count,
            'a2a' as thread_type
          FROM a2a_chat_sessions s
          WHERE s.id = $1 AND s.user_id = $2 AND s.is_active = true
        `, [threadId, userId]);

        if (a2aResult.rows.length > 0) {
          const thread = a2aResult.rows[0];
          previews.push({
            id: thread.id,
            title: thread.title,
            lastMessage: thread.last_message || '',
            lastSender: thread.last_sender || 'System',
            messageCount: parseInt(thread.message_count) || 0,
            lastActiveAt: thread.last_active_at,
            threadType: thread.thread_type,
            agentType: thread.agent_type
          });
        } else {
          // Check regular conversations
          const convResult = await pool.query(`
            SELECT 
              s.id,
              COALESCE(s.title, s.session_name, 'Chat Conversation') as title,
              COALESCE(s.last_active_at, s.updated_at) as last_active_at,
              (SELECT COALESCE(m.message_content, m.content) FROM a2a_chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
              (SELECT 
                CASE 
                  WHEN m.sender_type = 'user' THEN 'You'
                  WHEN m.agent_type IS NOT NULL THEN CONCAT(UPPER(SUBSTRING(m.agent_type, 1, 1)), SUBSTRING(m.agent_type, 2))
                  ELSE 'Assistant'
                END 
                FROM a2a_chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1
              ) as last_sender,
              (SELECT COUNT(*) FROM a2a_chat_messages m WHERE m.session_id = s.id) as message_count,
              'a2a_session' as thread_type
            FROM a2a_chat_sessions s
            WHERE s.id = $1 AND s.user_id = $2 AND s.is_active = true
          `, [threadId, userId]);

          if (convResult.rows.length > 0) {
            const thread = convResult.rows[0];
            previews.push({
              id: thread.id,
              title: thread.title,
              lastMessage: thread.last_message || '',
              lastSender: thread.last_sender || 'System',
              messageCount: parseInt(thread.message_count) || 0,
              lastActiveAt: thread.last_active_at,
              threadType: thread.thread_type,
              agentType: null
            });
          }
        }
      } catch (error) {
        console.log(`Error fetching preview for thread ${threadId}:`, error.message);
      }
    }

    res.json({
      success: true,
      previews: previews,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching bulk thread previews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bulk thread previews',
      details: error.message
    });
  }
});

/**
 * PUT /api/threads/:id/preview
 * Update thread preview information (used when new messages are sent)
 */
router.put('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const threadId = req.params.id;
    const { lastMessage } = req.body;

    console.log(`Updating thread preview for thread ${threadId}, user ${userId}`);

    // Update or insert thread preview with simplified schema
    await pool.query(`
      INSERT INTO thread_previews (
        thread_id, user_id, last_message, last_message_at, updated_at
      )
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (thread_id, user_id) DO UPDATE SET
        last_message = COALESCE(EXCLUDED.last_message, thread_previews.last_message),
        last_message_at = NOW(),
        updated_at = NOW()
    `, [threadId, userId, lastMessage]);

    res.json({
      success: true,
      message: 'Thread preview updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating thread preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update thread preview',
      details: error.message
    });
  }
});

/**
 * PUT /api/threads/messages/:messageId
 * Update an existing message content
 */
router.put('/messages/:messageId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const messageId = req.params.messageId;
        const { content, session_id } = req.body;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: 'Message ID is required'
            });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message content is required'
            });
        }

        // Find the message and verify user has access
        const messageQuery = `
            SELECT m.id, m.session_id, COALESCE(m.message_content, m.content) as message_content, m.sender_type, s.user_id
            FROM a2a_chat_messages m
            JOIN a2a_chat_sessions s ON m.session_id = s.id
            WHERE m.message_id = $1 AND s.user_id = $2 AND s.is_active = true
        `;
        
        const messageResult = await pool.query(messageQuery, [messageId, userId]);

        if (messageResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Message not found or access denied'
            });
        }

        const message = messageResult.rows[0];

        // Only allow users to edit their own messages
        if (message.sender_type !== 'user') {
            return res.status(403).json({
                success: false,
                error: 'Only user messages can be edited'
            });
        }

        // Store original content if not already stored
        const updateQuery = `
            UPDATE a2a_chat_messages 
            SET 
                message_content = $1, 
                updated_at = NOW(),
                is_edited = true,
                original_content = COALESCE(original_content, $2)
            WHERE message_id = $3 AND session_id = $4
            RETURNING id, message_content, updated_at, is_edited, message_id, session_id
        `;

        const updateResult = await pool.query(updateQuery, [
            content.trim(),
            message.message_content, // Store original content if not already stored
            messageId,
            message.session_id
        ]);

        if (updateResult.rows.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update message'
            });
        }

        const updatedMessage = updateResult.rows[0];

        // Update session's last activity
        await pool.query(`
            UPDATE a2a_chat_sessions 
            SET last_active_at = NOW(), updated_at = NOW()
            WHERE id = $1
        `, [message.session_id]);

        console.log(`Message ${messageId} updated in session ${message.session_id}`);

        res.json({
            success: true,
            message: {
                id: updatedMessage.id,
                message_id: updatedMessage.message_id,
                session_id: updatedMessage.session_id,
                content: updatedMessage.message_content,
                updated_at: updatedMessage.updated_at,
                is_edited: updatedMessage.is_edited
            }
        });

    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/threads/:id
 * Get a specific thread/session by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const threadId = parseInt(req.params.id);

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (isNaN(threadId) || threadId <= 0) {
            return res.status(400).json({ error: 'Invalid thread ID' });
        }

        // Query for the specific thread/session
        const sessionQuery = `
            SELECT 
                id,
                session_name,
                agent_type,
                created_at,
                updated_at,
                is_active,
                metadata,
                title,
                last_active_at,
                is_pinned,
                avatar_url,
                unread_count,
                thread_metadata
            FROM a2a_chat_sessions 
            WHERE id = $1 AND user_id = $2 AND is_active = true
        `;

        const result = await pool.query(sessionQuery, [threadId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        const session = result.rows[0];

        // Return the session data
        res.json({
            success: true,
            data: {
                id: session.id,
                session_name: session.session_name,
                title: session.title || session.session_name,
                agent_type: session.agent_type,
                created_at: session.created_at,
                updated_at: session.updated_at,
                last_active_at: session.last_active_at,
                is_active: session.is_active,
                is_pinned: session.is_pinned,
                avatar_url: session.avatar_url,
                unread_count: session.unread_count,
                metadata: session.metadata || {},
                thread_metadata: session.thread_metadata || {}
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching thread:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Helper Functions
 */

/**
 * Process buckets to handle pagination for arrays with 50+ items
 */
function processBucketsForPagination(result, limit) {
    const processed = { ...result };
    
    ['pinned', 'today', 'yesterday', 'last7Days', 'older'].forEach(bucket => {
        if (Array.isArray(processed[bucket]) && processed[bucket].length > 50) {
            // If bucket has more than 50 items, paginate
            processed[bucket] = {
                items: processed[bucket].slice(0, limit),
                totalCount: processed[bucket].length,
                hasMore: processed[bucket].length > limit,
                nextOffset: limit
            };
        }
    });
    
    return processed;
}

/**
 * Helper function to update session context
 */
async function updateSessionContext(userId, sessionData) {
  try {
    // Store or update session context in a2a_session_context table
    await pool.query(`
      INSERT INTO a2a_session_context (
        user_id, session_data, last_accessed, created_at, updated_at
      )
      VALUES ($1, $2, NOW(), NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        session_data = EXCLUDED.session_data,
        last_accessed = NOW(),
        updated_at = NOW()
    `, [userId, JSON.stringify(sessionData)]);
  } catch (error) {
    console.log('Session context update failed:', error.message);
  }
}

/**
 * Helper function to update thread preferences
 */
async function updateThreadPreferences(userId, preferences) {
  try {
    // Use the upsert function to handle conflicts properly
    await pool.query(`SELECT upsert_thread_preferences($1, $2)`, [
      userId, 
      JSON.stringify(preferences)
    ]);
  } catch (error) {
    console.log('Thread preferences update failed:', error.message);
    
    // Fallback to direct table operation if function doesn't exist
    try {
      await pool.query(`
        INSERT INTO thread_preferences (
          user_id, preferences, created_at, updated_at
        )
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          preferences = EXCLUDED.preferences,
          updated_at = NOW()
      `, [userId, JSON.stringify(preferences)]);
    } catch (fallbackError) {
      console.log('Thread preferences fallback update failed:', fallbackError.message);
    }
  }
}

/**
 * Helper function to get thread preferences
 */
async function getThreadPreferences(userId) {
  try {
    // Try both table names in case of inconsistency
    let result = await pool.query(`
      SELECT preferences FROM thread_preferences 
      WHERE user_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      // Fallback to a2a_thread_preferences table
      result = await pool.query(`
        SELECT preferences FROM a2a_thread_preferences 
        WHERE user_id = $1
      `, [userId]);
    }
    
    if (result.rows.length > 0) {
      return result.rows[0].preferences;
    }
    return {}; // Default empty preferences
  } catch (error) {
    console.log('Thread preferences fetch failed:', error.message);
    return {};
  }
}

export default router;