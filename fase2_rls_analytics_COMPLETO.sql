-- =====================================================
-- FASE 2: RLS EM TABELAS DE ANALYTICS E NOTIFICAÇÕES
-- =====================================================
-- Este script implementa Row Level Security (RLS) nas tabelas
-- de analytics, notificações e configurações para garantir isolamento de dados
-- 
-- BASEADO NA ANÁLISE REAL DAS MIGRATIONS E ESTRUTURAS DE TABELAS
-- =====================================================

-- =====================================================
-- 1. REMOVER POLÍTICAS EXISTENTES (SE HOUVER)
-- =====================================================

-- Analytics Events
DROP POLICY IF EXISTS "analytics_events_policy" ON public.analytics_events;

-- Analytics Reports
DROP POLICY IF EXISTS "analytics_reports_policy" ON public.analytics_reports;

-- Analytics Dashboards
DROP POLICY IF EXISTS "analytics_dashboards_policy" ON public.analytics_dashboards;

-- Analytics Metrics
DROP POLICY IF EXISTS "analytics_metrics_policy" ON public.analytics_metrics;

-- Analytics Sessions
DROP POLICY IF EXISTS "analytics_sessions_policy" ON public.analytics_sessions;

-- Analytics Config
DROP POLICY IF EXISTS "analytics_config_policy" ON public.analytics_config;

-- Analytics Funnels
DROP POLICY IF EXISTS "analytics_funnels_policy" ON public.analytics_funnels;

-- Notifications (sistema novo)
DROP POLICY IF EXISTS "notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "notification_recipients_policy" ON public.notification_recipients;
DROP POLICY IF EXISTS "notification_templates_policy" ON public.notification_templates;
DROP POLICY IF EXISTS "notification_recipients_map_policy" ON public.notification_recipients_map;
DROP POLICY IF EXISTS "notification_delivery_logs_policy" ON public.notification_delivery_logs;

-- Plan Groups
DROP POLICY IF EXISTS "plan_groups_policy" ON public.plan_groups;

-- Plans
DROP POLICY IF EXISTS "plans_policy" ON public.plans;

-- Knowledge Base Articles
DROP POLICY IF EXISTS "knowledge_base_articles_policy" ON public.knowledge_base_articles;

-- System Config
DROP POLICY IF EXISTS "system_config_policy" ON public.system_config;

-- =====================================================
-- 2. HABILITAR RLS NAS TABELAS
-- =====================================================

-- Tabelas de Analytics
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_funnels ENABLE ROW LEVEL SECURITY;

-- Tabelas de Notificações (sistema novo)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Tabelas de Configuração
ALTER TABLE public.plan_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CRIAR POLÍTICAS DE ACESSO - ANALYTICS
-- =====================================================

-- ANALYTICS_EVENTS: Usuários veem eventos dos seus servidores
-- Por enquanto apenas admins até migração completa
CREATE POLICY "analytics_events_policy" ON public.analytics_events
  FOR ALL USING (
    -- Apenas administradores por enquanto
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
    -- TODO: Após migração, adicionar:
    -- OR user_id = auth.uid()
  );

-- ANALYTICS_REPORTS: Criador ou admin
CREATE POLICY "analytics_reports_policy" ON public.analytics_reports
  FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ANALYTICS_DASHBOARDS: Criador ou admin
CREATE POLICY "analytics_dashboards_policy" ON public.analytics_dashboards
  FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ANALYTICS_METRICS: Apenas admins (dados agregados sensíveis)
CREATE POLICY "analytics_metrics_policy" ON public.analytics_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ANALYTICS_SESSIONS: Usuário vê suas próprias sessões
CREATE POLICY "analytics_sessions_policy" ON public.analytics_sessions
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ANALYTICS_CONFIG: Apenas admins
CREATE POLICY "analytics_config_policy" ON public.analytics_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ANALYTICS_FUNNELS: Usuário vê seus próprios funis
CREATE POLICY "analytics_funnels_policy" ON public.analytics_funnels
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 4. CRIAR POLÍTICAS DE ACESSO - NOTIFICAÇÕES
-- =====================================================

