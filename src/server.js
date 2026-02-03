const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { query } = require('./database');
const { verifyIngestKey, verifyToken } = require('./auth');
const routes = require('./routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Use all routes
app.use(routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics ingestion (service-to-service)
app.post('/v1/metrics', async (req, res) => {
  try {
    const orgKey = req.headers['x-org-key'];
    if (!orgKey) {
      return res.status(401).json({ error: 'Missing X-Org-Key header' });
    }

    // Verify org key
    const org = await verifyIngestKey(orgKey);
    if (!org) {
      return res.status(401).json({ error: 'Invalid X-Org-Key' });
    }

    const { service_name, environment, metrics } = req.body;

    // Insert metrics into database
    for (const metric of metrics) {
      await query(
        `INSERT INTO metrics (organization_id, service_name, environment, metric_name, value, ts)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [org.id, service_name, environment || 'prod', metric.name, metric.value, metric.ts]
      );
    }

    res.json({ status: 'accepted', metric_count: metrics.length });
  } catch (err) {
    console.error('Error ingesting metrics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get metrics (requires JWT auth)
app.get('/v1/metrics', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { metric_name, service_name } = req.query;
    
    // Build query
    let sql = 'SELECT * FROM metrics WHERE organization_id = $1';
    const params = [decoded.orgId];
    let paramCount = 2;

    if (service_name) {
      sql += ` AND service_name = $${paramCount}`;
      params.push(service_name);
      paramCount++;
    }

    if (metric_name) {
      sql += ` AND metric_name = $${paramCount}`;
      params.push(metric_name);
      paramCount++;
    }

    sql += ' ORDER BY ts DESC LIMIT 1000';

    const result = await query(sql, params);
    res.json({ metrics: result.rows });
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
});