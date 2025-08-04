import fs from 'fs';
import path from 'path';

export const cleanupUnusedImages = async (pool) => {
    try {
        // Get all image filenames from database
        const result = await pool.query('SELECT images FROM businesses');
        const usedImages = new Set(result.rows.flatMap(row => row.images || []));

        // Get all files in uploads directory
        const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
        const files = fs.readdirSync(uploadsDir);

        // Remove unused files
        files.forEach(file => {
            if (!usedImages.has(file) && file.startsWith('business-')) {
                fs.unlink(path.join(uploadsDir, file), err => {
                    if (err) console.error('Error deleting unused image:', err);
                });
            }
        });
    } catch (error) {
        console.error('Error cleaning up images:', error);
    }
};

export const validateImagePath = (filename) => {
    return /^business-[\w-]+\.(jpg|jpeg|png)$/i.test(filename);
};
