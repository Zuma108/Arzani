# Stripe Webhook Configuration for Freemium Token System

## Overview
This document outlines the Stripe webhook setup for the Arzani Marketplace freemium token system. The webhook handles token purchases and payment processing automatically.

## Webhook Configuration Details

### Stripe Dashboard Settings
- **Webhook URL**: `https://arzani.co.uk/webhook`
- **Destination ID**: `we_1RnG2KLbWafSwHQXU7ahFlEP`
- **API Version**: `2024-12-18.acacia`
- **Signing Secret**: `whsec_FaLVKfpv6IvNcSSSfS2MbEdTVqVMkXkv`

### Events Configured
✅ `checkout.session.completed` - Token purchase completion
✅ `payment_intent.succeeded` - Payment confirmation  
✅ `payment_intent.payment_failed` - Payment failure handling

## Environment Variables Required

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_[your_publishable_key]
STRIPE_SECRET_KEY=sk_test_[your_secret_key]

# Webhook Configuration
STRIPE_WEBHOOK_SECRET=whsec_FaLVKfpv6IvNcSSSfS2MbEdTVqVMkXkv

# Frontend URLs (for success/cancel redirects)
FRONTEND_URL=https://arzani.co.uk

# Production Keys (when ready)
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_[your_live_publishable_key]
STRIPE_SECRET_KEY_LIVE=sk_live_[your_live_secret_key]
STRIPE_WEBHOOK_SECRET_LIVE=whsec_[your_live_webhook_secret]
```

## How the Webhook Flow Works

### 1. User Initiates Purchase
```javascript
// User clicks "Buy Tokens" -> API creates Stripe checkout session
POST /api/tokens/purchase
{
  "packageId": 2,  // Professional pack
}

// Returns checkout URL and session ID
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

### 2. User Completes Payment
- User enters payment details on Stripe checkout page
- Stripe processes payment
- On success, Stripe sends `checkout.session.completed` webhook

### 3. Webhook Processes Token Addition
```javascript
// Webhook receives session data with metadata:
{
  "metadata": {
    "user_id": "123",
    "token_amount": "25",
    "bonus_tokens": "5", 
    "package_type": "professional",
    "total_tokens": "30"
  }
}

// Webhook automatically:
// 1. Adds tokens to user account
// 2. Records transaction in audit trail
// 3. Logs successful processing
// 4. Returns 200 OK to Stripe
```

### 4. User Sees Updated Balance
- Frontend token widget automatically refreshes
- User can immediately use purchased tokens
- Transaction appears in user's token history

## Database Tables Used

### `stripe_webhook_events`
Tracks all webhook events for idempotency and debugging:
```sql
CREATE TABLE stripe_webhook_events (
    stripe_event_id VARCHAR(255) UNIQUE,  -- Stripe event ID
    event_type VARCHAR(100),              -- checkout.session.completed
    processing_status VARCHAR(50),        -- success/failed/retry
    user_id INTEGER,                      -- User who purchased
    tokens_added INTEGER,                 -- Tokens added to account
    processed_at TIMESTAMP,               -- When processed
    raw_data JSONB                        -- Full Stripe event data
);
```

### `failed_token_purchases`
Logs failed purchases for manual review:
```sql 
CREATE TABLE failed_token_purchases (
    session_id VARCHAR(255),              -- Stripe session ID
    user_id INTEGER,                      -- User attempting purchase
    error_message TEXT,                   -- Error details
    tokens_intended INTEGER,              -- Tokens they should have received
    amount_intended INTEGER,              -- Amount they paid
    resolved BOOLEAN DEFAULT false       -- Whether manually fixed
);
```

### `payment_disputes`
Tracks chargebacks and disputes:
```sql
CREATE TABLE payment_disputes (
    stripe_charge_id VARCHAR(255),       -- Disputed charge
    user_id INTEGER,                     -- User involved
    amount INTEGER,                      -- Disputed amount
    tokens_to_deduct INTEGER,            -- Tokens to remove if dispute wins
    status VARCHAR(50)                   -- open/resolved
);
```

## Testing the Webhook

### 1. Using Stripe CLI (Local Testing)
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

