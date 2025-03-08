// models/user.js
const pool = require('./database');

const createUserTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        googleId TEXT,
        verified BOOLEAN DEFAULT FALSE,
        picture TEXT,
        phone_number TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
};

const createUser = async (user) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO users (username, email, password, googleId, verified, picture, phone_number, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [user.username, user.email, user.password, user.googleId, user.verified, user.picture, user.phone_number, new Date(), new Date()]);
    return { id: result.rows[0].id, ...user };
  } finally {
    client.release();
  }
};

const getUserByEmail = async (email) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0];
  } finally {
    client.release();
  }
};

const updateUser = async (user) => {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE users
      SET username = $1, email = $2, password = $3, googleId = $4, verified = $5, picture = $6, phone_number = $7, created_at = $8, updated_at = $9
      WHERE id = $10
    `, [user.username, user.email, user.password, user.googleId, user.verified, user.picture, user.phone_number, user.created_at, user.updated_at, user.id]);
  } finally {
    client.release();
  }
};

module.exports = {
  createUserTable,
  createUser,
  getUserByEmail,
  updateUser,
};