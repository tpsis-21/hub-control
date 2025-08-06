-- =====================================================
-- SCRIPT DE VERIFICAÇÃO DE SEGURANÇA - HUB CONTROL
-- =====================================================
-- Execute este script após aplicar as migrações de segurança
-- para verificar se tudo foi configurado corretamente

-- =====================================================
-- 1. VERIFICAÇÃO DE TABELAS COM RLS HABILITADO
-- =====================================================

SELECT 
    '🔒 VERIFICAÇÃO RLS' as categoria,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Habilitado'
        ELSE '❌ RLS Desabilitado'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 2. VERIFICAÇÃO DE POLÍTICAS RESTRITIVAS
-- =====================================================

SELECT 
    '🛡️ POLÍTICAS RLS' as categoria,
    tablename,
    policyname,
    cmd as operacao,
    CASE 
        WHEN qual LIKE '%auth.uid()%' OR qual LIKE '%profiles%role%admin%' THEN '✅ Restritiva'
        WHEN qual = 'true' OR qual LIKE '%true%' THEN '⚠️ Permissiva'
        ELSE '🔍 Verificar'
    END as tipo_politica
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 3. VERIFICAÇÃO DE POLÍTICAS PROBLEMÁTICAS
-- =====================================================

SELECT 
    '⚠️ POLÍTICAS PROBLEMÁTICAS' as categoria,
    tablename,
    policyname,
    'Política permite acesso total - REVISAR' as problema
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    policyname LIKE '%allow_all%' OR
    policyname LIKE '%open_access%' OR
    policyname LIKE '%total_access%' OR
    qual = 'true'
)
ORDER BY tablename;

-- =====================================================
-- 4. VERIFICAÇÃO DO SISTEMA DE AUDITORIA
-- =====================================================

-- Verificar se a tabela audit_logs existe
SELECT 
    '📋 SISTEMA AUDITORIA' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') 
        THEN '✅ Tabela audit_logs criada'
        ELSE '❌ Tabela audit_logs não encontrada'
    END as status;

-- Verificar índices da tabela audit_logs
SELECT 
    '📋 ÍNDICES AUDITORIA' as categoria,
    indexname,
    '✅ Índice criado' as status
FROM pg_indexes 
WHERE tablename = 'audit_logs'
ORDER BY indexname;

-- =====================================================
-- 5. VERIFICAÇÃO DE CONFIGURAÇÕES SEGURAS
-- =====================================================

-- Verificar se a tabela secure_configs existe
SELECT 
    '🔐 CONFIGURAÇÕES SEGURAS' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'secure_configs') 
        THEN '✅ Tabela secure_configs criada'
        ELSE '❌ Tabela secure_configs não encontrada'
    END as status;

-- Verificar configurações inseridas (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'secure_configs') THEN
        RAISE NOTICE '🔐 Configurações encontradas:';
        PERFORM key, description FROM secure_configs;
    END IF;
END $$;

-- =====================================================
-- 6. VERIFICAÇÃO DE RATE LIMITING
-- =====================================================

-- Verificar se a tabela rate_limits existe
SELECT 
    '⏱️ RATE LIMITING' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits') 
        THEN '✅ Tabela rate_limits criada'
        ELSE '❌ Tabela rate_limits não encontrada'
    END as status;

-- =====================================================
-- 7. VERIFICAÇÃO DE FUNÇÕES DE SEGURANÇA
-- =====================================================

-- Verificar se as funções foram criadas
SELECT 
    '⚙️ FUNÇÕES SEGURANÇA' as categoria,
    proname as nome_funcao,
    '✅ Função criada' as status
FROM pg_proc 
WHERE proname IN (
    'validate_strong_password',
    'check_rate_limit'
)
ORDER BY proname;

-- =====================================================
-- 8. VERIFICAÇÃO DE VIEWS DE MONITORAMENTO
-- =====================================================

-- Verificar se as views foram criadas
SELECT 
    '👁️ VIEWS MONITORAMENTO' as categoria,
    viewname,
    '✅ View criada' as status
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN (
    'suspicious_activities',
    'user_activity_summary',
    'table_activity_summary'
)
ORDER BY viewname;

-- =====================================================
-- 9. VERIFICAÇÃO DE EXTENSÕES
-- =====================================================

-- Verificar extensões necessárias
SELECT 
    '🔧 EXTENSÕES' as categoria,
    extname as nome_extensao,
    '✅ Extensão instalada' as status
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto')
ORDER BY extname;

-- =====================================================
-- 10. TESTE DE FUNÇÕES DE SEGURANÇA
-- =====================================================

