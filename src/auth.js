const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('./database');
require('dotenv').config();

// Hash ingest key for storage
function hashIngestKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Verify ingest key
async function verifyIngestKey(key) {
  const keyHash = hashIngestKey(key);
  const result = await query(
    'SELECT id FROM organizations WHERE ingest_key_hash = $1',
    [keyHash]
  );
  return result.rows[0];
}

// Hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Verify password
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(userId, orgId, role) {
  return jwt.sign(
    { userId, orgId, role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashIngestKey,
  verifyIngestKey,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};