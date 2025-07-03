// Integration guide and example usage for the A2A Threads API
// File: docs/threads_api_integration.md

# A2A Threads API Integration Guide

## Overview

The A2A Threads API provides advanced conversation management with:
- Bucketed organization (pinned, today, yesterday, last7Days, older)
- Caching with 30-second TTL
- Pagination for large datasets
- Thread preferences (pinning, custom titles, archiving)
- Real-time analytics and metadata

## Database Setup

1. Run the SQL enhancement script:
```bash
psql -U your_username -d your_database -f sql/a2a_threads_enhancement.sql
```

2. Verify tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'a2a_thread%' OR table_name = 'v_a2a_threads';
```

## Express App Integration

### 1. Add to your main app.js or server.js:

```javascript
const express = require('express');
const threadsRouter = require('./routes/api/threads');

const app = express();

// Database middleware (add your database connection)
app.use((req, res, next) => {
    req.db = your_database_connection; // Replace with your DB setup
    next();
});

// Authentication middleware (add your auth logic)
app.use((req, res, next) => {
    // Add your authentication logic here
    // Ensure req.user.id or req.session.userId is available
    next();
});

// Mount the threads API
app.use('/api/threads', threadsRouter);
```

### 2. Frontend JavaScript Usage:

```javascript
// Fetch threads with bucketing
async function fetchThreads(limit = 20, offset = 0) {
    try {
        const response = await fetch(`/api/threads?limit=${limit}&offset=${offset}`);
        const result = await response.json();
        
        if (result.success) {
            displayThreads(result.data);
        } else {
            console.error('Failed to fetch threads:', result.error);
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

// Display threads in the UI
function displayThreads(data) {
    const { pinned, today, yesterday, last7Days, older, metadata } = data;
    
    // Update sidebar with bucketed threads
    updateThreadBucket('pinned', pinned, 'Pinned Conversations');
    updateThreadBucket('today', today, 'Today');
    updateThreadBucket('yesterday', yesterday, 'Yesterday');
    updateThreadBucket('last7Days', last7Days, 'Last 7 Days');
    updateThreadBucket('older', older, 'Older');
    
    // Update metadata display
    document.getElementById('totalThreads').textContent = metadata.totalCount;
    document.getElementById('fromCache').textContent = metadata.fromCache ? 'Yes' : 'No';
}

function updateThreadBucket(bucketId, threads, title) {
    const container = document.getElementById(`${bucketId}Threads`);
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = `<h3>${title}</h3>`;
    
    // Handle paginated bucket format
    const threadList = Array.isArray(threads) ? threads : threads?.items || [];
    
    threadList.forEach(thread => {
        const threadElement = createThreadElement(thread);
        container.appendChild(threadElement);
    });
    
    // Add "Load More" button if needed
    if (threads?.hasMore) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.onclick = () => loadMoreThreads(bucketId, threads.nextOffset);
        container.appendChild(loadMoreBtn);
    }
}

function createThreadElement(thread) {
    const div = document.createElement('div');
    div.className = 'thread-item';
    div.innerHTML = `
        <div class="thread-avatar">
            <img src="${thread.avatar_url || '/default-avatar.png'}" alt="Avatar">
        </div>
        <div class="thread-content">
            <div class="thread-title">${thread.title}</div>
            <div class="thread-meta">
                ${thread.message_count} messages • ${formatDate(thread.last_active_at)}
            </div>
            <div class="thread-agents">
                ${thread.agents_involved.map(agent => `<span class="agent-tag">${agent}</span>`).join('')}
            </div>
        </div>
        <div class="thread-actions">
            <button onclick="togglePin(${thread.id}, ${!thread.is_pinned})" class="pin-btn">
                ${thread.is_pinned ? '📌' : '📍'}
            </button>
            <button onclick="openThread(${thread.id})" class="open-btn">Open</button>
        </div>
    `;
    
    // Add click handler to open thread
    div.onclick = () => openThread(thread.id);
    
    return div;
}

// Pin/unpin thread
async function togglePin(threadId, pinned) {
    try {
        const response = await fetch(`/api/threads/${threadId}/pin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pinned })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Refresh threads to show updated state
            fetchThreads();
        } else {
            console.error('Failed to toggle pin:', result.error);
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

// Update thread title
async function updateThreadTitle(threadId, newTitle) {
    try {
        const response = await fetch(`/api/threads/${threadId}/title`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: newTitle })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update UI to show new title
            fetchThreads();
        } else {
            console.error('Failed to update title:', result.error);
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

// Archive thread
async function archiveThread(threadId) {
    if (!confirm('Are you sure you want to archive this conversation?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/threads/${threadId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Remove from UI
            fetchThreads();
        } else {
            console.error('Failed to archive thread:', result.error);
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
}

function openThread(threadId) {
    // Implement your thread opening logic here
    // This could navigate to a chat page or load the conversation
    window.location.href = `/chat/${threadId}`;
}

// Auto-refresh threads every 30 seconds
setInterval(() => {
    fetchThreads();
}, 30000);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchThreads();
});
```

### 3. CSS Styles for Thread Display:

```css
.thread-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
    transition: background-color 0.2s;
}

.thread-item:hover {
    background-color: #f9fafb;
}

.thread-avatar img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 12px;
}

.thread-content {
    flex: 1;
    min-width: 0;
}

.thread-title {
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.thread-meta {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
}

.thread-agents {
    display: flex;
    gap: 4px;
}

.agent-tag {
    background: #dbeafe;
    color: #1e40af;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
}

.thread-actions {
    display: flex;
    gap: 8px;
}

.pin-btn, .open-btn {
    padding: 4px 8px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.pin-btn:hover, .open-btn:hover {
    background-color: #f3f4f6;
}

#pinnedThreads, #todayThreads, #yesterdayThreads, #last7DaysThreads, #olderThreads {
    margin-bottom: 20px;
}

#pinnedThreads h3, #todayThreads h3, #yesterdayThreads h3, #last7DaysThreads h3, #olderThreads h3 {
    margin: 0 0 10px 0;
    padding: 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
}
```

## API Response Examples

### GET /api/threads Response:
```json
{
  "success": true,
  "data": {
    "pinned": [
      {
        "id": 123,
        "title": "Important Project Discussion",
        "last_active_at": "2024-01-15T10:30:00Z",
        "is_pinned": true,
        "avatar_url": "/avatars/project.png",
        "unread_count": 2,
        "message_count": 45,
        "agents_involved": ["orchestrator", "analyst"],
        "metadata": {...}
      }
    ],
    "today": [...],
    "yesterday": [...],
    "last7Days": [...],
    "older": [...],
    "metadata": {
      "totalCount": 245,
      "pinnedCount": 3,
      "todayCount": 12,
      "yesterdayCount": 8,
      "last7DaysCount": 25,
      "olderCount": 197,
      "limit": 20,
      "offset": 0,
      "generatedAt": "2024-01-15T10:30:00Z",
      "fromCache": false
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Performance Considerations

1. **Caching**: Results are cached for 30 seconds to reduce database load
2. **Pagination**: Large buckets (50+ items) are automatically paginated
3. **Indexing**: Comprehensive indexes ensure fast queries
4. **Cache Cleanup**: Expired cache entries are cleaned automatically

## Monitoring and Maintenance

### Check cache performance:
```sql
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN expires_at > now() THEN 1 END) as active_entries,
    AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_ttl_seconds
FROM a2a_thread_cache;
```

### Monitor thread activity:
```sql
SELECT 
    DATE_TRUNC('hour', last_active_at) as hour,
    COUNT(*) as active_threads
FROM a2a_chat_sessions 
WHERE last_active_at >= now() - interval '24 hours'
GROUP BY hour 
ORDER BY hour;
```

### Clean up old data:
```sql
-- Clean expired cache (run periodically)
SELECT clean_expired_cache();

-- Archive very old threads (run monthly)
UPDATE a2a_thread_preferences 
SET is_archived = true 
WHERE session_id IN (
    SELECT id FROM a2a_chat_sessions 
    WHERE last_active_at < now() - interval '1 year'
);
```

This integration provides a robust, scalable conversation management system that enhances the existing A2A chat functionality with modern UI patterns and efficient data handling.