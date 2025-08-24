-- ⚙️ Funções e Views para Sistema de Notificações
-- Migração para criar funções auxiliares, views e triggers

-- Função para obter resumo de entrega de notificações
CREATE OR REPLACE FUNCTION get_notification_delivery_summary(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status_filter TEXT DEFAULT NULL,
  channel_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  date_period DATE,
  total_notifications BIGINT,
  delivered_count BIGINT,
  failed_count BIGINT,
  pending_count BIGINT,
  cancelled_count BIGINT,
  success_rate NUMERIC,
  avg_response_time NUMERIC,
  by_channel JSONB,
  by_priority JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      DATE(ndl.created_at) as day,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ndl.status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE ndl.status = 'failed') as failed,
      COUNT(*) FILTER (WHERE ndl.status = 'pending') as pending,
      COUNT(*) FILTER (WHERE ndl.status = 'cancelled') as cancelled,
      AVG(ndl.response_time) FILTER (WHERE ndl.response_time IS NOT NULL) as avg_resp_time,
      jsonb_object_agg(
        COALESCE(ndl.channel, 'unknown'),
        COUNT(*)
      ) FILTER (WHERE ndl.channel IS NOT NULL) as channels,
      jsonb_object_agg(
        COALESCE(ndl.priority, 'unknown'),
        COUNT(*)
      ) FILTER (WHERE ndl.priority IS NOT NULL) as priorities
    FROM notification_delivery_logs ndl
    WHERE ndl.created_at >= start_date 
      AND ndl.created_at <= end_date
      AND (status_filter IS NULL OR ndl.status = status_filter)
      AND (channel_filter IS NULL OR ndl.channel = channel_filter)
    GROUP BY DATE(ndl.created_at)
  )
  SELECT 
    ds.day,
    ds.total,
    ds.delivered,
    ds.failed,
    ds.pending,
    ds.cancelled,
    CASE 
      WHEN ds.total > 0 THEN ROUND((ds.delivered::NUMERIC / ds.total::NUMERIC) * 100, 2)
      ELSE 0
    END,
    ROUND(ds.avg_resp_time, 2),
    COALESCE(ds.channels, '{}'::jsonb),
    COALESCE(ds.priorities, '{}'::jsonb)
  FROM daily_stats ds
  ORDER BY ds.day DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar fila de notificações
CREATE OR REPLACE FUNCTION process_notification_queue(
  batch_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  processed_count INTEGER,
  failed_count INTEGER,
  details JSONB
) AS $$
DECLARE
  queue_item RECORD;
  processed INTEGER := 0;
  failed INTEGER := 0;
  result_details JSONB := '[]'::jsonb;
