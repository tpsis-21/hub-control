-- ============================================================================
-- 📊 Migração: Tabelas de Analytics - Hub Control
-- 
-- Criação das tabelas necessárias para o sistema de analytics,
-- incluindo eventos, métricas, sessões e configurações.
-- 
-- Data: 2024-12-20
-- Versão: 1.0.0
-- ============================================================================

-- Verificar se as tabelas já existem
DO $$
BEGIN
    -- Verificar se a extensão uuid-ossp está disponível
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    END IF;
END $$;

-- ============================================================================
-- 📋 TABELA: analytics_events
-- Armazena todos os eventos coletados pelo sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informações básicas do evento
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'user', 'system', 'transaction', 'navigation'
    
    -- Dados do evento (JSON flexível)
    properties JSONB DEFAULT '{}',
    
    -- Informações do usuário
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    anonymous_id VARCHAR(100),
    
    -- Informações técnicas
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    page_url TEXT,
    
    -- Informações de localização
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Informações do dispositivo
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    environment VARCHAR(20) DEFAULT 'production', -- 'development', 'staging', 'production'
    version VARCHAR(20),
    
    -- Índices para performance
    CONSTRAINT analytics_events_event_name_check CHECK (length(event_name) > 0),
    CONSTRAINT analytics_events_event_type_check CHECK (event_type IN ('user', 'system', 'transaction', 'navigation', 'error'))
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_environment ON analytics_events(environment);
CREATE INDEX IF NOT EXISTS idx_analytics_events_device_type ON analytics_events(device_type);

-- Índice composto para consultas comuns
CREATE INDEX IF NOT EXISTS idx_analytics_events_composite ON analytics_events(event_type, created_at, environment);

-- Índice GIN para consultas em propriedades JSON
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING GIN (properties);

