-- 🔗 SISTEMA DE WEBHOOKS DE SEGURANÇA - HUB CONTROL
-- Sistema para envio de notificações de segurança via webhooks
-- Integração com Slack, Teams, Discord, sistemas customizados, etc.

-- =====================================================
-- 1. TABELAS DE WEBHOOK
-- =====================================================

-- Tabela para configurações de webhook
CREATE TABLE IF NOT EXISTS webhook_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    webhook_type TEXT NOT NULL, -- 'slack', 'teams', 'discord', 'generic', 'custom'
    
    -- Configurações de Conexão
    webhook_url TEXT NOT NULL,
    secret_token TEXT, -- Para validação de assinatura
    authentication_header TEXT, -- Header customizado de autenticação
    
    -- Configurações de Formato
    payload_format TEXT DEFAULT 'json', -- 'json', 'form', 'xml'
    content_type TEXT DEFAULT 'application/json',
    custom_headers JSONB, -- Headers customizados
    payload_template JSONB, -- Template para formatação do payload
    
    -- Filtros de Eventos
    severity_filter TEXT[] DEFAULT ARRAY['CRITICAL', 'HIGH'], -- Severidades a enviar
    event_types_filter TEXT[], -- Tipos de eventos específicos
    user_filter TEXT[], -- Usuários específicos
    ip_filter TEXT[], -- IPs específicos
    time_filter JSONB, -- Filtros de horário (ex: apenas horário comercial)
    
    -- Configurações de Envio
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 5,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Rate Limiting
    rate_limit_per_minute INTEGER DEFAULT 10,
    rate_limit_per_hour INTEGER DEFAULT 100,
    
    -- Configurações de Agrupamento
    enable_batching BOOLEAN DEFAULT FALSE,
    batch_size INTEGER DEFAULT 5,
    batch_timeout_minutes INTEGER DEFAULT 5,
    
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

-- Tabela para fila de webhooks
CREATE TABLE IF NOT EXISTS webhook_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_config_id UUID NOT NULL REFERENCES webhook_configurations(id) ON DELETE CASCADE,
    
    -- Dados do Evento
    event_id UUID, -- ID do evento original
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL,
    severity TEXT NOT NULL,
    
    -- Payload
    original_data JSONB NOT NULL,
    formatted_payload JSONB, -- Payload formatado para o webhook
    
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
    response_headers JSONB,
    error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    batch_id UUID,
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'retrying')),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Tabela para histórico de webhooks
CREATE TABLE IF NOT EXISTS webhook_send_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_config_id UUID NOT NULL REFERENCES webhook_configurations(id),
    
    -- Estatísticas do Envio
    batch_id UUID,
    events_count INTEGER NOT NULL DEFAULT 1,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Resposta
    http_status INTEGER,
    response_size_bytes INTEGER,
    success BOOLEAN,
    error_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para métricas de webhook
