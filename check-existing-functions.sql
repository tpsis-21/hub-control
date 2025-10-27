-- =====================================================
-- VERIFICAÇÃO: Funções Existentes no Banco de Dados
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Objetivo: Identificar funções reais antes de corrigir search_path
-- =====================================================

-- 1. Listar TODAS as funções existentes no schema public
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_identity_arguments(p.oid) as identity_args,
    CASE 
        WHEN p.proconfig IS NULL THEN '⚠️ SEARCH_PATH MUTÁVEL'
        WHEN 'search_path=' = ANY(p.proconfig) THEN '✅ SEARCH_PATH FIXO'
        ELSE '❓ CONFIGURAÇÃO PERSONALIZADA'
    END as search_path_status,
    p.oid as function_oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY 
    CASE 
        WHEN p.proconfig IS NULL THEN 1  -- Priorizar funções que precisam correção
        ELSE 2
    END,
    p.proname;

-- =====================================================
-- 2. FUNÇÕES COM SEARCH_PATH MUTÁVEL (que precisam correção)
-- =====================================================

SELECT 
    '-- Função encontrada: ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as sql_comment,
    'ALTER FUNCTION public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') SET search_path = '''';' as sql_fix
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proconfig IS NULL
ORDER BY 
    CASE 
        WHEN p.proname ILIKE '%security%' OR p.proname ILIKE '%auth%' OR p.proname ILIKE '%password%' THEN 1
        WHEN p.proname ILIKE '%trigger%' OR p.proname ILIKE '%sync%' THEN 2
        ELSE 3
    END,
    p.proname;

-- =====================================================
-- 3. ESTATÍSTICAS RESUMIDAS
-- =====================================================

SELECT 
    COUNT(*) as total_funcoes_public,
    COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) as funcoes_search_path_mutavel,
    COUNT(CASE WHEN 'search_path=' = ANY(p.proconfig) THEN 1 END) as funcoes_search_path_fixo,
    ROUND(
        (COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) * 100.0) / COUNT(*), 
        2
    ) as percentual_vulneravel
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- =====================================================
-- 4. VERIFICAR FUNÇÕES ESPECÍFICAS DO SCRIPT ORIGINAL
-- =====================================================

-- Lista de funções que o script original tenta corrigir
WITH funcoes_script_original AS (
    SELECT unnest(ARRAY[
        'validate_password_strength',
        'validate_strong_password', 
        'create_security_alert',
        'resolve_security_alert',
        'check_rate_limit',
        'detect_suspicious_activity',
        'handle_new_user',
        'update_user_last_seen',
        'validate_user_permissions',
        'update_profile_updated_at',
        'handle_profile_changes',
        'audit_trigger_function',
        'log_data_changes',
        'sync_user_data',
        'update_mapping_statistics',
        'calculate_quality_scores',
        'validate_mapping_data',
        'check_data_integrity',
        'calculate_user_analytics',
        'generate_daily_reports',
        'update_dashboard_metrics',
        'process_mapping_quality',
        'analyze_mapping_completeness',
        'update_mapping_rankings',
        'cleanup_old_sessions',
        'archive_old_data',
        'send_notification',
        'process_background_tasks'
    ]) as function_name
)
SELECT 
    fso.function_name,
    CASE 
        WHEN p.proname IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status,
    CASE 
        WHEN p.proname IS NOT NULL AND p.proconfig IS NULL THEN '⚠️ PRECISA CORREÇÃO'
        WHEN p.proname IS NOT NULL AND 'search_path=' = ANY(p.proconfig) THEN '✅ JÁ CORRIGIDA'
        WHEN p.proname IS NOT NULL THEN '❓ CONFIG PERSONALIZADA'
        ELSE '➖ N/A'
    END as search_path_status,
    CASE 
        WHEN p.proname IS NOT NULL THEN pg_get_function_identity_arguments(p.oid)
        ELSE 'N/A'
    END as arguments
FROM funcoes_script_original fso
LEFT JOIN pg_proc p ON p.proname = fso.function_name
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
ORDER BY 
    CASE 
        WHEN p.proname IS NOT NULL AND p.proconfig IS NULL THEN 1  -- Existe e precisa correção
        WHEN p.proname IS NOT NULL THEN 2  -- Existe mas já corrigida
        ELSE 3  -- Não existe
    END,
    fso.function_name;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Lista completa de funções existentes
-- ✅ Identificação de funções que precisam correção
-- ✅ Verificação de funções do script original
-- =====================================================