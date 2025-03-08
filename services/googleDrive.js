import { google } from '@googleapis/drive';

export async function uploadToGoogleDrive(auth, fileContent, fileName) {
    const drive = google.drive({ version: 'v3', auth });
    
    const fileMetadata = {
        name: fileName,
        mimeType: 'application/vnd.google-apps.spreadsheet',
    };

    const media = {
        mimeType: 'text/csv',
        body: fileContent
    };

    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });
        
        return {
            fileId: file.data.id,
            webViewLink: file.data.webViewLink
        };
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
}
