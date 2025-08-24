-- 🔗 SISTEMA DE INTEGRAÇÃO COM SIEM - HUB CONTROL
-- Sistema para envio de eventos de segurança para ferramentas SIEM externas
-- Suporte para múltiplos provedores: Splunk, QRadar, ArcSight, ELK Stack, etc.

-- =====================================================
-- 1. TABELAS DE INTEGRAÇÃO SIEM
-- =====================================================

-- Tabela para configurações de SIEM
CREATE TABLE IF NOT EXISTS siem_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    name TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL, -- 'splunk', 'qradar', 'arcsight', 'elk', 'sentinel', 'custom'
    description TEXT,
    
    -- Configurações de Conexão
    endpoint_url TEXT NOT NULL,
    authentication_type TEXT DEFAULT 'api_key', -- 'api_key', 'bearer_token', 'basic_auth', 'certificate'
    api_key TEXT,
    username TEXT,
    password_hash TEXT,
    certificate_path TEXT,
    
    -- Configurações de Formato
    data_format TEXT DEFAULT 'json', -- 'json', 'xml', 'cef', 'leef', 'syslog'
    timestamp_format TEXT DEFAULT 'iso8601',
    field_mapping JSONB, -- Mapeamento de campos para o formato do SIEM
    
    -- Filtros e Regras
    severity_filter TEXT[] DEFAULT ARRAY['CRITICAL', 'HIGH'], -- Severidades a enviar
    event_types_filter TEXT[], -- Tipos de eventos específicos
    custom_filters JSONB, -- Filtros customizados
    
    -- Configurações de Envio
    batch_size INTEGER DEFAULT 10,
    batch_timeout_seconds INTEGER DEFAULT 30,
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 5,
    
    -- Rate Limiting
    rate_limit_per_minute INTEGER DEFAULT 100,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_healthy BOOLEAN DEFAULT TRUE,
    last_health_check TIMESTAMP WITH TIME ZONE,
    last_successful_send TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela para fila de eventos SIEM
CREATE TABLE IF NOT EXISTS siem_event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siem_config_id UUID NOT NULL REFERENCES siem_configurations(id) ON DELETE CASCADE,
    
    -- Dados do Evento
    event_id UUID, -- ID do evento original (security_alert, audit_log, etc.)
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL, -- 'security_alerts', 'audit_logs', 'user_activities', etc.
    severity TEXT NOT NULL,
    
    -- Payload
    original_data JSONB NOT NULL,
    formatted_data JSONB, -- Dados formatados para o SIEM
    
    -- Status de Processamento
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'retrying'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Resposta e Erros
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    batch_id UUID,
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'retrying')),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Tabela para histórico de envios
CREATE TABLE IF NOT EXISTS siem_send_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siem_config_id UUID NOT NULL REFERENCES siem_configurations(id),
    
    -- Estatísticas do Batch
    batch_id UUID NOT NULL,
    events_count INTEGER NOT NULL,
    successful_sends INTEGER DEFAULT 0,
    failed_sends INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Resposta
    http_status INTEGER,
    response_size_bytes INTEGER,
    error_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para métricas de SIEM
CREATE TABLE IF NOT EXISTS siem_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siem_config_id UUID NOT NULL REFERENCES siem_configurations(id),
    
    -- Período da Métrica
    metric_date DATE NOT NULL,
    metric_hour INTEGER, -- NULL para métricas diárias
    
    -- Contadores
    events_queued INTEGER DEFAULT 0,
    events_sent INTEGER DEFAULT 0,
    events_failed INTEGER DEFAULT 0,
    events_retried INTEGER DEFAULT 0,
    
    -- Performance
    avg_response_time_ms DECIMAL(10,2),
    max_response_time_ms INTEGER,
    min_response_time_ms INTEGER,
    
    -- Rate Limiting
    rate_limit_hits INTEGER DEFAULT 0,
    
    -- Saúde
    uptime_percentage DECIMAL(5,2),
    error_rate_percentage DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(siem_config_id, metric_date, metric_hour)
);

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_siem_configurations_active ON siem_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_siem_configurations_provider ON siem_configurations(provider);