-- NOTIFICATIONS: Usuário vê notificações direcionadas a ele
CREATE POLICY "notifications_policy" ON public.notifications
  FOR ALL USING (
    -- Criador da notificação
    created_by = auth.uid()
    -- OU Admin
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
    -- OU Destinatário da notificação
    OR EXISTS (
      SELECT 1 FROM public.notification_recipients_map nrm
      JOIN public.notification_recipients nr ON nr.id = nrm.recipient_id
      WHERE nrm.notification_id = notifications.id
      AND nr.type = 'user'
      AND nr.identifier = CAST(auth.uid() AS TEXT)
    )
  );

-- NOTIFICATION_RECIPIENTS: Usuário vê apenas seus próprios dados de destinatário
CREATE POLICY "notification_recipients_policy" ON public.notification_recipients
  FOR ALL USING (
    -- Próprio usuário
    (type = 'user' AND identifier = CAST(auth.uid() AS TEXT))
    -- OU Admin
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- NOTIFICATION_TEMPLATES: Criador ou admin
CREATE POLICY "notification_templates_policy" ON public.notification_templates
  FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- NOTIFICATION_RECIPIENTS_MAP: Usuário vê apenas seus mapeamentos
CREATE POLICY "notification_recipients_map_policy" ON public.notification_recipients_map
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.notification_recipients nr
      WHERE nr.id = notification_recipients_map.recipient_id
      AND nr.type = 'user'
      AND nr.identifier = CAST(auth.uid() AS TEXT)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- NOTIFICATION_DELIVERY_LOGS: Usuário vê apenas logs de suas notificações
CREATE POLICY "notification_delivery_logs_policy" ON public.notification_delivery_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.notification_recipients nr
      WHERE nr.id = notification_delivery_logs.recipient_id
      AND nr.type = 'user'
      AND nr.identifier = CAST(auth.uid() AS TEXT)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 5. CRIAR POLÍTICAS DE ACESSO - CONFIGURAÇÕES
-- =====================================================

-- PLAN_GROUPS: Dados públicos (todos podem ver)
CREATE POLICY "plan_groups_policy" ON public.plan_groups
  FOR SELECT USING (true);

-- PLANS: Dados públicos (todos podem ver)
CREATE POLICY "plans_policy" ON public.plans
  FOR SELECT USING (true);

-- KNOWLEDGE_BASE_ARTICLES: Artigos públicos ou criados pelo usuário
CREATE POLICY "knowledge_base_articles_policy" ON public.knowledge_base_articles
  FOR ALL USING (
    -- Artigos públicos
    is_public = true
    -- OU Criador
    OR created_by = auth.uid()
    -- OU Admin
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- SYSTEM_CONFIG: Apenas admins
CREATE POLICY "system_config_policy" ON public.system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 6. VERIFICAÇÃO DE IMPLEMENTAÇÃO
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
    'analytics_metrics', 'analytics_sessions', 'analytics_config', 'analytics_funnels',
    'notifications', 'notification_recipients', 'notification_templates',
    'notification_recipients_map', 'notification_delivery_logs',
    'plan_groups', 'plans', 'knowledge_base_articles', 'system_config'
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
    'analytics_metrics', 'analytics_sessions', 'analytics_config', 'analytics_funnels',
    'notifications', 'notification_recipients', 'notification_templates',
    'notification_recipients_map', 'notification_delivery_logs',
    'plan_groups', 'plans', 'knowledge_base_articles', 'system_config'
  )
ORDER BY tablename, policyname;
*/

-- =====================================================
-- 7. NOTAS IMPORTANTES
-- =====================================================
/*
1. ANALYTICS_EVENTS: Por enquanto apenas admins. Após migração completa,
   adicionar: OR user_id = auth.uid() para usuários verem seus próprios eventos.

2. NOTIFICATIONS: Sistema novo com múltiplas tabelas relacionadas.
   Políticas garantem que usuários vejam apenas notificações direcionadas a eles.

3. ANALYTICS_METRICS: Dados agregados sensíveis, apenas admins.

4. PLAN_GROUPS e PLANS: Dados públicos para facilitar exibição de planos.

5. KNOWLEDGE_BASE_ARTICLES: Artigos públicos ou criados pelo usuário.

6. Todas as políticas incluem acesso para administradores.

7. Usar CAST(auth.uid() AS TEXT) quando comparar UUID com TEXT.
*/