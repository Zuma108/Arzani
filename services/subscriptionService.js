import pool from '../db.js';

class SubscriptionService {
  static async createSubscriptionTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        plan_type VARCHAR(50),
        status VARCHAR(50),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    try {
      await pool.query(query);
    } catch (error) {
      console.error('Error creating subscriptions table:', error);
      throw error;
    }
  }

  static async updateSubscription(userId, subscriptionData) {
    const query = `
      INSERT INTO subscriptions (
        user_id, 
        stripe_subscription_id,
        stripe_customer_id,
        plan_type,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE
      SET 
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        plan_type = EXCLUDED.plan_type,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW();
    `;

    const values = [
      userId,
      subscriptionData.id,
      subscriptionData.customer,
      subscriptionData.items.data[0].price.lookup_key,
      subscriptionData.status,
      new Date(subscriptionData.current_period_start * 1000),
      new Date(subscriptionData.current_period_end * 1000),
      subscriptionData.cancel_at_period_end
    ];

    try {
      await pool.query(query, values);
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }
}

export default SubscriptionService;
