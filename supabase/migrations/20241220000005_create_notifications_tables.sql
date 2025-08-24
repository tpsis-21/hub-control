-- 🔔 Migração: Sistema de Notificações
-- Cria tabelas para gerenciar notificações, templates, destinatários e configurações

-- Enum para tipos de notificação
CREATE TYPE notification_type AS ENUM (
  'security_alert',
  'performance_alert', 
  'system_event',
  'user_action',
  'backup_status',
  'compliance_alert',
  'maintenance',
  'error_report',
  'audit_event',
  'custom'
);

-- Enum para canais de notificação
CREATE TYPE notification_channel AS ENUM (
  'email',
  'webhook',
  'in_app'
);

-- Enum para prioridades
CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Enum para status de entrega
CREATE TYPE delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'read'
);

-- Enum para tipos de destinatário
CREATE TYPE recipient_type AS ENUM (
  'user',
  'role',
  'group',
  'webhook'
);

-- Tabela de destinatários
CREATE TABLE notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type recipient_type NOT NULL,
  identifier TEXT NOT NULL, -- email, phone, user_id, etc.
  name TEXT,
  preferences JSONB NOT NULL DEFAULT '{}',
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_recipient_identifier UNIQUE (type, identifier)
);

-- Tabela de templates de notificação
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  subject TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_template_name UNIQUE (name, type, channel)
);

-- Tabela de configurações de canal
CREATE TABLE notification_channel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel notification_channel NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  rate_limit JSONB DEFAULT '{}',
  retry_policy JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Tabela principal de notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'normal',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  channels notification_channel[] NOT NULL,
  template_id UUID REFERENCES notification_templates(id),
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Índices para performance
  CONSTRAINT valid_schedule CHECK (scheduled_for IS NULL OR scheduled_for > created_at),
  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Tabela de relacionamento notificação-destinatário
CREATE TABLE notification_recipients_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES notification_recipients(id) ON DELETE CASCADE,
  delivery_status JSONB NOT NULL DEFAULT '{}', -- status por canal
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_notification_recipient UNIQUE (notification_id, recipient_id)
);

-- Tabela de log de entregas
CREATE TABLE notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES notification_recipients(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  status delivery_status NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  error_message TEXT,
  response_data JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice para consultas por notificação e canal
  INDEX idx_delivery_logs_notification_channel ON notification_delivery_logs(notification_id, channel),
  INDEX idx_delivery_logs_status ON notification_delivery_logs(status, created_at)
);

-- Tabela de estatísticas de notificação
CREATE TABLE notification_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel notification_channel NOT NULL,
  type notification_type NOT NULL,
  priority notification_priority NOT NULL,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  avg_processing_time_ms NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_daily_stats UNIQUE (date, channel, type, priority)
);

-- Tabela de filas de notificação (para processamento em lote)
CREATE TABLE notification_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel notification_channel NOT NULL,
  notification_ids UUID[] NOT NULL,
  batch_size INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_queue_status_scheduled ON notification_queues(status, scheduled_for)
);

-- Tabela de webhooks
CREATE TABLE notification_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT DEFAULT 'POST',
  headers JSONB DEFAULT '{}',
  authentication JSONB DEFAULT '{}',
  timeout_ms INTEGER DEFAULT 30000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_webhook_url CHECK (url ~ '^https?://'),
  CONSTRAINT valid_webhook_method CHECK (method IN ('POST', 'PUT', 'PATCH'))
);

-- Índices para performance
CREATE INDEX idx_notifications_type_priority ON notifications(type, priority);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_recipients_type_identifier ON notification_recipients(type, identifier);
CREATE INDEX idx_recipients_active ON notification_recipients(is_active) WHERE is_active = true;

CREATE INDEX idx_templates_type_channel ON notification_templates(type, channel);
CREATE INDEX idx_templates_active ON notification_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_delivery_logs_created_at ON notification_delivery_logs(created_at DESC);
CREATE INDEX idx_delivery_logs_recipient ON notification_delivery_logs(recipient_id, created_at DESC);

