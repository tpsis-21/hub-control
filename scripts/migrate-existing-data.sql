-- Script de migração para configurar dados existentes com as novas funcionalidades
-- Este script deve ser executado APÓS a aplicação da migração principal
-- Verificação: 20241220000001_add_period_calculation_fields.sql

-- Verificar se as colunas necessárias existem antes de executar
DO $$
BEGIN
    -- Verificar se as colunas foram adicionadas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'servers' 
        AND column_name = 'period_calculation_type'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'ERRO: A migração principal não foi aplicada. Execute primeiro: 20241220000001_add_period_calculation_fields.sql';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'servers' 
        AND column_name = 'credit_monitoring_enabled'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'ERRO: A migração principal não foi aplicada. Execute primeiro: 20241220000001_add_period_calculation_fields.sql';
    END IF;
    
    RAISE NOTICE 'Verificação concluída: Todas as colunas necessárias existem.';
END $$;

-- Configurar servidores existentes com valores padrão
UPDATE servers 
SET 
  period_calculation_type = 'days',
  period_calculation_config = '{
    "preferredUnit": "days",
    "allowFlexibleConversion": true,
    "monthCalculationStrategy": "exact"
  }',
  credit_monitoring_enabled = false,
  credit_warning_threshold = 10,
  credit_critical_threshold = 0,
  credit_notification_enabled = false
WHERE 
  period_calculation_type IS NULL;

-- Configurar servidores NATV com configuração específica
UPDATE servers 
SET 
  period_calculation_type = 'flexible',
  period_calculation_config = '{
    "preferredUnit": "days",
    "allowFlexibleConversion": true,
    "monthCalculationStrategy": "exact",
    "panelType": "natv",
    "supportsUsernameIdentification": true,
    "supportsUserIdIdentification": true
  }',
  credit_monitoring_enabled = true,
  credit_notification_enabled = true
WHERE 
  (LOWER(name) LIKE '%natv%' OR LOWER(api_url) LIKE '%natv%')
  AND period_calculation_type IS NULL;

-- Configurar servidores The Best com configuração específica
UPDATE servers 
SET 
  period_calculation_type = 'months',
  period_calculation_config = '{
    "preferredUnit": "months",
    "allowFlexibleConversion": true,
    "monthCalculationStrategy": "exact",
    "panelType": "thebest",
    "supportsUsernameIdentification": false,
    "supportsUserIdIdentification": true
  }',
  credit_monitoring_enabled = true,
  credit_notification_enabled = true
WHERE 
  (LOWER(name) LIKE '%best%' OR LOWER(api_url) LIKE '%best%')
  AND period_calculation_type IS NULL;

-- Configurar planos existentes com valores padrão
UPDATE plans 
SET 
  period_calculation_override = NULL,
  period_calculation_config = '{
    "inheritFromServer": true,
    "customCalculation": false
  }'
WHERE 
  period_calculation_config IS NULL;

-- Configurar planos mensais (30 dias) para usar meses
UPDATE plans 
SET 
  period_calculation_override = 'months',
  period_calculation_config = '{
    "inheritFromServer": false,
    "customCalculation": true,
    "preferredUnit": "months",
    "monthCalculationStrategy": "exact"
  }'
WHERE 
  validity = 30
  AND period_calculation_override IS NULL;

-- Configurar planos de 60 dias (2 meses) para usar meses
UPDATE plans 
SET 
  period_calculation_override = 'months',
  period_calculation_config = '{
    "inheritFromServer": false,
    "customCalculation": true,
    "preferredUnit": "months",
    "monthCalculationStrategy": "exact"
  }'
WHERE 
  validity = 60
  AND period_calculation_override IS NULL;

-- Configurar planos de 90 dias (3 meses) para usar meses
UPDATE plans 
SET 
  period_calculation_override = 'months',
  period_calculation_config = '{
    "inheritFromServer": false,
    "customCalculation": true,
    "preferredUnit": "months",
    "monthCalculationStrategy": "exact"
  }'
WHERE 
  validity = 90
  AND period_calculation_override IS NULL;

-- Configurar planos de 180 dias (6 meses) para usar meses
UPDATE plans 
SET 
  period_calculation_override = 'months',
  period_calculation_config = '{
    "inheritFromServer": false,
    "customCalculation": true,
    "preferredUnit": "months",
    "monthCalculationStrategy": "exact"
  }'
WHERE 
  validity = 180
  AND period_calculation_override IS NULL;

-- Configurar planos de 365 dias (12 meses) para usar meses
UPDATE plans 
SET 
  period_calculation_override = 'months',
  period_calculation_config = '{
    "inheritFromServer": false,
    "customCalculation": true,
    "preferredUnit": "months",
    "monthCalculationStrategy": "exact"
  }'
WHERE 
  validity = 365
  AND period_calculation_override IS NULL;

-- Inserir configurações padrão de notificação para usuários existentes
-- (apenas para servidores com monitoramento habilitado)
INSERT INTO server_credit_notifications (user_id, server_id, warning_threshold, critical_threshold, notification_enabled)
SELECT 
  u.id as user_id,
  s.id as server_id,
  s.credit_warning_threshold,
  s.credit_critical_threshold,
  s.credit_notification_enabled
FROM 
  auth.users u
  CROSS JOIN servers s
WHERE 
  s.credit_monitoring_enabled = true
  AND NOT EXISTS (
    SELECT 1 
    FROM server_credit_notifications scn 
    WHERE scn.user_id = u.id AND scn.server_id = s.id
  );

-- Log da migração
INSERT INTO migration_logs (migration_name, executed_at, description)
VALUES (
  'migrate_existing_data_period_calculation',
  NOW(),
  'Configuração de dados existentes para compatibilidade de períodos e monitoramento de créditos'
);

-- Verificação dos dados migrados
SELECT 
  'Servidores configurados' as tipo,
  COUNT(*) as quantidade
FROM servers 
WHERE period_calculation_type IS NOT NULL

UNION ALL

SELECT 
  'Planos configurados' as tipo,
  COUNT(*) as quantidade
FROM plans 
WHERE period_calculation_config IS NOT NULL

UNION ALL

SELECT 
  'Notificações de crédito configuradas' as tipo,
  COUNT(*) as quantidade
FROM server_credit_notifications;

-- Relatório de configurações por tipo de servidor
SELECT 
  CASE 
    WHEN period_calculation_config::json->>'panelType' = 'natv' THEN 'NATV'
    WHEN period_calculation_config::json->>'panelType' = 'thebest' THEN 'The Best'
    ELSE 'Genérico'
  END as tipo_painel,
  period_calculation_type,
  credit_monitoring_enabled,
  COUNT(*) as quantidade_servidores
FROM servers 
WHERE period_calculation_type IS NOT NULL
GROUP BY 
  period_calculation_config::json->>'panelType',
  period_calculation_type,
  credit_monitoring_enabled
ORDER BY tipo_painel, period_calculation_type;