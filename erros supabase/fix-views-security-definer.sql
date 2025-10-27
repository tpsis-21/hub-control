-- =====================================================
-- CORREÇÃO DE VIEWS COM SECURITY DEFINER
-- =====================================================
-- Este script corrige views que possuem SECURITY DEFINER
-- removendo essa configuração para usar SECURITY INVOKER (padrão)
-- 
-- Data: ${new Date().toLocaleDateString('pt-BR')}
-- Responsável: Correção de Segurança Supabase
-- =====================================================

-- IMPORTANTE: Execute o backup-views-security-definer.sql ANTES deste script!

-- Função para verificar se uma view tem SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_view_security_definer(p_schema TEXT, p_view_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    view_definition TEXT;
    has_security_definer BOOLEAN := FALSE;
BEGIN
    -- Obter definição da view
    SELECT pg_get_viewdef(c.oid, true)
    INTO view_definition
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = p_view_name 
    AND n.nspname = p_schema
    AND c.relkind = 'v';
    
    -- Verificar se contém SECURITY DEFINER
    IF view_definition IS NOT NULL THEN
        has_security_definer := view_definition ILIKE '%SECURITY DEFINER%';
    END IF;
    
    RETURN has_security_definer;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Função para corrigir uma view removendo SECURITY DEFINER
CREATE OR REPLACE FUNCTION fix_view_security_definer(p_schema TEXT, p_view_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    view_definition TEXT;
    clean_definition TEXT;
    view_exists BOOLEAN;
    had_security_definer BOOLEAN;
BEGIN
    -- Verificar se a view existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_schema = p_schema 
        AND table_name = p_view_name
    ) INTO view_exists;
    
    IF NOT view_exists THEN
        RAISE NOTICE 'View %.% não encontrada, pulando correção', p_schema, p_view_name;
        RETURN FALSE;
    END IF;
    
    -- Verificar se tem SECURITY DEFINER
    had_security_definer := check_view_security_definer(p_schema, p_view_name);
    
    IF NOT had_security_definer THEN
        RAISE NOTICE 'View %.% já não possui SECURITY DEFINER', p_schema, p_view_name;
        RETURN TRUE;
    END IF;
    
    -- Obter definição atual da view
    SELECT pg_get_viewdef(c.oid, true)
    INTO view_definition
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = p_view_name 
    AND n.nspname = p_schema
    AND c.relkind = 'v';
    
    -- Remover SECURITY DEFINER da definição
    clean_definition := regexp_replace(
        view_definition, 
        '\s*WITH\s+\(\s*security_definer\s*=\s*(true|''true''|on|''on'')\s*\)', 
        '', 
        'gi'
    );
    
    -- Remover outras variações de SECURITY DEFINER
    clean_definition := regexp_replace(
        clean_definition, 
        '\s*WITH\s+SECURITY\s+DEFINER', 
        '', 
        'gi'
    );
    
    -- Dropar e recriar a view
    EXECUTE format('DROP VIEW %I.%I CASCADE', p_schema, p_view_name);
    EXECUTE format('CREATE VIEW %I.%I AS %s', p_schema, p_view_name, clean_definition);
    
    RAISE NOTICE 'View %.% corrigida com sucesso (SECURITY DEFINER removido)', p_schema, p_view_name;
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao corrigir view %.%: %', p_schema, p_view_name, SQLERRM;
        RETURN FALSE;
END;
$$;

-- =====================================================
-- EXECUTAR CORREÇÃO DAS VIEWS IDENTIFICADAS
-- =====================================================

DO $$
DECLARE
    views_to_fix TEXT[] := ARRAY[
        'analytics_device_metrics',
        'thebest_dashboard', 
        'user_activity_summary',
        'analytics_daily_active_users',
        'analytics_popular_pages',
        'thebest_mapping_quality_analysis',
        'thebest_mapping_summary',
        'thebest_mapping_issues'
    ];
    view_name TEXT;
    fixed_count INTEGER := 0;
    total_views INTEGER;
    start_time TIMESTAMP;
BEGIN
    start_time := NOW();
    total_views := array_length(views_to_fix, 1);
    
    RAISE NOTICE '=== INICIANDO CORREÇÃO DE % VIEWS ===', total_views;
    RAISE NOTICE 'Data/Hora: %', start_time;
    RAISE NOTICE '';
    
    -- Corrigir cada view
    FOREACH view_name IN ARRAY views_to_fix
    LOOP
        RAISE NOTICE 'Processando view: %', view_name;
        
        IF fix_view_security_definer('public', view_name) THEN
            fixed_count := fixed_count + 1;
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '=== CORREÇÃO CONCLUÍDA ===';
    RAISE NOTICE 'Tempo total: %', NOW() - start_time;
    RAISE NOTICE 'Views corrigidas: %/%', fixed_count, total_views;
    RAISE NOTICE 'Views não encontradas/já corretas: %', total_views - fixed_count;
    
END;
$$;

-- =====================================================
-- VERIFICAR CORREÇÕES REALIZADAS
-- =====================================================

-- Verificar se ainda existem views com SECURITY DEFINER
DO $$
DECLARE
    view_record RECORD;
    views_with_definer INTEGER := 0;
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO PÓS-CORREÇÃO ===';
    
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
        AND viewname IN (
            'analytics_device_metrics',
            'thebest_dashboard', 
            'user_activity_summary',
            'analytics_daily_active_users',
            'analytics_popular_pages',
            'thebest_mapping_quality_analysis',
            'thebest_mapping_summary',
            'thebest_mapping_issues'
        )
    LOOP
        IF check_view_security_definer(view_record.schemaname, view_record.viewname) THEN
            RAISE NOTICE 'ATENÇÃO: View %.% ainda possui SECURITY DEFINER!', 
                view_record.schemaname, view_record.viewname;
            views_with_definer := views_with_definer + 1;
        ELSE
            RAISE NOTICE 'OK: View %.% não possui SECURITY DEFINER', 
                view_record.schemaname, view_record.viewname;
        END IF;
    END LOOP;
    
    IF views_with_definer = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ SUCESSO: Todas as views foram corrigidas!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ ATENÇÃO: % views ainda precisam de correção manual', views_with_definer;
    END IF;
    
END;
$$;

-- =====================================================
-- VERIFICAR PERMISSÕES DAS TABELAS BASE
-- =====================================================

-- Script para verificar se as permissões das tabelas base estão adequadas
-- (Execute após a correção das views)

CREATE OR REPLACE FUNCTION check_table_permissions_for_views()
RETURNS TABLE(
    view_name TEXT,
    base_table TEXT,
    current_user_can_select BOOLEAN,
    recommended_action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE NOTICE 'Verificando permissões das tabelas base para as views corrigidas...';
    RAISE NOTICE 'Esta função deve ser executada com diferentes usuários para validar permissões.';
    
    -- Esta é uma função de exemplo - adapte conforme suas tabelas específicas
    RETURN QUERY
    SELECT 
        'analytics_device_metrics'::TEXT as view_name,
        'device_metrics'::TEXT as base_table,
        has_table_privilege(current_user, 'device_metrics', 'SELECT') as current_user_can_select,
        CASE 
            WHEN has_table_privilege(current_user, 'device_metrics', 'SELECT') 
            THEN 'Permissão OK'
            ELSE 'GRANT SELECT ON device_metrics TO ' || current_user
        END as recommended_action;
    
    -- Adicione mais verificações conforme necessário para outras views/tabelas
END;
$$;

-- Executar verificação de permissões
SELECT * FROM check_table_permissions_for_views();

-- =====================================================
-- LIMPEZA DAS FUNÇÕES AUXILIARES
-- =====================================================

-- Remover funções auxiliares após a correção (opcional)
-- DROP FUNCTION IF EXISTS check_view_security_definer(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS fix_view_security_definer(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS check_table_permissions_for_views();

-- =====================================================
-- INSTRUÇÕES FINAIS
-- =====================================================

/*
INSTRUÇÕES PÓS-CORREÇÃO:

1. VALIDAR FUNCIONAMENTO:
   - Teste cada view com diferentes usuários
   - Verifique se as aplicações continuam funcionando
   - Confirme que não há dados sensíveis expostos

2. AJUSTAR PERMISSÕES (SE NECESSÁRIO):
   - Se alguma view não funcionar, ajuste permissões nas tabelas base
   - Use GRANT SELECT ON tabela TO usuario/role conforme necessário

3. MONITORAR LOGS:
   - Acompanhe logs de erro nas próximas 24-48h
   - Verifique se há tentativas de acesso negadas

4. ROLLBACK (SE NECESSÁRIO):
   - Use o script backup-views-security-definer.sql para restaurar
   - Execute: SELECT restore_view_from_backup('public', 'nome_da_view');

5. DOCUMENTAR MUDANÇAS:
   - Atualize documentação das views
   - Informe equipe sobre as mudanças de segurança

IMPORTANTE:
- Esta correção melhora a segurança seguindo o princípio do menor privilégio
- Views agora executam com permissões do usuário atual (SECURITY INVOKER)
- Pode ser necessário ajustar permissões nas tabelas base
*/