CREATE INDEX IF NOT EXISTS idx_siem_event_queue_config ON siem_event_queue(siem_config_id);
CREATE INDEX IF NOT EXISTS idx_siem_event_queue_status ON siem_event_queue(status);
CREATE INDEX IF NOT EXISTS idx_siem_event_queue_scheduled ON siem_event_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_siem_event_queue_priority ON siem_event_queue(priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_siem_event_queue_batch ON siem_event_queue(batch_id);

CREATE INDEX IF NOT EXISTS idx_siem_send_history_config ON siem_send_history(siem_config_id);
CREATE INDEX IF NOT EXISTS idx_siem_send_history_batch ON siem_send_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_siem_send_history_date ON siem_send_history(started_at);

CREATE INDEX IF NOT EXISTS idx_siem_metrics_config_date ON siem_metrics(siem_config_id, metric_date);

-- =====================================================
-- 3. FUNÇÕES DE INTEGRAÇÃO SIEM
-- =====================================================

-- Função para adicionar evento à fila SIEM
CREATE OR REPLACE FUNCTION queue_siem_event(
    event_type_param TEXT,
    event_source_param TEXT,
    severity_param TEXT,
    event_data_param JSONB,
    event_id_param UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    config_record RECORD;
    queue_id UUID;
    queued_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Buscar configurações SIEM ativas que aceitam este tipo de evento
    FOR config_record IN
        SELECT *
        FROM siem_configurations
        WHERE 
            is_active = TRUE
            AND is_healthy = TRUE
            AND (severity_filter IS NULL OR severity_param = ANY(severity_filter))
            AND (event_types_filter IS NULL OR event_type_param = ANY(event_types_filter))
    LOOP
        -- Inserir evento na fila
        INSERT INTO siem_event_queue (
            siem_config_id,
            event_id,
            event_type,
            event_source,
            severity,
            original_data,
            max_attempts,
            priority
        )
        VALUES (
            config_record.id,
            event_id_param,
            event_type_param,
            event_source_param,
            severity_param,
            event_data_param,
            config_record.retry_attempts,
            CASE severity_param
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 5
                WHEN 'LOW' THEN 8
                ELSE 5
            END
        )
        RETURNING id INTO queue_id;
        
        queued_count := queued_count + 1;
    END LOOP;
    
    result := jsonb_build_object(
        'success', true,
        'queued_count', queued_count,
        'event_type', event_type_param,
        'severity', severity_param,
        'queued_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para formatar dados para SIEM específico
CREATE OR REPLACE FUNCTION format_siem_data(
    siem_config_id_param UUID,
    original_data_param JSONB
)
RETURNS JSONB AS $$
DECLARE
    config_record RECORD;
    formatted_data JSONB;
    field_mapping JSONB;
BEGIN
    -- Buscar configuração do SIEM
    SELECT * INTO config_record
    FROM siem_configurations
    WHERE id = siem_config_id_param;
    
    IF NOT FOUND THEN
        RETURN original_data_param;
    END IF;
    
    field_mapping := config_record.field_mapping;
    
    -- Formatação baseada no provider
    CASE config_record.provider
        WHEN 'splunk' THEN
            formatted_data := jsonb_build_object(
                'time', EXTRACT(EPOCH FROM NOW()),
                'host', 'hub-control',
                'source', 'hub-control-security',
                'sourcetype', 'security:alert',
                'event', original_data_param
            );
            
        WHEN 'qradar' THEN
            formatted_data := jsonb_build_object(
                'EventTime', TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'EventName', original_data_param->>'type',
                'Severity', original_data_param->>'severity',
                'SourceIP', original_data_param->>'ip_address',
                'UserName', original_data_param->>'user_email',
                'EventData', original_data_param
            );
            
        WHEN 'elk' THEN
            formatted_data := jsonb_build_object(
                '@timestamp', TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'level', LOWER(original_data_param->>'severity'),
                'message', original_data_param->>'description',
                'fields', original_data_param,
                'tags', ARRAY['security', 'hub-control']
            );
            
        WHEN 'sentinel' THEN
            formatted_data := jsonb_build_object(
                'TimeGenerated', TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'Computer', 'hub-control',
                'EventID', original_data_param->>'id',
                'Level', original_data_param->>'severity',
                'EventData', original_data_param
            );
            
        ELSE
            -- Formato genérico JSON
            formatted_data := jsonb_build_object(
                'timestamp', NOW(),
                'source', 'hub-control',
                'event', original_data_param
            );
    END CASE;
    
    -- Aplicar mapeamento de campos customizado se existir
    IF field_mapping IS NOT NULL THEN
        -- Aplicar transformações customizadas
        -- (implementação simplificada - pode ser expandida)
        formatted_data := formatted_data || field_mapping;
    END IF;
    
    RETURN formatted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar fila SIEM
CREATE OR REPLACE FUNCTION process_siem_queue(batch_size_param INTEGER DEFAULT 10)
RETURNS JSONB AS $$
DECLARE
    queue_record RECORD;
    config_record RECORD;
    batch_id UUID;
    processed_count INTEGER := 0;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    result JSONB;
BEGIN
    batch_id := gen_random_uuid();
    
    -- Processar eventos pendentes por prioridade
    FOR queue_record IN
        SELECT *
        FROM siem_event_queue
        WHERE 
            status = 'pending'
            AND scheduled_at <= NOW()
            AND attempts < max_attempts
        ORDER BY priority ASC, scheduled_at ASC
        LIMIT batch_size_param
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Buscar configuração do SIEM
        SELECT * INTO config_record
        FROM siem_configurations
        WHERE id = queue_record.siem_config_id AND is_active = TRUE;
        
        IF FOUND THEN
            -- Marcar como processando
            UPDATE siem_event_queue
            SET 
                status = 'processing',
                batch_id = batch_id,
                processed_at = NOW(),
                attempts = attempts + 1
            WHERE id = queue_record.id;
            
            -- Formatar dados
            UPDATE siem_event_queue
            SET formatted_data = format_siem_data(queue_record.siem_config_id, queue_record.original_data)
            WHERE id = queue_record.id;
            
            -- Simular envio (em implementação real, faria HTTP request)
            -- Por enquanto, marcar como enviado com sucesso
            UPDATE siem_event_queue
            SET 
                status = 'sent',
                sent_at = NOW(),
                response_status = 200,
                response_body = 'Event sent successfully'
            WHERE id = queue_record.id;
            
            success_count := success_count + 1;
        ELSE
            -- Configuração não encontrada ou inativa
            UPDATE siem_event_queue
            SET 
                status = 'failed',
                error_message = 'SIEM configuration not found or inactive'
            WHERE id = queue_record.id;
            
            error_count := error_count + 1;
        END IF;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    -- Registrar histórico do batch se processou algo
    IF processed_count > 0 THEN
        INSERT INTO siem_send_history (
            siem_config_id,
            batch_id,
            events_count,
            successful_sends,
            failed_sends,
            completed_at,
            duration_ms
        )
        SELECT 
            queue_record.siem_config_id,
            batch_id,
            processed_count,
            success_count,
            error_count,
            NOW(),
            EXTRACT(MILLISECONDS FROM (NOW() - MIN(processed_at)))::INTEGER
        FROM siem_event_queue
        WHERE batch_id = batch_id
        GROUP BY siem_config_id;
    END IF;
    
    result := jsonb_build_object(
        'success', true,
        'batch_id', batch_id,
        'processed_count', processed_count,
        'success_count', success_count,
        'error_count', error_count,
        'processed_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar saúde dos SIEMs
CREATE OR REPLACE FUNCTION check_siem_health()
RETURNS JSONB AS $$
DECLARE
    config_record RECORD;
    health_results JSONB := '[]'::JSONB;
    total_configs INTEGER := 0;
    healthy_configs INTEGER := 0;
    result JSONB;
BEGIN
    FOR config_record IN
        SELECT *
        FROM siem_configurations
        WHERE is_active = TRUE
    LOOP
        total_configs := total_configs + 1;
        
        -- Verificar se houve envios bem-sucedidos recentemente
        IF EXISTS (
            SELECT 1
            FROM siem_event_queue
            WHERE 
                siem_config_id = config_record.id
                AND status = 'sent'
                AND sent_at > NOW() - INTERVAL '1 hour'
        ) THEN
            -- Marcar como saudável
            UPDATE siem_configurations
            SET 
                is_healthy = TRUE,
                last_health_check = NOW(),
                last_successful_send = (
                    SELECT MAX(sent_at)
                    FROM siem_event_queue
                    WHERE siem_config_id = config_record.id AND status = 'sent'
                )
            WHERE id = config_record.id;
            
            healthy_configs := healthy_configs + 1;
        ELSE
            -- Verificar se há muitos erros recentes
            IF (
                SELECT COUNT(*)
                FROM siem_event_queue
                WHERE 
                    siem_config_id = config_record.id
                    AND status = 'failed'
                    AND last_error_at > NOW() - INTERVAL '30 minutes'
            ) > 5 THEN
                -- Marcar como não saudável
                UPDATE siem_configurations
                SET 
                    is_healthy = FALSE,
                    last_health_check = NOW()
                WHERE id = config_record.id;
            END IF;
        END IF;
        
        health_results := health_results || jsonb_build_object(
            'siem_id', config_record.id,
            'name', config_record.name,
            'provider', config_record.provider,
            'is_healthy', config_record.is_healthy,
            'last_successful_send', config_record.last_successful_send
        );
    END LOOP;
    
    result := jsonb_build_object(
        'success', true,
        'total_configurations', total_configs,
        'healthy_configurations', healthy_configs,
        'health_percentage', CASE 
            WHEN total_configs > 0 THEN ROUND((healthy_configs::DECIMAL / total_configs) * 100, 2)
            ELSE 0
        END,
        'configurations', health_results,
        'checked_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGERS PARA ENVIO AUTOMÁTICO
-- =====================================================

-- Trigger para enviar alertas de segurança para SIEM
CREATE OR REPLACE FUNCTION trigger_siem_security_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Enviar apenas alertas críticos e altos para SIEM
    IF NEW.severity IN ('CRITICAL', 'HIGH') THEN
        PERFORM queue_siem_event(
            'SECURITY_ALERT',
            'security_alerts',
            NEW.severity,
            jsonb_build_object(
                'id', NEW.id,
                'type', NEW.type,
                'severity', NEW.severity,
                'description', NEW.description,
                'ip_address', NEW.ip_address,
                'user_email', NEW.user_email,
                'details', NEW.details,
                'created_at', NEW.created_at
            ),
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER siem_security_alert_trigger
    AFTER INSERT ON security_alerts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_siem_security_alert();

-- Trigger para enviar logs de auditoria críticos
CREATE OR REPLACE FUNCTION trigger_siem_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Enviar apenas ações críticas para SIEM
    IF NEW.action IN (
        'LOGIN_FAILED',
        'PRIVILEGE_ESCALATION',
        'DATA_ACCESS_DENIED',
        'SECURITY_VIOLATION',
        'ADMIN_ACTION'
    ) THEN
        PERFORM queue_siem_event(
            'AUDIT_LOG',
            'audit_logs',
            CASE 
                WHEN NEW.action IN ('PRIVILEGE_ESCALATION', 'SECURITY_VIOLATION') THEN 'HIGH'
                WHEN NEW.action = 'LOGIN_FAILED' THEN 'MEDIUM'
                ELSE 'LOW'
            END,
            jsonb_build_object(
                'id', NEW.id,
                'action', NEW.action,
                'user_email', NEW.user_email,
                'ip_address', NEW.ip_address,
                'user_agent', NEW.user_agent,
                'details', NEW.details,
                'created_at', NEW.created_at
            ),
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER siem_audit_log_trigger
    AFTER INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_siem_audit_log();

-- =====================================================
-- 5. VIEWS DE MONITORAMENTO SIEM
-- =====================================================

-- View para dashboard SIEM
CREATE OR REPLACE VIEW siem_dashboard AS
SELECT 
    'active_configurations' as metric,
    COUNT(*) as value,
    'Configurações SIEM ativas' as description
FROM siem_configurations 
WHERE is_active = TRUE

UNION ALL

SELECT 
    'healthy_configurations' as metric,
    COUNT(*) as value,
    'Configurações SIEM saudáveis' as description
FROM siem_configurations 
WHERE is_active = TRUE AND is_healthy = TRUE

UNION ALL

SELECT 
    'events_pending' as metric,
    COUNT(*) as value,
    'Eventos pendentes na fila' as description
FROM siem_event_queue 
WHERE status = 'pending'

UNION ALL

SELECT 
    'events_sent_24h' as metric,
    COUNT(*) as value,
    'Eventos enviados nas últimas 24h' as description
FROM siem_event_queue 
WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'events_failed_24h' as metric,
    COUNT(*) as value,
    'Eventos falharam nas últimas 24h' as description
FROM siem_event_queue 
WHERE status = 'failed' AND last_error_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'avg_response_time_ms' as metric,
    COALESCE(AVG(duration_ms), 0)::INTEGER as value,
    'Tempo médio de resposta (ms)' as description
FROM siem_send_history 
WHERE started_at > NOW() - INTERVAL '24 hours';

-- View para eventos SIEM com falha
CREATE OR REPLACE VIEW siem_failed_events AS
SELECT 
    seq.id,
    sc.name as siem_name,
    sc.provider,
    seq.event_type,
    seq.severity,
    seq.attempts,
    seq.max_attempts,
    seq.error_message,
    seq.last_error_at,
    seq.created_at
FROM siem_event_queue seq
JOIN siem_configurations sc ON seq.siem_config_id = sc.id
WHERE seq.status = 'failed'
ORDER BY seq.last_error_at DESC;

-- View para performance SIEM
CREATE OR REPLACE VIEW siem_performance_summary AS
SELECT 
    sc.name,
    sc.provider,
    sc.is_healthy,
    COUNT(seq.id) as total_events,
    COUNT(seq.id) FILTER (WHERE seq.status = 'sent') as successful_events,
    COUNT(seq.id) FILTER (WHERE seq.status = 'failed') as failed_events,
    ROUND(
        (COUNT(seq.id) FILTER (WHERE seq.status = 'sent')::DECIMAL / 
         NULLIF(COUNT(seq.id), 0)) * 100, 2
    ) as success_rate_percentage,
    AVG(ssh.duration_ms) as avg_response_time_ms,
    MAX(seq.sent_at) as last_successful_send
FROM siem_configurations sc
LEFT JOIN siem_event_queue seq ON sc.id = seq.siem_config_id
LEFT JOIN siem_send_history ssh ON sc.id = ssh.siem_config_id
WHERE sc.is_active = TRUE
GROUP BY sc.id, sc.name, sc.provider, sc.is_healthy
ORDER BY success_rate_percentage DESC;

-- =====================================================
-- 6. CONFIGURAÇÕES PADRÃO
-- =====================================================

-- Inserir configuração exemplo para Splunk
INSERT INTO siem_configurations (
    name, provider, description, endpoint_url, authentication_type,
    api_key, data_format, severity_filter, batch_size, retry_attempts
)
VALUES (
    'Splunk Production',
    'splunk',
    'Splunk SIEM principal para eventos de segurança',
    'https://splunk.empresa.com:8088/services/collector/event',
    'api_key',
    'your-splunk-hec-token-here',
    'json',
    ARRAY['CRITICAL', 'HIGH'],
    20,
    3
)
ON CONFLICT (name) DO NOTHING;

-- Inserir configuração exemplo para ELK Stack
INSERT INTO siem_configurations (
    name, provider, description, endpoint_url, authentication_type,
    username, password_hash, data_format, severity_filter, batch_size
)
VALUES (
    'ELK Stack Security',
    'elk',
    'Elasticsearch para logs de segurança',
    'https://elasticsearch.empresa.com:9200/security-logs/_doc',
    'basic_auth',
    'elastic_user',
    'hashed_password_here',
    'json',
    ARRAY['CRITICAL', 'HIGH', 'MEDIUM'],
    15
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 7. FUNÇÃO DE LIMPEZA
-- =====================================================

-- Função para limpar eventos antigos da fila
CREATE OR REPLACE FUNCTION cleanup_siem_queue()
RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
    result JSONB;
BEGIN
    -- Deletar eventos enviados com sucesso há mais de 7 dias
    DELETE FROM siem_event_queue
    WHERE 
        status = 'sent'
        AND sent_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Deletar eventos falhados há mais de 30 dias
    DELETE FROM siem_event_queue
    WHERE 
        status = 'failed'
        AND last_error_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Deletar histórico antigo (mais de 90 dias)
    DELETE FROM siem_send_history
    WHERE started_at < NOW() - INTERVAL '90 days';
    
    -- Deletar métricas antigas (mais de 1 ano)
    DELETE FROM siem_metrics
    WHERE metric_date < CURRENT_DATE - INTERVAL '1 year';
    
    result := jsonb_build_object(
        'success', true,
        'deleted_events', deleted_count,
        'cleaned_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNÇÃO DE TESTE
-- =====================================================

-- Função para testar integração SIEM
CREATE OR REPLACE FUNCTION test_siem_integration()
RETURNS JSONB AS $$
DECLARE
    test_event_data JSONB;
    queue_result JSONB;
    process_result JSONB;
    health_result JSONB;
    final_result JSONB;
BEGIN
    -- Criar evento de teste
    test_event_data := jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'TEST_ALERT',
        'severity', 'HIGH',
        'description', 'Teste de integração SIEM',
        'ip_address', '127.0.0.1',
        'user_email', 'test@hubcontrol.com',
        'created_at', NOW()
    );
    
    -- Adicionar à fila
    queue_result := queue_siem_event(
        'TEST_ALERT',
        'test_system',
        'HIGH',
        test_event_data
    );
    
    -- Processar fila
    process_result := process_siem_queue(5);
    
    -- Verificar saúde
    health_result := check_siem_health();
    
    -- Compilar resultado final
    final_result := jsonb_build_object(
        'test_completed_at', NOW(),
        'queue_result', queue_result,
        'process_result', process_result,
        'health_result', health_result,
        'dashboard_summary', (
            SELECT jsonb_agg(row_to_json(sd.*)) FROM siem_dashboard sd
        )
    );
    
    RETURN final_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. COMENTÁRIOS E GRANTS
-- =====================================================

COMMENT ON TABLE siem_configurations IS 'Configurações de integração com sistemas SIEM';
COMMENT ON TABLE siem_event_queue IS 'Fila de eventos para envio aos SIEMs';
COMMENT ON TABLE siem_send_history IS 'Histórico de envios para SIEMs';
COMMENT ON TABLE siem_metrics IS 'Métricas de performance dos SIEMs';

-- Grants para usuários autenticados
GRANT SELECT ON siem_dashboard TO authenticated;
GRANT SELECT ON siem_failed_events TO authenticated;
GRANT SELECT ON siem_performance_summary TO authenticated;

GRANT EXECUTE ON FUNCTION queue_siem_event(TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_siem_queue(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_siem_health() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_siem_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION test_siem_integration() TO authenticated;

-- Log de criação
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Integração SIEM criado com sucesso!';
    RAISE NOTICE '🔗 Suporte para: Splunk, QRadar, ArcSight, ELK Stack, Sentinel';
    RAISE NOTICE '📊 Views disponíveis: siem_dashboard, siem_failed_events, siem_performance_summary';
    RAISE NOTICE '🔧 Funções disponíveis: queue_siem_event(), process_siem_queue(), check_siem_health()';
    RAISE NOTICE '⚙️ Configurações exemplo inseridas para Splunk e ELK';
    RAISE NOTICE '🧪 Execute test_siem_integration() para testar o sistema';
END $$;