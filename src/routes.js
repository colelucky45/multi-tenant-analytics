const express = require('express');
const { query } = require('./database');
const { hashPassword, verifyPassword, generateToken, verifyToken } = require('./auth');
const router = express.Router();

// Middleware to verify JWT
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

// Register a new user
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, org_name } = req.body;

    if (!email || !password || !org_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create organization
    const orgResult = await query(
      'INSERT INTO organizations (name, ingest_key_hash) VALUES ($1, $2) RETURNING id',
      [org_name, 'temp-key-hash']
    );
    const orgId = orgResult.rows[0].id;

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userResult = await query(
      'INSERT INTO users (organization_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, role',
      [orgId, email, passwordHash, 'admin']
    );

    const user = userResult.rows[0];
    const token = generateToken(user.id, orgId, user.role);

    res.json({ user_id: user.id, org_id: orgId, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Find user
    const result = await query(
      'SELECT id, organization_id, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.organization_id, user.role);
    res.json({ user_id: user.id, org_id: user.organization_id, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboards
router.get('/v1/organizations/:org_id/dashboards', requireAuth, async (req, res) => {
  try {
    if (req.user.orgId !== req.params.org_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      'SELECT id, name, config, created_at FROM dashboards WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.user.orgId]
    );

    res.json({ dashboards: result.rows });
  } catch (err) {
    console.error('Error fetching dashboards:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create dashboard
router.post('/v1/organizations/:org_id/dashboards', requireAuth, async (req, res) => {
  try {
    if (req.user.orgId !== req.params.org_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, config } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing dashboard name' });
    }

    const result = await query(
      'INSERT INTO dashboards (organization_id, created_by_user_id, name, config) VALUES ($1, $2, $3, $4) RETURNING id, name, created_at',
      [req.user.orgId, req.user.userId, name, config || {}]
    );

    res.json({ dashboard: result.rows[0] });
  } catch (err) {
    console.error('Error creating dashboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alerts
router.get('/v1/organizations/:org_id/alerts', requireAuth, async (req, res) => {
  try {
    if (req.user.orgId !== req.params.org_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      'SELECT id, metric_name, service_name, threshold, condition, duration_seconds, enabled, created_at FROM alerts WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.user.orgId]
    );

    res.json({ alerts: result.rows });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create alert
router.post('/v1/organizations/:org_id/alerts', requireAuth, async (req, res) => {
  try {
    if (req.user.orgId !== req.params.org_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { metric_name, service_name, threshold, condition, duration_seconds } = req.body;

    if (!metric_name || !threshold || !condition) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      'INSERT INTO alerts (organization_id, created_by_user_id, metric_name, service_name, threshold, condition, duration_seconds) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, metric_name, threshold, created_at',
      [req.user.orgId, req.user.userId, metric_name, service_name, threshold, condition, duration_seconds || 300]
    );

    res.json({ alert: result.rows[0] });
  } catch (err) {
    console.error('Error creating alert:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;