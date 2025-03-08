import BusinessMetricsService from './services/businessMetricsService.js';
import RateLimiter from './utils/rateLimit.js';

const metricsService = new BusinessMetricsService(pool);
const rateLimiter = new RateLimiter();

wss.on('connection', async (ws) => {
    const clientId = uuidv4();
    ws.clientId = clientId;

    ws.on('message', async (message) => {
        if (!rateLimiter.isAllowed(ws.clientId)) {
            ws.send(JSON.stringify({
                type: 'error',
                text: 'Too many requests. Please wait a moment.'
            }));
            return;
        }

        try {
            const data = JSON.parse(message);
            
            if (data.type === 'business_query') {
                const metrics = metricsService.getAllIndustryMetrics();
                ws.send(JSON.stringify({
                    type: 'metrics',
                    metrics: metrics,
                    timestamp: Date.now()
                }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
});