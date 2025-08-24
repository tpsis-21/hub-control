-- =====================================================
-- VERIFICAÇÃO DE TABELAS DE ANALYTICS EXISTENTES
-- =====================================================
-- Este script verifica quais tabelas de analytics existem
-- e suas estruturas para corrigir o script RLS

-- 1. Verificar quais tabelas existem
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%analytics%'
ORDER BY table_name;

-- 2. Verificar estrutura das tabelas analytics_reports
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'analytics_reports'
ORDER BY ordinal_position;

-- 3. Verificar estrutura das tabelas analytics_dashboards
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'analytics_dashboards'
ORDER BY ordinal_position;

-- 4. Verificar estrutura das tabelas analytics_events
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'analytics_events'
ORDER BY ordinal_position;

-- 5. Verificar estrutura das tabelas analytics_metrics
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'analytics_metrics'
ORDER BY ordinal_position;

-- 6. Verificar estrutura das tabelas analytics_sessions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'analytics_sessions'
ORDER BY ordinal_position;

-- 7. Verificar estrutura das tabelas analytics_config
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'analytics_config'
ORDER BY ordinal_position;

-- 8. Verificar estrutura das tabelas analytics_funnels
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'analytics_funnels'
ORDER BY ordinal_position;

-- 9. Verificar se RLS já está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%analytics%'
ORDER BY tablename;

-- 10. Verificar políticas RLS existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE '%analytics%'
ORDER BY tablename, policyname;