BEGIN
  -- Processar itens da fila em lote
  FOR queue_item IN 
    SELECT nq.*, n.type, n.title, n.content, n.priority
    FROM notification_queue nq
    JOIN notifications n ON n.id = nq.notification_id
    WHERE nq.status = 'pending'
      AND (nq.scheduled_for IS NULL OR nq.scheduled_for <= NOW())
    ORDER BY nq.priority DESC, nq.created_at ASC
    LIMIT batch_size
  LOOP
    BEGIN
      -- Marcar como processando
      UPDATE notification_queue 
      SET status = 'processing', 
          updated_at = NOW()
      WHERE id = queue_item.id;
      
      -- Aqui seria feita a integração com o sistema de notificações
      -- Por enquanto, apenas simular o processamento
      
      -- Marcar como processado
      UPDATE notification_queue 
      SET status = 'processed', 
          processed_at = NOW(),
          updated_at = NOW()
      WHERE id = queue_item.id;
      
      processed := processed + 1;
      
      -- Adicionar aos detalhes
      result_details := result_details || jsonb_build_object(
        'id', queue_item.id,
        'notification_id', queue_item.notification_id,
        'status', 'success'
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Marcar como falha
      UPDATE notification_queue 
      SET status = 'failed', 
          error_message = SQLERRM,
          updated_at = NOW()
      WHERE id = queue_item.id;
      
      failed := failed + 1;
      
      -- Adicionar aos detalhes
      result_details := result_details || jsonb_build_object(
        'id', queue_item.id,
        'notification_id', queue_item.notification_id,
        'status', 'failed',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT processed, failed, result_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar dados antigos de notificações
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
  days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE (
  deleted_notifications INTEGER,
  deleted_logs INTEGER,
  deleted_queue_items INTEGER,
  cleanup_date TIMESTAMPTZ
) AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  del_notifications INTEGER;
  del_logs INTEGER;
  del_queue INTEGER;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- Deletar logs de entrega antigos
  DELETE FROM notification_delivery_logs 
  WHERE created_at < cutoff_date;
  GET DIAGNOSTICS del_logs = ROW_COUNT;
  
  -- Deletar itens da fila processados antigos
  DELETE FROM notification_queue 
  WHERE created_at < cutoff_date 
    AND status IN ('processed', 'failed');
  GET DIAGNOSTICS del_queue = ROW_COUNT;
  
  -- Deletar notificações antigas (apenas as que não têm logs recentes)
  DELETE FROM notifications 
  WHERE created_at < cutoff_date
    AND NOT EXISTS (
      SELECT 1 FROM notification_delivery_logs ndl 
      WHERE ndl.notification_id = notifications.id 
        AND ndl.created_at >= cutoff_date
    );
  GET DIAGNOSTICS del_notifications = ROW_COUNT;
  
  RETURN QUERY SELECT del_notifications, del_logs, del_queue, cutoff_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular métricas de performance de notificações
CREATE OR REPLACE FUNCTION calculate_notification_metrics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT,
  calculated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT 
      'total_notifications' as name,
      COUNT(*)::NUMERIC as value,
      'count' as unit
    FROM notifications n
    WHERE n.created_at >= start_date AND n.created_at <= end_date
    
    UNION ALL
    
    SELECT 
      'delivery_success_rate' as name,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE 0
      END as value,
      'percentage' as unit
    FROM notification_delivery_logs ndl
    WHERE ndl.created_at >= start_date AND ndl.created_at <= end_date
    
    UNION ALL
    
    SELECT 
      'avg_response_time' as name,
      COALESCE(ROUND(AVG(response_time), 2), 0) as value,
      'milliseconds' as unit
    FROM notification_delivery_logs ndl
    WHERE ndl.created_at >= start_date 
      AND ndl.created_at <= end_date
      AND ndl.response_time IS NOT NULL
    
    UNION ALL
    
    SELECT 
      'failed_deliveries' as name,
      COUNT(*) FILTER (WHERE status = 'failed')::NUMERIC as value,
      'count' as unit
    FROM notification_delivery_logs ndl
    WHERE ndl.created_at >= start_date AND ndl.created_at <= end_date
    
    UNION ALL
    
    SELECT 
      'pending_queue_items' as name,
      COUNT(*)::NUMERIC as value,
      'count' as unit
    FROM notification_queue nq
    WHERE nq.status = 'pending'
    
    UNION ALL
    
    SELECT 
      'active_recipients' as name,
      COUNT(DISTINCT recipient_id)::NUMERIC as value,
      'count' as unit
    FROM notification_delivery_logs ndl
    WHERE ndl.created_at >= start_date AND ndl.created_at <= end_date
    
    UNION ALL
    
    SELECT 
      'webhook_success_rate' as name,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'delivered' AND webhook_id IS NOT NULL)::NUMERIC / 
                COUNT(*) FILTER (WHERE webhook_id IS NOT NULL)::NUMERIC) * 100, 2)
        ELSE 0
      END as value,
      'percentage' as unit
    FROM notification_delivery_logs ndl
    WHERE ndl.created_at >= start_date 
      AND ndl.created_at <= end_date
      AND ndl.webhook_id IS NOT NULL
  )
  SELECT m.name, m.value, m.unit, NOW()
  FROM metrics m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para dashboard de notificações
