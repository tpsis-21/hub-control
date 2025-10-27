-- =====================================================
-- SCRIPT DE VERIFICAÇÃO: Correções de Segurança
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Objetivo: Validar todas as correções aplicadas
-- Escopo: RLS, Views SECURITY DEFINER, Search Path
-- =====================================================

\echo '🔍 INICIANDO VERIFICAÇÃO DE SEGURANÇA SUPABASE...'
\echo ''

-- =====================================================
-- 1. VERIFICAÇÃO RLS (Row Level Security)
-- =====================================================

\echo '📋 1. VERIFICANDO RLS NA TABELA PROFILES...'

SELECT 
    '1.1 STATUS RLS PROFILES' as verificacao,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS DESABILITADO'
    END as status_rls,
    CASE 
        WHEN rowsecurity = true THEN 'SEGURO'
        ELSE 'CRÍTICO - CORRIGIR IMEDIATAMENTE'
    END as nivel_seguranca
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'profiles';

\echo ''

-- Verificar políticas RLS ativas
SELECT 
    '1.2 POLÍTICAS RLS PROFILES' as verificacao,
    policyname,
    cmd as operacao,
    CASE 
        WHEN roles = '{authenticated}' THEN '✅ Usuários Autenticados'
        WHEN roles = '{anon}' THEN '⚠️ Usuários Anônimos'
        ELSE '❓ ' || array_to_string(roles, ', ')
    END as usuarios_permitidos,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ Com Restrições'
        ELSE '⚠️ Sem Restrições'
    END as nivel_restricao
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

\echo ''

-- =====================================================
-- 2. VERIFICAÇÃO VIEWS SECURITY DEFINER
-- =====================================================

\echo '📋 2. VERIFICANDO VIEWS SECURITY DEFINER...'

-- Listar views que ainda têm SECURITY DEFINER
SELECT 
    '2.1 VIEWS COM SECURITY DEFINER' as verificacao,
    schemaname,
    viewname,
    viewowner,
    '❌ SECURITY DEFINER ATIVO' as status,
    'ALTO RISCO - CORRIGIR' as nivel_risco
FROM pg_views 
WHERE schemaname = 'public'
    AND definition ILIKE '%SECURITY DEFINER%'
ORDER BY viewname;

-- Se não houver resultados, mostrar sucesso
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NENHUMA VIEW COM SECURITY DEFINER ENCONTRADA'
        ELSE '❌ ' || COUNT(*) || ' VIEWS AINDA PRECISAM SER CORRIGIDAS'
    END as resultado_views_security_definer
FROM pg_views 
WHERE schemaname = 'public'
    AND definition ILIKE '%SECURITY DEFINER%';

\echo ''

-- Verificar views específicas que foram corrigidas
SELECT 
    '2.2 STATUS VIEWS CORRIGIDAS' as verificacao,
    viewname,
    CASE 
        WHEN definition ILIKE '%SECURITY DEFINER%' THEN '❌ AINDA COM SECURITY DEFINER'
        ELSE '✅ CORRIGIDA (SECURITY INVOKER)'
    END as status_correcao
FROM pg_views 
WHERE schemaname = 'public'
    AND viewname IN (
        'analytics_device_metrics',
        'thebest_dashboard', 
        'user_activity_summary',
        'analytics_popular_pages',
        'thebest_mapping_quality_analysis',
        'thebest_mapping_summary',
        'thebest_mapping_issues',
        'analytics_daily_active_users'
    )
ORDER BY viewname;

\echo ''

-- =====================================================
-- 3. VERIFICAÇÃO SEARCH PATH DAS FUNÇÕES
-- =====================================================

\echo '📋 3. VERIFICANDO SEARCH PATH DAS FUNÇÕES...'

-- Resumo geral das funções
SELECT 
    '3.1 RESUMO SEARCH PATH' as verificacao,
    COUNT(*) as total_funcoes,
    COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) as funcoes_search_path_mutavel,
    COUNT(CASE WHEN 'search_path=' = ANY(p.proconfig) THEN 1 END) as funcoes_search_path_fixo,
    CASE 
        WHEN COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) = 0 THEN '✅ TODAS SEGURAS'
        ELSE '⚠️ ' || COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) || ' FUNÇÕES INSEGURAS'
    END as status_geral
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

\echo ''

-- Listar funções críticas de segurança
SELECT 
    '3.2 FUNÇÕES CRÍTICAS DE SEGURANÇA' as verificacao,
    p.proname as function_name,
    CASE 
        WHEN p.proconfig IS NULL THEN '❌ SEARCH_PATH MUTÁVEL'
        WHEN 'search_path=' = ANY(p.proconfig) THEN '✅ SEARCH_PATH FIXO'
        ELSE '❓ CONFIGURAÇÃO PERSONALIZADA'
    END as search_path_status,
    CASE 
        WHEN p.proconfig IS NULL THEN 'MÉDIO RISCO'
        ELSE 'SEGURO'
    END as nivel_risco
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (p.proname ILIKE '%security%' 
         OR p.proname ILIKE '%auth%' 
         OR p.proname ILIKE '%password%'
         OR p.proname ILIKE '%validate%')
