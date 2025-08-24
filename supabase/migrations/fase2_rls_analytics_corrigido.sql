-- =====================================================
-- FASE 2: RLS para Tabelas de Analytics - CORRIGIDO
-- =====================================================
-- Este script implementa Row Level Security (RLS) nas tabelas de analytics
-- baseado na estrutura real do banco de dados

-- =====================================================
-- 1. TABELA ANALYTICS_EVENTS
-- =====================================================
-- Estrutura: id (PK), type, timestamp, user_id, session_id, value, unit, dimensions, metadata, processed

-- Habilitar RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Política para visualização: usuários podem ver apenas seus próprios eventos ou admins veem tudo
CREATE POLICY "analytics_events_select_policy" ON public.analytics_events
  FOR SELECT USING (
    user_id = auth.uid() OR 
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: usuários podem criar eventos para si mesmos
CREATE POLICY "analytics_events_insert_policy" ON public.analytics_events
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores podem atualizar eventos
CREATE POLICY "analytics_events_update_policy" ON public.analytics_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 2. TABELA ANALYTICS_REPORTS
-- =====================================================
-- Estrutura: id (PK), name, description, type, query, visualization, schedule, alerts, access, metadata

-- Habilitar RLS
ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;

-- Política para visualização: apenas administradores (relatórios são sensíveis)
CREATE POLICY "analytics_reports_select_policy" ON public.analytics_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "analytics_reports_insert_policy" ON public.analytics_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "analytics_reports_update_policy" ON public.analytics_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "analytics_reports_delete_policy" ON public.analytics_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 3. TABELA ANALYTICS_DASHBOARDS
-- =====================================================
-- Estrutura: id (PK), name, description, widgets, layout, filters, access, metadata

-- Habilitar RLS
ALTER TABLE public.analytics_dashboards ENABLE ROW LEVEL SECURITY;

-- Política para visualização: apenas administradores (dashboards são sensíveis)
CREATE POLICY "analytics_dashboards_select_policy" ON public.analytics_dashboards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "analytics_dashboards_insert_policy" ON public.analytics_dashboards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "analytics_dashboards_update_policy" ON public.analytics_dashboards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "analytics_dashboards_delete_policy" ON public.analytics_dashboards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 4. TABELA NOTIFICATIONS
-- =====================================================
-- Estrutura: id (PK), type, event, days_before_expiration, subject, message, active

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política para visualização: todos os usuários autenticados podem ver notificações
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política para inserção: apenas administradores
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. TABELA PERFORMANCE_METRICS
-- =====================================================
-- Estrutura: id (PK), type, value, unit, timestamp, source, metadata, tags

-- Habilitar RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Política para visualização: apenas administradores (métricas são sensíveis)
CREATE POLICY "performance_metrics_select_policy" ON public.performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "performance_metrics_insert_policy" ON public.performance_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "performance_metrics_update_policy" ON public.performance_metrics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "performance_metrics_delete_policy" ON public.performance_metrics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 6. TABELA SYSTEM_CONFIG
-- =====================================================
-- Estrutura: id (PK), key, value, description, category, is_public

-- Habilitar RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Política para visualização: usuários podem ver apenas configs públicas, admins veem tudo
CREATE POLICY "system_config_select_policy" ON public.system_config
  FOR SELECT USING (
    is_public = true OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "system_config_insert_policy" ON public.system_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "system_config_update_policy" ON public.system_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "system_config_delete_policy" ON public.system_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 7. TABELA WORKFLOWS
-- =====================================================
-- Estrutura: id (PK), name, description, type, version, status, config, triggers, actions, flow, variables, access, metadata

-- Habilitar RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Política para visualização: apenas administradores (workflows são sensíveis)
CREATE POLICY "workflows_select_policy" ON public.workflows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "workflows_insert_policy" ON public.workflows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "workflows_update_policy" ON public.workflows
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "workflows_delete_policy" ON public.workflows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 8. TABELA WORKFLOW_EXECUTIONS
-- =====================================================
-- Estrutura: id (PK), workflow_id, workflow_version, status, context, progress, results, control, metadata

-- Habilitar RLS
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Política para visualização: apenas administradores (execuções são sensíveis)
CREATE POLICY "workflow_executions_select_policy" ON public.workflow_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "workflow_executions_insert_policy" ON public.workflow_executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "workflow_executions_update_policy" ON public.workflow_executions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "workflow_executions_delete_policy" ON public.workflow_executions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- VERIFICAÇÃO DE COBERTURA RLS
-- =====================================================

-- Query para verificar se RLS está habilitado nas tabelas de analytics
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'analytics_events', 'analytics_reports', 'analytics_dashboards', 
  'notifications', 'performance_metrics', 'system_config',
  'workflows', 'workflow_executions'
)
ORDER BY tablename;

-- Query para verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
  'analytics_events', 'analytics_reports', 'analytics_dashboards', 
  'notifications', 'performance_metrics', 'system_config',
  'workflows', 'workflow_executions'
)
ORDER BY tablename, policyname;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================
-- Este script implementa RLS baseado na estrutura real das tabelas:
-- 
-- 1. ANALYTICS_EVENTS: Isolamento por user_id com suporte a eventos anônimos
-- 2. ANALYTICS_REPORTS: Apenas administradores (dados sensíveis)
-- 3. ANALYTICS_DASHBOARDS: Apenas administradores (dados sensíveis)
-- 4. NOTIFICATIONS: Visualização para todos, modificação apenas para admins
-- 5. PERFORMANCE_METRICS: Apenas administradores (dados sensíveis)
-- 6. SYSTEM_CONFIG: Configs públicas para todos, privadas apenas para admins
-- 7. WORKFLOWS: Apenas administradores (lógica de negócio sensível)
-- 8. WORKFLOW_EXECUTIONS: Apenas administradores (dados de execução sensíveis)
--
-- Todas as políticas incluem verificação de role 'admin' para acesso total
-- =====================================================