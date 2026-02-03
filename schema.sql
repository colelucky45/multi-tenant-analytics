-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  ingest_key_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Users (with role-based access)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'engineer', 'developer', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Metrics (time-series data)
CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL DEFAULT 'prod',
  metric_name VARCHAR(255) NOT NULL,
  value FLOAT NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_metrics_org_ts ON metrics(organization_id, ts DESC);
CREATE INDEX idx_metrics_org_service_metric ON metrics(organization_id, service_name, metric_name, ts DESC);

-- Dashboards
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  metric_name VARCHAR(255) NOT NULL,
  service_name VARCHAR(255),
  threshold FLOAT NOT NULL,
  condition VARCHAR(10) NOT NULL CHECK (condition IN ('>', '<', '>=', '<=', '=')),
  duration_seconds INT NOT NULL DEFAULT 300,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alert events (audit trail)
CREATE TABLE alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES alerts(id),
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metric_value FLOAT NOT NULL,
  status VARCHAR(50) DEFAULT 'fired',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_alert_events_org_alert ON alert_events(organization_id, alert_id, triggered_at DESC);

-- Enable Row-Level Security
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY metrics_org_isolation ON metrics
  FOR SELECT
  USING (organization_id = current_setting('app.org_id')::uuid);

CREATE POLICY dashboards_org_isolation ON dashboards
  FOR ALL
  USING (organization_id = current_setting('app.org_id')::uuid);

CREATE POLICY alerts_org_isolation ON alerts
  FOR ALL
  USING (organization_id = current_setting('app.org_id')::uuid);

CREATE POLICY alert_events_org_isolation ON alert_events
  FOR ALL
  USING (organization_id = current_setting('app.org_id')::uuid);