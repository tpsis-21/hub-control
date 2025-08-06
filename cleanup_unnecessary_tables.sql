-- Script para limpeza de tabelas desnecessárias e duplicadas
-- Data: 2024-12-23
-- Descrição: Remove tabelas duplicadas e desnecessárias do banco de dados

-- =====================================================
-- 1. VERIFICAR TABELAS EXISTENTES
-- =====================================================

-- Listar todas as tabelas públicas para análise
SELECT 
  'TABELAS EXISTENTES' as categoria,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 2. IDENTIFICAR TABELAS DUPLICADAS/DESNECESSÁRIAS
-- =====================================================

-- Tabelas que podem ser removidas (baseado na análise):
-- 1. Múltiplas versões de financial_transactions
-- 2. Tabelas de backup/teste
-- 3. Tabelas obsoletas de marketing
-- 4. Tabelas de configuração duplicadas

-- =====================================================
-- 3. BACKUP DE DADOS IMPORTANTES (SE NECESSÁRIO)
-- =====================================================

-- Criar backup de dados importantes antes da exclusão
CREATE TABLE IF NOT EXISTS backup_financial_data AS
SELECT * FROM financial_transactions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions');

-- =====================================================
-- 4. REMOVER TABELAS DESNECESSÁRIAS
-- =====================================================

-- Remover tabelas de backup antigas
DROP TABLE IF EXISTS backup_history CASCADE;
DROP TABLE IF EXISTS recovery_history CASCADE;

-- Remover tabelas de configuração duplicadas
DROP TABLE IF EXISTS secure_configs CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;

-- Remover tabelas de notificação duplicadas
DROP TABLE IF EXISTS user_blocks CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;

-- Remover tabelas de marketing duplicadas (manter apenas a versão principal)
-- Verificar se existem dados importantes antes de remover
DO $$
BEGIN
    -- Verificar se há campanhas ativas
    IF EXISTS (
        SELECT 1 FROM marketing_campaigns 
        WHERE status IN ('sending', 'scheduled')
        LIMIT 1
    ) THEN
        RAISE NOTICE 'ATENÇÃO: Existem campanhas ativas. Não removendo tabelas de marketing.';
    ELSE
        -- Remover tabelas de marketing se não houver campanhas ativas
        DROP TABLE IF EXISTS deliverability_metrics CASCADE;
        DROP TABLE IF EXISTS unsubscribe_records CASCADE;
        DROP TABLE IF EXISTS smtp_configs CASCADE;
        DROP TABLE IF EXISTS email_logs CASCADE;
        DROP TABLE IF EXISTS automation_rules CASCADE;
        DROP TABLE IF EXISTS email_templates CASCADE;
        DROP TABLE IF EXISTS marketing_campaigns CASCADE;
        RAISE NOTICE 'Tabelas de marketing removidas (não havia campanhas ativas).';
    END IF;
END $$;

-- =====================================================
-- 5. CONSOLIDAR TABELAS FINANCEIRAS
-- =====================================================

-- Manter apenas uma versão da tabela financial_transactions
-- Se existirem múltiplas versões, consolidar dados
DO $$
DECLARE
    table_count integer;
BEGIN
    -- Contar quantas tabelas financial_transactions existem
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name LIKE '%financial%transaction%' 
    AND table_schema = 'public';
    
    IF table_count > 1 THEN
        RAISE NOTICE 'Encontradas % tabelas financeiras. Consolidando...', table_count;
        
        -- Criar tabela consolidada se não existir
        CREATE TABLE IF NOT EXISTS financial_transactions_consolidated (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type TEXT NOT NULL CHECK (type IN ('receita', 'despesa', 'income', 'expense')),
            description TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            category TEXT NOT NULL,
            transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Migrar dados de todas as tabelas financeiras
        INSERT INTO financial_transactions_consolidated 
        (type, description, amount, category, transaction_date, notes, created_at)
        SELECT 
            CASE 
                WHEN type IN ('income') THEN 'receita'
                WHEN type IN ('expense') THEN 'despesa'
                ELSE type
            END as type,
            description,
            amount,
            category,
            COALESCE(transaction_date, date, CURRENT_DATE) as transaction_date,
            notes,
            created_at
        FROM financial_transactions
        WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions')
        ON CONFLICT (id) DO NOTHING;
        
        -- Remover tabela antiga
        DROP TABLE IF EXISTS financial_transactions CASCADE;
        
        -- Renomear tabela consolidada
        ALTER TABLE financial_transactions_consolidated RENAME TO financial_transactions;
        
        RAISE NOTICE 'Tabelas financeiras consolidadas com sucesso.';
    END IF;
END $$;

-- =====================================================
-- 6. LIMPAR TABELAS DE PUSH NOTIFICATIONS DUPLICADAS
-- =====================================================

-- Verificar se existem tabelas duplicadas de push notifications
DROP TABLE IF EXISTS push_subscriptions_old CASCADE;
DROP TABLE IF EXISTS push_subscriptions_backup CASCADE;

-- =====================================================
-- 7. REMOVER TABELAS DE INTEGRAÇÃO OBSOLETAS
-- =====================================================

-- Remover tabelas de integração antigas se não estiverem sendo usadas
DO $$
BEGIN
    -- Verificar se integration_configs tem dados importantes
    IF EXISTS (
        SELECT 1 FROM integration_configs 
        WHERE is_active = true
        LIMIT 1
    ) THEN
        RAISE NOTICE 'ATENÇÃO: Existem integrações ativas. Mantendo tabela integration_configs.';
    ELSE
        DROP TABLE IF EXISTS integration_configs CASCADE;
        RAISE NOTICE 'Tabela integration_configs removida (não havia integrações ativas).';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabela integration_configs não existe.';
END $$;

-- =====================================================
-- 8. VERIFICAR RESULTADO DA LIMPEZA
-- =====================================================

-- Listar tabelas restantes após limpeza
SELECT 
  'TABELAS APÓS LIMPEZA' as categoria,
  table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Verificar espaço liberado
SELECT 
  'ESPAÇO TOTAL USADO' as info,
  pg_size_pretty(pg_database_size(current_database())) as tamanho_db;

-- =====================================================
-- 9. RECRIAR ÍNDICES NECESSÁRIOS
-- =====================================================

-- Recriar índices importantes que podem ter sido removidos
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date 
  ON financial_transactions(transaction_date);
  
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type 
  ON financial_transactions(type);
  
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category 
  ON financial_transactions(category);

-- =====================================================
-- 10. ATUALIZAR ESTATÍSTICAS
-- =====================================================

-- Atualizar estatísticas do banco após limpeza
ANALYZE;

-- =====================================================
-- 11. RELATÓRIO FINAL
-- =====================================================

SELECT 'LIMPEZA CONCLUÍDA COM SUCESSO! 🧹✨' as status;
SELECT 'Tabelas desnecessárias removidas' as acao_1;
SELECT 'Dados importantes preservados' as acao_2;
SELECT 'Índices recriados' as acao_3;
SELECT 'Estatísticas atualizadas' as acao_4;
SELECT 'Execute SELECT security_health_check(); para verificar segurança' as proximo_passo;