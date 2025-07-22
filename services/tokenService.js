/**
 * Token Service - Core business logic for freemium token system
 * Handles all token operations with security, performance, and reliability
 */

import pool from '../db.js';

class TokenService {
  
  /**
   * Add tokens to user account (purchases, bonuses, admin adjustments)
   * @param {number} userId - User ID
   * @param {number} amount - Number of tokens to add
   * @param {string} transactionType - 'purchase', 'bonus', 'admin_adjustment'
   * @param {object} metadata - Additional transaction data
   * @returns {Promise<object>} - Success status and new balance
   */
  static async addTokens(userId, amount, transactionType, metadata = {}) {
    if (!userId || amount <= 0) {
      throw new Error('Invalid user ID or token amount');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert or update user tokens record atomically
      const upsertQuery = `
        INSERT INTO user_tokens (user_id, token_balance, tokens_purchased, lifetime_purchased)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          token_balance = user_tokens.token_balance + $2,
          tokens_purchased = user_tokens.tokens_purchased + $3,
          lifetime_purchased = user_tokens.lifetime_purchased + $3,
          updated_at = CURRENT_TIMESTAMP
        RETURNING token_balance
      `;

      const purchaseAmount = transactionType === 'purchase' ? amount : 0;
      const result = await client.query(upsertQuery, [userId, amount, purchaseAmount]);
      const newBalance = result.rows[0].token_balance;

      // Log the transaction
      await client.query(
        `INSERT INTO token_transactions 
         (user_id, transaction_type, tokens_amount, action_type, stripe_payment_intent_id, metadata, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId, 
          transactionType, 
          amount, 
          metadata.actionType || null,
          metadata.stripePaymentIntentId || null,
          JSON.stringify(metadata),
          metadata.ipAddress || null,
          metadata.userAgent || null
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        newBalance,
        tokensAdded: amount,
        transactionType
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding tokens:', error);
      throw new Error(`Failed to add tokens: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Consume tokens for user actions with atomic balance checking
   * @param {number} userId - User ID
   * @param {number} amount - Number of tokens to consume
   * @param {string} actionType - Type of action (contact_seller, boost_listing, etc.)
   * @param {object} metadata - Additional context data
   * @returns {Promise<object>} - Success status and remaining balance
   */
  static async consumeTokens(userId, amount, actionType, metadata = {}) {
    if (!userId || amount <= 0) {
      throw new Error('Invalid user ID or token amount');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check and update balance atomically with row locking
      const balanceQuery = `
        SELECT token_balance 
        FROM user_tokens 
        WHERE user_id = $1 
        FOR UPDATE
      `;
      
      const balanceResult = await client.query(balanceQuery, [userId]);
      
      if (balanceResult.rows.length === 0) {
        throw new Error('User token account not found');
      }

      const currentBalance = balanceResult.rows[0].token_balance;
      
      if (currentBalance < amount) {
        throw new Error(`Insufficient token balance. Required: ${amount}, Available: ${currentBalance}`);
      }

      // Deduct tokens
      const updateQuery = `
        UPDATE user_tokens 
        SET token_balance = token_balance - $1,
            tokens_consumed = tokens_consumed + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING token_balance
      `;
      
      const updateResult = await client.query(updateQuery, [amount, userId]);
      const newBalance = updateResult.rows[0].token_balance;

      // Log consumption transaction
      const transactionQuery = `
        INSERT INTO token_transactions 
        (user_id, transaction_type, tokens_amount, action_type, reference_id, metadata, ip_address, user_agent)
        VALUES ($1, 'consumption', $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const transactionResult = await client.query(transactionQuery, [
        userId,
        amount,
        actionType,
        metadata.referenceId || null,
        JSON.stringify(metadata),
        metadata.ipAddress || null,
        metadata.userAgent || null
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        remainingBalance: newBalance,
        tokensConsumed: amount,
        transactionId: transactionResult.rows[0].id,
        actionType
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error consuming tokens:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's current token balance efficiently
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Current token balance
   */
  static async getUserBalance(userId) {
    try {
      const result = await pool.query(
        'SELECT get_user_token_balance($1) as balance',
        [userId]
      );
      return result.rows[0].balance;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * Get user's token transaction history with pagination
   * @param {number} userId - User ID
   * @param {object} options - Query options (limit, offset, type filter)
   * @returns {Promise<object>} - Transaction history and pagination info
   */
  static async getUserTransactions(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      transactionType = null,
      actionType = null,
      startDate = null,
      endDate = null
    } = options;

    try {
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (transactionType) {
        whereClause += ` AND transaction_type = $${paramIndex}`;
        params.push(transactionType);
        paramIndex++;
      }

      if (actionType) {
        whereClause += ` AND action_type = $${paramIndex}`;
        params.push(actionType);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Get transactions with pagination
      const transactionsQuery = `
        SELECT 
          id,
          transaction_type,
          tokens_amount,
          action_type,
          reference_id,
          created_at,
          metadata
        FROM token_transactions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM token_transactions
        ${whereClause}
      `;

      const [transactionsResult, countResult] = await Promise.all([
        pool.query(transactionsQuery, params),
        pool.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
      ]);

      const total = parseInt(countResult.rows[0].total);
      const hasMore = offset + limit < total;

      return {
        transactions: transactionsResult.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw new Error('Failed to retrieve transaction history');
    }
  }

  /**
   * Check if user can make a free contact this month
   * @param {number} userId - User ID
   * @param {number} businessId - Business ID
   * @returns {Promise<boolean>} - Whether user can make free contact
   */
  static async canMakeFreeContact(userId, businessId) {
    try {
      const result = await pool.query(
        'SELECT can_make_free_contact($1, $2) as can_contact',
        [userId, businessId]
      );
      return result.rows[0].can_contact;
    } catch (error) {
      console.error('Error checking free contact eligibility:', error);
      return false;
    }
  }

  /**
   * Record contact attempt and manage limitations
   * @param {number} userId - User ID  
   * @param {number} businessId - Business ID
   * @param {number} tokensSpent - Tokens spent on this contact
   * @param {boolean} isFreeContact - Whether this was a free contact
   * @returns {Promise<object>} - Contact record result
   */
  static async recordContactAttempt(userId, businessId, tokensSpent = 0, isFreeContact = false) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert or update contact limitations
      const contactQuery = `
        INSERT INTO contact_limitations 
        (user_id, business_id, contact_count, first_contact_at, last_contact_at, tokens_spent, is_free_contact, monthly_free_used, last_free_reset)
        VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, business_id)
        DO UPDATE SET
          contact_count = contact_limitations.contact_count + 1,
          last_contact_at = CURRENT_TIMESTAMP,
          tokens_spent = contact_limitations.tokens_spent + $3,
          monthly_free_used = CASE 
            WHEN $4 = true AND DATE_TRUNC('month', contact_limitations.last_free_reset) < DATE_TRUNC('month', CURRENT_TIMESTAMP)
            THEN 1
            WHEN $4 = true 
            THEN contact_limitations.monthly_free_used + 1
            ELSE contact_limitations.monthly_free_used
          END,
          last_free_reset = CASE
            WHEN $4 = true AND DATE_TRUNC('month', contact_limitations.last_free_reset) < DATE_TRUNC('month', CURRENT_TIMESTAMP)
            THEN CURRENT_TIMESTAMP
            ELSE contact_limitations.last_free_reset
          END
        RETURNING contact_count, tokens_spent
      `;

      const freeContactValue = isFreeContact ? 1 : 0;
      const contactResult = await client.query(contactQuery, [
        userId, 
        businessId, 
        tokensSpent, 
        isFreeContact, 
        freeContactValue
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        contactCount: contactResult.rows[0].contact_count,
        totalTokensSpent: contactResult.rows[0].tokens_spent,
        isFreeContact
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording contact attempt:', error);
      throw new Error('Failed to record contact attempt');
    } finally {
      client.release();
    }
  }

  /**
   * Get token packages available for purchase
   * @param {boolean} activeOnly - Only return active packages
   * @returns {Promise<Array>} - Available token packages
   */
  static async getTokenPackages(activeOnly = true) {
    try {
      let query = `
        SELECT 
          id,
          name,
          token_amount,
          price_gbp,
          bonus_tokens,
          stripe_price_id,
          recommended,
          description,
          display_order
        FROM token_packages
      `;

      const params = [];
      
      if (activeOnly) {
        query += ' WHERE is_active = true';
      }

      query += ' ORDER BY display_order ASC, token_amount ASC';

      const result = await pool.query(query, params);
      
      const processedPackages = result.rows.map(pkg => ({
        ...pkg,
        price_gbp_formatted: (pkg.price_gbp / 100).toFixed(2),
        total_tokens: pkg.token_amount + pkg.bonus_tokens,
        value_per_token: ((pkg.price_gbp / 100) / (pkg.token_amount + pkg.bonus_tokens)).toFixed(3)
      }));
      
      // Debug log only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('TokenService.getTokenPackages returning:', JSON.stringify(processedPackages, null, 2));
      }
      return processedPackages;

    } catch (error) {
      console.error('Error getting token packages:', error);
      throw new Error('Failed to retrieve token packages');
    }
  }

  /**
   * Process Stripe webhook for successful token purchase
   * @param {object} stripeEvent - Stripe webhook event data
   * @returns {Promise<object>} - Processing result
   */
  static async processTokenPurchase(stripeEvent) {
    const { 
      client_reference_id: userId,
      metadata: { package_id: packageId, token_amount, bonus_tokens },
      payment_intent: paymentIntentId,
      amount_total: amountPaid
    } = stripeEvent.data.object;

    if (!userId || !packageId || !token_amount) {
      throw new Error('Missing required webhook data');
    }

    try {
      const totalTokens = parseInt(token_amount) + parseInt(bonus_tokens || 0);
      
      const result = await this.addTokens(
        parseInt(userId),
        totalTokens,
        'purchase',
        {
          stripePaymentIntentId: paymentIntentId,
          packageId: parseInt(packageId),
          amountPaid,
          bonusTokens: parseInt(bonus_tokens || 0),
          baseTokens: parseInt(token_amount)
        }
      );

      console.log(`✅ Token purchase processed: User ${userId} received ${totalTokens} tokens`);
      
      return result;

    } catch (error) {
      console.error('Error processing token purchase:', error);
      throw error;
    }
  }

  /**
   * Get user token summary including balance and recent activity
   * @param {number} userId - User ID
   * @returns {Promise<object>} - User token summary
   */
  static async getUserTokenSummary(userId) {
    try {
      const summaryQuery = `
        SELECT 
          COALESCE(ut.token_balance, 0) as current_balance,
          COALESCE(ut.tokens_purchased, 0) as lifetime_purchased,
          COALESCE(ut.tokens_consumed, 0) as lifetime_consumed,
          COALESCE(ut.lifetime_purchased, 0) as total_purchased,
          u.buyer_plan,
          u.freemium_tier,
          u.free_contacts_used,
          u.free_contacts_reset_date,
          COUNT(DISTINCT cl.business_id) as businesses_contacted,
          SUM(cl.tokens_spent) as tokens_spent_on_contacts
        FROM users u
        LEFT JOIN user_tokens ut ON u.id = ut.user_id
        LEFT JOIN contact_limitations cl ON u.id = cl.user_id
        WHERE u.id = $1
        GROUP BY u.id, ut.token_balance, ut.tokens_purchased, ut.tokens_consumed, ut.lifetime_purchased, 
                 u.buyer_plan, u.freemium_tier, u.free_contacts_used, u.free_contacts_reset_date
      `;

      const result = await pool.query(summaryQuery, [userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const summary = result.rows[0];

      // Calculate value metrics
      const totalTokensAcquired = summary.lifetime_purchased;
      const tokensRemaining = summary.current_balance;
      const utilizationRate = totalTokensAcquired > 0 ? 
        ((summary.lifetime_consumed / totalTokensAcquired) * 100).toFixed(1) : 0;

      return {
        balance: {
          current: summary.current_balance,
          lifetime_purchased: summary.lifetime_purchased,
          lifetime_consumed: summary.lifetime_consumed,
          utilization_rate: utilizationRate
        },
        user: {
          buyer_plan: summary.buyer_plan,
          freemium_tier: summary.freemium_tier,
          free_contacts_used: summary.free_contacts_used,
          free_contacts_reset_date: summary.free_contacts_reset_date
        },
        activity: {
          businesses_contacted: parseInt(summary.businesses_contacted || 0),
          tokens_spent_on_contacts: parseInt(summary.tokens_spent_on_contacts || 0)
        }
      };

    } catch (error) {
      console.error('Error getting user token summary:', error);
      throw new Error('Failed to retrieve user token summary');
    }
  }
}

export default TokenService;
