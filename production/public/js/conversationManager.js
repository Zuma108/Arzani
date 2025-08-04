/**
 * Conversation Manager - Handles saving, loading, and organizing conversations
 */
export class ConversationManager {
    constructor() {
        this.folders = this.loadFolders();
        this.conversations = this.loadConversations();
        this.selectedFolder = 'all';
    }
    
    // FOLDER OPERATIONS
    
    /**
     * Load folders from localStorage
     */
    loadFolders() {
        try {
            const folders = JSON.parse(localStorage.getItem('conversationFolders')) || [];
            
            // Ensure default folders exist
            if (folders.length === 0) {
                const defaultFolders = [
                    { id: "all", name: "All Conversations", default: true, count: 0 },
                    { id: "business", name: "Business Inquiries", default: false, count: 0 },
                    { id: "market", name: "Market Research", default: false, count: 0 },
                    { id: "analytics", name: "Analytics", default: false, count: 0 }
                ];
                localStorage.setItem('conversationFolders', JSON.stringify(defaultFolders));
                return defaultFolders;
            }
            
            return folders;
        } catch (error) {
            console.error('Error loading folders:', error);
            return [];
        }
    }
    
    /**
     * Save folders to localStorage
     */
    saveFolders() {
        try {
            localStorage.setItem('conversationFolders', JSON.stringify(this.folders));
        } catch (error) {
            console.error('Error saving folders:', error);
        }
    }
    
    /**
     * Create a new folder
     */
    createFolder(name) {
        if (!name || name.trim() === '') return null;
        
        // Generate unique ID based on timestamp and random number
        const id = `folder_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        const newFolder = {
            id,
            name: name.trim(),
            default: false,
            count: 0
        };
        
        this.folders.push(newFolder);
        this.saveFolders();
        this.updateFolderCounts();
        
        return newFolder;
    }
    
    /**
     * Update a folder
     */
    updateFolder(id, newName) {
        const folder = this.folders.find(f => f.id === id);
        if (folder && newName && newName.trim() !== '') {
            folder.name = newName.trim();
            this.saveFolders();
            return true;
        }
        return false;
    }
    
    /**
     * Delete a folder and move its conversations to "All Conversations"
     */
    deleteFolder(id) {
        // Don't delete default folders
        const folder = this.folders.find(f => f.id === id);
        if (!folder || folder.default) return false;
        
        // Move conversations from this folder to the "all" folder
        this.conversations.forEach(conv => {
            if (conv.folder === id) {
                conv.folder = 'all';
            }
        });
        
        // Remove the folder
        this.folders = this.folders.filter(f => f.id !== id);
        this.saveConversations();
        this.saveFolders();
        
        return true;
    }
    
    /**
     * Update conversation counts for each folder
     */
    updateFolderCounts() {
        // Reset counts
        this.folders.forEach(folder => {
            folder.count = 0;
        });
        
        // Count conversations in each folder
        this.conversations.forEach(conv => {
            const folder = this.folders.find(f => f.id === conv.folder);
            if (folder) {
                folder.count++;
            }
            
            // Also count in "All" folder
            const allFolder = this.folders.find(f => f.id === 'all');
            if (allFolder) {
                allFolder.count++;
            }
        });
        
        this.saveFolders();
    }
    
    // CONVERSATION OPERATIONS
    
    /**
     * Load conversations from localStorage
     */
    loadConversations() {
        try {
            return JSON.parse(localStorage.getItem('savedConversations')) || [];
        } catch (error) {
            console.error('Error loading conversations:', error);
            return [];
        }
    }
    
    /**
     * Save conversations to localStorage
     */
    saveConversations() {
        try {
            localStorage.setItem('savedConversations', JSON.stringify(this.conversations));
            this.updateFolderCounts();
        } catch (error) {
            console.error('Error saving conversations:', error);
        }
    }
    
    /**
     * Create a new conversation
     */
    createConversation(title, folderId, messages, summary = '') {
        if (!title || title.trim() === '') return null;
        
        // Ensure folder exists
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) {
            folderId = 'all'; // Default to "All Conversations"
        }
        
        // Create new conversation
        const newConversation = {
            id: Date.now().toString(),
            title: title.trim(),
            folder: folderId,
            messages: messages || [],
            summary: summary || messages?.[0] || title,
            timestamp: new Date().toISOString()
        };
        
        this.conversations.push(newConversation);
        this.saveConversations();
        
        return newConversation;
    }
    
    /**
     * Get conversations by folder
     */
    getConversationsByFolder(folderId = 'all') {
        if (folderId === 'all') {
            return [...this.conversations].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp));
        }
        
        return this.conversations
            .filter(conv => conv.folder === folderId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    /**
     * Get a conversation by ID
     */
    getConversation(id) {
        return this.conversations.find(conv => conv.id === id);
    }
    
    /**
     * Update a conversation
     */
    updateConversation(id, updates) {
        const conversation = this.conversations.find(conv => conv.id === id);
        if (conversation) {
            Object.assign(conversation, updates);
            this.saveConversations();
            return true;
        }
        return false;
    }
    
    /**
     * Move a conversation to another folder
     */
    moveConversation(id, newFolderId) {
        const conversation = this.conversations.find(conv => conv.id === id);
        const folder = this.folders.find(f => f.id === newFolderId);
        
        if (conversation && folder) {
            conversation.folder = newFolderId;
            this.saveConversations();
            return true;
        }
        return false;
    }
    
    /**
     * Delete a conversation
     */
    deleteConversation(id) {
        const initialLength = this.conversations.length;
        this.conversations = this.conversations.filter(conv => conv.id !== id);
        
        if (initialLength !== this.conversations.length) {
            this.saveConversations();
            return true;
        }
        return false;
    }
    
    /**
     * Get formatted time ago string for a date
     */
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - new Date(date);
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
