export function handleImageError(img) {
    img.onerror = null; // Prevent infinite loop
    img.src = '/images/default-business.jpg';
}

export function getImageUrl(imageSource) {
    if (!imageSource) return '/images/default-business.jpg';
    
    try {
        if (imageSource.startsWith('s3://')) {
            const path = imageSource.slice(5);
            return `https://${awsConfig.bucketName}.s3.${awsConfig.region}.amazonaws.com/${path}`;
        }
        return imageSource;
    } catch (error) {
        console.error('Error processing image URL:', error);
        return '/images/default-business.jpg';
    }
}
