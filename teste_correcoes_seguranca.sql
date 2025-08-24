-- =====================================================
-- SCRIPT DE TESTE PARA CORREÇÕES DE SEGURANÇA
-- =====================================================
-- Este script testa as correções antes da aplicação
-- para garantir que não haverá problemas
--
-- Data: $(date)
-- Autor: Sistema de Segurança Automatizado
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICAÇÕES PRÉ-EXECUÇÃO
-- =====================================================

-- 1.1 Verificar se as views existem atualmente
SELECT 
  'VIEWS EXISTENTES' as categoria,
  viewname,
  'Existe' as status
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN (
  'thebest_dashboard',
  'analytics_device_metrics', 
  'user_activity_summary',
  'analytics_popular_pages',
  'analytics_daily_active_users'
)
UNION ALL
SELECT 
  'VIEWS FALTANDO' as categoria,
  unnest(ARRAY[
    'thebest_dashboard',
    'analytics_device_metrics', 
    'user_activity_summary',
    'analytics_popular_pages',
    'analytics_daily_active_users'
  ]) as viewname,
  'NÃO EXISTE' as status
WHERE NOT EXISTS (
  SELECT 1 FROM pg_views 
  WHERE schemaname = 'public'
  AND viewname = unnest(ARRAY[
    'thebest_dashboard',
    'analytics_device_metrics', 
    'user_activity_summary',
    'analytics_popular_pages',
    'analytics_daily_active_users'
  ])
)
ORDER BY categoria, viewname;

-- 1.2 Verificar se as tabelas existem
SELECT 
  'TABELAS EXISTENTES' as categoria,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS JÁ HABILITADO'
    ELSE 'RLS DESABILITADO'
  END as status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
UNION ALL
SELECT 
  'TABELAS FALTANDO' as categoria,
  unnest(ARRAY['empresas', 'in_app_notifications', 'users', 'expenses']) as tablename,
  'TABELA NÃO EXISTE' as status_rls
WHERE NOT EXISTS (
  SELECT 1 FROM pg_tables 
  WHERE schemaname = 'public'
  AND tablename = unnest(ARRAY['empresas', 'in_app_notifications', 'users', 'expenses'])
)
ORDER BY categoria, tablename;

-- 1.3 Verificar estrutura das tabelas (colunas necessárias)
SELECT 
  'ESTRUTURA TABELAS' as categoria,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('empresas', 'in_app_notifications', 'users', 'expenses')
AND column_name IN ('id', 'user_id')
ORDER BY table_name, column_name;

-- 1.4 Verificar se a tabela profiles existe (necessária para políticas admin)
SELECT 
  'TABELA PROFILES' as categoria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') 
    THEN '✅ Tabela profiles existe'
    ELSE '❌ Tabela profiles NÃO existe - políticas admin podem falhar'
  END as status;

-- =====================================================
-- PARTE 2: VERIFICAR DEPENDÊNCIAS DAS VIEWS
-- =====================================================

-- 2.1 Verificar se as tabelas base das views existem
SELECT 
  'DEPENDÊNCIAS VIEWS' as categoria,
  'thebest_packages' as tabela_necessaria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thebest_packages')
    THEN '✅ Existe'
    ELSE '❌ NÃO existe - view thebest_dashboard falhará'
  END as status
UNION ALL
SELECT 
  'DEPENDÊNCIAS VIEWS' as categoria,
  'thebest_renewals' as tabela_necessaria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thebest_renewals')
    THEN '✅ Existe'
    ELSE '❌ NÃO existe - view thebest_dashboard falhará'
  END as status
UNION ALL
SELECT 
  'DEPENDÊNCIAS VIEWS' as categoria,
  'analytics_sessions' as tabela_necessaria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_sessions')
    THEN '✅ Existe'
    ELSE '❌ NÃO existe - views analytics falharão'
  END as status
UNION ALL
SELECT 
  'DEPENDÊNCIAS VIEWS' as categoria,
  'analytics_events' as tabela_necessaria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_events')
    THEN '✅ Existe'
    ELSE '❌ NÃO existe - views analytics falharão'
  END as status
UNION ALL
SELECT 
  'DEPENDÊNCIAS VIEWS' as categoria,
  'audit_logs' as tabela_necessaria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs')
    THEN '✅ Existe'
    ELSE '❌ NÃO existe - view user_activity_summary falhará'
  END as status;

