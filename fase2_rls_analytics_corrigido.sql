-- =====================================================
-- SCRIPT RLS FASE 2 - ANALYTICS E NOTIFICAÇÕES (CORRIGIDO)
-- =====================================================
-- Este script implementa Row Level Security (RLS) para as tabelas
-- de analytics e notificações baseado nas tabelas que REALMENTE existem
-- no banco de dados.
--
-- TABELAS VERIFICADAS E EXISTENTES:
-- ✅ analytics_config
-- ✅ analytics_events  
-- ✅ analytics_funnels
-- ✅ analytics_metrics
-- ✅ analytics_sessions
--
-- TABELAS REMOVIDAS (NÃO EXISTEM):
-- ❌ analytics_reports
-- ❌ analytics_dashboards
-- =====================================================

-- Início da transação
BEGIN;

-- =====================================================
-- REMOÇÃO DE POLÍTICAS EXISTENTES (SE HOUVER)
-- =====================================================

-- Analytics Config
DROP POLICY IF EXISTS "analytics_config_select_policy" ON public.analytics_config;
DROP POLICY IF EXISTS "analytics_config_insert_policy" ON public.analytics_config;
DROP POLICY IF EXISTS "analytics_config_update_policy" ON public.analytics_config;
DROP POLICY IF EXISTS "analytics_config_delete_policy" ON public.analytics_config;

-- Analytics Events
DROP POLICY IF EXISTS "analytics_events_select_policy" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_policy" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_update_policy" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_delete_policy" ON public.analytics_events;

-- Analytics Funnels
DROP POLICY IF EXISTS "analytics_funnels_select_policy" ON public.analytics_funnels;
DROP POLICY IF EXISTS "analytics_funnels_insert_policy" ON public.analytics_funnels;
DROP POLICY IF EXISTS "analytics_funnels_update_policy" ON public.analytics_funnels;
DROP POLICY IF EXISTS "analytics_funnels_delete_policy" ON public.analytics_funnels;

-- Analytics Metrics
DROP POLICY IF EXISTS "analytics_metrics_select_policy" ON public.analytics_metrics;
DROP POLICY IF EXISTS "analytics_metrics_insert_policy" ON public.analytics_metrics;
DROP POLICY IF EXISTS "analytics_metrics_update_policy" ON public.analytics_metrics;
DROP POLICY IF EXISTS "analytics_metrics_delete_policy" ON public.analytics_metrics;

-- Analytics Sessions
DROP POLICY IF EXISTS "analytics_sessions_select_policy" ON public.analytics_sessions;
DROP POLICY IF EXISTS "analytics_sessions_insert_policy" ON public.analytics_sessions;
DROP POLICY IF EXISTS "analytics_sessions_update_policy" ON public.analytics_sessions;
DROP POLICY IF EXISTS "analytics_sessions_delete_policy" ON public.analytics_sessions;

-- =====================================================
-- HABILITAÇÃO DE RLS
-- =====================================================

ALTER TABLE public.analytics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. TABELA ANALYTICS_CONFIG
-- =====================================================
-- Estrutura: id (UUID), config_key, config_value (JSONB), description, environment
-- Acesso: Apenas administradores (configurações são sensíveis)

-- Política para visualização: apenas administradores
CREATE POLICY "analytics_config_select_policy" ON public.analytics_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "analytics_config_insert_policy" ON public.analytics_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "analytics_config_update_policy" ON public.analytics_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "analytics_config_delete_policy" ON public.analytics_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 2. TABELA ANALYTICS_EVENTS
-- =====================================================
-- Estrutura: id (UUID), event_name, event_type, user_id, session_id, properties (JSONB)
-- Acesso: Usuários veem apenas seus próprios eventos + admins veem tudo

