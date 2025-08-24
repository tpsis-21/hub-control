-- Migration: Sistema de Notificações
-- Criado em: 2024-12-20
-- Descrição: Criação completa do sistema de notificações com todas as tabelas, índices, triggers e funções necessárias

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Criar tipos ENUM
CREATE TYPE notification_type AS ENUM (
  'user',
  'admin', 
  'system',
  'security',
  'marketing',
  'transactional',
  'reminder',
  'alert',
  'announcement',
  'maintenance'
);

CREATE TYPE notification_channel AS ENUM (
  'email',
  'in_app',
  'webhook'
);

CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'processing',
  'sent',
  'delivered',
  'failed',
  'cancelled',
  'expired'
);

CREATE TYPE delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'rejected',
  'spam',
  'unsubscribed'
);

-- Tabela principal de notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  recipients JSONB NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  priority notification_priority DEFAULT 'medium',
  status notification_status DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  template_id UUID,
  template_variables JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_recipients CHECK (jsonb_array_length(recipients) > 0),
  CONSTRAINT valid_subject CHECK (length(trim(subject)) > 0),
  CONSTRAINT valid_content CHECK (length(trim(content)) > 0),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
  CONSTRAINT valid_scheduled_for CHECK (scheduled_for IS NULL OR scheduled_for > created_at),
  CONSTRAINT valid_expires_at CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Templates de notificação
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type notification_type NOT NULL,
  subject_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_template_name CHECK (length(trim(name)) > 0),
  CONSTRAINT valid_subject_template CHECK (length(trim(subject_template)) > 0),
  CONSTRAINT valid_content_template CHECK (length(trim(content_template)) > 0),
  CONSTRAINT valid_version CHECK (version > 0)
);

-- Configurações de canais
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel notification_channel NOT NULL UNIQUE,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  rate_limit JSONB,
  retry_policy JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_config CHECK (jsonb_typeof(config) = 'object')
);

-- Logs de entrega
CREATE TABLE notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  recipient JSONB NOT NULL,
  status delivery_status NOT NULL,
  attempts INTEGER DEFAULT 1,
  response_data JSONB,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processing_time_ms INTEGER,
  
  -- Constraints
  CONSTRAINT valid_attempts CHECK (attempts > 0),
  CONSTRAINT valid_processing_time CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0)
);

-- Webhooks
CREATE TABLE notification_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  headers JSONB DEFAULT '{}',
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  retry_policy JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT valid_webhook_name CHECK (length(trim(name)) > 0),
  CONSTRAINT valid_webhook_url CHECK (url ~* '^https?://'),
  CONSTRAINT valid_events CHECK (array_length(events, 1) > 0),
  CONSTRAINT valid_success_count CHECK (success_count >= 0),
  CONSTRAINT valid_failure_count CHECK (failure_count >= 0)
);

-- Destinatários
CREATE TABLE notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  channels notification_channel[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_recipient_name CHECK (length(trim(name)) > 0),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT has_contact_method CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Estatísticas agregadas (para performance)
CREATE TABLE notification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel notification_channel,
  type notification_type,
  priority notification_priority,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_pending INTEGER DEFAULT 0,
  average_processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_stats_counts CHECK (
    total_sent >= 0 AND 
    total_delivered >= 0 AND 
    total_failed >= 0 AND 
    total_pending >= 0
  ),
  CONSTRAINT valid_processing_time_stats CHECK (average_processing_time_ms >= 0),
  
  -- Unique constraint para evitar duplicatas
  UNIQUE(date, channel, type, priority)
);

-- Índices para performance

