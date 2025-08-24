-- =====================================================
-- FASE 2: RLS EM TABELAS DE ANALYTICS E MONITORAMENTO
-- =====================================================
-- Este script implementa Row Level Security (RLS) nas tabelas
-- de analytics e monitoramento para garantir isolamento de dados

-- =====================================================
-- 1. HABILITAR RLS NAS TABELAS DE ANALYTICS
-- =====================================================

-- Tabela analytics_events (eventos de analytics)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Tabela analytics_reports (relatórios de analytics)
ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;

-- Tabela analytics_dashboards (dashboards de analytics)
ALTER TABLE public.analytics_dashboards ENABLE ROW LEVEL SECURITY;

-- Tabela notifications (notificações)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Tabela plan_groups (grupos de planos)
ALTER TABLE public.plan_groups ENABLE ROW LEVEL SECURITY;

-- Tabela plans (planos de serviço)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Tabela knowledge_base_articles (artigos da base de conhecimento)
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- Tabela system_config (configurações do sistema)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CRIAR POLÍTICAS DE ACESSO
-- =====================================================

-- Política para analytics_events
-- Usuários podem ver eventos dos seus servidores (após migração)
-- Por enquanto, apenas admins
CREATE POLICY "analytics_events_policy" ON public.analytics_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para analytics_reports
-- Usuários podem ver relatórios que criaram
CREATE POLICY "analytics_reports_policy" ON public.analytics_reports
  FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para analytics_dashboards
-- Usuários podem ver dashboards que criaram
CREATE POLICY "analytics_dashboards_policy" ON public.analytics_dashboards
  FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para notifications
-- Usuários só podem ver suas próprias notificações
CREATE POLICY "notifications_policy" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- Política para plan_groups
-- Todos podem ver grupos de planos (dados públicos)
CREATE POLICY "plan_groups_policy" ON public.plan_groups
  FOR SELECT USING (true);

-- Política para plans
-- Todos podem ver planos (dados públicos)
CREATE POLICY "plans_policy" ON public.plans
  FOR SELECT USING (true);

-- Política para knowledge_base_articles
-- Usuários podem ver artigos que criaram ou artigos públicos
CREATE POLICY "knowledge_base_articles_policy" ON public.knowledge_base_articles
  FOR ALL USING (
    created_by = auth.uid()
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para system_config
-- Apenas admins podem acessar configurações do sistema
CREATE POLICY "system_config_policy" ON public.system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- VERIFICAÇÃO DE IMPLEMENTAÇÃO
-- =====================================================
-- =====================================================
-- 3. VERIFICAÇÃO DE IMPLEMENTAÇÃO
-- =====================================================

-- Execute esta query para verificar se RLS foi habilitado:
/*
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'analytics_events', 'analytics_reports', 'analytics_dashboards',
    'notifications', 'plan_groups', 'plans', 'knowledge_base_articles',
    'system_config'
  )
ORDER BY tablename;
*/

-- Execute esta query para verificar as políticas criadas:
/*
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
  AND tablename IN (
    'analytics_events', 'analytics_reports', 'analytics_dashboards',
    'notifications', 'plan_groups', 'plans', 'knowledge_base_articles',
    'system_config'
  )
ORDER BY tablename, policyname;
*/