ORDER BY 
    CASE WHEN p.proconfig IS NULL THEN 1 ELSE 2 END,
    p.proname;

\echo ''

-- Listar funções que ainda precisam ser corrigidas
SELECT 
    '3.3 FUNÇÕES PENDENTES DE CORREÇÃO' as verificacao,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    '⚠️ PRECISA SER CORRIGIDA' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proconfig IS NULL
ORDER BY p.proname
LIMIT 10; -- Limitar para não sobrecarregar

\echo ''

-- =====================================================
-- 4. VERIFICAÇÃO GERAL DE SEGURANÇA
-- =====================================================

\echo '📋 4. RESUMO GERAL DE SEGURANÇA...'

-- Score de segurança geral
WITH security_metrics AS (
    -- RLS Score
    SELECT 
        CASE WHEN rowsecurity = true THEN 100 ELSE 0 END as rls_score
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'profiles'
    
    UNION ALL
    
    -- Views Score
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100 
            ELSE GREATEST(0, 100 - (COUNT(*) * 12.5))
        END as views_score
    FROM pg_views 
    WHERE schemaname = 'public' AND definition ILIKE '%SECURITY DEFINER%'
    
    UNION ALL
    
    -- Functions Score
    SELECT 
        CASE 
            WHEN COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) = 0 THEN 100
            ELSE GREATEST(0, 100 - (COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) * 2))
        END as functions_score
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
)
SELECT 
    '4.1 SCORE DE SEGURANÇA GERAL' as verificacao,
    ROUND(AVG(rls_score), 1) as score_percentual,
    CASE 
        WHEN AVG(rls_score) >= 90 THEN '🟢 EXCELENTE'
        WHEN AVG(rls_score) >= 70 THEN '🟡 BOM'
        WHEN AVG(rls_score) >= 50 THEN '🟠 REGULAR'
        ELSE '🔴 CRÍTICO'
    END as nivel_seguranca_geral,
    CASE 
        WHEN AVG(rls_score) >= 90 THEN 'Sistema seguro, monitoramento contínuo recomendado'
        WHEN AVG(rls_score) >= 70 THEN 'Algumas melhorias necessárias'
        WHEN AVG(rls_score) >= 50 THEN 'Correções importantes pendentes'
        ELSE 'AÇÃO IMEDIATA NECESSÁRIA'
    END as recomendacao
FROM security_metrics;

\echo ''

-- =====================================================
-- 5. PRÓXIMOS PASSOS RECOMENDADOS
-- =====================================================

\echo '📋 5. PRÓXIMOS PASSOS RECOMENDADOS...'

SELECT 
    '5.1 AÇÕES RECOMENDADAS' as categoria,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
                AND tablename = 'profiles' 
                AND rowsecurity = false
        ) THEN '🚨 URGENTE: Habilitar RLS na tabela profiles'
        
        WHEN EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public' 
                AND definition ILIKE '%SECURITY DEFINER%'
        ) THEN '⚠️ ALTA: Corrigir views com SECURITY DEFINER'
        
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proconfig IS NULL
        ) THEN '📋 MÉDIA: Corrigir search_path das funções'
        
        ELSE '✅ MONITORAMENTO: Implementar verificação contínua'
    END as acao_prioritaria,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
                AND tablename = 'profiles' 
                AND rowsecurity = false
        ) THEN 'Executar: fix-rls-profiles.sql'
        
        WHEN EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public' 
                AND definition ILIKE '%SECURITY DEFINER%'
        ) THEN 'Executar: fix-security-definer-views.sql'
        
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proconfig IS NULL
        ) THEN 'Executar: fix-function-search-paths.sql'
        
        ELSE 'Implementar monitoramento automático'
    END as script_recomendado;

\echo ''
\echo '✅ VERIFICAÇÃO DE SEGURANÇA CONCLUÍDA!'
\echo ''
\echo '📄 RELATÓRIOS DISPONÍVEIS:'
\echo '   - SUPABASE_SECURITY_ANALYSIS_REPORT.md'
\echo '   - fix-rls-profiles.sql'
\echo '   - fix-security-definer-views.sql' 
\echo '   - fix-function-search-paths.sql'
\echo ''
\echo '🔄 EXECUTE ESTE SCRIPT NOVAMENTE APÓS APLICAR AS CORREÇÕES'