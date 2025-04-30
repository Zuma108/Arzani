/**
 * A2A Protocol Webhook Implementation
 * 
 * Handles sending push notifications to registered webhooks
 */

const axios = require('axios');
const { verifyWebhookSignature } = require('./security');
const config = require('../config');
const logger = require('../utils/logger');

class WebhookManager {
  constructor() {
    // Map of registered webhooks by taskId
    this.webhooks = new Map();
  }
  
  /**
   * Register a webhook URL for a task
   */
  registerWebhook(taskId, url, options = {}) {
    if (!taskId || !url) {
      throw new Error('Task ID and webhook URL are required');
    }
    
    // Store webhook configuration
    this.webhooks.set(taskId, {
      url,
      secret: options.secret || config.a2a.webhookSecret,
      metadata: options.metadata || {},
      events: options.events || ['status', 'message', 'artifact']
    });
    
    logger.info(`Registered webhook for task ${taskId}: ${url}`);
    return true;
  }
  
  /**
   * Send a webhook notification
   */
  async sendNotification(taskId, eventType, payload) {
    const webhook = this.webhooks.get(taskId);
    if (!webhook) {
      logger.debug(`No webhook registered for task ${taskId}`);
      return false;
    }
    
    // Skip if event type not in registered events
    if (!webhook.events.includes(eventType)) {
      logger.debug(`Webhook for task ${taskId} not subscribed to ${eventType}`);
      return false;
    }
    
    try {
      // Prepare notification payload
      const notificationPayload = {
        task_id: taskId,
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload,
        metadata: webhook.metadata
      };
      
      // Generate signature if secret exists
      let headers = {
        'Content-Type': 'application/json',
        'X-Arzani-Timestamp': notificationPayload.timestamp
      };
      
      if (webhook.secret) {
        const signature = this._generateSignature(
          JSON.stringify(notificationPayload),
          webhook.secret
        );
        headers['X-Arzani-Signature'] = signature;
      }
      
      // Send webhook request
      const response = await axios.post(webhook.url, notificationPayload, { headers });
      
      logger.info(`Webhook notification sent for task ${taskId}, event ${eventType}, status ${response.status}`);
      return true;
    } catch (error) {
      logger.error(`Webhook notification failed for task ${taskId}:`, error);
      return false;
    }
  }
  
  /**
   * Generate HMAC signature for webhook payload
   * @private
   */
  _generateSignature(payload, secret) {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
  
  /**
   * Verify an incoming webhook signature
   */
  verifySignature(signature, payload, secret) {
    return verifyWebhookSignature(signature, payload, secret);
  }
  
  /**
   * Unregister a webhook
   */
  unregisterWebhook(taskId) {
    if (this.webhooks.has(taskId)) {
      this.webhooks.delete(taskId);
      logger.info(`Unregistered webhook for task ${taskId}`);
      return true;
    }
    return false;
  }
}

// Singleton instance
const webhookManager = new WebhookManager();
module.exports = webhookManager;
