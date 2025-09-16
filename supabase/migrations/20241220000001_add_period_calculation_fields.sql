-- Migration: Add period calculation fields to servers and plans tables
-- Date: 2024-12-20
-- Description: Adds fields for period calculation configuration and credit monitoring

-- Add period calculation fields to servers table
ALTER TABLE servers 
ADD COLUMN period_calculation_type TEXT DEFAULT 'days' CHECK (period_calculation_type IN ('days', 'months')),
ADD COLUMN period_calculation_config JSONB DEFAULT '{}',
ADD COLUMN credit_monitoring_enabled BOOLEAN DEFAULT false,
ADD COLUMN credit_warning_threshold INTEGER DEFAULT 10,
ADD COLUMN credit_critical_threshold INTEGER DEFAULT 0,
ADD COLUMN credit_notification_enabled BOOLEAN DEFAULT false;

-- Add period configuration fields to plans table
ALTER TABLE plans 
ADD COLUMN period_type TEXT DEFAULT 'days' CHECK (period_type IN ('days', 'months')),
ADD COLUMN period_config JSONB DEFAULT '{}';

-- Create index for better performance on period queries
CREATE INDEX IF NOT EXISTS idx_servers_period_calculation ON servers(period_calculation_type);
CREATE INDEX IF NOT EXISTS idx_plans_period_type ON plans(period_type);
CREATE INDEX IF NOT EXISTS idx_servers_credit_monitoring ON servers(credit_monitoring_enabled) WHERE credit_monitoring_enabled = true;

-- Add comments for documentation
COMMENT ON COLUMN servers.period_calculation_type IS 'Type of period calculation: days (exact) or months (calendar - real months)';
COMMENT ON COLUMN servers.period_calculation_config IS 'JSON configuration for period calculation strategy';
COMMENT ON COLUMN servers.credit_monitoring_enabled IS 'Enable credit monitoring for this server';
COMMENT ON COLUMN servers.credit_warning_threshold IS 'Credit threshold for warning notifications';
COMMENT ON COLUMN servers.credit_critical_threshold IS 'Credit threshold for critical notifications (usually 0)';
COMMENT ON COLUMN servers.credit_notification_enabled IS 'Enable notifications for low credits';
COMMENT ON COLUMN plans.period_type IS 'Period type for this plan: days or months';
COMMENT ON COLUMN plans.period_config IS 'JSON configuration for plan period settings';

-- Update existing servers with default configurations
-- NATV servers (assuming they use days by default)
UPDATE servers 
SET 
  period_calculation_type = 'days',
  period_calculation_config = '{"type": "days", "strict": true}',
  credit_monitoring_enabled = true,
  credit_notification_enabled = false
WHERE api_url ILIKE '%natv%' OR name ILIKE '%natv%';

-- The Best servers (they use months)
UPDATE servers 
SET 
  period_calculation_type = 'months',
  period_calculation_config = '{"type": "months", "dayOfMonth": "same"}',
  credit_monitoring_enabled = true,
  credit_notification_enabled = false
WHERE api_url ILIKE '%thebest%' OR name ILIKE '%thebest%' OR name ILIKE '%the best%';

-- Update existing plans with period configuration
-- Convert common validity periods to months where appropriate
UPDATE plans 
SET 
  period_type = 'months',
  period_config = '{"months": 1}'
WHERE validity = 30;

UPDATE plans 
SET 
  period_type = 'months',
  period_config = '{"months": 2}'
WHERE validity = 60;

UPDATE plans 
SET 
  period_type = 'months',
  period_config = '{"months": 3}'
WHERE validity = 90;

UPDATE plans 
SET 
  period_type = 'months',
  period_config = '{"months": 6}'
WHERE validity = 180;

UPDATE plans 
SET 
  period_type = 'months',
  period_config = '{"months": 12}'
WHERE validity = 365;

-- Create notification settings table for credit monitoring
CREATE TABLE IF NOT EXISTS server_credit_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('warning', 'critical')),
  threshold INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(server_id, user_id, notification_type)
);

-- Create index for credit notifications
CREATE INDEX IF NOT EXISTS idx_server_credit_notifications_server ON server_credit_notifications(server_id);
CREATE INDEX IF NOT EXISTS idx_server_credit_notifications_user ON server_credit_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_server_credit_notifications_enabled ON server_credit_notifications(enabled) WHERE enabled = true;

-- Add RLS policies for credit notifications
ALTER TABLE server_credit_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit notifications" ON server_credit_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own credit notifications" ON server_credit_notifications
  FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_server_credit_notifications_updated_at
  BEFORE UPDATE ON server_credit_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for credit notifications table
COMMENT ON TABLE server_credit_notifications IS 'User-specific credit notification settings for servers';
COMMENT ON COLUMN server_credit_notifications.notification_type IS 'Type of notification: warning or critical';
COMMENT ON COLUMN server_credit_notifications.threshold IS 'Credit threshold that triggers this notification';
COMMENT ON COLUMN server_credit_notifications.enabled IS 'Whether this notification is enabled for the user';