-- Notifications
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notifications_user_id ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_template_id ON notifications(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_notifications_retry_count ON notifications(retry_count);
CREATE INDEX idx_notifications_pending ON notifications(status, scheduled_for) WHERE status = 'pending';

-- Delivery Logs
CREATE INDEX idx_delivery_logs_notification_id ON notification_delivery_logs(notification_id);
CREATE INDEX idx_delivery_logs_status ON notification_delivery_logs(status);
CREATE INDEX idx_delivery_logs_channel ON notification_delivery_logs(channel);
CREATE INDEX idx_delivery_logs_created_at ON notification_delivery_logs(created_at);
CREATE INDEX idx_delivery_logs_delivered_at ON notification_delivery_logs(delivered_at) WHERE delivered_at IS NOT NULL;

-- Templates
CREATE INDEX idx_templates_type ON notification_templates(type);
CREATE INDEX idx_templates_enabled ON notification_templates(enabled);
CREATE INDEX idx_templates_name ON notification_templates(name);

-- Channels
CREATE INDEX idx_channels_enabled ON notification_channels(enabled);
CREATE INDEX idx_channels_last_used ON notification_channels(last_used_at) WHERE last_used_at IS NOT NULL;

-- Webhooks
CREATE INDEX idx_webhooks_enabled ON notification_webhooks(enabled);
CREATE INDEX idx_webhooks_events ON notification_webhooks USING GIN(events);
CREATE INDEX idx_webhooks_last_triggered ON notification_webhooks(last_triggered_at) WHERE last_triggered_at IS NOT NULL;

-- Recipients
CREATE INDEX idx_recipients_email ON notification_recipients(email) WHERE email IS NOT NULL;
CREATE INDEX idx_recipients_phone ON notification_recipients(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_recipients_enabled ON notification_recipients(enabled);
CREATE INDEX idx_recipients_channels ON notification_recipients USING GIN(channels);

-- Stats
CREATE INDEX idx_stats_date ON notification_stats(date);
CREATE INDEX idx_stats_channel ON notification_stats(channel) WHERE channel IS NOT NULL;
CREATE INDEX idx_stats_type ON notification_stats(type) WHERE type IS NOT NULL;
CREATE INDEX idx_stats_priority ON notification_stats(priority) WHERE priority IS NOT NULL;

-- Funções e Triggers

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON notification_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON notification_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at
  BEFORE UPDATE ON notification_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stats_updated_at
  BEFORE UPDATE ON notification_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar estatísticas
CREATE OR REPLACE FUNCTION update_notification_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar estatísticas quando status da notificação muda
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO notification_stats (
      date, channel, type, priority,
      total_sent, total_delivered, total_failed, total_pending
    )
    VALUES (
      CURRENT_DATE, NEW.channel, NEW.type, NEW.priority,
      CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'pending' THEN 1 ELSE 0 END
    )
    ON CONFLICT (date, channel, type, priority)
    DO UPDATE SET
      total_sent = notification_stats.total_sent + 
        CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
      total_delivered = notification_stats.total_delivered + 
        CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
      total_failed = notification_stats.total_failed + 
        CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      total_pending = notification_stats.total_pending + 
        CASE WHEN NEW.status = 'pending' THEN 1 ELSE 0 END,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para estatísticas
CREATE TRIGGER update_notification_stats_trigger
  AFTER UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notification_stats();

-- Função para atualizar last_used_at dos canais
CREATE OR REPLACE FUNCTION update_channel_last_used()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE notification_channels 
  SET last_used_at = NOW()
  WHERE channel = NEW.channel;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para last_used_at
CREATE TRIGGER update_channel_last_used_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_channel_last_used();

-- Função para limpeza automática de dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_notifications(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar notificações antigas
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND status IN ('delivered', 'failed', 'cancelled', 'expired');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Deletar logs de entrega órfãos
  DELETE FROM notification_delivery_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * (retention_days / 2)
    AND notification_id NOT IN (SELECT id FROM notifications);
  
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Função para obter estatísticas do sistema
CREATE OR REPLACE FUNCTION get_notification_system_stats(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  total_pending BIGINT,
  delivery_rate NUMERIC,
  avg_processing_time_ms NUMERIC,
  stats_by_channel JSONB,
  stats_by_type JSONB,
  stats_by_priority JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH base_stats AS (
    SELECT 
      SUM(ns.total_sent) as sent,
      SUM(ns.total_delivered) as delivered,
      SUM(ns.total_failed) as failed,
      SUM(ns.total_pending) as pending,
      AVG(ns.average_processing_time_ms) as avg_time
    FROM notification_stats ns
    WHERE ns.date BETWEEN start_date AND end_date
  ),
  channel_stats AS (
    SELECT jsonb_object_agg(
      ns.channel,
      jsonb_build_object(
        'sent', SUM(ns.total_sent),
        'delivered', SUM(ns.total_delivered),
        'failed', SUM(ns.total_failed),
        'pending', SUM(ns.total_pending)
      )
    ) as stats
    FROM notification_stats ns
    WHERE ns.date BETWEEN start_date AND end_date
      AND ns.channel IS NOT NULL
  ),
  type_stats AS (
    SELECT jsonb_object_agg(
      ns.type,
      jsonb_build_object(
        'sent', SUM(ns.total_sent),
        'delivered', SUM(ns.total_delivered),
        'failed', SUM(ns.total_failed),
        'pending', SUM(ns.total_pending)
      )
    ) as stats
    FROM notification_stats ns
    WHERE ns.date BETWEEN start_date AND end_date
      AND ns.type IS NOT NULL
  ),
  priority_stats AS (
    SELECT jsonb_object_agg(
      ns.priority,
      jsonb_build_object(
        'sent', SUM(ns.total_sent),
        'delivered', SUM(ns.total_delivered),
        'failed', SUM(ns.total_failed),
        'pending', SUM(ns.total_pending)
      )
    ) as stats
    FROM notification_stats ns
    WHERE ns.date BETWEEN start_date AND end_date
      AND ns.priority IS NOT NULL
  )
  SELECT 
    bs.sent,
    bs.delivered,
    bs.failed,
    bs.pending,
    CASE 
      WHEN bs.sent > 0 THEN ROUND((bs.delivered::NUMERIC / bs.sent::NUMERIC) * 100, 2)
      ELSE 0
    END,
    ROUND(bs.avg_time, 2),
    cs.stats,
    ts.stats,
    ps.stats
  FROM base_stats bs
  CROSS JOIN channel_stats cs
  CROSS JOIN type_stats ts
  CROSS JOIN priority_stats ps;
END;
$$ language 'plpgsql';

-- Função para verificar saúde do sistema
CREATE OR REPLACE FUNCTION check_notification_system_health()
RETURNS TABLE (
  status TEXT,
  delivery_rate NUMERIC,
  pending_notifications BIGINT,
  failed_notifications_last_hour BIGINT,
  average_processing_time_ms NUMERIC,
  active_channels INTEGER,
  total_channels INTEGER,
  issues TEXT[]
) AS $$
DECLARE
  health_status TEXT := 'healthy';
  issues_array TEXT[] := ARRAY[]::TEXT[];
  delivery_rate_val NUMERIC;
  pending_count BIGINT;
  failed_last_hour BIGINT;
  avg_processing_time NUMERIC;
  active_channels_count INTEGER;
  total_channels_count INTEGER;
BEGIN
  -- Calcular métricas
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END,
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour')
  INTO delivery_rate_val, pending_count, failed_last_hour
  FROM notifications
  WHERE created_at > NOW() - INTERVAL '24 hours';
  
  -- Tempo médio de processamento
  SELECT COALESCE(AVG(processing_time_ms), 0)
  INTO avg_processing_time
  FROM notification_delivery_logs
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND processing_time_ms IS NOT NULL;
  
  -- Contagem de canais
  SELECT 
    COUNT(*) FILTER (WHERE enabled = true),
    COUNT(*)
  INTO active_channels_count, total_channels_count
  FROM notification_channels;
  
  -- Verificar problemas
  IF delivery_rate_val < 95 THEN
    issues_array := array_append(issues_array, 'Taxa de entrega baixa: ' || delivery_rate_val || '%');
  END IF;
  
  IF pending_count > 1000 THEN
    issues_array := array_append(issues_array, 'Muitas notificações pendentes: ' || pending_count);
  END IF;
  
  IF failed_last_hour > 100 THEN
    issues_array := array_append(issues_array, 'Muitas falhas na última hora: ' || failed_last_hour);
  END IF;
  
  IF avg_processing_time > 5000 THEN
    issues_array := array_append(issues_array, 'Tempo de processamento alto: ' || avg_processing_time || 'ms');
  END IF;
  
  IF active_channels_count = 0 THEN
    issues_array := array_append(issues_array, 'Nenhum canal ativo');
  END IF;
  
  -- Determinar status
  IF array_length(issues_array, 1) IS NULL THEN
    health_status := 'healthy';
  ELSIF array_length(issues_array, 1) <= 2 THEN
    health_status := 'degraded';
  ELSE
    health_status := 'unhealthy';
  END IF;
  
  RETURN QUERY SELECT 
    health_status,
    delivery_rate_val,
    pending_count,
    failed_last_hour,
    avg_processing_time,
    active_channels_count,
    total_channels_count,
    issues_array;
END;
$$ language 'plpgsql';

-- Políticas RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;

-- Políticas para notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  ));

CREATE POLICY "Users can create notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM profiles WHERE role IN ('admin', 'moderator')
  ));

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  ));

