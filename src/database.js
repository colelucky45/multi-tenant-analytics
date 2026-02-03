const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'observability'
});

// Test connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('✗ PostgreSQL connection error:', err);
});

// Helper function to run queries with org isolation
async function query(text, params = []) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

// Helper to set org context for RLS
async function setOrgContext(client, orgId) {
  await client.query(`SET app.org_id = '${orgId}'`);
}

module.exports = {
  pool,
  query,
  setOrgContext
};