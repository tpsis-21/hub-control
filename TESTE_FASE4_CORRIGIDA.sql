-- =====================================================
-- TESTE FASE 4 CORRIGIDA - POLÍTICAS DE SISTEMA
-- =====================================================

-- Desativar RLS temporariamente para limpeza
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications DISABLE ROW LEVEL SECURITY;

-- Remover políticas conflitantes se existirem
DROP POLICY IF EXISTS "user_settings_admin_only" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_user_update" ON public.user_settings;
DROP POLICY IF EXISTS "plans_view_policy" ON public.plans;
DROP POLICY IF EXISTS "plans_admin_modify" ON public.plans;
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
DROP POLICY IF EXISTS "plans_admin_manage" ON public.plans;
DROP POLICY IF EXISTS "plan_groups_view_policy" ON public.plan_groups;
DROP POLICY IF EXISTS "plan_groups_admin_modify" ON public.plan_groups;
DROP POLICY IF EXISTS "plan_groups_public_read" ON public.plan_groups;
DROP POLICY IF EXISTS "plan_groups_admin_manage" ON public.plan_groups;
DROP POLICY IF EXISTS "notifications_user_access" ON public.in_app_notifications;
DROP POLICY IF EXISTS "notifications_admin_access" ON public.in_app_notifications;

SELECT 'Políticas antigas removidas!' as status;

-- =====================================================
-- CRIAR POLÍTICAS CORRIGIDAS
-- =====================================================

-- USER_SETTINGS (apenas admins podem gerenciar configurações)
CREATE POLICY "user_settings_admin_only" ON public.user_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- USER_SETTINGS (usuários podem atualizar suas próprias configurações)
CREATE POLICY "user_settings_user_update" ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid());

-- PLANS (usuários autenticados podem visualizar, apenas admins podem modificar)
CREATE POLICY "plans_view_policy" ON public.plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "plans_admin_insert" ON public.plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "plans_admin_update" ON public.plans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "plans_admin_delete" ON public.plans
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- PLAN_GROUPS (usuários autenticados podem visualizar, apenas admins podem modificar)
CREATE POLICY "plan_groups_view_policy" ON public.plan_groups
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "plan_groups_admin_insert" ON public.plan_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "plan_groups_admin_update" ON public.plan_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "plan_groups_admin_delete" ON public.plan_groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- NOTIFICATIONS
CREATE POLICY "notifications_user_access" ON public.in_app_notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_access" ON public.in_app_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Reativar RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

SELECT 'FASE 4 CORRIGIDA: Políticas de sistema criadas com tipos corretos!' as status;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar se as políticas foram criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('user_settings', 'plans', 'plan_groups', 'in_app_notifications')
ORDER BY tablename, policyname;

SELECT 'Verificação concluída!' as status;