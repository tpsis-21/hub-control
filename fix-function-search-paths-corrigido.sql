-- =====================================================
-- CORREÇÃO: Funções com Search Path Mutável (VERSÃO CORRIGIDA)
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Problema: Funções com search_path mutável
-- Impacto: MÉDIO - Possível SQL injection
-- Correção: Só altera funções que realmente existem
-- =====================================================

-- 1. Verificar funções atuais com search_path mutável
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN '⚠️ SEARCH_PATH MUTÁVEL'
        WHEN 'search_path=' = ANY(p.proconfig) THEN '✅ SEARCH_PATH FIXO'
        ELSE '❓ CONFIGURAÇÃO PERSONALIZADA'
    END as search_path_status
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
-- CORREÇÃO AUTOMÁTICA: Só funções que existem
-- =====================================================

DO $$
DECLARE
    func_record RECORD;
    total_corrigidas INTEGER := 0;
    funcoes_nao_encontradas TEXT[] := ARRAY[]::TEXT[];
    funcoes_ja_corrigidas TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '🔧 Iniciando correção de funções com search_path mutável...';
    RAISE NOTICE '';
    
    -- Lista de funções que queremos corrigir (do script original)
    FOR func_record IN 
        SELECT 
            n.nspname,
            p.proname,
            pg_get_function_identity_arguments(p.oid) as args,
            p.proconfig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
            AND p.proname IN (
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
            )
    LOOP
        -- Verificar se a função já tem search_path configurado
        IF func_record.proconfig IS NOT NULL AND 'search_path=' = ANY(func_record.proconfig) THEN
            funcoes_ja_corrigidas := array_append(funcoes_ja_corrigidas, func_record.proname);
            RAISE NOTICE '✅ %: já corrigida', func_record.proname;
        ELSIF func_record.proconfig IS NULL THEN
            -- Aplicar correção
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = ''''', 
                          func_record.nspname, 
                          func_record.proname, 
                          func_record.args);
            
            total_corrigidas := total_corrigidas + 1;
            RAISE NOTICE '🔧 %: corrigida', func_record.proname;
        ELSE
            RAISE NOTICE '❓ %: configuração personalizada mantida', func_record.proname;
        END IF;
    END LOOP;
    
    -- Verificar funções que não foram encontradas
    WITH funcoes_esperadas AS (
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
    SELECT array_agg(fe.function_name) INTO funcoes_nao_encontradas
    FROM funcoes_esperadas fe
    LEFT JOIN pg_proc p ON p.proname = fe.function_name
    LEFT JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
    WHERE p.proname IS NULL;
    
    -- Aplicar correção para TODAS as outras funções com search_path mutável
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Corrigindo outras funções com search_path mutável...';
    
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
            AND p.proconfig IS NULL
            AND p.proname NOT IN (
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
                ])
            )
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = ''''', 
                      func_record.nspname, 
                      func_record.proname, 
                      func_record.args);
        
        total_corrigidas := total_corrigidas + 1;
        RAISE NOTICE '🔧 %: corrigida', func_record.proname;
    END LOOP;
    
    -- Relatório final
    RAISE NOTICE '';
    RAISE NOTICE '📊 RELATÓRIO FINAL:';
    RAISE NOTICE '✅ Total de funções corrigidas: %', total_corrigidas;
    RAISE NOTICE '✅ Funções já corrigidas: %', array_length(funcoes_ja_corrigidas, 1);
    
    IF funcoes_nao_encontradas IS NOT NULL AND array_length(funcoes_nao_encontradas, 1) > 0 THEN
        RAISE NOTICE '⚠️ Funções não encontradas no banco:';
        FOR i IN 1..array_length(funcoes_nao_encontradas, 1) LOOP
            RAISE NOTICE '   - %', funcoes_nao_encontradas[i];
        END LOOP;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Correção concluída com sucesso!';
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se ainda existem funções com search_path mutável
SELECT 
    COUNT(*) as total_funcoes,
    COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) as funcoes_com_search_path_mutavel,
    COUNT(CASE WHEN 'search_path=' = ANY(p.proconfig) THEN 1 END) as funcoes_corrigidas,
    CASE 
        WHEN COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) = 0 THEN '✅ TODAS CORRIGIDAS'
        ELSE '⚠️ AINDA EXISTEM FUNÇÕES PARA CORRIGIR'
    END as status_geral
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- Listar funções ainda não corrigidas (se houver)
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    '⚠️ PRECISA SER CORRIGIDA' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proconfig IS NULL
ORDER BY p.proname;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Todas as funções existentes com search_path fixo ('')
-- ✅ Proteção contra SQL injection
-- ✅ Sem erros de funções inexistentes
-- ✅ Relatório detalhado das correções
-- =====================================================

-- NOTAS IMPORTANTES:
-- 1. Este script só corrige funções que realmente existem
-- 2. Fornece feedback detalhado sobre o processo
-- 3. Identifica funções não encontradas sem gerar erro
-- 4. Corrige TODAS as funções com search_path mutável

-- ROLLBACK (se necessário):
-- Para reverter uma função específica:
-- ALTER FUNCTION public.nome_da_funcao(argumentos) RESET search_path;