### 2. Test Webhook Endpoint Health
```bash
# Check webhook health
curl https://arzani.co.uk/webhook/health

# Expected response:
{
  "status": "healthy",
  "webhook_url": "https://arzani.co.uk/webhook",
  "events_listening": [
    "checkout.session.completed",
    "payment_intent.succeeded", 
    "payment_intent.payment_failed"
  ],
  "timestamp": "2025-07-21T..."
}
```

### 3. Monitor Webhook Logs
```bash
# Check processing logs in your application
tail -f logs/webhook.log

# Or query database for recent events
SELECT * FROM stripe_webhook_events 
ORDER BY processed_at DESC 
LIMIT 10;
```

## Error Handling & Recovery

### Automatic Retry Logic
- Stripe automatically retries failed webhooks
- Webhook returns 500 status for retry-able errors
- Returns 200 for successfully processed events
- Uses idempotency to prevent duplicate processing

### Manual Recovery Process
1. **Check Failed Purchases**:
   ```sql
   SELECT * FROM failed_token_purchases 
   WHERE resolved = false;
   ```

2. **Manually Add Tokens** (if payment succeeded but webhook failed):
   ```sql
   -- Add tokens manually
   CALL add_tokens_to_user(user_id, token_amount, 'manual_recovery');
   
   -- Mark as resolved
   UPDATE failed_token_purchases 
   SET resolved = true, resolved_at = NOW() 
   WHERE session_id = 'cs_test_...';
   ```

3. **Handle Disputes**:
   ```sql
   -- Deduct tokens for valid disputes
   UPDATE user_tokens 
   SET token_balance = token_balance - disputed_tokens
   WHERE user_id = dispute_user_id;
   ```

## Security Considerations

### Webhook Signature Verification
```javascript
// Every webhook verifies Stripe signature
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body, 
  sig, 
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Idempotency Protection
```javascript
// Prevents duplicate processing
const existingEvent = await checkEventProcessed(event.id);
if (existingEvent) {
  return res.json({status: 'already_processed'});
}
```

### Rate Limiting
- Webhook endpoint has no rate limiting (Stripe controls frequency)
- Other token endpoints have rate limiting configured
- Failed webhooks logged for investigation

## Monitoring & Analytics

### Key Metrics to Track
1. **Webhook Success Rate**: % of webhooks processed successfully
2. **Token Purchase Volume**: Total tokens sold per day/week/month
3. **Revenue Tracking**: Total revenue from token sales
4. **Failed Purchase Rate**: % of purchases that fail processing
5. **User Conversion**: Free to paid user conversion rates

### Webhook Analytics Query
```sql
-- Daily webhook processing stats
SELECT 
  DATE(processed_at) as date,
  event_type,
  processing_status,
  COUNT(*) as event_count,
  SUM(tokens_added) as total_tokens_added
FROM stripe_webhook_events
WHERE processed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(processed_at), event_type, processing_status
ORDER BY date DESC;
```

## Troubleshooting Common Issues

### Issue: Webhook Not Firing
**Symptoms**: User pays but tokens not added
**Solution**: 
1. Check Stripe webhook logs in dashboard
2. Verify webhook URL is correct: `https://arzani.co.uk/webhook`
3. Check server logs for errors

### Issue: Duplicate Token Addition
**Symptoms**: User gets tokens multiple times for one purchase
**Solution**: 
1. Check idempotency logic in webhook handler
2. Verify `stripe_webhook_events` table has unique constraint
3. Review webhook retry settings

### Issue: Payment Succeeded but Webhook Failed
**Symptoms**: Stripe shows successful payment, user has no tokens
**Solution**:
1. Check `failed_token_purchases` table
2. Manually add tokens using recovery process
3. Investigate webhook error logs

---

## Summary

The Stripe webhook system provides:
- ✅ **Automatic token fulfillment** when payments complete
- ✅ **Complete audit trail** of all webhook events
- ✅ **Error recovery mechanisms** for failed processing
- ✅ **Idempotency protection** against duplicate processing
- ✅ **Security verification** of all webhook signatures
- ✅ **Comprehensive logging** for troubleshooting

Your freemium token system is now fully integrated with Stripe's payment processing and webhook system, providing a robust foundation for monetizing your marketplace features.
