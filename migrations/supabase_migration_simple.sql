-- =====================================================
-- MIGRAÇÃO SUPER SIMPLES PARA SUPABASE
-- Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- Adicionar colunas à tabela servers
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS period_calculation_type TEXT,
ADD COLUMN IF NOT EXISTS period_calculation_config JSONB,
ADD COLUMN IF NOT EXISTS credit_monitoring_enabled BOOLEAN,
ADD COLUMN IF NOT EXISTS credit_warning_threshold INTEGER,
ADD COLUMN IF NOT EXISTS credit_critical_threshold INTEGER,
ADD COLUMN IF NOT EXISTS credit_notification_enabled BOOLEAN;

-- Definir valores padrão
UPDATE servers 
SET 
  period_calculation_type = COALESCE(period_calculation_type, 'days'),
  period_calculation_config = COALESCE(period_calculation_config, '{}'),
  credit_monitoring_enabled = COALESCE(credit_monitoring_enabled, false),
  credit_warning_threshold = COALESCE(credit_warning_threshold, 10),
  credit_critical_threshold = COALESCE(credit_critical_threshold, 0),
  credit_notification_enabled = COALESCE(credit_notification_enabled, false);

-- Adicionar colunas à tabela plans
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS period_calculation_override TEXT,
ADD COLUMN IF NOT EXISTS period_calculation_config JSONB;

-- Definir valores padrão para plans
UPDATE plans 
SET 
  period_calculation_config = COALESCE(period_calculation_config, '{}');

-- Criar tabela simples de notificações
CREATE TABLE IF NOT EXISTS server_credit_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    server_id UUID NOT NULL,
    warning_threshold INTEGER DEFAULT 10,
    critical_threshold INTEGER DEFAULT 0,
    notification_enabled BOOLEAN DEFAULT true,
    last_warning_sent TIMESTAMPTZ,
    last_critical_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurar servidores NATV
UPDATE servers 
SET 
  period_calculation_type = 'flexible',
  period_calculation_config = '{"panelType": "natv"}',
  credit_monitoring_enabled = true
WHERE 
  LOWER(name) LIKE '%natv%' OR LOWER(url) LIKE '%natv%';

-- Configurar servidores The Best
UPDATE servers 
SET 
  period_calculation_type = 'months',
  period_calculation_config = '{"panelType": "thebest"}',
  credit_monitoring_enabled = true
WHERE 
  LOWER(name) LIKE '%best%' OR LOWER(url) LIKE '%best%';

-- Configurar planos mensais
UPDATE plans 
SET 
  period_calculation_override = 'months'
WHERE 
  validity IN (30, 60, 90, 180, 365);

-- Verificação
SELECT 'Migração concluída!' as status;
SELECT COUNT(*) as servidores_configurados FROM servers WHERE period_calculation_type IS NOT NULL;
SELECT COUNT(*) as planos_configurados FROM plans WHERE period_calculation_config IS NOT NULL;