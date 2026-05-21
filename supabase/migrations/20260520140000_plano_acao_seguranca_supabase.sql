-- PLANO_ACAO_SEGURANCA_SUPABASE.md — fechamento de lacunas
-- Fase 2: RLS analytics | Fase 3: views security_invoker | Fase 4: search_path
-- Fase 0/6: servers.user_id + políticas por dono (corrige hub_control_servers_admin só-admin)

-- ---------------------------------------------------------------------------
-- Fase 0/6 — servers: dono + admin (app /servidores usa RLS, não só service_role)
-- ---------------------------------------------------------------------------
ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_servers_user_id ON public.servers(user_id);

DROP POLICY IF EXISTS "hub_control_servers_admin" ON public.servers;
DROP POLICY IF EXISTS "servers_select_policy" ON public.servers;
DROP POLICY IF EXISTS "servers_insert_policy" ON public.servers;
DROP POLICY IF EXISTS "servers_update_policy" ON public.servers;
DROP POLICY IF EXISTS "servers_delete_policy" ON public.servers;
DROP POLICY IF EXISTS "servers_admin_select_policy" ON public.servers;
DROP POLICY IF EXISTS "servers_admin_update_policy" ON public.servers;

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_servers_select" ON public.servers
  FOR SELECT TO authenticated
  USING (
    public.hub_control_is_admin()
    OR user_id = auth.uid()
  );

CREATE POLICY "hub_control_servers_insert" ON public.servers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.hub_control_is_admin()
    OR user_id = auth.uid()
  );

CREATE POLICY "hub_control_servers_update" ON public.servers
  FOR UPDATE TO authenticated
  USING (
    public.hub_control_is_admin()
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.hub_control_is_admin()
    OR user_id = auth.uid()
  );

CREATE POLICY "hub_control_servers_delete" ON public.servers
  FOR DELETE TO authenticated
  USING (
    public.hub_control_is_admin()
    OR user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Fase 2 — analytics (se tabelas existirem)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_events') THEN
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hub_control_analytics_events" ON public.analytics_events;
    CREATE POLICY "hub_control_analytics_events" ON public.analytics_events
      FOR ALL TO authenticated
      USING (user_id = auth.uid() OR public.hub_control_is_admin())
      WITH CHECK (user_id = auth.uid() OR public.hub_control_is_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_sessions') THEN
    ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hub_control_analytics_sessions" ON public.analytics_sessions;
    CREATE POLICY "hub_control_analytics_sessions" ON public.analytics_sessions
      FOR ALL TO authenticated
      USING (user_id = auth.uid() OR public.hub_control_is_admin())
      WITH CHECK (user_id = auth.uid() OR public.hub_control_is_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_funnels') THEN
    ALTER TABLE public.analytics_funnels ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hub_control_analytics_funnels" ON public.analytics_funnels;
    CREATE POLICY "hub_control_analytics_funnels" ON public.analytics_funnels
      FOR ALL TO authenticated
      USING (user_id = auth.uid() OR public.hub_control_is_admin())
      WITH CHECK (user_id = auth.uid() OR public.hub_control_is_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_metrics') THEN
    ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hub_control_analytics_metrics" ON public.analytics_metrics;
    CREATE POLICY "hub_control_analytics_metrics" ON public.analytics_metrics
      FOR ALL TO authenticated
      USING (public.hub_control_is_admin())
      WITH CHECK (public.hub_control_is_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_config') THEN
    ALTER TABLE public.analytics_config ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hub_control_analytics_config" ON public.analytics_config;
    CREATE POLICY "hub_control_analytics_config_select" ON public.analytics_config
      FOR SELECT TO authenticated
      USING (public.hub_control_is_admin());
    CREATE POLICY "hub_control_analytics_config_write" ON public.analytics_config
      FOR ALL TO authenticated
      USING (public.hub_control_is_admin())
      WITH CHECK (public.hub_control_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Fase 3 — views sem SECURITY DEFINER (security_invoker quando suportado)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'thebest_dashboard') THEN
    EXECUTE 'ALTER VIEW public.thebest_dashboard SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'analytics_device_metrics') THEN
    EXECUTE 'ALTER VIEW public.analytics_device_metrics SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'analytics_popular_pages') THEN
    EXECUTE 'ALTER VIEW public.analytics_popular_pages SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'analytics_daily_active_users') THEN
    EXECUTE 'ALTER VIEW public.analytics_daily_active_users SET (security_invoker = true)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'security_invoker em views: % — recrie views via 20241225000002 se necessário', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Fase 4 — search_path fixo em funções public sem configuração
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
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'search_path skip %: %', fn, SQLERRM;
    END;
  END LOOP;
END $$;