CREATE INDEX idx_statistics_date_channel ON notification_statistics(date DESC, channel);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_notification_recipients_updated_at
  BEFORE UPDATE ON notification_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_channel_configs_updated_at
  BEFORE UPDATE ON notification_channel_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_webhooks_updated_at
  BEFORE UPDATE ON notification_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_statistics_updated_at
  BEFORE UPDATE ON notification_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para processar estatísticas diárias
CREATE OR REPLACE FUNCTION update_notification_statistics()
RETURNS void AS $$
DECLARE
  target_date DATE := CURRENT_DATE - INTERVAL '1 day';
  rec RECORD;
BEGIN
  -- Agregar estatísticas do dia anterior
  FOR rec IN
    SELECT 
      dl.channel,
      n.type,
      n.priority,
      COUNT(*) as total_sent,
      COUNT(*) FILTER (WHERE dl.status = 'delivered') as total_delivered,
      COUNT(*) FILTER (WHERE dl.status = 'failed') as total_failed,
      COUNT(*) FILTER (WHERE dl.status = 'read') as total_read,
      AVG(dl.processing_time_ms) as avg_processing_time
    FROM notification_delivery_logs dl
    JOIN notifications n ON dl.notification_id = n.id
    WHERE DATE(dl.created_at) = target_date
    GROUP BY dl.channel, n.type, n.priority
  LOOP
    INSERT INTO notification_statistics (
      date, channel, type, priority,
      total_sent, total_delivered, total_failed, total_read,
      avg_processing_time_ms
    ) VALUES (
      target_date, rec.channel, rec.type, rec.priority,
      rec.total_sent, rec.total_delivered, rec.total_failed, rec.total_read,
      rec.avg_processing_time
    )
    ON CONFLICT (date, channel, type, priority) DO UPDATE SET
      total_sent = EXCLUDED.total_sent,
      total_delivered = EXCLUDED.total_delivered,
      total_failed = EXCLUDED.total_failed,
      total_read = EXCLUDED.total_read,
      avg_processing_time_ms = EXCLUDED.avg_processing_time_ms,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar notificações antigas
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
  retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Deletar logs de entrega antigos
  DELETE FROM notification_delivery_logs 
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Deletar notificações antigas (cascata deletará relacionamentos)
  DELETE FROM notifications 
  WHERE created_at < cutoff_date
    AND (expires_at IS NULL OR expires_at < NOW());
  
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Deletar filas antigas processadas
  DELETE FROM notification_queues 
  WHERE created_at < cutoff_date
    AND status IN ('completed', 'failed');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de entrega
