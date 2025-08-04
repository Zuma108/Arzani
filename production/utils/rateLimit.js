class RateLimiter {
    constructor(windowMs = 60000, maxRequests = 30) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.clients = new Map();
    }

    isAllowed(clientId) {
        const now = Date.now();
        const clientData = this.clients.get(clientId) || { count: 0, windowStart: now };

        if (now - clientData.windowStart > this.windowMs) {
            clientData.count = 1;
            clientData.windowStart = now;
        } else if (clientData.count >= this.maxRequests) {
            return false;
        } else {
            clientData.count++;
        }

        this.clients.set(clientId, clientData);
        return true;
    }
}

export default RateLimiter;