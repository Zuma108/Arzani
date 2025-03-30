import { getSession } from 'next-auth/react';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  // Check if method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Extract file data from request body
    const { fileType, fileContent, fileName } = req.body;

    if (!fileType || !fileContent) {
      return res.status(400).json({ error: 'Missing required file data' });
    }

    // Create a unique file name
    const key = `uploads/${session.user.id}/${uuidv4()}-${fileName || 'file'}`;
    
    // Decode base64 file content if needed
    let fileBuffer;
    if (fileContent.startsWith('data:')) {
      const base64Data = fileContent.split(',')[1];
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      fileBuffer = Buffer.from(fileContent, 'base64');
    }

    // Configure upload parameters
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: fileType,
    };

    // Upload to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Return success with file URL
    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return res.status(200).json({ 
      success: true, 
      fileUrl,
      key
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file to S3' });
  }
}