-- Testar validação de senha (se a função existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_strong_password') THEN
        -- Teste com senha fraca
        IF NOT validate_strong_password('123') THEN
            RAISE NOTICE '✅ Validação de senha fraca funcionando';
        ELSE
            RAISE NOTICE '❌ Validação de senha fraca falhou';
        END IF;
        
        -- Teste com senha forte
        IF validate_strong_password('MinhaSenh@123') THEN
            RAISE NOTICE '✅ Validação de senha forte funcionando';
        ELSE
            RAISE NOTICE '❌ Validação de senha forte falhou';
        END IF;
    ELSE
        RAISE NOTICE '❌ Função validate_strong_password não encontrada';
    END IF;
END $$;

-- =====================================================
-- 11. RESUMO FINAL DE SEGURANÇA
-- =====================================================

WITH security_summary AS (
    SELECT 
        COUNT(CASE WHEN rowsecurity = true THEN 1 END) as tabelas_com_rls,
        COUNT(*) as total_tabelas
    FROM pg_tables 
    WHERE schemaname = 'public'
),
policy_summary AS (
    SELECT 
        COUNT(CASE WHEN qual NOT LIKE '%true%' AND qual LIKE '%auth.uid()%' THEN 1 END) as politicas_restritivas,
        COUNT(CASE WHEN qual = 'true' OR policyname LIKE '%allow_all%' THEN 1 END) as politicas_permissivas,
        COUNT(*) as total_politicas
    FROM pg_policies 
    WHERE schemaname = 'public'
),
audit_check AS (
    SELECT 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') 
        THEN 1 ELSE 0 END as audit_system
),
secure_config_check AS (
    SELECT 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'secure_configs') 
        THEN 1 ELSE 0 END as secure_configs
),
rate_limit_check AS (
    SELECT 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits') 
        THEN 1 ELSE 0 END as rate_limiting
)
SELECT 
    '📊 RESUMO SEGURANÇA' as categoria,
    CONCAT(
        '🔒 RLS: ', s.tabelas_com_rls, '/', s.total_tabelas, ' tabelas | ',
        '🛡️ Políticas: ', p.politicas_restritivas, ' restritivas, ', p.politicas_permissivas, ' permissivas | ',
        '📋 Auditoria: ', CASE WHEN a.audit_system = 1 THEN '✅' ELSE '❌' END, ' | ',
        '🔐 Config Segura: ', CASE WHEN sc.secure_configs = 1 THEN '✅' ELSE '❌' END, ' | ',
        '⏱️ Rate Limit: ', CASE WHEN rl.rate_limiting = 1 THEN '✅' ELSE '❌' END
    ) as status_geral
FROM security_summary s, policy_summary p, audit_check a, secure_config_check sc, rate_limit_check rl;

-- =====================================================
-- 12. SCORE DE SEGURANÇA
-- =====================================================

WITH security_score AS (
    SELECT 
        -- RLS habilitado (25 pontos)
        CASE WHEN (
            SELECT COUNT(*) FROM pg_tables 
            WHERE schemaname = 'public' AND rowsecurity = true
        ) >= 5 THEN 25 ELSE 0 END as rls_score,
        
        -- Políticas restritivas (25 pontos)
        CASE WHEN (
            SELECT COUNT(*) FROM pg_policies 
            WHERE schemaname = 'public' 
            AND qual NOT LIKE '%true%' 
            AND (qual LIKE '%auth.uid()%' OR qual LIKE '%admin%')
        ) >= 10 THEN 25 ELSE 0 END as policy_score,
        
        -- Sistema de auditoria (20 pontos)
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs'
        ) THEN 20 ELSE 0 END as audit_score,
        
        -- Configurações seguras (15 pontos)
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'secure_configs'
        ) THEN 15 ELSE 0 END as config_score,
        
        -- Rate limiting (10 pontos)
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits'
        ) THEN 10 ELSE 0 END as rate_score,
        
        -- Funções de segurança (5 pontos)
        CASE WHEN (
            SELECT COUNT(*) FROM pg_proc 
            WHERE proname IN ('validate_strong_password', 'check_rate_limit')
        ) >= 2 THEN 5 ELSE 0 END as function_score
)
SELECT 
    '🏆 SCORE SEGURANÇA' as categoria,
    CONCAT(
        (rls_score + policy_score + audit_score + config_score + rate_score + function_score),
        '/100 pontos | ',
        CASE 
            WHEN (rls_score + policy_score + audit_score + config_score + rate_score + function_score) >= 90 THEN '🟢 EXCELENTE'
            WHEN (rls_score + policy_score + audit_score + config_score + rate_score + function_score) >= 70 THEN '🟡 BOM'
            WHEN (rls_score + policy_score + audit_score + config_score + rate_score + function_score) >= 50 THEN '🟠 REGULAR'
            ELSE '🔴 CRÍTICO'
        END
    ) as score_final
FROM security_score;

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================

SELECT 
    '✅ VERIFICAÇÃO CONCLUÍDA' as status,
    'Execute este script regularmente para monitorar a segurança' as recomendacao;