-- Políticas para templates (apenas admins)
CREATE POLICY "Only admins can manage templates" ON notification_templates
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  ));

-- Políticas para delivery logs (apenas leitura para usuários)
CREATE POLICY "Users can view delivery logs" ON notification_delivery_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.id = notification_id 
      AND (n.user_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM profiles WHERE role = 'admin'
      ))
  ));

-- Políticas para recipients
CREATE POLICY "Users can manage recipients" ON notification_recipients
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role IN ('admin', 'moderator')
  ));

-- Inserir dados iniciais

-- Templates padrão
INSERT INTO notification_templates (name, type, subject_template, content_template, variables) VALUES
('welcome_user', 'user', 'Bem-vindo ao {{app_name}}, {{user.name}}!', 
 'Olá {{user.name}},\n\nSua conta foi criada com sucesso em {{created_at}}.\n\nObrigado por se juntar a nós!', 
 ARRAY['app_name', 'user.name', 'created_at']),

('security_alert', 'security', '🔒 Alerta de Segurança - {{alert_type}}', 
 'Detectamos uma atividade suspeita em sua conta:\n\n{{alert_details}}\n\nSe não foi você, altere sua senha imediatamente.', 
 ARRAY['alert_type', 'alert_details']),

('backup_success', 'system', '✅ Backup Concluído com Sucesso', 
 'O backup do sistema foi concluído com sucesso.\n\nDetalhes:\n- Tamanho: {{backup_size}}\n- Duração: {{duration}}\n- Arquivos: {{file_count}}', 
 ARRAY['backup_size', 'duration', 'file_count']),