-- Política para visualização: próprios eventos ou admin
CREATE POLICY "analytics_events_select_policy" ON public.analytics_events
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: qualquer usuário autenticado pode inserir eventos
CREATE POLICY "analytics_events_insert_policy" ON public.analytics_events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Política para atualização: apenas administradores (eventos não devem ser editados)
CREATE POLICY "analytics_events_update_policy" ON public.analytics_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "analytics_events_delete_policy" ON public.analytics_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 3. TABELA ANALYTICS_FUNNELS
-- =====================================================
-- Estrutura: id (UUID), funnel_name, step_name, step_order, user_id, session_id
-- Acesso: Usuários veem apenas seus próprios funis + admins veem tudo

-- Política para visualização: próprios funis ou admin
CREATE POLICY "analytics_funnels_select_policy" ON public.analytics_funnels
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: qualquer usuário autenticado pode inserir funis
CREATE POLICY "analytics_funnels_insert_policy" ON public.analytics_funnels
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Política para atualização: apenas administradores
CREATE POLICY "analytics_funnels_update_policy" ON public.analytics_funnels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "analytics_funnels_delete_policy" ON public.analytics_funnels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 4. TABELA ANALYTICS_METRICS
-- =====================================================
-- Estrutura: id (UUID), metric_name, metric_type, value, dimensions (JSONB)
-- Acesso: Apenas administradores (métricas agregadas são sensíveis)

-- Política para visualização: apenas administradores
CREATE POLICY "analytics_metrics_select_policy" ON public.analytics_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "analytics_metrics_insert_policy" ON public.analytics_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "analytics_metrics_update_policy" ON public.analytics_metrics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "analytics_metrics_delete_policy" ON public.analytics_metrics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. TABELA ANALYTICS_SESSIONS
-- =====================================================
-- Estrutura: id (UUID), session_id, user_id, started_at, ended_at
-- Acesso: Usuários veem apenas suas próprias sessões + admins veem tudo

-- Política para visualização: próprias sessões ou admin
CREATE POLICY "analytics_sessions_select_policy" ON public.analytics_sessions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: qualquer usuário autenticado pode inserir sessões
CREATE POLICY "analytics_sessions_insert_policy" ON public.analytics_sessions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Política para atualização: próprias sessões ou admin
CREATE POLICY "analytics_sessions_update_policy" ON public.analytics_sessions
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "analytics_sessions_delete_policy" ON public.analytics_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se RLS foi habilitado corretamente
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'analytics_config',
    'analytics_events', 
    'analytics_funnels',
    'analytics_metrics',
    'analytics_sessions'
  )
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'analytics_config',
    'analytics_events', 
    'analytics_funnels',
    'analytics_metrics',
    'analytics_sessions'
  )
ORDER BY tablename, policyname;

-- Confirmar transação
COMMIT;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
/*
✅ TABELAS PROCESSADAS (5 tabelas):
   - analytics_config: Apenas admins (configurações sensíveis)
   - analytics_events: Usuários veem próprios eventos + admins
   - analytics_funnels: Usuários veem próprios funis + admins
   - analytics_metrics: Apenas admins (métricas agregadas sensíveis)
   - analytics_sessions: Usuários veem próprias sessões + admins

🔒 POLÍTICAS IMPLEMENTADAS:
   - SELECT: Baseado em user_id ou role admin
   - INSERT: Usuários autenticados ou admins
   - UPDATE: Próprios dados ou admins
   - DELETE: Apenas administradores

⚠️ TABELAS REMOVIDAS (não existem no banco):
   - analytics_reports
   - analytics_dashboards

📋 PRÓXIMOS PASSOS:
   1. Executar este script no Supabase SQL Editor
   2. Verificar se todas as políticas foram criadas
   3. Testar acesso com usuários diferentes
   4. Monitorar logs de segurança

🔧 PARA REVERTER:
   - Desabilitar RLS: ALTER TABLE [tabela] DISABLE ROW LEVEL SECURITY;
   - Remover políticas: DROP POLICY [nome] ON [tabela];
*/