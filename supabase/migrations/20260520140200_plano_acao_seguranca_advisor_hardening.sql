-- PLANO_ACAO_SEGURANCA — Fase complementar: Security Advisor (0028/0026)
-- Revoga anon em RPCs SECURITY DEFINER e em tabelas que não devem ser públicas via GraphQL/REST.
-- Mantém anon em clients/plans (área /cliente/ e planos públicos com RLS).

-- ---------------------------------------------------------------------------
-- 0028: anon não executa RPCs SECURITY DEFINER (inclui hub_control_is_admin)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.hub_control_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hub_control_is_admin() TO authenticated, service_role;

-- Evita EXECUTE residual em anon no schema (advisor 0028)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ---------------------------------------------------------------------------
-- 0026: reduzir exposição GraphQL/REST para anon em tabelas administrativas
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'servers', 'settings', 'secure_configs', 'empresas', 'financial_transactions',
    'payments', 'expenses', 'users', 'profiles', 'system_logs', 'suspicious_activities',
    'smtp_configs', 'rate_limits', 'email_logs', 'notifications', 'deliverability_metrics',
    'in_app_notifications', 'checkout_orders', 'checkout_settings', 'audit_logs',
    'user_settings', 'knowledge_base_articles'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
    END IF;
  END LOOP;
END $$;

-- Views administrativas / analytics
DO $$
DECLARE
  vw text;
BEGIN
  FOREACH vw IN ARRAY ARRAY[
    'user_activity_summary', 'thebest_dashboard', 'analytics_device_metrics',
    'analytics_popular_pages', 'analytics_daily_active_users'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_views
      WHERE schemaname = 'public' AND viewname = vw
    ) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', vw);
    END IF;
  END LOOP;
END $$;

-- Garantir que authenticated e service_role mantêm uso via políticas RLS
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