('system_maintenance', 'announcement', '🔧 Manutenção Programada - {{maintenance_date}}', 
 'Informamos que haverá manutenção programada em {{maintenance_date}}.\n\nDuração estimada: {{duration}}\n\nServiços afetados: {{affected_services}}', 
 ARRAY['maintenance_date', 'duration', 'affected_services']),

('performance_alert', 'alert', '⚠️ Alerta de Performance - {{metric_name}}', 
 'Detectamos um problema de performance:\n\n{{metric_name}}: {{current_value}} (limite: {{threshold}})\n\nAção recomendada: {{recommended_action}}', 
 ARRAY['metric_name', 'current_value', 'threshold', 'recommended_action']);

-- Configurações de canais padrão (desabilitadas por padrão)
INSERT INTO notification_channels (channel, config, enabled) VALUES
('email', '{}', false),
('sms', '{}', false),
('slack', '{}', false),
('webhook', '{}', false);

-- Destinatário administrador padrão
INSERT INTO notification_recipients (name, email, channels, preferences) VALUES
('Administrador', 'admin@example.com', ARRAY['email'], 
 '{"notifications": {"security": true, "system": true, "alerts": true}}');

-- Configurar job de limpeza automática (executar diariamente às 2:00)
SELECT cron.schedule('cleanup-old-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications(90);');

-- Comentários nas tabelas
COMMENT ON TABLE notifications IS 'Tabela principal de notificações do sistema';
COMMENT ON TABLE notification_templates IS 'Templates reutilizáveis para notificações';
COMMENT ON TABLE notification_channels IS 'Configurações dos canais de notificação';
COMMENT ON TABLE notification_delivery_logs IS 'Logs detalhados de entrega de notificações';
COMMENT ON TABLE notification_webhooks IS 'Configurações de webhooks para eventos';
COMMENT ON TABLE notification_recipients IS 'Destinatários cadastrados no sistema';
COMMENT ON TABLE notification_stats IS 'Estatísticas agregadas para performance';

-- Comentários nas funções
COMMENT ON FUNCTION cleanup_old_notifications(INTEGER) IS 'Remove notificações antigas baseado no período de retenção';
COMMENT ON FUNCTION get_notification_system_stats(DATE, DATE) IS 'Retorna estatísticas completas do sistema de notificações';
COMMENT ON FUNCTION check_notification_system_health() IS 'Verifica a saúde geral do sistema de notificações';

-- Finalizar migração
INSERT INTO schema_migrations (version) VALUES ('20241220000000');

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE 'Sistema de Notificações instalado com sucesso!';
  RAISE NOTICE 'Tabelas criadas: notifications, notification_templates, notification_channels, notification_delivery_logs, notification_webhooks, notification_recipients, notification_stats';
  RAISE NOTICE 'Funções criadas: cleanup_old_notifications, get_notification_system_stats, check_notification_system_health';
  RAISE NOTICE 'Templates padrão inseridos: 5 templates';
  RAISE NOTICE 'Canais configurados: email, sms, slack, webhook (desabilitados)';
  RAISE NOTICE 'Job de limpeza agendado: diariamente às 2:00';
  RAISE NOTICE 'Para configurar os canais, use o script: npm run init:notifications';
END $$;