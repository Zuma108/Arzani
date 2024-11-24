const db = require('../server');

const createUserTable = () => {
  const stmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      googleId TEXT UNIQUE,
      verified BOOLEAN DEFAULT FALSE,
      picture TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  stmt.run();
};

const createUser = (user) => {
  const stmt = db.prepare(`
    INSERT INTO users (email, password, googleId, verified, picture)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(user.email, user.password, user.googleId, user.verified, user.picture);
  return { id: info.lastInsertRowid, ...user };
};

const getUserByEmail = (email) => {
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  return stmt.get(email);
};

module.exports = {
  createUserTable,
  createUser,
  getUserByEmail,
};