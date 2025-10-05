import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const router = express.Router();

// Website validation endpoint
router.post('/validate-website', async (req, res) => {
    try {
        console.log('Website validation request received:', req.body);
        const { url } = req.body;
        
        if (!url) {
            console.log('Website validation: URL is required');
            return res.status(400).json({
                success: false,
                message: 'URL is required'
            });
        }
        
        let normalizedUrl = url.trim();
        
        // Validate URL format
        try {
            const parsedUrl = new URL(normalizedUrl);
            
            // Check if it's a valid business domain (not social media, etc.)
            const domain = parsedUrl.hostname.toLowerCase();
            const socialMediaDomains = [
                'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
                'youtube.com', 'tiktok.com', 'snapchat.com', 'pinterest.com',
                'reddit.com', 'tumblr.com', 'medium.com', 'blogger.com',
                'wordpress.com', 'wix.com', 'squarespace.com'
            ];
            
            const isSocialMedia = socialMediaDomains.some(social => 
                domain.includes(social) || domain.endsWith(social)
            );
            
            if (isSocialMedia) {
                return res.json({
                    success: false,
                    message: 'Please enter your company website, not a social media profile'
                });
            }
            
        } catch (urlError) {
            return res.json({
                success: false,
                message: 'Please enter a valid website URL'
            });
        }
        
        // Fetch website data
        const response = await axios.get(normalizedUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept redirects
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract website information
        const websiteData = {
            url: normalizedUrl,
            statusCode: response.status,
            hasSSL: normalizedUrl.startsWith('https://'),
            title: $('title').text().trim() || $('h1').first().text().trim() || '',
            description: $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || 
                        $('p').first().text().trim().substring(0, 150) || '',
            favicon: $('link[rel="icon"]').attr('href') || 
                    $('link[rel="shortcut icon"]').attr('href') || 
                    `${new URL(normalizedUrl).origin}/favicon.ico`,
            companyName: extractCompanyName($, normalizedUrl)
        };
        
        // Validate that it looks like a business website
        const businessScore = calculateBusinessScore($, websiteData);
        
        if (businessScore < 3) {
            return res.json({
                success: false,
                message: 'This website may not be a business website. Please verify the URL.'
            });
        }
        
        res.json({
            success: true,
            data: websiteData
        });
        
    } catch (error) {
        console.error('Website validation error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: req.body?.url
        });
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return res.json({
                success: false,
                message: 'Website not found or unreachable. Please check the URL.'
            });
        }
        
        if (error.code === 'ETIMEDOUT') {
            return res.json({
                success: false,
                message: 'Website took too long to respond. Please try again.'
            });
        }
        
        if (error.response?.status === 404) {
            return res.json({
                success: false,
                message: 'Website not found (404). Please check the URL.'
            });
        }
        
        res.json({
            success: false,
            message: 'Unable to verify website. You can continue with your setup.'
        });
    }
});

function extractCompanyName($, url) {
    // Try multiple methods to extract company name
    const methods = [
        () => $('meta[property="og:site_name"]').attr('content'),
        () => $('meta[name="application-name"]').attr('content'),
        () => $('.company-name, .brand-name, .logo-text').first().text(),
        () => $('title').text().split('|')[0].split('-')[0].trim(),
        () => {
            const domain = new URL(url).hostname.replace('www.', '');
            return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
        }
    ];
    
    for (const method of methods) {
        try {
            const result = method();
            if (result && result.length > 2 && result.length < 100) {
                return result.trim();
            }
        } catch (e) {
            // Continue to next method
        }
    }
    
    return null;
}

function calculateBusinessScore($, websiteData) {
    let score = 0;
    
    // Check for business indicators
    const businessKeywords = [
        'company', 'business', 'services', 'solutions', 'about us', 'contact us',
        'products', 'team', 'careers', 'industries', 'clients', 'customers'
    ];
    
    const pageText = $('body').text().toLowerCase();
    const hasBusinessKeywords = businessKeywords.some(keyword => 
        pageText.includes(keyword)
    );
    
    if (hasBusinessKeywords) score += 2;
    if ($('nav, .nav, .navigation').length > 0) score += 1;
    if ($('.about, #about, [href*="about"]').length > 0) score += 1;
    if ($('.contact, #contact, [href*="contact"]').length > 0) score += 1;
    if ($('.services, #services, [href*="services"]').length > 0) score += 1;
    if (websiteData.hasSSL) score += 1;
    if (websiteData.description && websiteData.description.length > 50) score += 1;
    
    return score;
}

export default router;