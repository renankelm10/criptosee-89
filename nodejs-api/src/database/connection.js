const { Pool } = require('pg');
const logger = require('../utils/logger');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false, // Easypanel internal connection
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

// Execute query with error handling
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error', { text, error: error.message });
    throw error;
  }
}

// Get client from pool
async function getClient() {
  return pool.connect();
}

// Close pool
async function close() {
  await pool.end();
  logger.info('Database connection pool closed');
}

module.exports = {
  query,
  getClient,
  testConnection,
  close,
  pool
};