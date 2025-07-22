# Freemium Token System Implementation Checklist
## Step-by-Step Integration Guide for Arzani Marketplace

### Overview
This checklist provides a comprehensive, step-by-step implementation guide for integrating the freemium token-based system into the Arzani marketplace. Each task is optimized for scalability, efficiency, and maintainability from a Google-developer perspective.

---

## Phase 1: Database Foundation & Schema Design ⚡

### 1.1 Database Schema Implementation
- [x] **Create user_tokens table with proper indexing** ✅ COMPLETED
  ```sql
  CREATE TABLE user_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      token_balance INTEGER DEFAULT 0 CHECK (token_balance >= 0),
      tokens_purchased INTEGER DEFAULT 0,
      tokens_consumed INTEGER DEFAULT 0,
      lifetime_purchased INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Indexes for performance
  CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
  CREATE INDEX idx_user_tokens_balance ON user_tokens(token_balance);
  ```

- [x] **Create token_transactions table with partitioning** ✅ COMPLETED
  ```sql
  CREATE TABLE token_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'refund', 'bonus')),
      tokens_amount INTEGER NOT NULL,
      action_type VARCHAR(100), 
      reference_id INTEGER,
      stripe_payment_intent_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB DEFAULT '{}',
      
      -- Partitioning preparation
      CONSTRAINT chk_positive_amount CHECK (
          (transaction_type IN ('purchase', 'bonus') AND tokens_amount > 0) OR
          (transaction_type IN ('consumption', 'refund') AND tokens_amount > 0)
      )
  );
  
  -- High-performance indexes
  CREATE INDEX idx_token_transactions_user_date ON token_transactions(user_id, created_at DESC);
  CREATE INDEX idx_token_transactions_type ON token_transactions(transaction_type);
  CREATE INDEX idx_token_transactions_stripe ON token_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
  ```

- [x] **Create contact_limitations table with composite indexes** ✅ COMPLETED
  ```sql
  CREATE TABLE contact_limitations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      business_id INTEGER REFERENCES businesses(id) NOT NULL,
      contact_count INTEGER DEFAULT 0,
      first_contact_at TIMESTAMP,
      last_contact_at TIMESTAMP,
      tokens_spent INTEGER DEFAULT 0,
      is_free_contact BOOLEAN DEFAULT false,
      
      UNIQUE(user_id, business_id)
  );
  
  -- Composite indexes for query optimization
  CREATE INDEX idx_contact_limitations_user_business ON contact_limitations(user_id, business_id);
  CREATE INDEX idx_contact_limitations_user_date ON contact_limitations(user_id, last_contact_at DESC);
  ```

- [x] **Create token_packages table for pricing management** ✅ COMPLETED
  ```sql
  CREATE TABLE token_packages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      token_amount INTEGER NOT NULL CHECK (token_amount > 0),
      price_gbp INTEGER NOT NULL CHECK (price_gbp > 0), -- in pence
      bonus_tokens INTEGER DEFAULT 0 CHECK (bonus_tokens >= 0),
      stripe_price_id VARCHAR(255) UNIQUE,
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX idx_token_packages_active ON token_packages(is_active, display_order);
  ```

### 1.2 Extend Existing Tables
- [ ] **Add token-related fields to users table**
  ```sql
  ALTER TABLE users 
  ADD COLUMN token_balance INTEGER DEFAULT 0 CHECK (token_balance >= 0),
  ADD COLUMN free_contacts_used INTEGER DEFAULT 0,
  ADD COLUMN free_contacts_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN freemium_tier VARCHAR(20) DEFAULT 'basic' CHECK (freemium_tier IN ('basic', 'premium', 'enterprise'));
  
  -- Create index for token balance queries
  CREATE INDEX idx_users_token_balance ON users(token_balance) WHERE token_balance > 0;
  ```

- [ ] **Extend businesses table for seller features**
  ```sql
  ALTER TABLE businesses 
  ADD COLUMN is_boosted BOOLEAN DEFAULT false,
  ADD COLUMN boosted_until TIMESTAMP,
  ADD COLUMN boost_level INTEGER DEFAULT 0 CHECK (boost_level BETWEEN 0 AND 3),
  ADD COLUMN boost_tokens_spent INTEGER DEFAULT 0,
  ADD COLUMN featured_tokens_spent INTEGER DEFAULT 0;
  
  -- Index for boosted listings query optimization
  CREATE INDEX idx_businesses_boosted ON businesses(is_boosted, boosted_until) WHERE is_boosted = true;
  ```

- [ ] **Extend business_inquiries for token tracking**
  ```sql
  ALTER TABLE business_inquiries 
  ADD COLUMN tokens_spent INTEGER DEFAULT 0,
  ADD COLUMN inquiry_type VARCHAR(50) DEFAULT 'free' CHECK (inquiry_type IN ('free', 'token', 'premium')),
  ADD COLUMN contact_attempt_number INTEGER DEFAULT 1;
  ```

