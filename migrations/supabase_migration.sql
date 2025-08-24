-- =====================================================
-- MIGRAÇÃO COM REMOÇÃO DE CONSTRAINTS CONFLITANTES
-- Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- ETAPA 0: Remover constraints conflitantes existentes (versão simplificada)
-- Tentar remover constraints que podem existir (ignora erros se não existirem)
ALTER TABLE servers DROP CONSTRAINT IF EXISTS servers_period_calculation_type_check;
ALTER TABLE servers DROP CONSTRAINT IF EXISTS check_period_calculation_type;

-- ETAPA 1: Adicionar colunas básicas à tabela servers (uma por vez para evitar erros)
ALTER TABLE servers ADD COLUMN IF NOT EXISTS period_calculation_type TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS period_calculation_config JSONB;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS credit_monitoring_enabled BOOLEAN;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS credit_warning_threshold INTEGER;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS credit_critical_threshold INTEGER;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS credit_notification_enabled BOOLEAN;

-- ETAPA 2: Definir valores padrão para colunas existentes
UPDATE servers 
SET 
  period_calculation_type = 'days',
  period_calculation_config = '{}',
  credit_monitoring_enabled = false,
  credit_warning_threshold = 10,
  credit_critical_threshold = 0,
  credit_notification_enabled = false
WHERE 
  period_calculation_type IS NULL;

-- ETAPA 3: Adicionar colunas à tabela plans (uma por vez para evitar erros)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS period_calculation_override TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS period_calculation_config JSONB;

-- ETAPA 4: Definir valores padrão para plans
UPDATE plans 
SET 
  period_calculation_config = '{}'
WHERE 
  period_calculation_config IS NULL;

-- ETAPA 5: Criar tabela de notificações
CREATE TABLE IF NOT EXISTS server_credit_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    server_id UUID NOT NULL,
    warning_threshold INTEGER DEFAULT 10,
    critical_threshold INTEGER DEFAULT 0,
    notification_enabled BOOLEAN DEFAULT true,
    last_warning_sent TIMESTAMP WITH TIME ZONE,
    last_critical_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ETAPA 6: Configurar servidores NATV
UPDATE servers 
SET 
  period_calculation_type = 'flexible',
  period_calculation_config = '{"panelType": "natv", "preferredUnit": "days"}',
  credit_monitoring_enabled = true,
  credit_notification_enabled = true
WHERE 
  name ILIKE '%natv%' OR url ILIKE '%natv%';

-- ETAPA 7: Configurar servidores The Best
UPDATE servers 
SET 
  period_calculation_type = 'months',
  period_calculation_config = '{"panelType": "thebest", "preferredUnit": "months"}',
  credit_monitoring_enabled = true,
  credit_notification_enabled = true
WHERE 
  name ILIKE '%best%' OR url ILIKE '%best%';

-- ETAPA 8: Configurar planos mensais
UPDATE plans 
SET 
  period_calculation_override = 'months',
  period_calculation_config = '{"preferredUnit": "months"}'
WHERE 
  validity IN (30, 60, 90, 180, 365);

-- ETAPA 9: Criar nova constraint que permite 'flexible'
ALTER TABLE servers 
ADD CONSTRAINT servers_period_type_valid 
CHECK (period_calculation_type IN ('days', 'months', 'flexible'));

-- ETAPA 10: Criar índices básicos
CREATE INDEX IF NOT EXISTS idx_servers_period_type ON servers(period_calculation_type);
CREATE INDEX IF NOT EXISTS idx_servers_credit_monitoring ON servers(credit_monitoring_enabled);

-- ETAPA 11: Habilitar RLS na nova tabela
ALTER TABLE server_credit_notifications ENABLE ROW LEVEL SECURITY;

-- VERIFICAÇÃO FINAL
SELECT 
  'Servidores configurados' as tipo,
  COUNT(*) as quantidade
FROM servers 
WHERE period_calculation_type IS NOT NULL;

SELECT 
  'Planos configurados' as tipo,
  COUNT(*) as quantidade
FROM plans 
WHERE period_calculation_config IS NOT NULL;

SELECT 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as status;