CREATE OR REPLACE VIEW notification_dashboard AS
WITH recent_stats AS (
  SELECT 
    COUNT(*) as total_notifications_24h,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as notifications_last_hour,
    COUNT(DISTINCT type) as unique_types_24h
  FROM notifications 
  WHERE created_at >= NOW() - INTERVAL '24 hours'
),
delivery_stats AS (
  SELECT 
    COUNT(*) as total_deliveries_24h,
    COUNT(*) FILTER (WHERE status = 'delivered') as successful_deliveries_24h,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_deliveries_24h,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_deliveries_24h,
    AVG(response_time) FILTER (WHERE response_time IS NOT NULL) as avg_response_time_24h,
    COUNT(DISTINCT channel) as active_channels_24h
  FROM notification_delivery_logs 
  WHERE created_at >= NOW() - INTERVAL '24 hours'
),
queue_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') as pending_queue_items,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_queue_items,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_queue_items
  FROM notification_queue
),
webhook_stats AS (
  SELECT 
    COUNT(*) as total_webhooks,
    COUNT(*) FILTER (WHERE enabled = true) as active_webhooks,
    COUNT(DISTINCT url) as unique_webhook_urls
  FROM notification_webhooks
)
SELECT 
  -- Estatísticas de notificações
  rs.total_notifications_24h,
  rs.notifications_last_hour,
  rs.unique_types_24h,
  
  -- Estatísticas de entrega
  ds.total_deliveries_24h,
  ds.successful_deliveries_24h,
  ds.failed_deliveries_24h,
  ds.pending_deliveries_24h,
  CASE 
    WHEN ds.total_deliveries_24h > 0 THEN 
      ROUND((ds.successful_deliveries_24h::NUMERIC / ds.total_deliveries_24h::NUMERIC) * 100, 2)
    ELSE 0
  END as success_rate_24h,
  ROUND(ds.avg_response_time_24h, 2) as avg_response_time_24h,
  ds.active_channels_24h,
  
  -- Estatísticas da fila
  qs.pending_queue_items,
  qs.processing_queue_items,
  qs.failed_queue_items,
  
  -- Estatísticas de webhooks
  ws.total_webhooks,
  ws.active_webhooks,
  ws.unique_webhook_urls,
  
  -- Timestamp da consulta
  NOW() as generated_at
FROM recent_stats rs
CROSS JOIN delivery_stats ds
CROSS JOIN queue_stats qs
CROSS JOIN webhook_stats ws;

-- View para performance de canais
CREATE OR REPLACE VIEW notification_channel_performance AS
SELECT 
  ndl.channel,
  COUNT(*) as total_deliveries,
  COUNT(*) FILTER (WHERE ndl.status = 'delivered') as successful_deliveries,
  COUNT(*) FILTER (WHERE ndl.status = 'failed') as failed_deliveries,
  COUNT(*) FILTER (WHERE ndl.status = 'pending') as pending_deliveries,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE ndl.status = 'delivered')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
    ELSE 0
  END as success_rate,
  AVG(ndl.response_time) FILTER (WHERE ndl.response_time IS NOT NULL) as avg_response_time,
  MIN(ndl.response_time) FILTER (WHERE ndl.response_time IS NOT NULL) as min_response_time,
  MAX(ndl.response_time) FILTER (WHERE ndl.response_time IS NOT NULL) as max_response_time,
  AVG(ndl.attempt_count) as avg_attempts,
  COUNT(DISTINCT ndl.recipient_id) as unique_recipients,
  DATE_TRUNC('hour', ndl.created_at) as hour_period
FROM notification_delivery_logs ndl
WHERE ndl.created_at >= NOW() - INTERVAL '24 hours'
  AND ndl.channel IS NOT NULL
GROUP BY ndl.channel, DATE_TRUNC('hour', ndl.created_at)
ORDER BY hour_period DESC, ndl.channel;

-- View para análise de webhooks
CREATE OR REPLACE VIEW webhook_analysis AS
SELECT 
  nw.id,
  nw.name,
  nw.url,
  nw.enabled,
  nw.events,
  COUNT(ndl.id) as total_calls_24h,
  COUNT(ndl.id) FILTER (WHERE ndl.status = 'delivered') as successful_calls_24h,
  COUNT(ndl.id) FILTER (WHERE ndl.status = 'failed') as failed_calls_24h,
  CASE 
    WHEN COUNT(ndl.id) > 0 THEN 
      ROUND((COUNT(ndl.id) FILTER (WHERE ndl.status = 'delivered')::NUMERIC / COUNT(ndl.id)::NUMERIC) * 100, 2)
    ELSE 0
  END as success_rate_24h,
  AVG(ndl.response_time) FILTER (WHERE ndl.response_time IS NOT NULL) as avg_response_time_24h,
  MAX(ndl.created_at) as last_call_at,
  COUNT(DISTINCT ndl.event_type) as unique_events_24h,
  nw.created_at as webhook_created_at,
  nw.updated_at as webhook_updated_at
FROM notification_webhooks nw
LEFT JOIN notification_delivery_logs ndl ON ndl.webhook_id = nw.id 
  AND ndl.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY nw.id, nw.name, nw.url, nw.enabled, nw.events, nw.created_at, nw.updated_at
