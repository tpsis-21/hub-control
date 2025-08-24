-- Migração para adicionar campos de configuração de cálculo de período e monitoramento de créditos
-- Data: 2024-12-20
-- Descrição: Adiciona campos para compatibilidade de períodos com painéis IPTV e sistema de monitoramento de créditos

-- Adicionar campos de configuração de período à tabela servers
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS period_calculation_type VARCHAR(20) DEFAULT 'days',
ADD COLUMN IF NOT EXISTS period_calculation_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS credit_monitoring_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_warning_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS credit_critical_threshold INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_notification_enabled BOOLEAN DEFAULT false;

-- Adicionar comentários aos campos da tabela servers
COMMENT ON COLUMN servers.period_calculation_type IS 'Tipo de cálculo de período: days, months, flexible';
COMMENT ON COLUMN servers.period_calculation_config IS 'Configuração JSON para cálculo de período específico do painel';
COMMENT ON COLUMN servers.credit_monitoring_enabled IS 'Habilita monitoramento de créditos para este servidor';
COMMENT ON COLUMN servers.credit_warning_threshold IS 'Limite de créditos para enviar aviso (warning)';
COMMENT ON COLUMN servers.credit_critical_threshold IS 'Limite crítico de créditos para alerta urgente';
COMMENT ON COLUMN servers.credit_notification_enabled IS 'Habilita envio de notificações de crédito baixo';

-- Adicionar campos de configuração de período à tabela plans
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS period_calculation_override VARCHAR(20),
ADD COLUMN IF NOT EXISTS period_calculation_config JSONB DEFAULT '{}';

-- Adicionar comentários aos campos da tabela plans
COMMENT ON COLUMN plans.period_calculation_override IS 'Override do tipo de cálculo de período para este plano específico';
COMMENT ON COLUMN plans.period_calculation_config IS 'Configuração JSON específica do plano para cálculo de período';

-- Criar tabela para configurações de notificação de crédito por usuário
CREATE TABLE IF NOT EXISTS server_credit_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    warning_threshold INTEGER DEFAULT 10,
    critical_threshold INTEGER DEFAULT 0,
    notification_enabled BOOLEAN DEFAULT true,
    last_warning_sent TIMESTAMP WITH TIME ZONE,
    last_critical_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, server_id)
);

-- Adicionar comentários à tabela server_credit_notifications
COMMENT ON TABLE server_credit_notifications IS 'Configurações de notificação de crédito baixo por usuário e servidor';
COMMENT ON COLUMN server_credit_notifications.user_id IS 'ID do usuário que receberá as notificações';
COMMENT ON COLUMN server_credit_notifications.server_id IS 'ID do servidor a ser monitorado';
COMMENT ON COLUMN server_credit_notifications.warning_threshold IS 'Limite personalizado para aviso de crédito baixo';
COMMENT ON COLUMN server_credit_notifications.critical_threshold IS 'Limite personalizado para alerta crítico';
COMMENT ON COLUMN server_credit_notifications.notification_enabled IS 'Se as notificações estão habilitadas para este usuário/servidor';
COMMENT ON COLUMN server_credit_notifications.last_warning_sent IS 'Timestamp da última notificação de aviso enviada';
COMMENT ON COLUMN server_credit_notifications.last_critical_sent IS 'Timestamp da última notificação crítica enviada';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_servers_period_calculation_type ON servers(period_calculation_type);
CREATE INDEX IF NOT EXISTS idx_servers_credit_monitoring ON servers(credit_monitoring_enabled) WHERE credit_monitoring_enabled = true;
CREATE INDEX IF NOT EXISTS idx_plans_period_override ON plans(period_calculation_override) WHERE period_calculation_override IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_notifications_user_server ON server_credit_notifications(user_id, server_id);
CREATE INDEX IF NOT EXISTS idx_credit_notifications_enabled ON server_credit_notifications(notification_enabled) WHERE notification_enabled = true;

-- Habilitar RLS (Row Level Security) na tabela server_credit_notifications
ALTER TABLE server_credit_notifications ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários só podem ver/editar suas próprias configurações
CREATE POLICY "Users can manage their own credit notification settings" ON server_credit_notifications
    FOR ALL USING (auth.uid() = user_id);

-- Política RLS: admins podem ver todas as configurações
CREATE POLICY "Admins can view all credit notification settings" ON server_credit_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela server_credit_notifications
CREATE TRIGGER update_server_credit_notifications_updated_at
    BEFORE UPDATE ON server_credit_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar constraints de validação
ALTER TABLE servers 
ADD CONSTRAINT check_period_calculation_type 
    CHECK (period_calculation_type IN ('days', 'months', 'flexible')),
ADD CONSTRAINT check_credit_thresholds 
    CHECK (credit_warning_threshold >= credit_critical_threshold);

ALTER TABLE plans 
ADD CONSTRAINT check_period_calculation_override 
    CHECK (period_calculation_override IN ('days', 'months', 'flexible') OR period_calculation_override IS NULL);

ALTER TABLE server_credit_notifications 
ADD CONSTRAINT check_notification_thresholds 
    CHECK (warning_threshold >= critical_threshold AND critical_threshold >= 0);

-- Criar tabela de logs de migração se não existir
CREATE TABLE IF NOT EXISTS migration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    success BOOLEAN DEFAULT true
);

-- Registrar esta migração
INSERT INTO migration_logs (migration_name, description)
VALUES (
    '20241220000001_add_period_calculation_fields',
    'Adicionados campos para configuração de cálculo de período e monitoramento de créditos nas tabelas servers e plans. Criada tabela server_credit_notifications para configurações personalizadas por usuário.'
);

-- Verificação final - mostrar estrutura das tabelas modificadas
SELECT 
    'servers' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'servers' 
    AND column_name LIKE '%period%' OR column_name LIKE '%credit%'
    AND table_schema = 'public'

UNION ALL

SELECT 
    'plans' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'plans' 
    AND column_name LIKE '%period%'
    AND table_schema = 'public'

ORDER BY tabela, column_name;