CREATE TABLE IF NOT EXISTS webhook_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_config_id UUID NOT NULL REFERENCES webhook_configurations(id),
    
    -- Período da Métrica
    metric_date DATE NOT NULL,
    metric_hour INTEGER, -- NULL para métricas diárias
    
    -- Contadores
    webhooks_sent INTEGER DEFAULT 0,
    webhooks_failed INTEGER DEFAULT 0,
    webhooks_retried INTEGER DEFAULT 0,
    
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
    
    UNIQUE(webhook_config_id, metric_date, metric_hour)
);

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_webhook_configurations_active ON webhook_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_configurations_type ON webhook_configurations(webhook_type);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_config ON webhook_queue(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON webhook_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_scheduled ON webhook_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_priority ON webhook_queue(priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_batch ON webhook_queue(batch_id);

CREATE INDEX IF NOT EXISTS idx_webhook_send_history_config ON webhook_send_history(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_send_history_date ON webhook_send_history(started_at);

CREATE INDEX IF NOT EXISTS idx_webhook_metrics_config_date ON webhook_metrics(webhook_config_id, metric_date);

-- =====================================================
-- 3. FUNÇÕES DE WEBHOOK
-- =====================================================

-- Função para adicionar webhook à fila
CREATE OR REPLACE FUNCTION queue_webhook_notification(
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
    current_hour INTEGER;
BEGIN
    current_hour := EXTRACT(HOUR FROM NOW());
    
    -- Buscar configurações de webhook ativas que aceitam este tipo de evento
    FOR config_record IN
        SELECT *
        FROM webhook_configurations
        WHERE 
            is_active = TRUE
            AND is_healthy = TRUE
            AND (severity_filter IS NULL OR severity_param = ANY(severity_filter))
            AND (event_types_filter IS NULL OR event_type_param = ANY(event_types_filter))
            AND (
                time_filter IS NULL 
                OR (
                    (time_filter->>'start_hour')::INTEGER <= current_hour 
                    AND (time_filter->>'end_hour')::INTEGER >= current_hour
                )
            )
    LOOP
        -- Verificar rate limiting
        IF NOT check_webhook_rate_limit(config_record.id) THEN
            CONTINUE;
        END IF;
        
        -- Inserir webhook na fila
        INSERT INTO webhook_queue (
            webhook_config_id,
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

-- Função para verificar rate limiting
CREATE OR REPLACE FUNCTION check_webhook_rate_limit(webhook_config_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    config_record RECORD;
    sent_last_minute INTEGER;
    sent_last_hour INTEGER;
BEGIN
    -- Buscar configuração
    SELECT * INTO config_record
    FROM webhook_configurations
    WHERE id = webhook_config_id_param;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar limite por minuto
    SELECT COUNT(*) INTO sent_last_minute
    FROM webhook_queue
    WHERE 
        webhook_config_id = webhook_config_id_param
        AND status = 'sent'
        AND sent_at > NOW() - INTERVAL '1 minute';
    
    IF sent_last_minute >= config_record.rate_limit_per_minute THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar limite por hora
    SELECT COUNT(*) INTO sent_last_hour
    FROM webhook_queue
    WHERE 
        webhook_config_id = webhook_config_id_param
        AND status = 'sent'
        AND sent_at > NOW() - INTERVAL '1 hour';
    
    IF sent_last_hour >= config_record.rate_limit_per_hour THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para formatar payload do webhook
CREATE OR REPLACE FUNCTION format_webhook_payload(
    webhook_config_id_param UUID,
    original_data_param JSONB
)
RETURNS JSONB AS $$
DECLARE
    config_record RECORD;
    formatted_payload JSONB;
    template JSONB;
BEGIN
    -- Buscar configuração do webhook
    SELECT * INTO config_record
    FROM webhook_configurations
    WHERE id = webhook_config_id_param;
    
    IF NOT FOUND THEN
        RETURN original_data_param;
    END IF;
    
    template := config_record.payload_template;
    
    -- Formatação baseada no tipo de webhook
    CASE config_record.webhook_type
        WHEN 'slack' THEN
            formatted_payload := jsonb_build_object(
                'text', format('🚨 *Alerta de Segurança - %s*', original_data_param->>'severity'),
                'attachments', jsonb_build_array(
                    jsonb_build_object(
                        'color', CASE original_data_param->>'severity'
                            WHEN 'CRITICAL' THEN 'danger'
                            WHEN 'HIGH' THEN 'warning'
                            ELSE 'good'
                        END,
                        'fields', jsonb_build_array(
                            jsonb_build_object(
                                'title', 'Tipo',
                                'value', original_data_param->>'type',
                                'short', true
                            ),
                            jsonb_build_object(
                                'title', 'Severidade',
                                'value', original_data_param->>'severity',
                                'short', true
                            ),
                            jsonb_build_object(
                                'title', 'Descrição',
                                'value', original_data_param->>'description',
                                'short', false
                            ),
                            jsonb_build_object(
                                'title', 'IP',
                                'value', COALESCE(original_data_param->>'ip_address', 'N/A'),
                                'short', true
                            ),
                            jsonb_build_object(
                                'title', 'Usuário',
                                'value', COALESCE(original_data_param->>'user_email', 'N/A'),
                                'short', true
                            )
                        ),
                        'ts', EXTRACT(EPOCH FROM NOW())::INTEGER
                    )
                )
            );
            
        WHEN 'teams' THEN
            formatted_payload := jsonb_build_object(
                '@type', 'MessageCard',
                '@context', 'http://schema.org/extensions',
                'themeColor', CASE original_data_param->>'severity'
                    WHEN 'CRITICAL' THEN 'FF0000'
                    WHEN 'HIGH' THEN 'FFA500'
                    ELSE '00FF00'
                END,
                'summary', format('Alerta de Segurança - %s', original_data_param->>'severity'),
                'sections', jsonb_build_array(
                    jsonb_build_object(
                        'activityTitle', format('🚨 Alerta de Segurança - %s', original_data_param->>'severity'),
                        'activitySubtitle', original_data_param->>'description',
                        'facts', jsonb_build_array(
                            jsonb_build_object(
                                'name', 'Tipo:',
                                'value', original_data_param->>'type'
                            ),
                            jsonb_build_object(
                                'name', 'IP:',
                                'value', COALESCE(original_data_param->>'ip_address', 'N/A')
                            ),
                            jsonb_build_object(
                                'name', 'Usuário:',
                                'value', COALESCE(original_data_param->>'user_email', 'N/A')
                            ),
                            jsonb_build_object(
                                'name', 'Horário:',
                                'value', TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS')
                            )
                        ),
                        'markdown', true
                    )
                )
            );
            
        WHEN 'discord' THEN
            formatted_payload := jsonb_build_object(
                'embeds', jsonb_build_array(
                    jsonb_build_object(
                        'title', format('🚨 Alerta de Segurança - %s', original_data_param->>'severity'),
                        'description', original_data_param->>'description',
                        'color', CASE original_data_param->>'severity'
                            WHEN 'CRITICAL' THEN 16711680  -- Red
                            WHEN 'HIGH' THEN 16753920     -- Orange
                            ELSE 65280                     -- Green
                        END,
                        'fields', jsonb_build_array(
                            jsonb_build_object(
                                'name', 'Tipo',
                                'value', original_data_param->>'type',
                                'inline', true
                            ),
                            jsonb_build_object(
                                'name', 'IP',
                                'value', COALESCE(original_data_param->>'ip_address', 'N/A'),
                                'inline', true
                            ),
                            jsonb_build_object(
                                'name', 'Usuário',
                                'value', COALESCE(original_data_param->>'user_email', 'N/A'),
                                'inline', true
                            )
                        ),
                        'timestamp', TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                    )
                )
            );
            
        ELSE
            -- Formato genérico
            formatted_payload := jsonb_build_object(
                'timestamp', NOW(),
                'source', 'hub-control-security',
                'alert', jsonb_build_object(
                    'id', original_data_param->>'id',
                    'type', original_data_param->>'type',
                    'severity', original_data_param->>'severity',
                    'description', original_data_param->>'description',
                    'ip_address', original_data_param->>'ip_address',
                    'user_email', original_data_param->>'user_email',
                    'details', original_data_param->>'details'
                )
            );
    END CASE;
    
    -- Aplicar template customizado se existir
    IF template IS NOT NULL THEN
        -- Mesclar com template customizado
        formatted_payload := formatted_payload || template;
    END IF;
    
    RETURN formatted_payload;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar fila de webhooks
CREATE OR REPLACE FUNCTION process_webhook_queue(batch_size_param INTEGER DEFAULT 10)
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
    
    -- Processar webhooks pendentes por prioridade
    FOR queue_record IN
        SELECT *
        FROM webhook_queue
        WHERE 
            status = 'pending'
            AND scheduled_at <= NOW()
            AND attempts < max_attempts
        ORDER BY priority ASC, scheduled_at ASC
        LIMIT batch_size_param
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Buscar configuração do webhook
        SELECT * INTO config_record
        FROM webhook_configurations
        WHERE id = queue_record.webhook_config_id AND is_active = TRUE;
        
        IF FOUND THEN
            -- Marcar como processando
            UPDATE webhook_queue
            SET 
                status = 'processing',
                batch_id = batch_id,
                processed_at = NOW(),
                attempts = attempts + 1
            WHERE id = queue_record.id;
            
            -- Formatar payload
            UPDATE webhook_queue
            SET formatted_payload = format_webhook_payload(queue_record.webhook_config_id, queue_record.original_data)
            WHERE id = queue_record.id;
            
            -- Simular envio do webhook (em implementação real, faria HTTP request)
            -- Por enquanto, marcar como enviado com sucesso
            UPDATE webhook_queue
            SET 
                status = 'sent',
                sent_at = NOW(),
                response_status = 200,
                response_body = 'Webhook sent successfully'
            WHERE id = queue_record.id;
            
            -- Registrar histórico
            INSERT INTO webhook_send_history (
                webhook_config_id,
                batch_id,
                events_count,
                completed_at,
                http_status,
                success,
                duration_ms
            )
            VALUES (
                config_record.id,
                batch_id,
                1,
                NOW(),
                200,
                TRUE,
                EXTRACT(MILLISECONDS FROM (NOW() - queue_record.processed_at))::INTEGER
            );
            
            success_count := success_count + 1;
        ELSE
            -- Configuração não encontrada ou inativa
            UPDATE webhook_queue
            SET 
                status = 'failed',
                error_message = 'Webhook configuration not found or inactive'
            WHERE id = queue_record.id;
            
            error_count := error_count + 1;
        END IF;
        
        processed_count := processed_count + 1;
    END LOOP;
    
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

-- Função para verificar saúde dos webhooks
CREATE OR REPLACE FUNCTION check_webhook_health()
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
        FROM webhook_configurations
        WHERE is_active = TRUE
    LOOP
        total_configs := total_configs + 1;
        
        -- Verificar se houve envios bem-sucedidos recentemente
        IF EXISTS (
            SELECT 1
            FROM webhook_queue
            WHERE 
                webhook_config_id = config_record.id
                AND status = 'sent'
                AND sent_at > NOW() - INTERVAL '1 hour'
        ) THEN
            -- Marcar como saudável
            UPDATE webhook_configurations
            SET 
                is_healthy = TRUE,
                last_health_check = NOW(),
                last_successful_send = (
                    SELECT MAX(sent_at)
                    FROM webhook_queue
                    WHERE webhook_config_id = config_record.id AND status = 'sent'
                )
            WHERE id = config_record.id;
            
            healthy_configs := healthy_configs + 1;
        ELSE
            -- Verificar se há muitos erros recentes
            IF (
                SELECT COUNT(*)
                FROM webhook_queue
                WHERE 
                    webhook_config_id = config_record.id
                    AND status = 'failed'
                    AND last_error_at > NOW() - INTERVAL '30 minutes'
            ) > 3 THEN
                -- Marcar como não saudável
                UPDATE webhook_configurations
                SET 
                    is_healthy = FALSE,
                    last_health_check = NOW()
                WHERE id = config_record.id;
            END IF;
        END IF;
        
        health_results := health_results || jsonb_build_object(
            'webhook_id', config_record.id,
            'name', config_record.name,
            'type', config_record.webhook_type,
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

-- Trigger para enviar alertas de segurança via webhook
CREATE OR REPLACE FUNCTION trigger_webhook_security_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Enviar alertas críticos e altos via webhook
    IF NEW.severity IN ('CRITICAL', 'HIGH') THEN
        PERFORM queue_webhook_notification(
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

CREATE TRIGGER webhook_security_alert_trigger
    AFTER INSERT ON security_alerts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_webhook_security_alert();

-- =====================================================
-- 5. VIEWS DE MONITORAMENTO
-- =====================================================

-- View para dashboard de webhooks
CREATE OR REPLACE VIEW webhook_dashboard AS
SELECT 
    'active_webhooks' as metric,
    COUNT(*) as value,
    'Webhooks ativos' as description
FROM webhook_configurations 
WHERE is_active = TRUE

UNION ALL

SELECT 
    'healthy_webhooks' as metric,
    COUNT(*) as value,
    'Webhooks saudáveis' as description
FROM webhook_configurations 
WHERE is_active = TRUE AND is_healthy = TRUE

UNION ALL

SELECT 
    'webhooks_pending' as metric,
    COUNT(*) as value,
    'Webhooks pendentes' as description
FROM webhook_queue 
WHERE status = 'pending'

UNION ALL

SELECT 
    'webhooks_sent_24h' as metric,
    COUNT(*) as value,
    'Webhooks enviados nas últimas 24h' as description
FROM webhook_queue 
WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'webhooks_failed_24h' as metric,
    COUNT(*) as value,
    'Webhooks falharam nas últimas 24h' as description
FROM webhook_queue 
WHERE status = 'failed' AND last_error_at > NOW() - INTERVAL '24 hours';

-- View para webhooks com falha
CREATE OR REPLACE VIEW webhook_failed_notifications AS
SELECT 
    wq.id,
    wc.name as webhook_name,
    wc.webhook_type,
    wq.event_type,
    wq.severity,
    wq.attempts,
    wq.max_attempts,
    wq.error_message,
    wq.last_error_at,
    wq.created_at
FROM webhook_queue wq
JOIN webhook_configurations wc ON wq.webhook_config_id = wc.id
WHERE wq.status = 'failed'
ORDER BY wq.last_error_at DESC;

-- =====================================================
-- 6. CONFIGURAÇÕES PADRÃO
-- =====================================================

-- Inserir configuração exemplo para Slack
INSERT INTO webhook_configurations (
    name, webhook_type, description, webhook_url,
    severity_filter, retry_attempts, rate_limit_per_minute
)
VALUES (
    'Slack Security Alerts',
    'slack',
    'Canal #security-alerts no Slack',
    'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
    ARRAY['CRITICAL', 'HIGH'],
    3,
    5
)
ON CONFLICT (name) DO NOTHING;

-- Inserir configuração exemplo para Teams
INSERT INTO webhook_configurations (
    name, webhook_type, description, webhook_url,
    severity_filter, retry_attempts, rate_limit_per_minute
)
VALUES (
    'Teams Security Channel',
    'teams',
    'Canal de segurança no Microsoft Teams',
    'https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK',
    ARRAY['CRITICAL', 'HIGH'],
    3,
    5
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 7. FUNÇÃO DE LIMPEZA
-- =====================================================

-- Função para limpar webhooks antigos
CREATE OR REPLACE FUNCTION cleanup_webhook_queue()
RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
    result JSONB;
BEGIN
    -- Deletar webhooks enviados com sucesso há mais de 7 dias
    DELETE FROM webhook_queue
    WHERE 
        status = 'sent'
        AND sent_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Deletar webhooks falhados há mais de 30 dias
    DELETE FROM webhook_queue
    WHERE 
        status = 'failed'
        AND last_error_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Deletar histórico antigo (mais de 90 dias)
    DELETE FROM webhook_send_history
    WHERE started_at < NOW() - INTERVAL '90 days';
    
    -- Deletar métricas antigas (mais de 1 ano)
    DELETE FROM webhook_metrics
    WHERE metric_date < CURRENT_DATE - INTERVAL '1 year';
    
    result := jsonb_build_object(
        'success', true,
        'deleted_webhooks', deleted_count,
        'cleaned_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNÇÃO DE TESTE
-- =====================================================

-- Função para testar webhooks
CREATE OR REPLACE FUNCTION test_webhook_system()
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
        'type', 'TEST_WEBHOOK',
        'severity', 'HIGH',
        'description', 'Teste do sistema de webhooks',
        'ip_address', '127.0.0.1',
        'user_email', 'test@hubcontrol.com',
        'created_at', NOW()
    );
    
    -- Adicionar à fila
    queue_result := queue_webhook_notification(
        'TEST_WEBHOOK',
        'test_system',
        'HIGH',
        test_event_data
    );
    
    -- Processar fila
    process_result := process_webhook_queue(5);
    
    -- Verificar saúde
    health_result := check_webhook_health();
    
    -- Compilar resultado final
    final_result := jsonb_build_object(
        'test_completed_at', NOW(),
        'queue_result', queue_result,
        'process_result', process_result,
        'health_result', health_result,
        'dashboard_summary', (
            SELECT jsonb_agg(row_to_json(wd.*)) FROM webhook_dashboard wd
        )
    );
    
    RETURN final_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. COMENTÁRIOS E GRANTS
-- =====================================================

COMMENT ON TABLE webhook_configurations IS 'Configurações de webhooks para notificações de segurança';
COMMENT ON TABLE webhook_queue IS 'Fila de webhooks para envio';
COMMENT ON TABLE webhook_send_history IS 'Histórico de envios de webhooks';
COMMENT ON TABLE webhook_metrics IS 'Métricas de performance dos webhooks';

-- Grants para usuários autenticados
GRANT SELECT ON webhook_dashboard TO authenticated;
GRANT SELECT ON webhook_failed_notifications TO authenticated;

GRANT EXECUTE ON FUNCTION queue_webhook_notification(TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_webhook_queue(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_webhook_health() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_webhook_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION test_webhook_system() TO authenticated;

-- Log de criação
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Webhooks de Segurança criado com sucesso!';
    RAISE NOTICE '🔗 Suporte para: Slack, Teams, Discord, webhooks customizados';
    RAISE NOTICE '📊 Views disponíveis: webhook_dashboard, webhook_failed_notifications';
    RAISE NOTICE '🔧 Funções disponíveis: queue_webhook_notification(), process_webhook_queue(), check_webhook_health()';
    RAISE NOTICE '⚙️ Configurações exemplo inseridas para Slack e Teams';
    RAISE NOTICE '🧪 Execute test_webhook_system() para testar o sistema';
END $$;