ORDER BY total_calls_24h DESC, nw.name;

-- Trigger para atualizar estatísticas automaticamente
CREATE OR REPLACE FUNCTION update_notification_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar estatísticas na tabela de estatísticas
  INSERT INTO notification_stats (date, total_sent, total_delivered, total_failed, total_pending)
  VALUES (
    CURRENT_DATE,
    COALESCE((SELECT COUNT(*) FROM notifications WHERE DATE(created_at) = CURRENT_DATE), 0),
    COALESCE((SELECT COUNT(*) FROM notification_delivery_logs WHERE DATE(created_at) = CURRENT_DATE AND status = 'delivered'), 0),
    COALESCE((SELECT COUNT(*) FROM notification_delivery_logs WHERE DATE(created_at) = CURRENT_DATE AND status = 'failed'), 0),
    COALESCE((SELECT COUNT(*) FROM notification_delivery_logs WHERE DATE(created_at) = CURRENT_DATE AND status = 'pending'), 0)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_failed = EXCLUDED.total_failed,
    total_pending = EXCLUDED.total_pending,
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar estatísticas
DROP TRIGGER IF EXISTS trigger_update_notification_stats ON notifications;
CREATE TRIGGER trigger_update_notification_stats
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_notification_stats();

DROP TRIGGER IF EXISTS trigger_update_delivery_stats ON notification_delivery_logs;
CREATE TRIGGER trigger_update_delivery_stats
  AFTER INSERT OR UPDATE OR DELETE ON notification_delivery_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_notification_stats();

-- Função para validar configuração de webhook
CREATE OR REPLACE FUNCTION validate_webhook_config(
  webhook_url TEXT,
  webhook_events TEXT[]
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  validation_details JSONB
) AS $$
DECLARE
  url_valid BOOLEAN := false;
  events_valid BOOLEAN := false;
  details JSONB := '{}'::jsonb;
BEGIN
  -- Validar URL
  BEGIN
    IF webhook_url ~ '^https?://[^\s/$.?#].[^\s]*$' THEN
      url_valid := true;
      details := details || jsonb_build_object('url_format', 'valid');
    ELSE
      details := details || jsonb_build_object('url_format', 'invalid', 'url_error', 'URL format is invalid');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    details := details || jsonb_build_object('url_format', 'error', 'url_error', SQLERRM);
  END;
  
  -- Validar eventos
  IF array_length(webhook_events, 1) > 0 THEN
    events_valid := true;
    details := details || jsonb_build_object('events_count', array_length(webhook_events, 1));
  ELSE
    details := details || jsonb_build_object('events_error', 'At least one event must be specified');
  END IF;
  
  -- Retornar resultado
  IF url_valid AND events_valid THEN
    RETURN QUERY SELECT true, NULL::TEXT, details;
  ELSE
    RETURN QUERY SELECT false, 'Webhook validation failed', details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índices para otimização de performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_type ON notifications(created_at, type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority_status ON notifications(priority, status);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_created_status ON notification_delivery_logs(created_at, status);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_channel_status ON notification_delivery_logs(channel, status);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_webhook_id ON notification_delivery_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_recipient_id ON notification_delivery_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_queue_status_scheduled ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_queue_priority_created ON notification_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled_events ON notification_webhooks(enabled, events);
CREATE INDEX IF NOT EXISTS idx_recipients_type_identifier ON notification_recipients(type, identifier);
CREATE INDEX IF NOT EXISTS idx_templates_type_channel ON notification_templates(type, channel);

-- Comentários nas funções
COMMENT ON FUNCTION get_notification_delivery_summary IS 'Gera resumo de entregas de notificação por período';
COMMENT ON FUNCTION process_notification_queue IS 'Processa fila de notificações em lote';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Remove dados antigos de notificações';
COMMENT ON FUNCTION calculate_notification_metrics IS 'Calcula métricas de performance do sistema de notificações';
COMMENT ON FUNCTION validate_webhook_config IS 'Valida configuração de webhook';

-- Comentários nas views
COMMENT ON VIEW notification_dashboard IS 'Dashboard principal com estatísticas de notificações';
COMMENT ON VIEW notification_channel_performance IS 'Performance de canais de notificação por hora';
COMMENT ON VIEW webhook_analysis IS 'Análise de performance de webhooks';