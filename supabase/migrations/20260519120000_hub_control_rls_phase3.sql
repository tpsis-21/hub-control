-- Hub Control — Fase 3: políticas RLS consolidadas (HBCONTROL)
-- Funções SECURITY DEFINER evitam recursão em profiles.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hub_control_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.hub_control_is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.hub_control_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hub_control_is_authenticated() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hub_control_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hub_control_is_authenticated() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles — remover políticas permissivas
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "allow_all_delete" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_insert" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_select" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR id = auth.uid()
    OR public.hub_control_is_admin()
  );

CREATE POLICY "hub_control_profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR id = auth.uid());

CREATE POLICY "hub_control_profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR id = auth.uid()
    OR public.hub_control_is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR id = auth.uid()
    OR public.hub_control_is_admin()
  );

CREATE POLICY "hub_control_profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.hub_control_is_admin());

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_select_own" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_own" ON public.clients;
DROP POLICY IF EXISTS "clients_update_own" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_own" ON public.clients;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING (
    manager_id = auth.uid()::text
    OR public.hub_control_is_admin()
  );

CREATE POLICY "hub_control_clients_anon_link" ON public.clients
  FOR SELECT TO anon
  USING (unique_link IS NOT NULL);

CREATE POLICY "hub_control_clients_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    manager_id = auth.uid()::text
    OR public.hub_control_is_admin()
  );

CREATE POLICY "hub_control_clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    manager_id = auth.uid()::text
    OR public.hub_control_is_admin()
  );

CREATE POLICY "hub_control_clients_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (
    manager_id = auth.uid()::text
    OR public.hub_control_is_admin()
  );

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.hub_control_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = payments.client_id
        AND c.manager_id = auth.uid()::text
    )
  );

CREATE POLICY "hub_control_payments_write" ON public.payments
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

-- ---------------------------------------------------------------------------
-- plans / plan_groups — leitura autenticada, escrita admin
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_plans_select" ON public.plans
  FOR SELECT TO authenticated
  USING (public.hub_control_is_authenticated());

CREATE POLICY "hub_control_plans_write" ON public.plans
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

CREATE POLICY "hub_control_plan_groups_select" ON public.plan_groups
  FOR SELECT TO authenticated
  USING (public.hub_control_is_authenticated());

CREATE POLICY "hub_control_plan_groups_write" ON public.plan_groups
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

-- ---------------------------------------------------------------------------
-- servers / settings / secure_configs — admin
-- ---------------------------------------------------------------------------
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_servers_admin" ON public.servers
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

CREATE POLICY "hub_control_settings_admin" ON public.settings
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

CREATE POLICY "hub_control_secure_configs_admin" ON public.secure_configs
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

-- ---------------------------------------------------------------------------
-- financial / empresas / users / expenses
-- ---------------------------------------------------------------------------
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_financial_admin" ON public.financial_transactions
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

CREATE POLICY "hub_control_empresas_admin" ON public.empresas
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

CREATE POLICY "hub_control_users_admin" ON public.users
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

CREATE POLICY "hub_control_expenses_admin" ON public.expenses
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

-- ---------------------------------------------------------------------------
-- in_app_notifications / notifications (templates)
-- ---------------------------------------------------------------------------
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_in_app_notifications_own" ON public.in_app_notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.hub_control_is_admin())
  WITH CHECK (user_id = auth.uid() OR public.hub_control_is_admin());

CREATE POLICY "hub_control_notifications_admin" ON public.notifications
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

-- ---------------------------------------------------------------------------
-- user_settings / suspicious_activities
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_control_user_settings_own" ON public.user_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.hub_control_is_admin());

CREATE POLICY "hub_control_user_settings_update" ON public.user_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.hub_control_is_admin());

CREATE POLICY "hub_control_user_settings_admin_write" ON public.user_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.hub_control_is_admin());

CREATE POLICY "hub_control_suspicious_admin" ON public.suspicious_activities
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

-- ---------------------------------------------------------------------------
-- system_logs — substituir política permissiva
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "system_logs_policy" ON public.system_logs;

CREATE POLICY "hub_control_system_logs_admin" ON public.system_logs
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

-- ---------------------------------------------------------------------------
-- View user_activity_summary — security invoker
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.user_activity_summary;

CREATE VIEW public.user_activity_summary
WITH (security_invoker = true) AS
SELECT
  user_email,
  count(*) AS total_actions,
  count(*) FILTER (WHERE action = 'INSERT') AS inserts,
  count(*) FILTER (WHERE action = 'UPDATE') AS updates,
  count(*) FILTER (WHERE action = 'DELETE') AS deletes,
  max(created_at) AS last_activity
FROM public.audit_logs
WHERE created_at >= (now() - interval '30 days')
GROUP BY user_email
ORDER BY count(*) DESC;

GRANT SELECT ON public.user_activity_summary TO authenticated;

-- Leitura anon para área pública /cliente/
CREATE POLICY "hub_control_plans_anon_public" ON public.plans
  FOR SELECT TO anon
  USING (is_public = true);

CREATE POLICY "hub_control_plan_groups_anon_public" ON public.plan_groups
  FOR SELECT TO anon
  USING (true);
