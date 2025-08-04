/**
 * AI Crawler Monitoring Middleware
 * Tracks AI bot visits and crawling activity
 * Created: July 28, 2025
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known AI crawler user agents
const AI_CRAWLERS = {
  'GPTBot': {
    name: 'OpenAI GPTBot',
    patterns: ['GPTBot'],
    company: 'OpenAI',
    purpose: 'Training ChatGPT and GPT models'
  },
  'ChatGPT-User': {
    name: 'ChatGPT User Agent',
    patterns: ['ChatGPT-User'],
    company: 'OpenAI',
    purpose: 'ChatGPT web browsing feature'
  },
  'CCBot': {
    name: 'Common Crawl Bot',
    patterns: ['CCBot'],
    company: 'Common Crawl',
    purpose: 'Web crawling for AI training datasets'
  },
  'Claude-Web': {
    name: 'Claude Web Crawler',
    patterns: ['Claude-Web', 'ClaudeBot'],
    company: 'Anthropic',
    purpose: 'Training Claude AI models'
  },
  'PerplexityBot': {
    name: 'Perplexity AI Bot',
    patterns: ['PerplexityBot'],
    company: 'Perplexity AI',
    purpose: 'Real-time web search and AI responses'
  },
  'YouBot': {
    name: 'You.com Bot',
    patterns: ['YouBot'],
    company: 'You.com',
    purpose: 'AI search and chat features'
  },
  'Google-Extended': {
    name: 'Google Extended',
    patterns: ['Google-Extended'],
    company: 'Google',
    purpose: 'Training Bard and other AI models'
  },
  'Bingbot': {
    name: 'Microsoft Bing Bot',
    patterns: ['bingbot'],
    company: 'Microsoft',
    purpose: 'Search indexing and AI training'
  },
  'ByteSpider': {
    name: 'ByteDance Spider',
    patterns: ['ByteSpider'],
    company: 'ByteDance',
    purpose: 'Training AI models for TikTok and other services'
  },
  'Applebot': {
    name: 'Apple Bot',
    patterns: ['Applebot'],
    company: 'Apple',
    purpose: 'Siri and Apple Intelligence training'
  },
  'Meta-ExternalAgent': {
    name: 'Meta AI Agent',
    patterns: ['Meta-ExternalAgent', 'facebookexternalhit'],
    company: 'Meta',
    purpose: 'Training Meta AI models'
  }
};

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data/ai-crawler-logs');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Get log file path for current date
function getLogFilePath() {
  const today = new Date().toISOString().split('T')[0];
  return path.join(dataDir, `ai-crawlers-${today}.jsonl`);
}

// Detect AI crawler from user agent
function detectAICrawler(userAgent) {
  if (!userAgent) return null;
  
  for (const [key, crawler] of Object.entries(AI_CRAWLERS)) {
    for (const pattern of crawler.patterns) {
      if (userAgent.includes(pattern)) {
        return { key, ...crawler };
      }
    }
  }
  return null;
}

// Log AI crawler visit
function logCrawlerVisit(req, crawler) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    crawler: crawler.key,
    crawlerName: crawler.name,
    company: crawler.company,
    purpose: crawler.purpose,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    referer: req.get('Referer') || null,
    host: req.get('Host'),
    acceptLanguage: req.get('Accept-Language') || null,
    accept: req.get('Accept') || null,
    responseTime: null // Will be set by response middleware
  };
  
  try {
    const logFile = getLogFilePath();
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Error logging AI crawler visit:', error);
  }
  
  return logEntry;
}

// Get crawler statistics
export function getCrawlerStats(days = 7) {
  const stats = {
    totalVisits: 0,
    uniqueCrawlers: new Set(),
    crawlerBreakdown: {},
    dailyStats: {},
    topPages: {},
    recentVisits: []
  };
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const logFile = path.join(dataDir, `ai-crawlers-${dateStr}.jsonl`);
      
      if (fs.existsSync(logFile)) {
        const logData = fs.readFileSync(logFile, 'utf8');
        const lines = logData.trim().split('\n').filter(line => line);
        
        stats.dailyStats[dateStr] = { date: dateStr, visits: 0, crawlers: new Set() };
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            stats.totalVisits++;
            stats.uniqueCrawlers.add(entry.crawler);
            
            // Crawler breakdown
            if (!stats.crawlerBreakdown[entry.crawler]) {
              stats.crawlerBreakdown[entry.crawler] = {
                name: entry.crawlerName,
                company: entry.company,
                visits: 0,
                lastSeen: entry.timestamp
              };
            }
            stats.crawlerBreakdown[entry.crawler].visits++;
            stats.crawlerBreakdown[entry.crawler].lastSeen = entry.timestamp;
            
            // Daily stats
            stats.dailyStats[dateStr].visits++;
            stats.dailyStats[dateStr].crawlers.add(entry.crawler);
            
            // Top pages
            if (!stats.topPages[entry.path]) {
              stats.topPages[entry.path] = 0;
            }
            stats.topPages[entry.path]++;
            
            // Recent visits (last 50)
            stats.recentVisits.push(entry);
            
          } catch (parseError) {
            console.error('Error parsing log entry:', parseError);
          }
        }
        
        // Convert Set to array for daily crawlers
        stats.dailyStats[dateStr].crawlers = Array.from(stats.dailyStats[dateStr].crawlers);
      }
    }
    
    // Convert sets to arrays and sort
    stats.uniqueCrawlers = Array.from(stats.uniqueCrawlers);
    stats.recentVisits = stats.recentVisits
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);
    
    // Sort top pages
    stats.topPages = Object.entries(stats.topPages)
      .sort(([,a], [,b]) => b - a)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    
  } catch (error) {
    console.error('Error calculating crawler stats:', error);
  }
  
  return stats;
}

// Export the middleware
export default function aiCrawlerMonitoring(req, res, next) {
  const userAgent = req.get('User-Agent');
  const crawler = detectAICrawler(userAgent);
  
  if (crawler) {
    req.aiCrawler = crawler;
    const logEntry = logCrawlerVisit(req, crawler);
    req.crawlerLogEntry = logEntry;
    
    console.log(`🤖 AI Crawler detected: ${crawler.name} (${crawler.company}) accessing ${req.path}`);
  }
  
  next();
}

// Export utility functions
export { AI_CRAWLERS, detectAICrawler, getLogFilePath };
