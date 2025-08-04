import { google } from 'googleapis';
import pool from '../db.js';

class GoogleDriveService {
    constructor() {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            console.warn('⚠️ Google Drive credentials not configured - service will be disabled');
            this.isConfigured = false;
            return;
        }

        try {
            this.oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            this.drive = google.drive({ 
                version: 'v3', 
                auth: this.oauth2Client 
            });
            
            this.isConfigured = true;
            console.log('✅ Google Drive service configured successfully');
        } catch (error) {
            console.error('❌ Google Drive service configuration failed:', error.message);
            this.isConfigured = false;
        }
    }

    async setCredentials(tokens) {
        if (!this.isConfigured) {
            console.warn('⚠️ Google Drive service not configured - cannot set credentials');
            return false;
        }
        
        if (!tokens) {
            throw new Error('No tokens provided');
        }
        try {
            this.oauth2Client.setCredentials(tokens);
            return true;
        } catch (error) {
            console.error('Error setting credentials:', error);
            throw new Error('Failed to set Google Drive credentials');
        }
    }

    async exportDocument(userId, content, fileName, mimeType) {
        if (!this.isConfigured) {
            console.warn('⚠️ Google Drive service not configured - cannot export document');
            return { success: false, error: 'Google Drive service not configured' };
        }
        
        try {
            const fileMetadata = {
                name: fileName,
                mimeType: mimeType
            };

            const media = {
                mimeType: mimeType,
                body: content
            };

            const file = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink'
            });

            // Save export record to database
            await pool.query(
                'INSERT INTO document_exports (user_id, file_id, file_name, export_date) VALUES ($1, $2, $3, NOW())',
                [userId, file.data.id, fileName]
            );

            return {
                fileId: file.data.id,
                webViewLink: file.data.webViewLink
            };
        } catch (error) {
            console.error('Google Drive export error:', error);
            throw new Error('Failed to export document to Google Drive');
        }
    }

    async shareDocument(fileId, email, role = 'reader') {
        if (!this.isConfigured) {
            console.warn('⚠️ Google Drive service not configured - cannot share document');
            return { success: false, error: 'Google Drive service not configured' };
        }
        
        try {
            await this.drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    type: 'user',
                    role: role,
                    emailAddress: email
                }
            });
            return true;
        } catch (error) {
            console.error('Google Drive sharing error:', error);
            throw new Error('Failed to share document');
        }
    }
}

export default GoogleDriveService;
