-- Migration: Create analytics tables
-- Description: Create tables for analytics events, reports and dashboards

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT,
  session_id TEXT,
  value DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'count',
  dimensions JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_reports table
CREATE TABLE IF NOT EXISTS analytics_reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  query JSONB NOT NULL,
  visualization JSONB DEFAULT '{}',
  schedule JSONB,
  alerts JSONB,
  access JSONB DEFAULT '{"public": false, "users": [], "roles": []}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_dashboards table
CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  widgets JSONB DEFAULT '[]',
  layout JSONB DEFAULT '{"columns": 12, "rows": 10, "responsive": true}',
  filters JSONB DEFAULT '[]',
  access JSONB DEFAULT '{"public": false, "users": [], "roles": []}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_processed ON analytics_events(processed);

CREATE INDEX IF NOT EXISTS idx_analytics_reports_type ON analytics_reports(type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_created_at ON analytics_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_created_at ON analytics_dashboards(created_at);

-- Add update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_analytics_reports_updated_at 
  BEFORE UPDATE ON analytics_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_dashboards_updated_at 
  BEFORE UPDATE ON analytics_dashboards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();