CREATE OR REPLACE FUNCTION get_delivery_statistics(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  channel notification_channel,
  type notification_type,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC(5,2),
  avg_processing_time NUMERIC(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.channel,
    s.type,
    SUM(s.total_sent) as total_sent,
    SUM(s.total_delivered) as total_delivered,
    SUM(s.total_failed) as total_failed,
    CASE 
      WHEN SUM(s.total_sent) > 0 
      THEN ROUND((SUM(s.total_delivered)::NUMERIC / SUM(s.total_sent)) * 100, 2)
      ELSE 0
    END as delivery_rate,
    ROUND(AVG(s.avg_processing_time_ms), 2) as avg_processing_time
  FROM notification_statistics s
  WHERE s.date BETWEEN start_date AND end_date
  GROUP BY s.channel, s.type
  ORDER BY s.channel, s.type;
END;
$$ LANGUAGE plpgsql;

-- Função para validar preferências de notificação
CREATE OR REPLACE FUNCTION validate_notification_preferences(prefs JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  valid_channels TEXT[] := ARRAY['email', 'webhook', 'in_app'];
  valid_types TEXT[] := ARRAY['security_alert', 'performance_alert', 'system_event', 'user_action', 'backup_status', 'compliance_alert', 'maintenance', 'error_report', 'audit_event', 'custom'];
  channel_key TEXT;
  type_key TEXT;
BEGIN
  -- Validar estrutura básica
  IF NOT (prefs ? 'channels' AND prefs ? 'types' AND prefs ? 'frequency') THEN
    RETURN FALSE;
  END IF;
  
  -- Validar canais
  FOR channel_key IN SELECT jsonb_object_keys(prefs->'channels')
  LOOP
    IF NOT (channel_key = ANY(valid_channels)) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  -- Validar tipos
  FOR type_key IN SELECT jsonb_object_keys(prefs->'types')
  LOOP
    IF NOT (type_key = ANY(valid_types)) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar preferências
CREATE OR REPLACE FUNCTION validate_recipient_preferences()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_notification_preferences(NEW.preferences) THEN
    RAISE EXCEPTION 'Preferências de notificação inválidas';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_notification_recipient_preferences
  BEFORE INSERT OR UPDATE ON notification_recipients
  FOR EACH ROW EXECUTE FUNCTION validate_recipient_preferences();

-- View para dashboard de notificações
CREATE VIEW notification_dashboard AS
SELECT 
  n.id,
  n.type,
  n.priority,
  n.title,
  n.created_at,
  n.scheduled_for,
  n.expires_at,
  array_length(n.channels, 1) as channel_count,
  (
    SELECT COUNT(*) 
    FROM notification_recipients_map nrm 
    WHERE nrm.notification_id = n.id
  ) as recipient_count,
  (
    SELECT COUNT(*) 
    FROM notification_delivery_logs dl 
    WHERE dl.notification_id = n.id AND dl.status = 'delivered'
  ) as delivered_count,
  (
    SELECT COUNT(*) 
    FROM notification_delivery_logs dl 
    WHERE dl.notification_id = n.id AND dl.status = 'failed'
  ) as failed_count,
  CASE 
    WHEN n.scheduled_for IS NOT NULL AND n.scheduled_for > NOW() THEN 'scheduled'
    WHEN n.expires_at IS NOT NULL AND n.expires_at < NOW() THEN 'expired'
    WHEN EXISTS (
      SELECT 1 FROM notification_delivery_logs dl 
      WHERE dl.notification_id = n.id AND dl.status IN ('sent', 'delivered')
    ) THEN 'sent'
    ELSE 'pending'
  END as status
FROM notifications n
ORDER BY n.created_at DESC;

-- View para estatísticas de canal
CREATE VIEW channel_performance AS
SELECT 
  s.channel,
  SUM(s.total_sent) as total_sent,
  SUM(s.total_delivered) as total_delivered,
  SUM(s.total_failed) as total_failed,
  CASE 
    WHEN SUM(s.total_sent) > 0 
    THEN ROUND((SUM(s.total_delivered)::NUMERIC / SUM(s.total_sent)) * 100, 2)
    ELSE 0
  END as delivery_rate,
  ROUND(AVG(s.avg_processing_time_ms), 2) as avg_processing_time,
  COUNT(DISTINCT s.date) as days_active
FROM notification_statistics s
WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.channel
ORDER BY delivery_rate DESC;

-- Inserir configurações padrão de canais
INSERT INTO notification_channel_configs (channel, is_enabled, config, rate_limit, retry_policy) VALUES
('email', true, 
  '{
    "smtp": {
      "host": "localhost",
      "port": 587,
      "secure": false
    },
    "from": "noreply@hubcontrol.com"
  }',
  '{
    "maxPerMinute": 60,
    "maxPerHour": 1000,
    "maxPerDay": 10000
  }',
  '{
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelay": 1000
  }'
),

('webhook', true,
  '{}',
  '{
    "maxPerMinute": 30,
    "maxPerHour": 500,
    "maxPerDay": 5000
  }',
  '{
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelay": 1000
  }'
),
('slack', false,
  '{}',
  '{
    "maxPerMinute": 1,
    "maxPerHour": 100,
    "maxPerDay": 1000
  }',
  '{
    "maxRetries": 2,
    "backoffMultiplier": 2,
    "initialDelay": 2000
  }'
);

