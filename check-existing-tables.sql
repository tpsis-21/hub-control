-- =====================================================
-- VERIFICAÇÃO: Tabelas existentes no banco de dados
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Objetivo: Verificar quais tabelas existem antes de corrigir views
-- =====================================================

-- 1. Listar todas as tabelas no schema public
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificar tabelas específicas mencionadas nas views
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = t.table_name
        ) THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status
FROM (VALUES 
    ('device_analytics'),
    ('user_mapping_stats'),
    ('profiles'),
    ('user_activities'),
    ('page_analytics'),
    ('mapping_quality_metrics'),
    ('mappings'),
    ('mapping_issues')
) AS t(table_name)
ORDER BY table_name;

-- 3. Verificar views existentes com SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER ATIVO'
        ELSE 'SECURITY INVOKER (padrão)'
    END as security_mode
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- 4. Verificar views específicas que precisam ser corrigidas
SELECT 
    view_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public' 
            AND viewname = v.view_name
        ) THEN '✅ VIEW EXISTE'
        ELSE '❌ VIEW NÃO EXISTE'
    END as view_status
FROM (VALUES 
    ('analytics_device_metrics'),
    ('thebest_dashboard'),
    ('user_activity_summary'),
    ('analytics_popular_pages'),
    ('thebest_mapping_quality_analysis'),
    ('thebest_mapping_summary'),
    ('thebest_mapping_issues'),
    ('analytics_daily_active_users')
) AS v(view_name)
ORDER BY view_name;

-- =====================================================
-- RESULTADO: 
-- Este script mostrará quais tabelas e views existem
-- para que possamos corrigir apenas as views válidas
-- =====================================================