-- =====================================================
-- PARTE 3: VERIFICAR POLÍTICAS EXISTENTES
-- =====================================================

-- 3.1 Listar políticas existentes que serão removidas
SELECT 
  'POLÍTICAS EXISTENTES' as categoria,
  schemaname,
  tablename,
  policyname,
  cmd as tipo_operacao,
  'Será removida e recriada' as acao
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
ORDER BY tablename, policyname;

-- =====================================================
-- PARTE 4: SIMULAÇÃO DE TESTE (SEM EXECUTAR)
-- =====================================================

-- 4.1 Verificar se auth.uid() está disponível
SELECT 
  'FUNÇÃO AUTH' as categoria,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'auth' AND p.proname = 'uid'
    )
    THEN '✅ auth.uid() disponível'
    ELSE '❌ auth.uid() NÃO disponível - políticas falharão'
  END as status;

-- 4.2 Verificar permissões para criar/remover views
SELECT 
  'PERMISSÕES' as categoria,
  'CREATE/DROP VIEW' as operacao,
  CASE 
    WHEN has_schema_privilege('public', 'CREATE')
    THEN '✅ Permissão para criar views'
    ELSE '❌ SEM permissão para criar views'
  END as status
UNION ALL
SELECT 
  'PERMISSÕES' as categoria,
  'ALTER TABLE' as operacao,
  CASE 
    WHEN has_schema_privilege('public', 'USAGE')
    THEN '✅ Permissão para alterar tabelas'
    ELSE '❌ SEM permissão para alterar tabelas'
  END as status;

-- =====================================================
-- PARTE 5: RELATÓRIO DE PRONTIDÃO
-- =====================================================

-- 5.1 Resumo geral
WITH verificacoes AS (
  SELECT 
    COUNT(*) as total_views_existentes
  FROM pg_views 
  WHERE schemaname = 'public'
  AND viewname IN (
    'thebest_dashboard',
    'analytics_device_metrics', 
    'user_activity_summary',
    'analytics_popular_pages',
    'analytics_daily_active_users'
  )
),
tabelas AS (
  SELECT 
    COUNT(*) as total_tabelas_existentes
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
),
dependencias AS (
  SELECT 
    COUNT(*) as total_dependencias
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('thebest_packages', 'thebest_renewals', 'analytics_sessions', 'analytics_events', 'audit_logs')
)
SELECT 
  '📊 RELATÓRIO DE PRONTIDÃO' as titulo,
  CONCAT(v.total_views_existentes, '/5') as views_encontradas,
  CONCAT(t.total_tabelas_existentes, '/4') as tabelas_encontradas,
  CONCAT(d.total_dependencias, '/5') as dependencias_encontradas,
  CASE 
    WHEN v.total_views_existentes = 5 AND t.total_tabelas_existentes = 4 AND d.total_dependencias >= 3
    THEN '✅ PRONTO PARA EXECUÇÃO'
    WHEN t.total_tabelas_existentes = 4
    THEN '⚠️ PARCIALMENTE PRONTO - algumas views podem falhar'
    ELSE '❌ NÃO PRONTO - tabelas críticas faltando'
  END as status_geral
FROM verificacoes v, tabelas t, dependencias d;

-- =====================================================
-- PARTE 6: INSTRUÇÕES DE USO
-- =====================================================

-- INSTRUÇÕES:
-- 
-- 1. Execute este script primeiro para verificar a prontidão
-- 2. Analise o relatório de prontidão
-- 3. Se status = "PRONTO PARA EXECUÇÃO", execute o script principal
-- 4. Se status = "PARCIALMENTE PRONTO", execute com cuidado
-- 5. Se status = "NÃO PRONTO", corrija as dependências primeiro
--
-- PRÓXIMOS PASSOS:
-- - Se tudo estiver OK: execute correcao_problemas_seguranca_supabase.sql
-- - Se houver problemas: corrija as dependências antes
-- - Após execução: execute novamente este script para verificar
-- =====================================================

SELECT 
  '🎯 PRÓXIMOS PASSOS' as titulo,
  'Execute o script principal se status = PRONTO' as instrucao_1,
  'Monitore logs durante a execução' as instrucao_2,
  'Execute Supabase Security Advisor após aplicação' as instrucao_3;