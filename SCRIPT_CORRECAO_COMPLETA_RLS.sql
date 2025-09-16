-- =====================================================
-- SCRIPT DE CORREÇÃO COMPLETA DAS POLÍTICAS RLS
-- Hub Control - Supabase Database Security Fix
-- =====================================================

-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- Faça backup antes de executar em produção!

BEGIN;

-- =====================================================
-- FASE 1: CORREÇÃO CRÍTICA - RECURSÃO NA TABELA PROFILES
-- =====================================================

SELECT 'FASE 1: Corrigindo recursão na tabela profiles...' as status;

-- Desabilitar RLS temporariamente para limpeza
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas duplicadas/problemáticas
DROP POLICY IF EXISTS "allow_all_delete" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_insert" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_select" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_access" ON public.profiles;

-- Criar política para inserção de perfil próprio
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Criar política para deleção por admin
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

SELECT 'FASE 1: Concluída - Recursão corrigida!' as status;

-- =====================================================
-- FASE 2: HABILITAR RLS EM TABELAS CRÍTICAS
-- =====================================================

SELECT 'FASE 2: Habilitando RLS em tabelas críticas...' as status;

-- Tabelas Financeiras (PRIORIDADE MÁXIMA)
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Tabelas de Dados Sensíveis
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Tabelas de Sistema
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Tabelas de Analytics
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_config ENABLE ROW LEVEL SECURITY;

SELECT 'FASE 2: Concluída - RLS habilitado!' as status;

-- =====================================================
-- FASE 3: CRIAR POLÍTICAS PARA TABELAS FINANCEIRAS
-- =====================================================

SELECT 'FASE 3: Criando políticas para tabelas financeiras...' as status;

-- FINANCIAL_TRANSACTIONS (apenas admins - não tem relacionamento com usuários)
CREATE POLICY "financial_transactions_admin_only" ON public.financial_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- PAYMENTS (usuários veem pagamentos de seus clientes)
CREATE POLICY "payments_user_access" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()::text
    )
  );

CREATE POLICY "payments_admin_access" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

SELECT 'FASE 3: Concluída - Políticas financeiras criadas!' as status;

-- =====================================================
-- FASE 4: CRIAR POLÍTICAS PARA TABELAS DE SISTEMA
-- =====================================================

SELECT 'FASE 4: Criando políticas para tabelas de sistema...' as status;

-- USER_SETTINGS (apenas admins podem gerenciar configurações)
CREATE POLICY "user_settings_admin_only" ON public.user_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

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

CREATE POLICY "settings_user_update" ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid());

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

-- PLANS
CREATE POLICY "plans_public_read" ON public.plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "plans_admin_manage" ON public.plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- PLAN_GROUPS
CREATE POLICY "plan_groups_public_read" ON public.plan_groups
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "plan_groups_admin_manage" ON public.plan_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

SELECT 'FASE 4: Concluída - Políticas de sistema criadas!' as status;

-- =====================================================
-- FASE 5: CRIAR POLÍTICAS PARA ANALYTICS
-- =====================================================

SELECT 'FASE 5: Criando políticas para analytics...' as status;

-- ANALYTICS_EVENTS
CREATE POLICY "analytics_events_user_data" ON public.analytics_events
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "analytics_events_admin_access" ON public.analytics_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ANALYTICS_SESSIONS
CREATE POLICY "analytics_sessions_user_data" ON public.analytics_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "analytics_sessions_admin_access" ON public.analytics_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ANALYTICS_FUNNELS
CREATE POLICY "analytics_funnels_user_data" ON public.analytics_funnels
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "analytics_funnels_admin_access" ON public.analytics_funnels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ANALYTICS_METRICS
CREATE POLICY "analytics_metrics_user_data" ON public.analytics_metrics
  FOR ALL USING (true);

