-- 🔍 Script de Verificação de Dependências de Tabelas
-- Execute ANTES da limpeza para identificar dependências críticas

-- ==========================================
-- 1. VERIFICAR CHAVES ESTRANGEIRAS
-- ==========================================

SELECT 
    'FOREIGN KEY DEPENDENCIES' as tipo_verificacao,
    tc.table_name as tabela_origem,
    kcu.column_name as coluna_origem,
    ccu.table_name as tabela_referenciada,
    ccu.column_name as coluna_referenciada,
    tc.constraint_name as nome_constraint
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND (
        tc.table_name IN (
            'backup_history', 'recovery_history', 'secure_configs', 
            'rate_limits', 'user_blocks', 'notification_settings',
            'marketing_campaigns', 'email_templates', 'automation_rules',
            'email_logs', 'smtp_configs', 'unsubscribe_records',
            'deliverability_metrics', 'integration_configs'
        )
        OR ccu.table_name IN (
            'backup_history', 'recovery_history', 'secure_configs', 
            'rate_limits', 'user_blocks', 'notification_settings',
            'marketing_campaigns', 'email_templates', 'automation_rules',
            'email_logs', 'smtp_configs', 'unsubscribe_records',
            'deliverability_metrics', 'integration_configs'
        )
    )
ORDER BY tc.table_name, ccu.table_name;

-- ==========================================
-- 2. VERIFICAR TRIGGERS ATIVOS
-- ==========================================

SELECT 
    'TRIGGERS ATIVOS' as tipo_verificacao,
    trigger_name,
    event_object_table as tabela,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE 
    trigger_schema = 'public'
    AND event_object_table IN (
        'backup_history', 'recovery_history', 'secure_configs', 
        'rate_limits', 'user_blocks', 'notification_settings',
        'marketing_campaigns', 'email_templates', 'automation_rules',
        'email_logs', 'smtp_configs', 'unsubscribe_records',
        'deliverability_metrics', 'integration_configs'
    )
ORDER BY event_object_table, trigger_name;

-- ==========================================
-- 3. VERIFICAR VIEWS QUE DEPENDEM DAS TABELAS
-- ==========================================

SELECT 
    'VIEWS DEPENDENTES' as tipo_verificacao,
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE 
    schemaname = 'public'
    AND (
        definition ILIKE '%backup_history%' OR
        definition ILIKE '%recovery_history%' OR
        definition ILIKE '%secure_configs%' OR
        definition ILIKE '%rate_limits%' OR
        definition ILIKE '%user_blocks%' OR
        definition ILIKE '%notification_settings%' OR
        definition ILIKE '%marketing_campaigns%' OR
        definition ILIKE '%email_templates%' OR
        definition ILIKE '%automation_rules%' OR
        definition ILIKE '%email_logs%' OR
        definition ILIKE '%smtp_configs%' OR
        definition ILIKE '%unsubscribe_records%' OR
        definition ILIKE '%deliverability_metrics%' OR
        definition ILIKE '%integration_configs%'
    )
ORDER BY viewname;

-- ==========================================
-- 4. VERIFICAR FUNÇÕES QUE USAM AS TABELAS
-- ==========================================

SELECT 
    'FUNÇÕES DEPENDENTES' as tipo_verificacao,
    routine_name as nome_funcao,
    routine_type as tipo,
    routine_definition as definicao
FROM information_schema.routines
WHERE 
    routine_schema = 'public'
    AND (
        routine_definition ILIKE '%backup_history%' OR
        routine_definition ILIKE '%recovery_history%' OR
        routine_definition ILIKE '%secure_configs%' OR
        routine_definition ILIKE '%rate_limits%' OR
        routine_definition ILIKE '%user_blocks%' OR
        routine_definition ILIKE '%notification_settings%' OR
        routine_definition ILIKE '%marketing_campaigns%' OR
        routine_definition ILIKE '%email_templates%' OR
        routine_definition ILIKE '%automation_rules%' OR
        routine_definition ILIKE '%email_logs%' OR
        routine_definition ILIKE '%smtp_configs%' OR
        routine_definition ILIKE '%unsubscribe_records%' OR
        routine_definition ILIKE '%deliverability_metrics%' OR
        routine_definition ILIKE '%integration_configs%'
    )
ORDER BY routine_name;

-- ==========================================
-- 5. VERIFICAR POLÍTICAS RLS ATIVAS
-- ==========================================

