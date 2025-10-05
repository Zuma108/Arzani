import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import pool from './db.js';

dotenv.config();

// Database functions
async function createUserTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if tables already exist
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create users table only if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          google_id VARCHAR(255) UNIQUE,
          microsoft_id VARCHAR(255) UNIQUE,
          linkedin_id VARCHAR(255) UNIQUE,
          auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
          profile_picture VARCHAR(255) DEFAULT '/images/default-profile.png',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
      `);

      // Create users_auth table with foreign key
      await client.query(`
        CREATE TABLE IF NOT EXISTS users_auth (
          user_id INTEGER PRIMARY KEY,
          password_hash VARCHAR(255) NOT NULL,
          verified BOOLEAN DEFAULT false,
          verification_token VARCHAR(255),
          verification_expires TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users_auth(user_id);
      `);

      console.log('Database tables created successfully');
    } else {
      console.log('Tables already exist, skipping creation');
    }

    // First check if we need to add the provider columns
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('google_id', 'microsoft_id', 'linkedin_id');
    `;

    const existingColumns = await client.query(checkColumnsQuery);
    const columnsToAdd = [];

    if (!existingColumns.rows.find(col => col.column_name === 'google_id')) {
      columnsToAdd.push('ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE');
    }
    if (!existingColumns.rows.find(col => col.column_name === 'microsoft_id')) {
      columnsToAdd.push('ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255) UNIQUE');
    }
    if (!existingColumns.rows.find(col => col.column_name === 'linkedin_id')) {
      columnsToAdd.push('ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255) UNIQUE');
    }

    // Add provider type column if it doesn't exist
    if (!existingColumns.rows.find(col => col.column_name === 'auth_provider')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email'`);
    }

    // If we have columns to add, alter the table
    if (columnsToAdd.length > 0) {
      const alterTableQuery = `
        ALTER TABLE users
        ${columnsToAdd.join(', ')};
      `;
      await client.query(alterTableQuery);
    }

    // Add random profile picture assignment trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION assign_random_profile_picture()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.profile_picture IS NULL THEN
              NEW.profile_picture := '/images/default_profile' || 
                  (floor(random() * 5) + 1)::text || '.png';
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS set_default_profile_picture ON users;
      
      CREATE TRIGGER set_default_profile_picture
          BEFORE INSERT ON users
          FOR EACH ROW
          EXECUTE FUNCTION assign_random_profile_picture();
    `);

    await client.query('COMMIT');
    console.log('Database schema updated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error managing database tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Add table persistence check
async function checkTablePersistence() {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) FROM users;
    `);
    console.log(`Current users in database: ${result.rows[0].count}`);
    return true;
  } catch (error) {
    console.error('Database persistence check failed:', error);
    return false;
  }
}

async function createUser({ username, email, password }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First create the user
    const userResult = await client.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id',
      [username, email]
    );
    
    const userId = userResult.rows[0].id;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Then create the auth record
    await client.query(
      'INSERT INTO users_auth (user_id, password_hash) VALUES ($1, $2)',
      [userId, hashedPassword]
    );
    
    await client.query('COMMIT');
    return { id: userId, username, email };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getUserByEmail(email) {
  try {
    if (!email) {
      console.error('getUserByEmail called with null or empty email');
      return null;
    }
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    throw error;
  }
}

