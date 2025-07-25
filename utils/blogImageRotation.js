/**
 * Blog Image Rotation System
 * Manages the rotation of blog hero images from a predefined set
 */

// Available blog images in the figma design exports/images directory
const BLOG_IMAGES = [
  '/figma design exports/images/blog1.webp',
  '/figma design exports/images/blog2.webp',
  '/figma design exports/images/blog3.webp',
  '/figma design exports/images/blog4.webp',
  '/figma design exports/images/blog5.webp',
  '/figma design exports/images/blog6.webp'
];

/**
 * Get a blog image based on rotation index
 * @param {number} index - The rotation index (usually based on blog post ID or sequence)
 * @returns {string} - The image path
 */
export function getBlogImageByIndex(index) {
  const imageIndex = index % BLOG_IMAGES.length;
  return BLOG_IMAGES[imageIndex];
}

/**
 * Get a blog image based on blog post ID
 * @param {number} blogId - The blog post ID
 * @returns {string} - The image path
 */
export function getBlogImageById(blogId) {
  return getBlogImageByIndex(blogId - 1); // Subtract 1 to start from index 0
}

/**
 * Get a random blog image
 * @returns {string} - A random image path
 */
export function getRandomBlogImage() {
  const randomIndex = Math.floor(Math.random() * BLOG_IMAGES.length);
  return BLOG_IMAGES[randomIndex];
}

/**
 * Get next image in rotation sequence
 * @param {string} currentImage - Current image path
 * @returns {string} - Next image in sequence
 */
export function getNextBlogImage(currentImage) {
  const currentIndex = BLOG_IMAGES.indexOf(currentImage);
  if (currentIndex === -1) {
    return BLOG_IMAGES[0]; // Return first image if current not found
  }
  const nextIndex = (currentIndex + 1) % BLOG_IMAGES.length;
  return BLOG_IMAGES[nextIndex];
}

/**
 * Get blog image for new post based on existing posts count
 * @param {number} totalPosts - Total number of existing posts
 * @returns {string} - The image path for the new post
 */
export function getBlogImageForNewPost(totalPosts) {
  return getBlogImageByIndex(totalPosts);
}

/**
 * Get all available blog images
 * @returns {Array<string>} - Array of all blog image paths
 */
export function getAllBlogImages() {
  return [...BLOG_IMAGES];
}

/**
 * Validate if an image path is a valid blog image
 * @param {string} imagePath - The image path to validate
 * @returns {boolean} - True if valid blog image
 */
export function isValidBlogImage(imagePath) {
  return BLOG_IMAGES.includes(imagePath);
}

export default {
  getBlogImageByIndex,
  getBlogImageById,
  getRandomBlogImage,
  getNextBlogImage,
  getBlogImageForNewPost,
  getAllBlogImages,
  isValidBlogImage,
  BLOG_IMAGES
};
