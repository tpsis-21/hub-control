-- =====================================================
-- VALIDAÇÃO DE FUNÇÕES APÓS CORREÇÃO DO SEARCH_PATH
-- =====================================================
-- Este script valida se as funções foram corrigidas corretamente
-- e testa seu funcionamento após a aplicação do fix
-- 
-- Data: ${new Date().toLocaleDateString('pt-BR')}
-- Responsável: Correção de Segurança Supabase
-- =====================================================

-- Função para verificar se uma função tem search_path seguro
CREATE OR REPLACE FUNCTION check_function_search_path(p_schema TEXT, p_function_name TEXT)
RETURNS TABLE(
    function_name TEXT,
    has_secure_search_path BOOLEAN,
    current_search_path TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    func_prosrc TEXT;
    func_proconfig TEXT[];
    search_path_setting TEXT;
    is_secure BOOLEAN := FALSE;
BEGIN
    -- Buscar informações da função
    SELECT 
        p.prosrc,
        p.proconfig
    INTO 
        func_prosrc,
        func_proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = p_function_name 
    AND n.nspname = p_schema;
    
    -- Se função não encontrada
    IF func_prosrc IS NULL THEN
        RETURN QUERY SELECT 
            p_function_name,
            FALSE,
            'FUNÇÃO NÃO ENCONTRADA'::TEXT,
            'NOT_FOUND'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar configuração do search_path
    IF func_proconfig IS NOT NULL THEN
        -- Procurar por configuração de search_path
        FOR i IN 1..array_length(func_proconfig, 1) LOOP
            IF func_proconfig[i] LIKE 'search_path=%' THEN
                search_path_setting := func_proconfig[i];
                -- Verificar se é um search_path seguro (vazio ou específico)
                IF search_path_setting IN ('search_path=', 'search_path=public', 'search_path=public,pg_temp') THEN
                    is_secure := TRUE;
                END IF;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    -- Se não tem configuração de search_path, não é seguro
    IF search_path_setting IS NULL THEN
        search_path_setting := 'NÃO CONFIGURADO (MUTÁVEL)';
        is_secure := FALSE;
    END IF;
    
    RETURN QUERY SELECT 
        p_function_name,
        is_secure,
        search_path_setting,
        CASE 
            WHEN is_secure THEN 'OK'
            ELSE 'NEEDS_FIX'
        END;
END;
$$;

-- Função para testar execução de uma função (se possível)
CREATE OR REPLACE FUNCTION test_function_execution(p_schema TEXT, p_function_name TEXT)
RETURNS TABLE(
    function_name TEXT,
    test_result TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    func_signature TEXT;
    test_sql TEXT;
    result_text TEXT;
    error_text TEXT;
BEGIN
    -- Obter assinatura da função
    SELECT 
        p.proname || '(' || 
        COALESCE(
            string_agg(
                CASE 
                    WHEN p.proargnames IS NOT NULL AND array_length(p.proargnames, 1) >= i 
                    THEN p.proargnames[i] || ' ' 
                    ELSE '' 
                END || 
                format_type(p.proargtypes[i-1], NULL), 
                ', '
            ), 
            ''
        ) || ')'
    INTO func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN generate_series(1, p.pronargs) AS i
    WHERE p.proname = p_function_name 
    AND n.nspname = p_schema
    GROUP BY p.proname, p.pronargs;
    
    IF func_signature IS NULL THEN
        RETURN QUERY SELECT 
            p_function_name,
            'FUNÇÃO NÃO ENCONTRADA'::TEXT,
            'Function not found in schema'::TEXT;
        RETURN;
    END IF;
    
    -- Para funções sem parâmetros, tentar executar
    IF func_signature LIKE '%()' THEN
        BEGIN
            test_sql := format('SELECT %I.%I()', p_schema, p_function_name);
            EXECUTE test_sql INTO result_text;
            
            RETURN QUERY SELECT 
                p_function_name,
                'EXECUTADA COM SUCESSO'::TEXT,
                ''::TEXT;
        EXCEPTION
            WHEN OTHERS THEN
                error_text := SQLERRM;
                RETURN QUERY SELECT 
                    p_function_name,
                    'ERRO NA EXECUÇÃO'::TEXT,
                    error_text;
        END;
    ELSE
        RETURN QUERY SELECT 
            p_function_name,
            'REQUER PARÂMETROS - NÃO TESTADA'::TEXT,
            'Function requires parameters'::TEXT;
    END IF;
END;
$$;

-- =====================================================
-- EXECUTAR VALIDAÇÃO COMPLETA
-- =====================================================

DO $$
DECLARE
    functions_to_check TEXT[] := ARRAY[
        'update_push_subscriptions_updated_at',
        'convert_thebest_duration_to_days',
        'validate_password_strength',
        'update_expenses_updated_at',
        'is_article_visible_for_server',
        'update_in_app_notifications_updated_at',
        'convert_duration_flexible',
        'generate_unique_panel_plan_id',
        'ensure_panel_plan_id',
        'generate_unique_panel_server_id',
        'ensure_panel_server_id',
        'update_thebest_mappings_updated_at',
        'trigger_auto_map_new_packages',
        'trigger_auto_sync_on_package_change',
        'trigger_auto_sync_on_plan_change',
        'trigger_validate_mapping_on_change',
        'convert_days_to_thebest_enum',
        'handle_new_user',
        'create_security_alert',
        'resolve_security_alert',
        'trigger_suspicious_activity_detection',
        'validate_strong_password',
        'check_rate_limit',
        'trigger_log_mapping_changes',
        'set_trigger_enabled',
        'auto_map_thebest_packages',
        'validate_thebest_mapping',
        'get_unmapped_thebest_packages',
        'get_mapping_statistics',
        'disable_automation_triggers',
        'enable_automation_triggers',
        'detect_suspicious_activity',
        'sync_thebest_packages_from_csv',
        'sync_thebest_to_hubcontrol',
        'sync_hubcontrol_to_thebest',
        'sync_bidirectional',
        'check_sync_status',
        'update_updated_at_column',
        'scheduled_sync',
        'security_health_check',
        'is_mfa_required',
        'sanitize_html',
        'sanitize_profile_data',
        'update_updated_at',
        'validate_mapping_business_rules',
        'validate_sync_configuration',
        'calculate_compatibility_score',
        'get_mapping_recommendations',
        'trigger_validate_mapping_before_save',
        'test_duration_conversions',
        'current_user_is_admin'
    ];
    func_name TEXT;
    total_functions INTEGER;
    secure_functions INTEGER := 0;
    insecure_functions INTEGER := 0;
    not_found_functions INTEGER := 0;
    start_time TIMESTAMP;
BEGIN
    start_time := NOW();
    total_functions := array_length(functions_to_check, 1);
    
    RAISE NOTICE '=== VALIDAÇÃO DE FUNÇÕES APÓS CORREÇÃO ===';
    RAISE NOTICE 'Data/Hora: %', start_time;
    RAISE NOTICE 'Total de funções a verificar: %', total_functions;
    RAISE NOTICE '';
    
    -- Criar tabela temporária para resultados
    CREATE TEMP TABLE validation_results (
        function_name TEXT,
        has_secure_search_path BOOLEAN,
        current_search_path TEXT,
        status TEXT
    );
    
    -- Verificar cada função
    FOREACH func_name IN ARRAY functions_to_check
    LOOP
        INSERT INTO validation_results
        SELECT * FROM check_function_search_path('public', func_name);
    END LOOP;
    
    -- Contar resultados
    SELECT 
        COUNT(*) FILTER (WHERE status = 'OK'),
        COUNT(*) FILTER (WHERE status = 'NEEDS_FIX'),
        COUNT(*) FILTER (WHERE status = 'NOT_FOUND')
    INTO 
        secure_functions,
        insecure_functions,
        not_found_functions
    FROM validation_results;
    
    RAISE NOTICE '=== RESULTADOS DA VALIDAÇÃO ===';
    RAISE NOTICE 'Funções seguras (search_path fixo): %', secure_functions;
    RAISE NOTICE 'Funções inseguras (search_path mutável): %', insecure_functions;
    RAISE NOTICE 'Funções não encontradas: %', not_found_functions;
    RAISE NOTICE '';
    
    -- Mostrar funções que ainda precisam de correção
    IF insecure_functions > 0 THEN
        RAISE NOTICE '❌ FUNÇÕES QUE AINDA PRECISAM DE CORREÇÃO:';
        FOR func_name IN 
            SELECT v.function_name 
            FROM validation_results v 
            WHERE v.status = 'NEEDS_FIX'
            ORDER BY v.function_name
        LOOP
            RAISE NOTICE '  - %', func_name;
        END LOOP;
        RAISE NOTICE '';
    END IF;
    
    -- Mostrar funções não encontradas
    IF not_found_functions > 0 THEN
        RAISE NOTICE '⚠️  FUNÇÕES NÃO ENCONTRADAS:';
        FOR func_name IN 
            SELECT v.function_name 
            FROM validation_results v 
            WHERE v.status = 'NOT_FOUND'
            ORDER BY v.function_name
        LOOP
            RAISE NOTICE '  - %', func_name;
        END LOOP;
        RAISE NOTICE '';
    END IF;
    
    -- Resultado final
    IF insecure_functions = 0 THEN
        RAISE NOTICE '✅ SUCESSO: Todas as funções encontradas estão seguras!';
    ELSE
        RAISE NOTICE '❌ ATENÇÃO: % funções ainda precisam de correção', insecure_functions;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Tempo total de validação: %', NOW() - start_time;
    
END;
$$;

-- =====================================================
-- RELATÓRIO DETALHADO
-- =====================================================

-- Gerar relatório detalhado das funções
SELECT 
    'RELATÓRIO DETALHADO DE VALIDAÇÃO' as titulo,
    NOW() as data_validacao;

-- Funções seguras
SELECT 
    '✅ FUNÇÕES SEGURAS' as categoria,
    function_name,
    current_search_path
FROM check_function_search_path('public', unnest(ARRAY[
    'update_push_subscriptions_updated_at',
    'convert_thebest_duration_to_days',
    'validate_password_strength',
    'update_expenses_updated_at',
    'is_article_visible_for_server',
    'update_in_app_notifications_updated_at',
    'convert_duration_flexible',
    'generate_unique_panel_plan_id',
    'ensure_panel_plan_id',
    'generate_unique_panel_server_id',
    'ensure_panel_server_id',
    'update_thebest_mappings_updated_at',
    'trigger_auto_map_new_packages',
    'trigger_auto_sync_on_package_change',
    'trigger_auto_sync_on_plan_change',
    'trigger_validate_mapping_on_change',
    'convert_days_to_thebest_enum',
    'handle_new_user',
    'create_security_alert',
    'resolve_security_alert',
    'trigger_suspicious_activity_detection',
    'validate_strong_password',
    'check_rate_limit',
    'trigger_log_mapping_changes',
    'set_trigger_enabled',
    'auto_map_thebest_packages',
    'validate_thebest_mapping',
    'get_unmapped_thebest_packages',
    'get_mapping_statistics',
    'disable_automation_triggers',
    'enable_automation_triggers',
    'detect_suspicious_activity',
    'sync_thebest_packages_from_csv',
    'sync_thebest_to_hubcontrol',
    'sync_hubcontrol_to_thebest',
    'sync_bidirectional',
    'check_sync_status',
    'update_updated_at_column',
    'scheduled_sync',
    'security_health_check',
    'is_mfa_required',
    'sanitize_html',
    'sanitize_profile_data',
    'update_updated_at',
    'validate_mapping_business_rules',
    'validate_sync_configuration',
    'calculate_compatibility_score',
    'get_mapping_recommendations',
    'trigger_validate_mapping_before_save',
    'test_duration_conversions',
    'current_user_is_admin'
]))
WHERE status = 'OK'
ORDER BY function_name;

-- =====================================================
-- TESTE DE TRIGGERS (SE APLICÁVEL)
-- =====================================================

-- Verificar se triggers estão funcionando após correção
CREATE OR REPLACE FUNCTION validate_triggers_after_fix()
RETURNS TABLE(
    trigger_name TEXT,
    table_name TEXT,
    function_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE NOTICE 'Verificando triggers que usam funções corrigidas...';
    
    RETURN QUERY
    SELECT 
        t.tgname::TEXT as trigger_name,
        c.relname::TEXT as table_name,
        p.proname::TEXT as function_name,
        CASE 
            WHEN p.proname IS NOT NULL THEN 'TRIGGER ATIVO'
            ELSE 'FUNÇÃO NÃO ENCONTRADA'
        END as status
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'update_push_subscriptions_updated_at',
        'update_expenses_updated_at',
        'update_in_app_notifications_updated_at',
        'update_thebest_mappings_updated_at',
        'trigger_auto_map_new_packages',
        'trigger_auto_sync_on_package_change',
        'trigger_auto_sync_on_plan_change',
        'trigger_validate_mapping_on_change',
        'trigger_suspicious_activity_detection',
        'trigger_log_mapping_changes',
        'trigger_validate_mapping_before_save',
        'update_updated_at_column'
    )
    ORDER BY t.tgname;
END;
$$;

-- Executar validação de triggers
SELECT * FROM validate_triggers_after_fix();

-- =====================================================
-- LIMPEZA
-- =====================================================

-- Remover funções auxiliares (opcional)
-- DROP FUNCTION IF EXISTS check_function_search_path(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS test_function_execution(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS validate_triggers_after_fix();

-- =====================================================
-- INSTRUÇÕES FINAIS
-- =====================================================

/*
INSTRUÇÕES PÓS-VALIDAÇÃO:

1. ANALISAR RESULTADOS:
   - Verifique se todas as funções estão com search_path seguro
   - Identifique funções que ainda precisam de correção manual

2. TESTAR FUNCIONALIDADES:
   - Execute operações críticas da aplicação
   - Verifique se triggers estão funcionando
   - Teste fluxos de sincronização e automação

3. MONITORAR PERFORMANCE:
   - Acompanhe tempo de resposta das funções
   - Verifique se não há degradação de performance

4. CORRIGIR PROBLEMAS:
   - Se alguma função falhar, verifique dependências
   - Ajuste search_path manualmente se necessário
   - Use o script fix-function-search-paths-corrigido.sql novamente

5. DOCUMENTAR RESULTADOS:
   - Salve os resultados da validação
   - Atualize documentação técnica
   - Informe equipe sobre mudanças

IMPORTANTE:
- Execute esta validação após cada correção
- Mantenha logs dos resultados para auditoria
- Teste em ambiente de desenvolvimento primeiro
*/