-- ============================================================================
-- 📊 TABELA: analytics_metrics
-- Armazena métricas agregadas calculadas
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação da métrica
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'counter', 'gauge', 'histogram', 'summary'
    
    -- Valor da métrica
    value DECIMAL(15,4) NOT NULL,
    
    -- Dimensões (tags) para segmentação
    dimensions JSONB DEFAULT '{}',
    
    -- Período de agregação
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    granularity VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day', 'week', 'month'
    
    -- Metadados
    environment VARCHAR(20) DEFAULT 'production',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT analytics_metrics_metric_name_check CHECK (length(metric_name) > 0),
    CONSTRAINT analytics_metrics_period_check CHECK (period_end >= period_start),
    CONSTRAINT analytics_metrics_granularity_check CHECK (granularity IN ('minute', 'hour', 'day', 'week', 'month')),
    
    -- Unique constraint para evitar duplicatas
    UNIQUE(metric_name, dimensions, period_start, granularity, environment)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name ON analytics_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type ON analytics_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_period_start ON analytics_metrics(period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_granularity ON analytics_metrics(granularity);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_environment ON analytics_metrics(environment);

-- Índice composto para consultas de séries temporais
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_timeseries ON analytics_metrics(metric_name, granularity, period_start);

-- Índice GIN para dimensões
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_dimensions ON analytics_metrics USING GIN (dimensions);

-- ============================================================================
-- 👤 TABELA: analytics_sessions
-- Rastreia sessões de usuários
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificadores
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    anonymous_id VARCHAR(100),
    
    -- Informações da sessão
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    -- Métricas da sessão
    page_views INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    
    -- Informações técnicas
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    landing_page TEXT,
    exit_page TEXT,
    
    -- Informações de localização
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Informações do dispositivo
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_resolution VARCHAR(20),
    
    -- Informações de marketing
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(100),
    utm_content VARCHAR(100),
    
    -- Metadados
    environment VARCHAR(20) DEFAULT 'production',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT analytics_sessions_session_id_check CHECK (length(session_id) > 0),
    CONSTRAINT analytics_sessions_duration_check CHECK (duration_seconds >= 0 OR duration_seconds IS NULL)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_device_type ON analytics_sessions(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_environment ON analytics_sessions(environment);

-- Índice composto para análise de comportamento
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_behavior ON analytics_sessions(user_id, started_at, environment);

-- ============================================================================
-- ⚙️ TABELA: analytics_config
-- Armazena configurações do sistema de analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Chave de configuração
    config_key VARCHAR(100) UNIQUE NOT NULL,
    
    -- Valor da configuração (JSON flexível)
    config_value JSONB NOT NULL,
    
    -- Metadados
    description TEXT,
    environment VARCHAR(20) DEFAULT 'production',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT analytics_config_key_check CHECK (length(config_key) > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_analytics_config_key ON analytics_config(config_key);
CREATE INDEX IF NOT EXISTS idx_analytics_config_environment ON analytics_config(environment);

-- ============================================================================
-- 📈 TABELA: analytics_funnels
-- Rastreia funis de conversão
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_funnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação do funil
    funnel_name VARCHAR(100) NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    
    -- Identificadores do usuário
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    
    -- Timestamp do evento
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Propriedades adicionais
    properties JSONB DEFAULT '{}',
    
    -- Metadados
    environment VARCHAR(20) DEFAULT 'production',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT analytics_funnels_names_check CHECK (length(funnel_name) > 0 AND length(step_name) > 0),
    CONSTRAINT analytics_funnels_step_order_check CHECK (step_order > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_analytics_funnels_name ON analytics_funnels(funnel_name);
CREATE INDEX IF NOT EXISTS idx_analytics_funnels_step ON analytics_funnels(funnel_name, step_order);
CREATE INDEX IF NOT EXISTS idx_analytics_funnels_user ON analytics_funnels(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_funnels_session ON analytics_funnels(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_funnels_completed_at ON analytics_funnels(completed_at);

-- Índice composto para análise de funis
CREATE INDEX IF NOT EXISTS idx_analytics_funnels_analysis ON analytics_funnels(funnel_name, step_order, completed_at);

-- ============================================================================
-- 🔄 TRIGGERS PARA UPDATED_AT
-- ============================================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para tabelas que têm updated_at
DROP TRIGGER IF EXISTS update_analytics_metrics_updated_at ON analytics_metrics;
CREATE TRIGGER update_analytics_metrics_updated_at
    BEFORE UPDATE ON analytics_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analytics_sessions_updated_at ON analytics_sessions;
CREATE TRIGGER update_analytics_sessions_updated_at
    BEFORE UPDATE ON analytics_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analytics_config_updated_at ON analytics_config;
CREATE TRIGGER update_analytics_config_updated_at
    BEFORE UPDATE ON analytics_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 📊 VIEWS PARA RELATÓRIOS
-- ============================================================================

-- View para métricas diárias de usuários ativos
CREATE OR REPLACE VIEW analytics_daily_active_users AS
SELECT 
    DATE(created_at) as date,
    environment,
    COUNT(DISTINCT user_id) as daily_active_users,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as events
FROM analytics_events 
WHERE user_id IS NOT NULL
GROUP BY DATE(created_at), environment
ORDER BY date DESC;

-- View para métricas de dispositivos
CREATE OR REPLACE VIEW analytics_device_metrics AS
SELECT 
    device_type,
    browser,
    os,
    environment,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(DISTINCT user_id) as users,
    AVG(duration_seconds) as avg_session_duration
FROM analytics_sessions 
WHERE device_type IS NOT NULL
GROUP BY device_type, browser, os, environment
ORDER BY sessions DESC;

-- View para páginas mais visitadas
CREATE OR REPLACE VIEW analytics_popular_pages AS
SELECT 
    page_url,
    environment,
    COUNT(*) as page_views,
    COUNT(DISTINCT user_id) as unique_visitors,
    COUNT(DISTINCT session_id) as sessions
FROM analytics_events 
WHERE event_type = 'navigation' 
    AND page_url IS NOT NULL
GROUP BY page_url, environment
ORDER BY page_views DESC;

-- ============================================================================
-- 🗂️ CONFIGURAÇÕES INICIAIS
-- ============================================================================

-- Inserir configurações padrão
INSERT INTO analytics_config (config_key, config_value, description, environment) VALUES
('system.enabled', 'true', 'Sistema de analytics habilitado', 'production'),
('system.sample_rate', '100', 'Taxa de amostragem em porcentagem', 'production'),
('system.batch_size', '100', 'Tamanho do lote para processamento', 'production'),
('privacy.anonymize_ip', 'true', 'Anonimizar endereços IP', 'production'),
('privacy.data_retention_days', '365', 'Dias de retenção de dados', 'production'),
('events.user_events', 'true', 'Coletar eventos de usuário', 'production'),
('events.system_events', 'true', 'Coletar eventos de sistema', 'production'),
('events.transaction_events', 'true', 'Coletar eventos de transação', 'production'),
('events.navigation_events', 'true', 'Coletar eventos de navegação', 'production'),
('integrations.google_analytics.enabled', 'false', 'Integração com Google Analytics', 'production'),
('integrations.mixpanel.enabled', 'false', 'Integração com Mixpanel', 'production')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 📝 COMENTÁRIOS FINAIS
-- ============================================================================

-- Adicionar comentários às tabelas
COMMENT ON TABLE analytics_events IS 'Armazena todos os eventos coletados pelo sistema de analytics';
COMMENT ON TABLE analytics_metrics IS 'Métricas agregadas calculadas a partir dos eventos';
COMMENT ON TABLE analytics_sessions IS 'Sessões de usuários com informações de comportamento';
COMMENT ON TABLE analytics_config IS 'Configurações do sistema de analytics';
COMMENT ON TABLE analytics_funnels IS 'Rastreamento de funis de conversão';

-- Adicionar comentários às colunas principais
COMMENT ON COLUMN analytics_events.properties IS 'Dados flexíveis do evento em formato JSON';
COMMENT ON COLUMN analytics_events.session_id IS 'Identificador único da sessão do usuário';
COMMENT ON COLUMN analytics_metrics.dimensions IS 'Dimensões para segmentação da métrica';
COMMENT ON COLUMN analytics_sessions.duration_seconds IS 'Duração da sessão em segundos';

-- ============================================================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- ============================================================================

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migração de analytics concluída com sucesso!';
    RAISE NOTICE 'Tabelas criadas: analytics_events, analytics_metrics, analytics_sessions, analytics_config, analytics_funnels';
    RAISE NOTICE 'Views criadas: analytics_daily_active_users, analytics_device_metrics, analytics_popular_pages';
    RAISE NOTICE 'Configurações iniciais inseridas';
END $$;

/**
 * 📋 RESUMO DA MIGRAÇÃO:
 * 
 * ✅ Tabelas criadas:
 *    - analytics_events: Eventos coletados
 *    - analytics_metrics: Métricas agregadas
 *    - analytics_sessions: Sessões de usuários
 *    - analytics_config: Configurações do sistema
 *    - analytics_funnels: Funis de conversão
 * 
 * ✅ Índices otimizados para:
 *    - Consultas por data/período
 *    - Filtros por usuário/sessão
 *    - Agregações por tipo de evento
 *    - Consultas em propriedades JSON
 * 
 * ✅ Views para relatórios:
 *    - Usuários ativos diários
 *    - Métricas de dispositivos
 *    - Páginas populares
 * 
 * ✅ Configurações iniciais:
 *    - Sistema habilitado
 *    - Privacidade configurada
 *    - Eventos padrão ativados
 * 
 * 🔧 Para reverter esta migração:
 *    DROP TABLE IF EXISTS analytics_funnels CASCADE;
 *    DROP TABLE IF EXISTS analytics_config CASCADE;
 *    DROP TABLE IF EXISTS analytics_sessions CASCADE;
 *    DROP TABLE IF EXISTS analytics_metrics CASCADE;
 *    DROP TABLE IF EXISTS analytics_events CASCADE;
 *    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
 */