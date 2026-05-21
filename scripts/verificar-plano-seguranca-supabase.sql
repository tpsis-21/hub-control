-- Cole no SQL Editor do Supabase após aplicar 20260520140000_plano_acao_seguranca_supabase.sql

-- 1) Tabelas sem RLS
SELECT c.relname AS tabela, c.relrowsecurity AS rls_ativo
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'users', 'empresas', 'financial_transactions', 'payments', 'expenses', 'settings',
    'analytics_events', 'analytics_sessions', 'analytics_metrics', 'analytics_config',
    'analytics_funnels', 'in_app_notifications', 'plan_groups', 'plans', 'servers'
  )
ORDER BY c.relrowsecurity ASC, c.relname;

-- 2) servers.user_id
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'servers' AND column_name = 'user_id';

-- 3) Views SECURITY DEFINER (deve retornar 0 linhas)
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'thebest_dashboard', 'analytics_device_metrics', 'user_activity_summary',
    'analytics_popular_pages', 'analytics_daily_active_users'
  )
  AND definition ILIKE '%security definer%';

-- 4) Funções public sem search_path fixo
SELECT p.proname AS funcao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind IN ('f', 'p')
  AND NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
    WHERE cfg LIKE 'search_path=%'
  )
ORDER BY p.proname
LIMIT 50;