// Update getUserById to handle errors better and include professional profile pictures
async function getUserById(id) {
  try {
    console.log('Fetching user with ID:', id);
    const result = await pool.query(
      `SELECT u.*, ua.password_hash, ua.verified,
       COALESCE(
         pp.professional_picture_url,
         u.profile_picture,
         '/images/default-profile.png'
       ) as profile_picture_url
       FROM users u 
       LEFT JOIN users_auth ua ON u.id = ua.user_id 
       LEFT JOIN professional_profiles pp ON u.id = pp.user_id
       WHERE u.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log('No user found with ID:', id);
      return null;
    }
    
    console.log('User found:', result.rows[0].username);
    // Update the profile_picture field with the coalesced value
    const user = result.rows[0];
    user.profile_picture = user.profile_picture_url;
    delete user.profile_picture_url; // Clean up the temporary field
    return user;
  } catch (error) {
    console.error('Database error in getUserById:', error);
    throw error;
  }
}

async function verifyUser(userId) {
  try {
    // Add query to get user verification status
    const query = `
      SELECT u.id, u.username, u.email, ua.verified
      FROM users u
      JOIN users_auth ua ON u.id = ua.user_id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in verifyUser:', error);
    throw error;
  }
}

async function authenticateUser(email, password) {
  let client = null;
  
  try {
    // Add special handling for when the function receives a request object instead of email string
    if (typeof email !== 'string') {
      // Check if this is a request object (has headers, session, etc.)
      if (email && email.session && email.session.userId) {
        console.log(`Received request object instead of email. Using session userId: ${email.session.userId}`);
        
        // Use the userId from the session to get the user
        const userId = email.session.userId;
        client = await pool.connect();
        
        const userQuery = `
          SELECT 
            u.id,
            u.username,
            u.email,
            ua.verified
          FROM users u
          JOIN users_auth ua ON u.id = ua.user_id
          WHERE u.id = $1
        `;
        
        const result = await client.query(userQuery, [userId]);
        
        if (result.rows.length === 0) {
          console.log(`No user found with ID: ${userId}`);
          return null;
        }
        
        // Return the user without password verification since we're using session
        return {
          id: result.rows[0].id,
          username: result.rows[0].username,
          email: result.rows[0].email,
          verified: result.rows[0].verified
        };
      }
      
      // If we can't extract a userId, log the error and return null
      console.error('Invalid parameter type passed to authenticateUser. Expected string email, got:', 
                    email ? typeof email : 'null/undefined');
      return null;
    }
    
    // Original authentication logic for email/password
    console.log(`Authentication attempt for email: ${email}`);
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Join users and users_auth tables to get all necessary info
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        ua.password_hash,
        ua.verified
      FROM users u
      JOIN users_auth ua ON u.id = ua.user_id
      WHERE u.email = $1
    `;
    
    // Execute the query with careful error handling
    let result;
    try {
      result = await client.query(query, [email]);
    } catch (queryError) {
      console.error('Database query error during authentication:', queryError.message);
      throw new Error(`Query error: ${queryError.message}`);
    }
    
    // Check if we found a user
    if (result.rows.length === 0) {
      console.log(`No user found with email: ${email}`);
      return null;
    }
    
    // Extract data from result manually to avoid circular references
    const userData = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      password_hash: result.rows[0].password_hash,
      verified: result.rows[0].verified
    };
    
    console.log(`Found user: ${userData.username} (ID: ${userData.id})`);
    
    // Validate password with careful error handling
    let validPassword = false;
    try {
      if (userData.password_hash) {
        validPassword = await bcrypt.compare(password, userData.password_hash);
      } else {
        console.error(`User ${userData.id} has no password hash`);
        return null;
      }
    } catch (bcryptError) {
      console.error('Password validation error:', bcryptError.message);
      throw new Error(`Password validation error: ${bcryptError.message}`);
    }
    
    if (validPassword) {
      console.log(`Authentication successful for user: ${userData.id}`);
      // Return only the necessary user data (excluding password_hash)
      delete userData.password_hash;
      return userData;
    }
    
    console.log(`Invalid password for user: ${userData.id}`);
    return null;
  } catch (error) {
    // Enhanced error logging with details but without circular references
    console.error('Authentication error:', {
      message: error.message,
      stack: error.stack?.split('\n')[0],
      emailType: typeof email
    });
    
    // Create descriptive error without including the original error object
    throw new Error(`Authentication failed: ${error.message || 'Unknown database error'}`);
  } finally {
    // IMPORTANT: Always release the client back to the pool
    if (client) {
      console.log('Releasing database client');
      client.release(true); // true means to discard the client if it encountered an error
    }
  }
}

export async function getUserByLinkedInId(linkedinId) {
  const query = 'SELECT * FROM users WHERE linkedin_id = $1';
  const result = await pool.query(query, [linkedinId]);
  return result.rows[0];
}

export async function createUserWithLinkedIn(userData) {
  const { email, username, linkedinId } = userData;
  const query = `
    INSERT INTO users (email, username, linkedin_id, verified)
    VALUES ($1, $2, $3, true)
    RETURNING *
  `;
  const result = await pool.query(query, [email, username, linkedinId]);
  return result.rows[0];
}

// Add new function to create or update user with OAuth
async function createOrUpdateOAuthUser({ 
  email, 
  username, 
  provider, 
  providerId,
  profile_picture = null,
  tokens = null
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user exists with this email
    let user = await getUserByEmail(email);

    if (user) {
      // Update existing user with provider ID and tokens
      const updateFields = [`${provider}_id = $1`, 'auth_provider = $2', 'last_login = NOW()'];
      const updateValues = [providerId, provider];
      let paramCount = 2;

      if (profile_picture) {
        paramCount++;
        updateFields.push(`profile_picture = $${paramCount}`);
        updateValues.push(profile_picture);
      }

      if (tokens && provider === 'google') {
        paramCount++;
        updateFields.push(`google_tokens = $${paramCount}`);
        updateValues.push(JSON.stringify(tokens));
      }

      paramCount++;
      updateValues.push(email);

      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE email = $${paramCount}
        RETURNING *;
      `;
      
      const result = await client.query(updateQuery, updateValues);
      user = result.rows[0];
    } else {
      // Create new user
      const insertFields = ['username', 'email', `${provider}_id`, 'auth_provider'];
      const insertValues = [username, email, providerId, provider];
      let paramCount = 4;

      if (profile_picture) {
        paramCount++;
        insertFields.push('profile_picture');
        insertValues.push(profile_picture);
      }

      if (tokens && provider === 'google') {
        paramCount++;
        insertFields.push('google_tokens');
        insertValues.push(JSON.stringify(tokens));
      }

      const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');
      
      const insertQuery = `
        INSERT INTO users (${insertFields.join(', ')}) 
        VALUES (${placeholders})
        RETURNING *;
      `;
      
      const result = await client.query(insertQuery, insertValues);
      user = result.rows[0];

      // Create auth record with verified=true for OAuth users
      await client.query(`
        INSERT INTO users_auth (
          user_id, 
          password_hash,
          verified
        ) 
        VALUES ($1, $2, true)
      `, [user.id, 'OAUTH_USER']);
    }

    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in createOrUpdateOAuthUser:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Add provider-specific user fetch functions
async function getUserByProviderId(provider, providerId) {
  const query = `
    SELECT * FROM users 
    WHERE ${provider}_id = $1
  `;
  const result = await pool.query(query, [providerId]);
  return result.rows[0];
}

// Add this function to your database.js

async function addProviderColumns() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add provider columns
    await client.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'google_id') THEN
              ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'microsoft_id') THEN
              ALTER TABLE users ADD COLUMN microsoft_id VARCHAR(255) UNIQUE;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'linkedin_id') THEN
              ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(255) UNIQUE;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'auth_provider') THEN
              ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email';
          END IF;
      END $$;
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id);
      CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON users(linkedin_id);
      CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
    `);

    await client.query('COMMIT');
    console.log('Provider columns added successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding provider columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Add business history table creation function
async function createBusinessHistoryTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS business_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_history_entry UNIQUE (user_id, business_id, viewed_at)
      );

      CREATE INDEX IF NOT EXISTS idx_business_history_user ON business_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_business_history_business ON business_history(business_id);
      CREATE INDEX IF NOT EXISTS idx_business_history_viewed_at ON business_history(viewed_at);
    `);

    await client.query('COMMIT');
    console.log('Business history table created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating business history table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function addSubscriptionColumns() {
  const query = `
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;
  `;
  
  try {
    await pool.query(query);
    console.log('Added subscription columns to users table');
  } catch (error) {
    console.error('Error adding subscription columns:', error);
    throw error;
  }
}

// Get featured businesses from database
export async function getFeaturedBusinesses(limit = 5) {
  try {
    const query = `
      SELECT 
        id,
        business_name as name,
        industry,
        location,
        price::numeric as price,
        gross_revenue::numeric as revenue,
        ebitda::numeric as profit,
        date_listed
      FROM businesses
      WHERE is_featured = TRUE OR random() < 0.3
      ORDER BY date_listed DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    
    // If no featured businesses, return some random ones
    if (result.rows.length === 0) {
      const fallbackQuery = `
        SELECT 
          id,
          business_name as name,
          industry,
          location,
          price::numeric as price,
          gross_revenue::numeric as revenue,
          ebitda::numeric as profit,
          date_listed
        FROM businesses
        ORDER BY random()
        LIMIT $1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [limit]);
      return fallbackResult.rows;
    }
    
    return result.rows;
  } catch (error) {
    console.error('Error getting featured businesses:', error);
    return [];
  }
}

export {
  createUserTable,
  createUser,
  getUserByEmail,
  getUserById,
  verifyUser,
  authenticateUser,
  checkTablePersistence,
  createOrUpdateOAuthUser,
  getUserByProviderId,
  addProviderColumns,
  createBusinessHistoryTable,
  addSubscriptionColumns,
};