SELECT 
    'POLÍTICAS RLS' as tipo_verificacao,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE 
    schemaname = 'public'
    AND tablename IN (
        'backup_history', 'recovery_history', 'secure_configs', 
        'rate_limits', 'user_blocks', 'notification_settings',
        'marketing_campaigns', 'email_templates', 'automation_rules',
        'email_logs', 'smtp_configs', 'unsubscribe_records',
        'deliverability_metrics', 'integration_configs'
    )
ORDER BY tablename, policyname;

-- ==========================================
-- 6. VERIFICAR DADOS EXISTENTES
-- ==========================================

-- Verificar se as tabelas têm dados
DO $$
DECLARE
    table_name TEXT;
    row_count INTEGER;
    result_text TEXT := '';
BEGIN
    -- Lista de tabelas para verificar
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'backup_history', 'recovery_history', 'secure_configs', 
            'rate_limits', 'user_blocks', 'notification_settings',
            'marketing_campaigns', 'email_templates', 'automation_rules',
            'email_logs', 'smtp_configs', 'unsubscribe_records',
            'deliverability_metrics', 'integration_configs'
        ])
    LOOP
        -- Verificar se a tabela existe
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            -- Contar registros
            EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
            
            -- Adicionar ao resultado
            result_text := result_text || format('Tabela: %s - Registros: %s\n', table_name, row_count);
        ELSE
            result_text := result_text || format('Tabela: %s - NÃO EXISTE\n', table_name);
        END IF;
    END LOOP;
    
    -- Mostrar resultado
    RAISE NOTICE 'CONTAGEM DE DADOS:\n%', result_text;
END $$;

-- ==========================================
-- 7. VERIFICAR ÍNDICES IMPORTANTES
-- ==========================================

SELECT 
    'ÍNDICES' as tipo_verificacao,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE 
    schemaname = 'public'
    AND tablename IN (
        'backup_history', 'recovery_history', 'secure_configs', 
        'rate_limits', 'user_blocks', 'notification_settings',
        'marketing_campaigns', 'email_templates', 'automation_rules',
        'email_logs', 'smtp_configs', 'unsubscribe_records',
        'deliverability_metrics', 'integration_configs'
    )
ORDER BY tablename, indexname;

-- ==========================================
-- 8. VERIFICAR PERMISSÕES ESPECIAIS
-- ==========================================

SELECT 
    'PERMISSÕES' as tipo_verificacao,
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE 
    table_schema = 'public'
    AND table_name IN (
        'backup_history', 'recovery_history', 'secure_configs', 
        'rate_limits', 'user_blocks', 'notification_settings',
        'marketing_campaigns', 'email_templates', 'automation_rules',
        'email_logs', 'smtp_configs', 'unsubscribe_records',
        'deliverability_metrics', 'integration_configs'
    )
    AND grantee != 'postgres'
ORDER BY table_name, grantee;

-- ==========================================
-- 9. RESUMO FINAL
-- ==========================================

SELECT 
    '🎯 RESUMO DE VERIFICAÇÃO' as status,
    'Execute este script ANTES da limpeza' as instrucao,
    'Analise todas as dependências encontradas' as importante,
    'Remova apenas tabelas sem dependências críticas' as recomendacao;

-- ==========================================
-- 10. PRÓXIMOS PASSOS RECOMENDADOS
-- ==========================================

/*
📋 CHECKLIST DE VERIFICAÇÃO:

□ Verificar se há chaves estrangeiras críticas
□ Confirmar que não há triggers importantes
□ Verificar se views dependem das tabelas
□ Confirmar que funções não usam as tabelas
□ Verificar políticas RLS ativas
□ Confirmar quantidade de dados
□ Verificar índices importantes
□ Confirmar permissões especiais

⚠️ ATENÇÃO:
- Se uma tabela tem dependências críticas, NÃO a remova
- Se uma tabela tem dados importantes, faça backup primeiro
- Se uma tabela tem triggers ativos, considere desabilitá-los primeiro
- Se uma tabela é referenciada por views/funções, atualize-as primeiro

✅ SEGURO PARA REMOÇÃO:
- Tabelas sem chaves estrangeiras
- Tabelas sem triggers ativos
- Tabelas não referenciadas por views/funções
- Tabelas sem políticas RLS críticas
- Tabelas vazias ou com dados não críticos
- Tabelas sem índices únicos importantes
- Tabelas sem permissões especiais

🚀 PRÓXIMO PASSO:
 Após analisar os resultados, execute o script cleanup_unnecessary_tables.sql
*/