-- Inserir templates padrão
INSERT INTO notification_templates (name, type, channel, subject, title, body, variables, is_active) VALUES
('security_alert_email', 'security_alert', 'email', 
  '🚨 Alerta de Segurança - {{severity}}',
  'Alerta de Segurança Detectado',
  '<h2>Alerta de Segurança</h2>
   <p><strong>Tipo:</strong> {{type}}</p>
   <p><strong>Severidade:</strong> {{severity}}</p>
   <p><strong>Descrição:</strong> {{description}}</p>
   <p><strong>Data/Hora:</strong> {{timestamp}}</p>
   <p><strong>IP:</strong> {{ip}}</p>
   <p><strong>Usuário:</strong> {{user}}</p>
   <h3>Ação Recomendada</h3>
   <p>{{recommendation}}</p>
   <hr>
   <p><small>Este é um alerta automático do sistema Hub Control.</small></p>',
  ARRAY['type', 'severity', 'description', 'timestamp', 'ip', 'user', 'recommendation'],
  true
),
('backup_status_webhook', 'backup_status', 'webhook',
  NULL,
  '💾 Status do Backup',
  'Backup {{status}}: {{details}}',
  ARRAY['status', 'details'],
  true
);

-- Políticas RLS (Row Level Security)
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_webhooks ENABLE ROW LEVEL SECURITY;

-- Políticas para administradores (acesso total)
CREATE POLICY "Admins can manage all notification recipients" ON notification_recipients
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all notification templates" ON notification_templates
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all channel configs" ON notification_channel_configs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all notifications" ON notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all recipient mappings" ON notification_recipients_map
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all delivery logs" ON notification_delivery_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all statistics" ON notification_statistics
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all queues" ON notification_queues
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all webhooks" ON notification_webhooks
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Políticas para usuários (acesso limitado)
CREATE POLICY "Users can view their own recipient data" ON notification_recipients
  FOR SELECT USING (
    type = 'user' AND identifier = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY "Users can update their own preferences" ON notification_recipients
  FOR UPDATE USING (
    type = 'user' AND identifier = auth.jwt() ->> 'email'
  );

CREATE POLICY "Users can view active templates" ON notification_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notification_recipients_map nrm
      JOIN notification_recipients nr ON nrm.recipient_id = nr.id
      WHERE nrm.notification_id = notifications.id
        AND nr.type = 'user' 
        AND nr.identifier = auth.jwt() ->> 'email'
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY "Users can view their own delivery logs" ON notification_delivery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notification_recipients nr
      WHERE nr.id = notification_delivery_logs.recipient_id
        AND nr.type = 'user'
        AND nr.identifier = auth.jwt() ->> 'email'
    )
    OR auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

-- Políticas para sistema (service role)
CREATE POLICY "Service role can manage all notification data" ON notification_recipients
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all templates" ON notification_templates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all configs" ON notification_channel_configs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all notifications" ON notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all mappings" ON notification_recipients_map
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all delivery logs" ON notification_delivery_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all statistics" ON notification_statistics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all queues" ON notification_queues
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all webhooks" ON notification_webhooks
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Comentários para documentação
COMMENT ON TABLE notification_recipients IS 'Destinatários de notificações com suas preferências';
COMMENT ON TABLE notification_templates IS 'Templates reutilizáveis para notificações';
COMMENT ON TABLE notification_channel_configs IS 'Configurações dos canais de notificação';
COMMENT ON TABLE notifications IS 'Notificações enviadas pelo sistema';
COMMENT ON TABLE notification_recipients_map IS 'Relacionamento entre notificações e destinatários';
COMMENT ON TABLE notification_delivery_logs IS 'Log detalhado de entregas de notificação';
COMMENT ON TABLE notification_statistics IS 'Estatísticas agregadas de notificações';
COMMENT ON TABLE notification_queues IS 'Filas para processamento em lote';
COMMENT ON TABLE notification_webhooks IS 'Configurações de webhooks para notificações';

COMMENT ON FUNCTION update_notification_statistics() IS 'Atualiza estatísticas diárias de notificações';
COMMENT ON FUNCTION cleanup_old_notifications(INTEGER) IS 'Remove notificações antigas baseado no período de retenção';
COMMENT ON FUNCTION get_delivery_statistics(DATE, DATE) IS 'Retorna estatísticas de entrega para um período';
COMMENT ON FUNCTION validate_notification_preferences(JSONB) IS 'Valida estrutura das preferências de notificação';

COMMENT ON VIEW notification_dashboard IS 'Dashboard com visão geral das notificações';
COMMENT ON VIEW channel_performance IS 'Performance dos canais de notificação nos últimos 30 dias';