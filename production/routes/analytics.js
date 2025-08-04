import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ABTestAnalytics from '../controllers/ABTestAnalytics.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize A/B test analytics controller
const abTestAnalytics = new ABTestAnalytics();

// Store analytics data (fallback file system for backup)
const ANALYTICS_DIR = path.join(__dirname, '../../data/analytics');
const AB_TEST_FILE = path.join(ANALYTICS_DIR, 'ab-test-data.jsonl');

// Ensure analytics directory exists
async function ensureAnalyticsDir() {
    try {
        await fs.mkdir(ANALYTICS_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create analytics directory:', error);
    }
}

// Initialize
ensureAnalyticsDir();

/**
 * POST /api/analytics/ab-test
 * Collect A/B testing analytics data using database
 */
router.post('/ab-test', async (req, res) => {
    try {
        const { sessionId, userId, variant, events, metadata, routingMethod } = req.body;
        
        // Validate required fields
        if (!sessionId || !variant || !events) {
            return res.status(400).json({ 
                error: 'Missing required fields: sessionId, variant, events' 
            });
        }

        // Add server-side metadata
        const serverMetadata = {
            serverTimestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer'),
            ...metadata
        };

        // Record session assignment if not already recorded
        await abTestAnalytics.recordSessionAssignment({
            sessionId,
            userId: userId || null,
            variant,
            ipAddress: serverMetadata.ip,
            userAgent: serverMetadata.userAgent,
            routingMethod: routingMethod || 'a_b_testing'
        });

        // Process and record each event
        const results = [];
        for (const event of events) {
            // Ensure event has a valid type, default to 'page_view' if missing
            const eventType = event.type || 'page_view';
            
            const eventResult = await abTestAnalytics.recordEvent({
                sessionId,
                userId: userId || null,
                eventType: eventType,
                variant,
                pageUrl: event.page || req.get('Referer'),
                elementClicked: event.element,
                eventData: {
                    ...event.data,
                    clientTimestamp: event.timestamp,
                    serverMetadata
                },
                ipAddress: serverMetadata.ip,
                userAgent: serverMetadata.userAgent,
                routingMethod: routingMethod || 'a_b_testing'
            });
            results.push(eventResult);
        }

        // Also store in file for backup
        const processedEvents = events.map(event => ({
            ...event,
            serverTimestamp: new Date().toISOString(),
            sessionId,
            userId,
            variant,
            routingMethod,
            serverMetadata
        }));

        const dataLines = processedEvents.map(event => JSON.stringify(event)).join('\n') + '\n';
        await fs.appendFile(AB_TEST_FILE, dataLines);

        // Log for immediate monitoring
        console.log(`📊 AB Test Data: ${variant} | ${events.length} events | Session: ${sessionId.substring(0, 8)}... | Method: ${routingMethod || 'a_b_testing'}`);
        
        // Send realtime updates if needed
        if (global.io) {
            global.io.emit('ab-test-data', {
                variant,
                eventCount: events.length,
                routingMethod: routingMethod || 'a_b_testing',
                timestamp: new Date().toISOString()
            });
        }

        res.json({ 
            success: true, 
            eventCount: events.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AB Test Analytics Error:', error);
        res.status(500).json({ 
            error: 'Failed to store analytics data',
            details: error.message 
        });
    }
});

/**
 * GET /api/analytics/ab-test/report
 * Generate A/B testing report using database
 */
router.get('/ab-test/report', async (req, res) => {
    try {
        const { startDate, endDate, variant, format } = req.query;
        
        // Build analytics options
        const options = {
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            variant: variant || null,
            detailed: true,
            includeEvents: format === 'detailed'
        };
        
        // Get analytics from database
        const analytics = await abTestAnalytics.getAnalytics(options);
        
        // Format analytics summary into the structure the dashboard expects
        const variantData = {};
        analytics.summary.forEach(variant => {
            variantData[variant.variant] = {
                sessions: parseInt(variant.total_sessions) || 0,
                pageViews: parseInt(variant.total_page_views) || 0,
                conversions: parseInt(variant.total_conversions) || 0,
                conversionRate: parseFloat(variant.avg_conversion_rate) || 0,
                uniqueUsers: parseInt(variant.total_unique_users) || 0,
                bounceRate: parseFloat(variant.avg_bounce_rate) || 0
            };
        });

        // Create conversions structure expected by dashboard
        const conversions = {
            seller_first: {
                totalSessions: variantData.seller_first?.sessions || 0,
                overallConversionRate: variantData.seller_first?.conversionRate || 0,
                conversions: {
                    seller_cta_click: { rate: 0 },
                    form_submission: { rate: 0 }
                }
            },
            buyer_first: {
                totalSessions: variantData.buyer_first?.sessions || 0,
                overallConversionRate: variantData.buyer_first?.conversionRate || 0,
                conversions: {
                    seller_cta_click: { rate: 0 },
                    form_submission: { rate: 0 }
                }
            }
        };

        // Create engagement structure expected by dashboard
        const engagement = {
            seller_first: {
                avgTimeOnPage: 60, // Default placeholder
                avgScrollDepth: variantData.seller_first?.bounceRate ? (100 - variantData.seller_first.bounceRate) : 50,
                avgPageViews: variantData.seller_first?.pageViews || 0,
                avgCTAClicks: 0,
                bounceRate: variantData.seller_first?.bounceRate || 0
            },
            buyer_first: {
                avgTimeOnPage: 60, // Default placeholder
                avgScrollDepth: variantData.buyer_first?.bounceRate ? (100 - variantData.buyer_first.bounceRate) : 50,
                avgPageViews: variantData.buyer_first?.pageViews || 0,
                avgCTAClicks: 0,
                bounceRate: variantData.buyer_first?.bounceRate || 0
            }
        };

        // Format as report
        const report = {
            reportGenerated: new Date().toISOString(),
            timeframe: {
                start: options.startDate?.toISOString() || 'All time',
                end: options.endDate?.toISOString() || 'Now',
                variant: variant || 'All variants'
            },
            summary: analytics.summary,
            overview: {
                variants: variantData
            },
            conversions: conversions,
            engagement: engagement,
            statistical_significance: analytics.significance || { 
                confidence: 0, 
                significant: false, 
                message: 'Insufficient data',
                lift: 0
            },
            performance: {
                conversionRates: analytics.conversionRates,
                significanceTest: analytics.significanceTest,
                confidence: analytics.significance
            },
            trends: analytics.hourlyBreakdown || [],
            events: analytics.events || [],
            // Add placeholder data for other dashboard features
            funnel_analysis: {
                seller_first: {
                    page_views: variantData.seller_first?.pageViews || 0,
                    cta_clicks: 0,
                    form_starts: 0,
                    conversions: variantData.seller_first?.conversions || 0
                },
                buyer_first: {
                    page_views: variantData.buyer_first?.pageViews || 0,
                    cta_clicks: 0,
                    form_starts: 0,
                    conversions: variantData.buyer_first?.conversions || 0
                }
            },
            cta_performance: {
                seller_first: { top_ctas: [] },
                buyer_first: { top_ctas: [] }
            }
        };

        res.json({
            success: true,
            report
        });

    } catch (error) {
        console.error('Report Generation Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate report',
            details: error.message 
        });
    }
});

/**
 * GET /api/analytics/ab-test/dashboard
 * Real-time dashboard data
 */
router.get('/ab-test/dashboard', async (req, res) => {
    try {
        // Get real-time analytics from database (last 24 hours)
        const analytics = await abTestAnalytics.getAnalytics({
            timeframe: '24h',
            detailed: true
        });
        
        // Safely calculate aggregated summary metrics
        const summaryMetrics = {
            total_sessions: 0,
            total_conversions: 0,
            total_page_views: 0,
            unique_users: 0
        };

        if (analytics.summary && Array.isArray(analytics.summary)) {
            analytics.summary.forEach(row => {
                summaryMetrics.total_sessions += parseInt(row.total_sessions) || 0;
                summaryMetrics.total_conversions += parseInt(row.total_conversions) || 0;
                summaryMetrics.total_page_views += parseInt(row.total_page_views) || 0;
                summaryMetrics.unique_users += parseInt(row.total_unique_users) || 0;
            });
        }

        // Calculate overall conversion rate safely
        const overall_conversion_rate = summaryMetrics.total_sessions > 0 
            ? (summaryMetrics.total_conversions / summaryMetrics.total_sessions * 100) 
            : 0;

        // Determine best performing variant safely
        let best_performing_variant = 'tie';
        if (analytics.summary && analytics.summary.length >= 2) {
            const sellerFirst = analytics.summary.find(v => v.variant === 'seller_first');
            const buyerFirst = analytics.summary.find(v => v.variant === 'buyer_first');
            
            if (sellerFirst && buyerFirst) {
                const sellerRate = parseFloat(sellerFirst.conversion_rate) || 0;
                const buyerRate = parseFloat(buyerFirst.conversion_rate) || 0;
                
                if (sellerRate > buyerRate) {
                    best_performing_variant = 'seller_first';
                } else if (buyerRate > sellerRate) {
                    best_performing_variant = 'buyer_first';
                }
            } else if (sellerFirst) {
                best_performing_variant = 'seller_first';
            } else if (buyerFirst) {
                best_performing_variant = 'buyer_first';
            }
        } else if (analytics.summary && analytics.summary.length === 1) {
            best_performing_variant = analytics.summary[0].variant;
        }

        // Get real-time activity (last hour)
        let realtimeActivity = { active_sessions: 0 };
        try {
            const lastHourAnalytics = await abTestAnalytics.getAnalytics({
                timeframe: '1h',
                detailed: false
            });
            
            if (lastHourAnalytics.summary) {
                realtimeActivity.active_sessions = lastHourAnalytics.summary.reduce((total, row) => {
                    return total + (parseInt(row.total_sessions) || 0);
                }, 0);
            }
        } catch (hourError) {
            console.warn('Error getting hourly data:', hourError);
        }

        // Build dashboard response with all necessary data
        const dashboard = {
            ...analytics,
            statistical_significance: analytics.significance || { 
                confidence: 0, 
                significant: false, 
                message: 'Insufficient data',
                lift: 0
            },
            realtime: {
                active_sessions: realtimeActivity.active_sessions,
                conversion_rate: Math.round(overall_conversion_rate * 100) / 100,
                performance_winner: best_performing_variant,
                significance_level: analytics.significance?.confidence || 0,
                total_sessions_24h: summaryMetrics.total_sessions,
                total_conversions_24h: summaryMetrics.total_conversions
            },
            realtimeMetrics: {
                activeSessions: realtimeActivity.active_sessions,
                conversionRate: Math.round(overall_conversion_rate * 100) / 100,
                performanceWinner: best_performing_variant,
                significanceLevel: analytics.significance?.confidence || 0
            },
            hourlyData: analytics.hourlyBreakdown || analytics.daily || [],
            variantComparison: analytics.summary || [],
            alerts: analytics.alerts || [],
            summary: {
                total_sessions: summaryMetrics.total_sessions,
                total_conversions: summaryMetrics.total_conversions,
                total_page_views: summaryMetrics.total_page_views,
                unique_users: summaryMetrics.unique_users,
                overall_conversion_rate: Math.round(overall_conversion_rate * 100) / 100,
                best_performing_variant: best_performing_variant
            }
        };
        
        res.json({
            success: true,
            lastUpdated: new Date().toISOString(),
            timeframe: '24h',
            dashboard: dashboard
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate dashboard data',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

function generateABTestReport(events) {
    const sellerFirstEvents = events.filter(e => e.variant === 'seller_first');
    const buyerFirstEvents = events.filter(e => e.variant === 'buyer_first');

    return {
        overview: {
            totalEvents: events.length,
            sellerFirstEvents: sellerFirstEvents.length,
            buyerFirstEvents: buyerFirstEvents.length,
            variants: {
                seller_first: {
                    sessions: new Set(sellerFirstEvents.map(e => e.sessionId)).size,
                    users: new Set(sellerFirstEvents.map(e => e.userId)).size
                },
                buyer_first: {
                    sessions: new Set(buyerFirstEvents.map(e => e.sessionId)).size,
                    users: new Set(buyerFirstEvents.map(e => e.userId)).size
                }
            }
        },
        
        conversions: {
            seller_first: analyzeConversions(sellerFirstEvents),
            buyer_first: analyzeConversions(buyerFirstEvents)
        },
        
        engagement: {
            seller_first: analyzeEngagement(sellerFirstEvents),
            buyer_first: analyzeEngagement(buyerFirstEvents)
        },
        
        cta_performance: {
            seller_first: analyzeCTAPerformance(sellerFirstEvents),
            buyer_first: analyzeCTAPerformance(buyerFirstEvents)
        },
        
        funnel_analysis: {
            seller_first: analyzeFunnel(sellerFirstEvents),
            buyer_first: analyzeFunnel(buyerFirstEvents)
        },
        
        statistical_significance: calculateStatisticalSignificance(sellerFirstEvents, buyerFirstEvents)
    };
}

function analyzeConversions(events) {
    const sessions = new Set(events.map(e => e.sessionId));
    const totalSessions = sessions.size;
    
    const conversionEvents = [
        'seller_cta_click',
        'buyer_cta_click', 
        'form_submission',
        'signup_completed'
    ];
    
    const conversions = {};
    conversionEvents.forEach(eventType => {
        const convertedSessions = new Set(
            events.filter(e => e.event === eventType).map(e => e.sessionId)
        );
        conversions[eventType] = {
            count: convertedSessions.size,
            rate: totalSessions > 0 ? (convertedSessions.size / totalSessions) * 100 : 0
        };
    });
    
    return {
        totalSessions,
        conversions,
        overallConversionRate: calculateOverallConversion(events)
    };
}

function analyzeEngagement(events) {
    const timeOnPageEvents = events.filter(e => e.event === 'page_exit');
    const scrollEvents = events.filter(e => e.event === 'scroll_milestone');
    
    const avgTimeOnPage = timeOnPageEvents.length > 0 
        ? timeOnPageEvents.reduce((sum, e) => sum + (e.properties.timeOnPage || 0), 0) / timeOnPageEvents.length
        : 0;
        
    const avgScrollDepth = timeOnPageEvents.length > 0
        ? timeOnPageEvents.reduce((sum, e) => sum + (e.properties.maxScrollDepth || 0), 0) / timeOnPageEvents.length
        : 0;
    
    return {
        avgTimeOnPage: Math.round(avgTimeOnPage / 1000), // Convert to seconds
        avgScrollDepth: Math.round(avgScrollDepth),
        scrollMilestones: {
            '25%': scrollEvents.filter(e => e.properties.depth === 25).length,
            '50%': scrollEvents.filter(e => e.properties.depth === 50).length,
            '75%': scrollEvents.filter(e => e.properties.depth === 75).length,
            '100%': scrollEvents.filter(e => e.properties.depth === 100).length
        }
    };
}

function analyzeCTAPerformance(events) {
    const ctaClicks = events.filter(e => 
        e.event === 'seller_cta_click' || 
        e.event === 'buyer_cta_click' ||
        e.event === 'cta_click'
    );
    
    const totalSessions = new Set(events.map(e => e.sessionId)).size;
    const ctaPerformance = {};
    
    ctaClicks.forEach(event => {
        const ctaText = event.properties?.ctaText || 'Unknown CTA';
        const ctaLocation = event.properties?.ctaLocation || 'unknown';
        
        if (!ctaPerformance[ctaText]) {
            ctaPerformance[ctaText] = {
                clicks: 0,
                sessions: new Set(),
                locations: {},
                avgTimeToClick: 0
            };
        }
        
        ctaPerformance[ctaText].clicks++;
        ctaPerformance[ctaText].sessions.add(event.sessionId);
        ctaPerformance[ctaText].locations[ctaLocation] = 
            (ctaPerformance[ctaText].locations[ctaLocation] || 0) + 1;
    });
    
    // Convert to array format with calculated metrics
    const topCTAs = Object.entries(ctaPerformance).map(([ctaText, data]) => ({
        cta_text: ctaText,
        clicks: data.clicks,
        unique_sessions: data.sessions.size,
        conversion_rate: totalSessions > 0 ? (data.sessions.size / totalSessions) : 0,
        location: Object.keys(data.locations)[0] || 'unknown', // Primary location
        locations: data.locations
    })).sort((a, b) => b.clicks - a.clicks);
    
    return {
        total_cta_clicks: ctaClicks.length,
        unique_cta_sessions: new Set(ctaClicks.map(e => e.sessionId)).size,
        cta_conversion_rate: totalSessions > 0 ? 
            (new Set(ctaClicks.map(e => e.sessionId)).size / totalSessions) * 100 : 0,
        top_ctas: topCTAs.slice(0, 10)
    };
}

function analyzeFunnel(events) {
    const sessions = new Set(events.map(e => e.sessionId));
    const totalSessions = sessions.size;
    
    // Define funnel steps with actual counts
    const pageViews = new Set(
        events.filter(e => e.event === 'page_view').map(e => e.sessionId)
    ).size;
    
    const ctaClicks = new Set(
        events.filter(e => 
            e.event === 'seller_cta_click' || 
            e.event === 'buyer_cta_click' ||
            e.event === 'cta_click'
        ).map(e => e.sessionId)
    ).size;
    
    const formStarts = new Set(
        events.filter(e => e.event === 'form_started').map(e => e.sessionId)
    ).size;
    
    const conversions = new Set(
        events.filter(e => 
            e.event === 'form_submission' || 
            e.event === 'signup_completed'
        ).map(e => e.sessionId)
    ).size;
    
    return {
        page_views: pageViews,
        cta_clicks: ctaClicks,
        form_starts: formStarts,
        conversions: conversions,
        drop_off: {
            page_to_cta: pageViews > 0 ? ((pageViews - ctaClicks) / pageViews) * 100 : 0,
            cta_to_form: ctaClicks > 0 ? ((ctaClicks - formStarts) / ctaClicks) * 100 : 0,
            form_to_conversion: formStarts > 0 ? ((formStarts - conversions) / formStarts) * 100 : 0
        }
    };
}

function calculateOverallConversion(events) {
    const totalSessions = new Set(events.map(e => e.sessionId)).size;
    const conversionEvents = events.filter(e => 
        e.event === 'form_submission' || e.event === 'signup_completed'
    );
    const convertedSessions = new Set(conversionEvents.map(e => e.sessionId)).size;
    
    return totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0;
}

function calculateStatisticalSignificance(variantA, variantB) {
    const sessionsA = new Set(variantA.map(e => e.sessionId)).size;
    const sessionsB = new Set(variantB.map(e => e.sessionId)).size;
    
    const conversionsA = new Set(
        variantA.filter(e => e.event === 'form_submission').map(e => e.sessionId)
    ).size;
    const conversionsB = new Set(
        variantB.filter(e => e.event === 'form_submission').map(e => e.sessionId)
    ).size;
    
    if (sessionsA === 0 || sessionsB === 0) {
        return { significant: false, confidence: 0, message: 'Insufficient data' };
    }
    
    const rateA = conversionsA / sessionsA;
    const rateB = conversionsB / sessionsB;
    
    // Simple z-test for proportions
    const pooledRate = (conversionsA + conversionsB) / (sessionsA + sessionsB);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/sessionsA + 1/sessionsB));
    const zScore = Math.abs(rateA - rateB) / standardError;
    
    // Convert z-score to confidence level
    const confidence = (1 - 2 * (1 - normalCDF(Math.abs(zScore)))) * 100;
    
    return {
        significant: confidence > 95,
        confidence: Math.round(confidence * 100) / 100,
        zScore: Math.round(zScore * 1000) / 1000,
        lift: sessionsB > 0 ? Math.round(((rateA - rateB) / rateB) * 10000) / 100 : 0,
        message: confidence > 95 ? 'Statistically significant' : 'Not yet significant'
    };
}

function normalCDF(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
}

function generateDashboardData(events) {
    const last1h = events.filter(e => 
        new Date(e.serverTimestamp) >= new Date(Date.now() - 60 * 60 * 1000)
    );
    
    return {
        realtime: {
            events_last_hour: last1h.length,
            active_sessions: new Set(last1h.map(e => e.sessionId)).size,
            current_split: {
                seller_first: events.filter(e => e.variant === 'seller_first').length,
                buyer_first: events.filter(e => e.variant === 'buyer_first').length
            }
        },
        
        trending: {
            top_events: getTopEvents(events),
            conversion_rate_trend: getConversionTrend(events),
            popular_ctas: getPopularCTAs(events)
        },
        
        alerts: generateAlerts(events)
    };
}

function getTopEvents(events) {
    const eventCounts = {};
    events.forEach(e => {
        eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
    });
    
    return Object.entries(eventCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([event, count]) => ({ event, count }));
}

function getConversionTrend(events) {
    // Group by hour for the last 24 hours
    const hourlyData = {};
    
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(Date.now() - i * 60 * 60 * 1000);
        const hourKey = hour.toISOString().substring(0, 13) + ':00:00.000Z';
        hourlyData[hourKey] = { 
            seller_first: { sessions: 0, conversions: 0 },
            buyer_first: { sessions: 0, conversions: 0 }
        };
    }
    
    events.forEach(event => {
        const hourKey = event.serverTimestamp.substring(0, 13) + ':00:00.000Z';
        if (hourlyData[hourKey]) {
            const variant = event.variant || 'unknown';
            if (variant === 'seller_first' || variant === 'buyer_first') {
                if (event.event === 'page_view') {
                    hourlyData[hourKey][variant].sessions++;
                }
                if (event.event === 'form_submission' || event.event === 'seller_cta_click' || event.event === 'buyer_cta_click') {
                    hourlyData[hourKey][variant].conversions++;
                }
            }
        }
    });
    
    return Object.entries(hourlyData).map(([hour, data]) => ({
        hour: hour.substring(11, 16), // HH:MM format
        seller_first_sessions: data.seller_first.sessions,
        seller_first_conversions: data.seller_first.conversions,
        seller_first_rate: data.seller_first.sessions > 0 ? 
            (data.seller_first.conversions / data.seller_first.sessions) * 100 : 0,
        buyer_first_sessions: data.buyer_first.sessions,
        buyer_first_conversions: data.buyer_first.conversions,
        buyer_first_rate: data.buyer_first.sessions > 0 ? 
            (data.buyer_first.conversions / data.buyer_first.sessions) * 100 : 0
    }));
}

function getPopularCTAs(events) {
    const ctaClicks = events.filter(e => 
        e.event === 'seller_cta_click' || e.event === 'buyer_cta_click'
    );
    
    const ctaCounts = {};
    ctaClicks.forEach(e => {
        const cta = e.properties.ctaText || 'Unknown CTA';
        ctaCounts[cta] = (ctaCounts[cta] || 0) + 1;
    });
    
    return Object.entries(ctaCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([cta, clicks]) => ({ cta, clicks }));
}

function generateAlerts(events) {
    const alerts = [];
    
    // Check for low conversion rates
    const sessions = new Set(events.map(e => e.sessionId)).size;
    const conversions = new Set(
        events.filter(e => e.event === 'form_submission').map(e => e.sessionId)
    ).size;
    
    const conversionRate = sessions > 0 ? (conversions / sessions) * 100 : 0;
    
    if (sessions > 20 && conversionRate < 2) {
        alerts.push({
            type: 'warning',
            message: `Low conversion rate detected: ${conversionRate.toFixed(2)}%`,
            action: 'Review CTA performance and form optimization'
        });
    }
    
    // Check for unusual traffic patterns
    const last1h = events.filter(e => 
        new Date(e.serverTimestamp) >= new Date(Date.now() - 60 * 60 * 1000)
    );
    
    if (last1h.length > 100) {
        alerts.push({
            type: 'info',
            message: `High traffic detected: ${last1h.length} events in last hour`,
            action: 'Monitor server performance'
        });
    }
    
    return alerts;
}

export default router;