### 1.3 Database Performance Optimization
- [ ] **Create materialized views for analytics**
  ```sql
  CREATE MATERIALIZED VIEW mv_token_analytics AS
  SELECT 
      DATE_TRUNC('day', created_at) as date,
      transaction_type,
      COUNT(*) as transaction_count,
      SUM(tokens_amount) as total_tokens,
      COUNT(DISTINCT user_id) as unique_users
  FROM token_transactions
  GROUP BY DATE_TRUNC('day', created_at), transaction_type;
  
  CREATE INDEX idx_mv_token_analytics_date ON mv_token_analytics(date DESC);
  ```

- [ ] **Set up database connection pooling optimization**
  ```javascript
  // Update db.js with optimized pool settings
  const connectionConfig = {
      // ... existing config
      max: 20, // maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      maxUses: 7500, // close connection after 7500 uses
  };
  ```

---

## Phase 2: Stripe Integration & Payment Infrastructure 💳

### 2.1 Stripe Product Configuration
- [ ] **Create Stripe products for token packages**
  ```javascript
  // scripts/setup-stripe-products.js
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  const tokenPackages = [
    {
      name: "Starter Pack - 10 Tokens",
      description: "Perfect for trying premium features",
      unit_amount: 1000, // £10.00
      tokens: 10,
      bonus: 0
    },
    {
      name: "Professional Pack - 30 Tokens", 
      description: "Most popular choice for active users",
      unit_amount: 2500, // £25.00 (16% discount)
      tokens: 25,
      bonus: 5
    },
    {
      name: "Enterprise Pack - 65 Tokens",
      description: "Best value for power users",
      unit_amount: 5000, // £50.00 (23% discount) 
      tokens: 50,
      bonus: 15
    }
  ];
  ```

- [ ] **Set up Stripe webhook endpoint with idempotency**
  ```javascript
  // routes/stripe-webhooks.js
  app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      
      // Idempotency check
      const existingEvent = await pool.query(
        'SELECT id FROM webhook_logs WHERE stripe_event_id = $1',
        [event.id]
      );
      
      if (existingEvent.rows.length > 0) {
        return res.status(200).json({received: true, duplicate: true});
      }
      
      await processStripeEvent(event);
      res.status(200).json({received: true});
    } catch (err) {
      console.error('Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });
  ```