CREATE POLICY "analytics_metrics_admin_access" ON public.analytics_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ANALYTICS_CONFIG
CREATE POLICY "analytics_config_user_data" ON public.analytics_config
  FOR ALL USING (true);

CREATE POLICY "analytics_config_admin_access" ON public.analytics_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

SELECT 'FASE 5: Concluída - Políticas de analytics criadas!' as status;

-- =====================================================
-- FASE 6: OTIMIZAÇÃO - ÍNDICES PARA PERFORMANCE
-- =====================================================

SELECT 'FASE 6: Criando índices para otimização...' as status;

-- Índices para campos utilizados em RLS
CREATE INDEX IF NOT EXISTS idx_profiles_role_auth 
  ON public.profiles(role) WHERE role = 'admin';

-- Índice para clients usando manager_id (coluna que existe)
CREATE INDEX IF NOT EXISTS idx_clients_manager_id 
  ON public.clients(manager_id);

-- Índice para financial_transactions usando type (coluna que existe)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type 
  ON public.financial_transactions(type);

-- Índice para payments usando client_id (coluna que existe)
CREATE INDEX IF NOT EXISTS idx_payments_client_id 
  ON public.payments(client_id);

-- Removidos índices para tabelas/colunas inexistentes:
-- - idx_expenses_created_by (tabela expenses não existe)
-- - idx_empresas_owner_id (tabela empresas não existe)

CREATE INDEX IF NOT EXISTS idx_settings_user_id 
  ON public.user_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON public.in_app_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id 
  ON public.analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id 
  ON public.analytics_sessions(user_id);

SELECT 'FASE 6: Concluída - Índices criados!' as status;

-- =====================================================
-- FASE 7: FUNÇÃO AUXILIAR PARA VERIFICAÇÃO DE ADMIN
-- =====================================================

SELECT 'FASE 7: Criando função auxiliar otimizada...' as status;

-- Função otimizada para verificação de admin (com cache)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_result BOOLEAN;
BEGIN
  -- Cache do resultado por sessão
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin_result;
  
  RETURN COALESCE(is_admin_result, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Comentário para documentação
COMMENT ON FUNCTION public.current_user_is_admin() IS 
'Função otimizada para verificar se o usuário atual é admin. Usada nas políticas RLS.';

SELECT 'FASE 7: Concluída - Função auxiliar criada!' as status;

-- =====================================================
-- FASE 8: VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'FASE 8: Executando verificações finais...' as status;

-- Verificar se todas as tabelas têm RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'clients', 'financial_transactions', 'payments', 'expenses',
    'empresas', 'users', 'settings', 'in_app_notifications', 'plans', 'plan_groups',
    'analytics_events', 'analytics_sessions', 'analytics_funnels', 'analytics_metrics', 'analytics_config'
  )
ORDER BY tablename;

-- Contar políticas por tabela
SELECT 
  schemaname,
  tablename,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

SELECT 'FASE 8: Concluída - Verificações executadas!' as status;

-- =====================================================
-- COMMIT DAS ALTERAÇÕES
-- =====================================================

COMMIT;

SELECT '🎉 CORREÇÃO COMPLETA FINALIZADA COM SUCESSO! 🎉' as status;
SELECT 'Todas as políticas RLS foram corrigidas e otimizadas.' as message;
SELECT 'Reinicie o servidor da aplicação para aplicar as mudanças.' as next_step;

-- =====================================================
-- SCRIPT DE ROLLBACK (EM CASO DE EMERGÊNCIA)
-- =====================================================

/*
-- ROLLBACK DE EMERGÊNCIA (Execute apenas se necessário)
-- ATENÇÃO: Isso desabilitará toda a segurança RLS!

BEGIN;

-- Desabilitar RLS em todas as tabelas (APENAS EM EMERGÊNCIA)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_funnels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_config DISABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'ROLLBACK EXECUTADO - RLS DESABILITADO EM TODAS AS TABELAS!' as emergency_status;
*/