### 2.2 Token Purchase Flow Implementation
- [ ] **Create token purchase API endpoints**
  ```javascript
  // routes/api/tokens.js
  router.post('/purchase', requireAuth, async (req, res) => {
    const { packageId } = req.body;
    const userId = req.user.id;
    
    try {
      // Get package details
      const packageQuery = await pool.query(
        'SELECT * FROM token_packages WHERE id = $1 AND is_active = true',
        [packageId]
      );
      
      if (packageQuery.rows.length === 0) {
        return res.status(404).json({ error: 'Package not found' });
      }
      
      const package = packageQuery.rows[0];
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: package.stripe_price_id,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/tokens/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/tokens/cancel`,
        client_reference_id: userId.toString(),
        metadata: {
          package_id: packageId,
          token_amount: package.token_amount,
          bonus_tokens: package.bonus_tokens
        }
      });
      
      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error('Token purchase error:', error);
      res.status(500).json({ error: 'Purchase failed' });
    }
  });
  ```

- [ ] **Implement atomic token balance updates**
  ```javascript
  // services/tokenService.js
  class TokenService {
    static async addTokens(userId, amount, transactionType, metadata = {}) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Update user token balance atomically
        const updateResult = await client.query(
          `UPDATE user_tokens 
           SET token_balance = token_balance + $1,
               tokens_purchased = tokens_purchased + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2
           RETURNING token_balance`,
          [amount, userId]
        );
        
        if (updateResult.rows.length === 0) {
          // Create initial token record
          await client.query(
            `INSERT INTO user_tokens (user_id, token_balance, tokens_purchased)
             VALUES ($1, $2, $2)`,
            [userId, amount]
          );
        }
        
        // Log transaction
        await client.query(
          `INSERT INTO token_transactions 
           (user_id, transaction_type, tokens_amount, metadata)
           VALUES ($1, $2, $3, $4)`,
          [userId, transactionType, amount, JSON.stringify(metadata)]
        );
        
        await client.query('COMMIT');
        return { success: true, newBalance: updateResult.rows[0]?.token_balance || amount };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }
  ```

---

## Phase 3: Core Token Consumption Logic 🎯

### 3.1 Contact Limitation System
- [ ] **Implement freemium contact limits**
  ```javascript
  // middleware/contactLimits.js
  const checkContactLimits = async (req, res, next) => {
    const userId = req.user.id;
    const businessId = req.params.businessId;
    
    try {
      // Check if user has contacted this business before
      const contactHistory = await pool.query(
        `SELECT contact_count, first_contact_at, tokens_spent
         FROM contact_limitations 
         WHERE user_id = $1 AND business_id = $2`,
        [userId, businessId]
      );
      
      const userSubscription = await pool.query(
        'SELECT buyer_plan, free_contacts_used, free_contacts_reset_date FROM users WHERE id = $1',
        [userId]
      );
      
      const user = userSubscription.rows[0];
      const isFirstContact = contactHistory.rows.length === 0;
      
      // Check if user gets free contact
      if (isFirstContact && user.buyer_plan === 'free') {
        const today = new Date();
        const resetDate = new Date(user.free_contacts_reset_date);
        
        // Reset monthly limit if needed
        if (today > new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1)) {
          await pool.query(
            'UPDATE users SET free_contacts_used = 0, free_contacts_reset_date = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
          );
          user.free_contacts_used = 0;
        }
        
        if (user.free_contacts_used < 1) {
          req.contactType = 'free';
          return next();
        }
      }
      
      // Require tokens for additional contacts
      const tokensRequired = isFirstContact ? 2 : 1;
      const userTokens = await pool.query(
        'SELECT token_balance FROM user_tokens WHERE user_id = $1',
        [userId]
      );
      
      if (!userTokens.rows[0] || userTokens.rows[0].token_balance < tokensRequired) {
        return res.status(402).json({
          error: 'Insufficient tokens',
          tokensRequired,
          currentBalance: userTokens.rows[0]?.token_balance || 0
        });
      }
      
      req.contactType = 'token';
      req.tokensRequired = tokensRequired;
      next();
    } catch (error) {
      console.error('Contact limit check error:', error);
      res.status(500).json({ error: 'Contact limit check failed' });
    }
  };
  ```

- [ ] **Update contact seller endpoint**
  ```javascript
  // routes/api/businesses.js
  router.post('/:businessId/contact', requireAuth, checkContactLimits, async (req, res) => {
    const userId = req.user.id;
    const businessId = req.params.businessId;
    const { contactType, tokensRequired } = req;
    const { firstName, lastName, email, phone, message, timeframe } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      let tokensSpent = 0;
      
      // Handle token consumption
      if (contactType === 'token') {
        await TokenService.consumeTokens(userId, tokensRequired, 'contact_seller', {
          businessId,
          action: 'contact_seller'
        });
        tokensSpent = tokensRequired;
      } else if (contactType === 'free') {
        await client.query(
          'UPDATE users SET free_contacts_used = free_contacts_used + 1 WHERE id = $1',
          [userId]
        );
      }
      
      // Create contact inquiry
      const inquiry = await client.query(
        `INSERT INTO business_inquiries 
         (business_id, first_name, last_name, email, phone, message, timeframe, 
          user_email, tokens_spent, inquiry_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [businessId, firstName, lastName, email, phone, message, timeframe, 
         req.user.email, tokensSpent, contactType]
      );
      
      // Update contact limitations
      await client.query(
        `INSERT INTO contact_limitations (user_id, business_id, contact_count, first_contact_at, last_contact_at, tokens_spent)
         VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3)
         ON CONFLICT (user_id, business_id) 
         DO UPDATE SET 
           contact_count = contact_limitations.contact_count + 1,
           last_contact_at = CURRENT_TIMESTAMP,
           tokens_spent = contact_limitations.tokens_spent + $3`,
        [userId, businessId, tokensSpent]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        inquiryId: inquiry.rows[0].id,
        tokensSpent,
        contactType
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Contact creation error:', error);
      res.status(500).json({ error: 'Contact creation failed' });
    } finally {
      client.release();
    }
  });
  ```

### 3.2 Token Consumption Service
- [ ] **Create centralized token consumption service**
  ```javascript
  // services/tokenService.js (extended)
  class TokenService {
    static async consumeTokens(userId, amount, actionType, metadata = {}) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Check current balance
        const balanceQuery = await client.query(
          'SELECT token_balance FROM user_tokens WHERE user_id = $1 FOR UPDATE',
          [userId]
        );
        
        if (!balanceQuery.rows[0] || balanceQuery.rows[0].token_balance < amount) {
          throw new Error('Insufficient token balance');
        }
        
        // Deduct tokens
        await client.query(
          `UPDATE user_tokens 
           SET token_balance = token_balance - $1,
               tokens_consumed = tokens_consumed + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [amount, userId]
        );
        
        // Log consumption
        await client.query(
          `INSERT INTO token_transactions 
           (user_id, transaction_type, tokens_amount, action_type, reference_id, metadata)
           VALUES ($1, 'consumption', $2, $3, $4, $5)`,
          [userId, amount, actionType, metadata.referenceId, JSON.stringify(metadata)]
        );
        
        await client.query('COMMIT');
        return { success: true };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    
    static async getUserBalance(userId) {
      const result = await pool.query(
        'SELECT token_balance FROM user_tokens WHERE user_id = $1',
        [userId]
      );
      return result.rows[0]?.token_balance || 0;
    }
  }
  ```

---

## Phase 4: Seller Token Features 🚀

### 4.1 Listing Boost Implementation
- [ ] **Create listing boost endpoint**
  ```javascript
  // routes/api/seller-features.js
  router.post('/boost-listing/:businessId', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const businessId = req.params.businessId;
    const { boostLevel, duration } = req.body; // 1=standard(5 tokens), 2=premium(10 tokens)
    
    try {
      // Verify business ownership
      const business = await pool.query(
        'SELECT user_id FROM businesses WHERE id = $1',
        [businessId]
      );
      
      if (!business.rows[0] || business.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      const tokensRequired = boostLevel === 2 ? 10 : 5;
      const boostDuration = duration || 7; // days
      
      // Consume tokens and boost listing
      await TokenService.consumeTokens(userId, tokensRequired, 'boost_listing', {
        businessId,
        boostLevel,
        duration: boostDuration
      });
      
      const boostUntil = new Date();
      boostUntil.setDate(boostUntil.getDate() + boostDuration);
      
      await pool.query(
        `UPDATE businesses 
         SET is_boosted = true, boost_level = $1, boosted_until = $2,
             boost_tokens_spent = boost_tokens_spent + $3
         WHERE id = $4`,
        [boostLevel, boostUntil, tokensRequired, businessId]
      );
      
      res.json({
        success: true,
        tokensSpent: tokensRequired,
        boostedUntil: boostUntil
      });
    } catch (error) {
      console.error('Boost listing error:', error);
      res.status(500).json({ error: 'Boost failed' });
    }
  });
  ```

### 4.2 Premium Analytics for Sellers
- [ ] **Create seller analytics endpoint**
  ```javascript
  // routes/api/seller-analytics.js
  router.get('/premium-analytics/:businessId', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const businessId = req.params.businessId;
    
    try {
      // Check if user has access (token-gated)
      const hasAccess = await checkPremiumAnalyticsAccess(userId, businessId);
      
      if (!hasAccess) {
        return res.status(402).json({
          error: 'Premium analytics access required',
          tokensRequired: 3,
          currentBalance: await TokenService.getUserBalance(userId)
        });
      }
      
      // Generate comprehensive analytics
      const analytics = await generatePremiumAnalytics(businessId);
      
      res.json({
        success: true,
        analytics,
        accessType: 'premium'
      });
    } catch (error) {
      console.error('Premium analytics error:', error);
      res.status(500).json({ error: 'Analytics generation failed' });
    }
  });
  
  async function generatePremiumAnalytics(businessId) {
    // Advanced analytics queries
    const viewsData = await pool.query(`
      SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as views
      FROM analytics_events 
      WHERE event_data->>'business_id' = $1 
      AND event_type = 'business_view'
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `, [businessId]);
    
    const contactsData = await pool.query(`
      SELECT DATE_TRUNC('day', created_at) as date, 
             COUNT(*) as total_contacts,
             COUNT(*) FILTER (WHERE inquiry_type = 'token') as premium_contacts
      FROM business_inquiries 
      WHERE business_id = $1
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
    `, [businessId]);
    
    return {
      views: viewsData.rows,
      contacts: contactsData.rows,
      conversionRate: calculateConversionRate(viewsData.rows, contactsData.rows),
      popularKeywords: await getPopularSearchKeywords(businessId),
      competitorComparison: await getCompetitorInsights(businessId)
    };
  }
  ```

---

## Phase 5: Frontend Integration & UX 🎨

### 5.1 Token Balance UI Components
- [ ] **Create token balance display component**
  ```javascript
  // public/js/token-balance.js
  class TokenBalance {
    constructor() {
      this.balance = 0;
      this.init();
    }
    
    async init() {
      await this.fetchBalance();
      this.renderBalanceWidget();
      this.setupEventListeners();
    }
    
    async fetchBalance() {
      try {
        const response = await fetch('/api/tokens/balance', {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();
        this.balance = data.balance || 0;
      } catch (error) {
        console.error('Failed to fetch token balance:', error);
      }
    }
    
    renderBalanceWidget() {
      const widget = document.getElementById('token-balance-widget');
      if (!widget) return;
      
      widget.innerHTML = `
        <div class="token-balance-container">
          <div class="token-icon">🪙</div>
          <span class="token-count">${this.balance}</span>
          <button class="buy-tokens-btn" onclick="TokenPurchase.showModal()">
            ${this.balance === 0 ? 'Buy Tokens' : 'Top Up'}
          </button>
        </div>
      `;
    }
    
    updateBalance(newBalance) {
      this.balance = newBalance;
      this.renderBalanceWidget();
      this.showBalanceChangeNotification();
    }
  }
  ```

- [ ] **Implement token purchase modal**
  ```javascript
  // public/js/token-purchase.js
  class TokenPurchase {
    static showModal() {
      const modal = document.getElementById('token-purchase-modal');
      modal.style.display = 'block';
      this.loadPackages();
    }
    
    static async loadPackages() {
      try {
        const response = await fetch('/api/tokens/packages');
        const packages = await response.json();
        this.renderPackages(packages);
      } catch (error) {
        console.error('Failed to load token packages:', error);
      }
    }
    
    static renderPackages(packages) {
      const container = document.getElementById('token-packages');
      container.innerHTML = packages.map(pkg => `
        <div class="token-package ${pkg.recommended ? 'recommended' : ''}" 
             data-package-id="${pkg.id}">
          <div class="package-header">
            <h3>${pkg.name}</h3>
            ${pkg.recommended ? '<span class="recommended-badge">Most Popular</span>' : ''}
          </div>
          <div class="package-details">
            <div class="token-amount">${pkg.token_amount} tokens</div>
            ${pkg.bonus_tokens > 0 ? `<div class="bonus">+${pkg.bonus_tokens} bonus</div>` : ''}
            <div class="price">£${(pkg.price_gbp / 100).toFixed(2)}</div>
            <div class="value">£${((pkg.price_gbp / 100) / (pkg.token_amount + pkg.bonus_tokens)).toFixed(2)} per token</div>
          </div>
          <button class="purchase-btn" onclick="TokenPurchase.purchase(${pkg.id})">
            Purchase
          </button>
        </div>
      `).join('');
    }
    
    static async purchase(packageId) {
      try {
        const response = await fetch('/api/tokens/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({ packageId })
        });
        
        const data = await response.json();
        
        if (data.url) {
          window.location.href = data.url; // Redirect to Stripe Checkout
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (error) {
        console.error('Purchase failed:', error);
        alert('Purchase failed. Please try again.');
      }
    }
  }
  ```

### 5.2 Contact Form Token Integration
- [ ] **Update contact seller functionality**
  ```javascript
  // Update existing marketplace.js contactSeller function
  async function contactSeller(businessId) {
    try {
      // Check token requirements first
      const requirementsResponse = await fetch(`/api/businesses/${businessId}/contact-requirements`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      
      const requirements = await requirementsResponse.json();
      
      if (requirements.tokensRequired > 0) {
        const userBalance = await TokenBalance.fetchBalance();
        
        if (userBalance < requirements.tokensRequired) {
          showTokenRequiredModal(requirements.tokensRequired, userBalance);
          return;
        }
        
        // Show token confirmation
        const confirmed = await showTokenConfirmationModal(requirements);
        if (!confirmed) return;
      }
      
      // Proceed with contact form
      showContactModal(businessId, requirements);
    } catch (error) {
      console.error('Contact seller error:', error);
    }
  }
  
  function showTokenRequiredModal(required, current) {
    const modal = document.createElement('div');
    modal.className = 'token-required-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>🪙 Tokens Required</h3>
        <p>You need <strong>${required} tokens</strong> to contact this seller.</p>
        <p>Your current balance: <strong>${current} tokens</strong></p>
        <div class="modal-actions">
          <button onclick="TokenPurchase.showModal()">Buy Tokens</button>
          <button onclick="this.closest('.modal').remove()">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  ```

---

## Phase 6: Analytics & Monitoring 📊

### 6.1 Token Economy Analytics
- [ ] **Create admin analytics dashboard**
  ```javascript
  // routes/admin/token-analytics.js
  router.get('/token-metrics', requireAdminAuth, async (req, res) => {
    try {
      const metrics = await generateTokenMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Token metrics error:', error);
      res.status(500).json({ error: 'Metrics generation failed' });
    }
  });
  
  async function generateTokenMetrics() {
    // Token economy health metrics
    const economyMetrics = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        transaction_type,
        COUNT(*) as transaction_count,
        SUM(tokens_amount) as total_tokens,
        COUNT(DISTINCT user_id) as unique_users
      FROM token_transactions
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY month, transaction_type
      ORDER BY month DESC
    `);
    
    // User behavior analysis
    const userBehavior = await pool.query(`
      SELECT 
        u.buyer_plan,
        AVG(ut.token_balance) as avg_balance,
        AVG(ut.tokens_consumed) as avg_consumed,
        COUNT(DISTINCT u.id) as user_count,
        AVG(cl.contact_count) as avg_contacts_per_user
      FROM users u
      LEFT JOIN user_tokens ut ON u.id = ut.user_id
      LEFT JOIN contact_limitations cl ON u.id = cl.user_id
      GROUP BY u.buyer_plan
    `);
    
    // Revenue analytics
    const revenueMetrics = await pool.query(`
      SELECT 
        DATE_TRUNC('week', tt.created_at) as week,
        SUM(tp.price_gbp * tt.tokens_amount / tp.token_amount) as revenue_pence,
        COUNT(DISTINCT tt.user_id) as paying_users,
        AVG(tp.price_gbp * tt.tokens_amount / tp.token_amount) as avg_purchase_value
      FROM token_transactions tt
      JOIN token_packages tp ON tt.metadata->>'package_id' = tp.id::text
      WHERE tt.transaction_type = 'purchase'
      AND tt.created_at >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY week
      ORDER BY week DESC
    `);
    
    return {
      economyHealth: economyMetrics.rows,
      userBehavior: userBehavior.rows,
      revenueMetrics: revenueMetrics.rows,
      conversionFunnel: await calculateConversionFunnel()
    };
  }
  ```

### 6.2 Performance Monitoring
- [ ] **Set up token operation monitoring**
  ```javascript
  // middleware/performance-monitoring.js
  const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Log slow token operations
      if (req.path.includes('/tokens/') && duration > 500) {
        console.warn(`Slow token operation: ${req.method} ${req.path} took ${duration}ms`);
      }
      
      // Track token-related endpoint performance
      if (req.path.includes('/tokens/')) {
        recordMetric('token_operation_duration', duration, {
          endpoint: req.path,
          method: req.method,
          status: res.statusCode
        });
      }
    });
    
    next();
  };
  ```

---

## Phase 7: Security & Anti-Abuse 🔒

### 7.1 Token Security Implementation
- [ ] **Implement rate limiting for token operations**
  ```javascript
  // middleware/token-rate-limits.js
  const rateLimit = require('express-rate-limit');
  
  const tokenPurchaseLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 purchases per 15 minutes
    message: 'Too many token purchases. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  const tokenConsumptionLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 token operations per minute
    message: 'Rate limit exceeded for token operations.',
  });
  ```

- [ ] **Add fraud detection for token transactions**
  ```javascript
  // services/fraudDetection.js
  class FraudDetection {
    static async checkTokenPurchase(userId, packageId, amount) {
      const checks = await Promise.all([
        this.checkPurchaseVelocity(userId),
        this.checkUnusualPurchasePattern(userId, amount),
        this.checkSuspiciousActivity(userId)
      ]);
      
      const riskScore = checks.reduce((sum, score) => sum + score, 0);
      
      return {
        approved: riskScore < 50,
        riskScore,
        requiresReview: riskScore >= 30
      };
    }
    
    static async checkPurchaseVelocity(userId) {
      const recentPurchases = await pool.query(`
        SELECT COUNT(*) as purchase_count
        FROM token_transactions
        WHERE user_id = $1 
        AND transaction_type = 'purchase'
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `, [userId]);
      
      const count = parseInt(recentPurchases.rows[0].purchase_count);
      return count > 3 ? 30 : 0; // High risk if >3 purchases per hour
    }
  }
  ```

### 7.2 Database Security Hardening
- [ ] **Implement row-level security for sensitive tables**
  ```sql
  -- Enable RLS on token-related tables
  ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
  ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
  
  -- Create policies for user data access
  CREATE POLICY user_tokens_policy ON user_tokens 
  FOR ALL TO application_user 
  USING (user_id = current_setting('app.current_user_id')::integer);
  
  CREATE POLICY token_transactions_policy ON token_transactions
  FOR SELECT TO application_user
  USING (user_id = current_setting('app.current_user_id')::integer);
  ```

---

## Phase 8: Testing & Quality Assurance 🧪

### 8.1 Unit Testing for Token Operations
- [ ] **Create comprehensive token service tests**
  ```javascript
  // tests/tokenService.test.js
  describe('TokenService', () => {
    beforeEach(async () => {
      await setupTestDatabase();
    });
    
    describe('consumeTokens', () => {
      it('should successfully consume tokens when balance is sufficient', async () => {
        const userId = await createTestUser();
        await TokenService.addTokens(userId, 10, 'purchase');
        
        const result = await TokenService.consumeTokens(userId, 5, 'contact_seller');
        expect(result.success).toBe(true);
        
        const balance = await TokenService.getUserBalance(userId);
        expect(balance).toBe(5);
      });
      
      it('should fail when balance is insufficient', async () => {
        const userId = await createTestUser();
        await TokenService.addTokens(userId, 2, 'purchase');
        
        await expect(
          TokenService.consumeTokens(userId, 5, 'contact_seller')
        ).rejects.toThrow('Insufficient token balance');
      });
      
      it('should maintain atomicity on concurrent operations', async () => {
        const userId = await createTestUser();
        await TokenService.addTokens(userId, 10, 'purchase');
        
        // Simulate concurrent token consumption
        const operations = Array(5).fill().map(() => 
          TokenService.consumeTokens(userId, 3, 'contact_seller')
        );
        
        const results = await Promise.allSettled(operations);
        const successful = results.filter(r => r.status === 'fulfilled');
        
        expect(successful.length).toBeLessThanOrEqual(3); // Max 3 successful (9 tokens)
        
        const finalBalance = await TokenService.getUserBalance(userId);
        expect(finalBalance).toBeGreaterThanOrEqual(1);
      });
    });
  });
  ```

### 8.2 Integration Testing
- [ ] **Test Stripe webhook integration**
  ```javascript
  // tests/integration/stripe-webhooks.test.js
  describe('Stripe Webhooks', () => {
    it('should process successful payment and add tokens', async () => {
      const userId = await createTestUser();
      const mockEvent = createMockStripeEvent('checkout.session.completed', {
        client_reference_id: userId.toString(),
        metadata: { package_id: '1', token_amount: '10' }
      });
      
      const response = await request(app)
        .post('/webhooks/stripe')
        .send(mockEvent)
        .expect(200);
      
      const balance = await TokenService.getUserBalance(userId);
      expect(balance).toBe(10);
    });
  });
  ```

### 8.3 Load Testing
- [ ] **Create load tests for token operations**
  ```javascript
  // tests/load/token-operations.load.js
  import http from 'k6/http';
  import { check } from 'k6';
  
  export let options = {
    stages: [
      { duration: '2m', target: 100 }, // Ramp up
      { duration: '5m', target: 100 }, // Stay at 100 users
      { duration: '2m', target: 0 },   // Ramp down
    ],
  };
  
  export default function() {
    // Test token balance endpoint
    let balanceResponse = http.get('http://localhost:3000/api/tokens/balance', {
      headers: { 'Authorization': `Bearer ${__ENV.TEST_TOKEN}` }
    });
    
    check(balanceResponse, {
      'balance check is status 200': (r) => r.status === 200,
      'balance check responds in <100ms': (r) => r.timings.duration < 100,
    });
    
    // Test token consumption
    let consumeResponse = http.post('http://localhost:3000/api/businesses/1/contact', 
      JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        message: 'Load test contact'
      }),
      {
        headers: {
          'Authorization': `Bearer ${__ENV.TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    check(consumeResponse, {
      'contact creation status is 200 or 402': (r) => [200, 402].includes(r.status),
      'contact creation responds in <500ms': (r) => r.timings.duration < 500,
    });
  }
  ```

---

## Phase 9: Deployment & Production Readiness 🚀

### 9.1 Environment Configuration
- [ ] **Set up production environment variables**
  ```bash
  # .env.production
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PUBLISHABLE_KEY=pk_live_...
  
  # Token system configuration
  DEFAULT_FREE_CONTACTS_LIMIT=1
  TOKEN_PURCHASE_TIMEOUT=300000
  TOKEN_CONSUMPTION_RATE_LIMIT=10
  
  # Database optimization
  DB_POOL_MAX=20
  DB_POOL_IDLE_TIMEOUT=30000
  
  # Monitoring
  ENABLE_TOKEN_METRICS=true
  METRICS_ENDPOINT=/admin/metrics
  ```

- [ ] **Configure production database optimizations**
  ```sql
  -- Production database settings
  ALTER SYSTEM SET shared_buffers = '256MB';
  ALTER SYSTEM SET effective_cache_size = '1GB';
  ALTER SYSTEM SET maintenance_work_mem = '64MB';
  ALTER SYSTEM SET checkpoint_completion_target = 0.9;
  ALTER SYSTEM SET wal_buffers = '16MB';
  ALTER SYSTEM SET default_statistics_target = 100;
  ALTER SYSTEM SET random_page_cost = 1.1;
  
  -- Reload configuration
  SELECT pg_reload_conf();
  ```

### 9.2 Monitoring & Alerting Setup
- [ ] **Set up token system monitoring**
  ```javascript
  // monitoring/token-alerts.js
  const alerts = {
    lowTokenPurchaseRate: {
      metric: 'token_purchases_per_hour',
      threshold: 5,
      action: 'notify_product_team'
    },
    highTokenConsumptionError: {
      metric: 'token_consumption_errors_per_minute',
      threshold: 10,
      action: 'notify_engineering'
    },
    stripeWebhookFailures: {
      metric: 'stripe_webhook_failures',
      threshold: 3,
      action: 'page_on_call'
    }
  };
  ```

### 9.3 Backup & Recovery Procedures
- [ ] **Implement token system backup strategy**
  ```bash
  #!/bin/bash
  # scripts/backup-token-data.sh
  
  # Backup critical token tables
  pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
    --table=user_tokens \
    --table=token_transactions \
    --table=token_packages \
    --table=contact_limitations \
    --data-only --inserts \
    > "token_data_backup_$(date +%Y%m%d_%H%M%S).sql"
  
  # Upload to secure backup storage
  aws s3 cp token_data_backup_*.sql s3://arzani-backups/token-system/
  ```

---

## Phase 10: Launch & Post-Launch Optimization 📈

### 10.1 Soft Launch Checklist
- [ ] **Enable feature flags for gradual rollout**
  ```javascript
  // Feature flag configuration
  const featureFlags = {
    ENABLE_TOKEN_SYSTEM: process.env.ENABLE_TOKEN_SYSTEM === 'true',
    ENABLE_SELLER_BOOST: process.env.ENABLE_SELLER_BOOST === 'true',
    ENABLE_PREMIUM_ANALYTICS: process.env.ENABLE_PREMIUM_ANALYTICS === 'true',
    TOKEN_SYSTEM_ROLLOUT_PERCENTAGE: parseInt(process.env.TOKEN_ROLLOUT_PERCENTAGE) || 100
  };
  
  // Gradual user rollout
  function isUserInTokenBeta(userId) {
    if (!featureFlags.ENABLE_TOKEN_SYSTEM) return false;
    
    const hash = crypto.createHash('md5').update(userId.toString()).digest('hex');
    const percentage = parseInt(hash.substring(0, 2), 16) / 255 * 100;
    
    return percentage < featureFlags.TOKEN_SYSTEM_ROLLOUT_PERCENTAGE;
  }
  ```

### 10.2 User Education & Onboarding
- [ ] **Create token system onboarding flow**
  ```javascript
  // public/js/token-onboarding.js
  class TokenOnboarding {
    static showWelcomeTour() {
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'shadow-md bg-purple-dark',
          scrollTo: true
        }
      });
      
      tour.addStep({
        title: '🪙 Welcome to Token System',
        text: 'We\'ve introduced tokens to ensure quality interactions. You get 1 free contact per month, then use tokens for additional contacts.',
        attachTo: {
          element: '#token-balance-widget',
          on: 'bottom'
        },
        buttons: [{
          text: 'Next',
          action: tour.next
        }]
      });
      
      // Add more steps...
      tour.start();
    }
  }
  ```

### 10.3 A/B Testing for Token Pricing
- [ ] **Set up token pricing experiments**
  ```javascript
  // services/tokenPricingExperiments.js
  class TokenPricingExperiments {
    static getPackagesForUser(userId) {
      const experimentGroup = this.getUserExperimentGroup(userId);
      
      switch (experimentGroup) {
        case 'control':
          return this.getStandardPackages();
        case 'variant_a':
          return this.getDiscountedPackages();
        case 'variant_b':
          return this.getBundlePackages();
        default:
          return this.getStandardPackages();
      }
    }
    
    static getUserExperimentGroup(userId) {
      const hash = crypto.createHash('md5').update(userId.toString()).digest('hex');
      const percentage = parseInt(hash.substring(0, 2), 16) / 255 * 100;
      
      if (percentage < 33) return 'control';
      if (percentage < 66) return 'variant_a';
      return 'variant_b';
    }
  }
  ```

---

## Success Metrics & KPIs 📊

### Financial Metrics
- [ ] **Track Monthly Recurring Revenue from tokens**
  - Target: £50,000+ monthly by month 6
  - Measurement: Sum of token purchases per month

- [ ] **Monitor Average Revenue Per User (ARPU)**
  - Target: £25/month per active token user
  - Measurement: Total token revenue / active users

### User Engagement Metrics
- [ ] **Freemium to Paid Conversion Rate**
  - Target: >15% conversion within 30 days
  - Measurement: Users who purchase tokens / total new users

- [ ] **Token Utilization Rate**
  - Target: >80% of purchased tokens used within 3 months
  - Measurement: Consumed tokens / purchased tokens

### Quality Metrics
- [ ] **Contact Success Rate**
  - Target: >60% response rate for token-based contacts
  - Measurement: Seller responses / contacts initiated

- [ ] **System Performance**
  - Target: <100ms for token operations
  - Measurement: Average response time for token API calls

---

## Post-Launch Monitoring Checklist ✅

### Daily Monitoring
- [ ] Token purchase success rate (target: >95%)
- [ ] Token consumption error rate (target: <1%)
- [ ] Stripe webhook processing success (target: >99%)
- [ ] Database performance for token operations

### Weekly Analysis
- [ ] Token economy health metrics
- [ ] User behavior patterns and segmentation
- [ ] Conversion funnel optimization opportunities
- [ ] A/B test results for pricing experiments

### Monthly Reviews
- [ ] Overall financial performance vs targets
- [ ] User satisfaction surveys for token system
- [ ] Competitive analysis and pricing adjustments
- [ ] Feature usage analytics and roadmap planning

---

**Implementation Timeline**: 8-10 weeks
**Team Requirements**: 2-3 developers, 1 product manager, 1 QA engineer
**Budget Estimate**: Development + initial infrastructure costs
**Success Definition**: >15% freemium conversion, £50k+ MRR, <100ms token operation performance

This checklist ensures a Google-developer level implementation focusing on scalability, performance, and user experience while maintaining the robust marketplace functionality that Arzani already provides.
