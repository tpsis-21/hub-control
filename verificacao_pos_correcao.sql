-- =====================================================
-- VERIFICAÇÃO PÓS-CORREÇÃO DE SEGURANÇA
-- =====================================================
-- Script para verificar se as correções do Supabase Security Advisor
-- foram aplicadas com sucesso
--
-- Data: 2024-12-25
-- Autor: Sistema de Segurança Automatizado
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICAR VIEWS SEM SECURITY DEFINER
-- =====================================================

-- 1.1 Verificar se as views existem e não têm SECURITY DEFINER
SELECT 
  '🔍 VIEWS CORRIGIDAS' as categoria,
  viewname,
  CASE 
    WHEN viewname IN (
      'thebest_dashboard',
      'analytics_device_metrics', 
      'user_activity_summary',
      'analytics_popular_pages',
      'analytics_daily_active_users'
    ) THEN '✅ View existe e foi corrigida'
    ELSE '⚠️ View não esperada'
  END as status
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN (
  'thebest_dashboard',
  'analytics_device_metrics', 
  'user_activity_summary',
  'analytics_popular_pages',
  'analytics_daily_active_users'
)
ORDER BY viewname;

-- 1.2 Verificar se alguma view ainda tem SECURITY DEFINER
SELECT 
  '⚠️ VIEWS COM SECURITY DEFINER' as categoria,
  schemaname,
  viewname,
  '❌ Ainda tem SECURITY DEFINER' as problema
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'v'
AND EXISTS (
  SELECT 1 FROM pg_rewrite r 
  WHERE r.ev_class = c.oid 
  AND r.ev_attr = 0 
  AND r.ev_type = '1'
  AND r.is_instead = true
  AND position('SECURITY DEFINER' in upper(pg_get_viewdef(c.oid))) > 0
)
ORDER BY viewname;

-- =====================================================
-- PARTE 2: VERIFICAR RLS HABILITADO
-- =====================================================

-- 2.1 Verificar status do RLS nas tabelas corrigidas
SELECT 
  '🛡️ STATUS RLS' as categoria,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Ainda Desabilitado'
  END as status_rls,
  CASE 
    WHEN tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
    THEN '🎯 Tabela alvo da correção'
    ELSE '📋 Outras tabelas'
  END as tipo
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
ORDER BY tablename;

-- 2.2 Verificar se ainda há tabelas públicas sem RLS
SELECT 
  '⚠️ TABELAS SEM RLS' as categoria,
  schemaname,
  tablename,
  '❌ RLS ainda desabilitado' as problema
FROM pg_tables 
WHERE schemaname = 'public' 
AND NOT rowsecurity
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
AND tablename NOT IN (
  'spatial_ref_sys', 'geography_columns', 'geometry_columns',
  'raster_columns', 'raster_overviews'
)
ORDER BY tablename;

-- =====================================================
-- PARTE 3: VERIFICAR POLÍTICAS RLS
-- =====================================================

-- 3.1 Contar políticas por tabela corrigida
SELECT 
  '📊 POLÍTICAS POR TABELA' as categoria,
  schemaname,
  tablename,
  COUNT(*) as total_politicas,
  string_agg(cmd, ', ') as tipos_operacao
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 3.2 Listar todas as políticas criadas
SELECT 
  '📋 POLÍTICAS CRIADAS' as categoria,
  schemaname,
  tablename,
  policyname,
  cmd as operacao,
  CASE 
    WHEN policyname LIKE '%select%' THEN '👁️ Visualização'
    WHEN policyname LIKE '%insert%' THEN '➕ Inserção'
    WHEN policyname LIKE '%update%' THEN '✏️ Atualização'
    WHEN policyname LIKE '%delete%' THEN '🗑️ Exclusão'
    ELSE '❓ Outro'
  END as tipo
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
ORDER BY tablename, cmd, policyname;

-- =====================================================
-- PARTE 4: VERIFICAR DEPENDÊNCIAS
-- =====================================================

-- 4.1 Verificar se auth.uid() está funcionando
SELECT 
  '🔐 FUNÇÃO AUTH' as categoria,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'auth' AND p.proname = 'uid'
    )
    THEN '✅ auth.uid() disponível'
    ELSE '❌ auth.uid() NÃO disponível'
  END as status;

-- 4.2 Verificar se a tabela profiles existe (para políticas admin)
SELECT 
  '👤 TABELA PROFILES' as categoria,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') 
    THEN '✅ Tabela profiles existe'
    ELSE '⚠️ Tabela profiles NÃO existe - políticas admin podem não funcionar'
  END as status;

-- =====================================================
-- PARTE 5: TESTE DE FUNCIONALIDADE
-- =====================================================

-- 5.1 Testar se as views podem ser consultadas
DO $$
DECLARE
    view_name text;
    view_count integer;
    error_msg text;
BEGIN
    FOR view_name IN 
        SELECT viewname FROM pg_views 
        WHERE schemaname = 'public'
        AND viewname IN (
          'thebest_dashboard',
          'analytics_device_metrics', 
          'user_activity_summary',
          'analytics_popular_pages',
          'analytics_daily_active_users'
        )
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', view_name) INTO view_count;
            RAISE NOTICE '✅ View % funcional - % registros', view_name, view_count;
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
            RAISE NOTICE '❌ Erro na view %: %', view_name, error_msg;
        END;
    END LOOP;
END $$;

-- =====================================================
-- PARTE 6: RELATÓRIO FINAL
-- =====================================================

-- 6.1 Resumo das correções aplicadas
WITH 
views_corrigidas AS (
  SELECT COUNT(*) as total
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
tabelas_com_rls AS (
  SELECT COUNT(*) as total
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
  AND rowsecurity = true
),
politicas_criadas AS (
  SELECT COUNT(*) as total
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
),
tabelas_sem_rls AS (
  SELECT COUNT(*) as total
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND NOT rowsecurity
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
  AND tablename NOT IN (
    'spatial_ref_sys', 'geography_columns', 'geometry_columns',
    'raster_columns', 'raster_overviews'
  )
)
SELECT 
  '🎉 RELATÓRIO FINAL DE CORREÇÕES' as titulo,
  CONCAT(v.total, '/5') as views_corrigidas,
  CONCAT(t.total, '/4') as tabelas_com_rls,
  p.total as politicas_criadas,
  s.total as tabelas_ainda_sem_rls,
  CASE 
    WHEN v.total = 5 AND t.total = 4 AND s.total = 0
    THEN '✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO'
    WHEN v.total >= 3 AND t.total >= 3
    THEN '⚠️ CORREÇÕES PARCIALMENTE APLICADAS'
    ELSE '❌ CORREÇÕES NÃO APLICADAS ADEQUADAMENTE'
  END as status_geral
FROM views_corrigidas v, tabelas_com_rls t, politicas_criadas p, tabelas_sem_rls s;

-- 6.2 Próximos passos recomendados
SELECT 
  '📋 PRÓXIMOS PASSOS' as categoria,
  '1. Execute o Supabase Security Advisor novamente' as passo_1,
  '2. Verifique se todos os erros foram resolvidos' as passo_2,
  '3. Teste as funcionalidades das aplicações' as passo_3,
  '4. Monitore logs de erro por 24-48h' as passo_4,
  '5. Documente as alterações aplicadas' as passo_5;

-- =====================================================
-- PARTE 7: COMANDOS PARA VERIFICAÇÃO MANUAL
-- =====================================================

-- Para verificar manualmente no Supabase Security Advisor:
-- 1. Acesse o painel do Supabase
-- 2. Vá em Settings > Database
-- 3. Execute o Security Advisor
-- 4. Verifique se os seguintes erros foram resolvidos:
--    - security_definer_view para as 5 views
--    - rls_disabled_in_public para as 4 tabelas
--
-- Para testar RLS manualmente:
-- SELECT * FROM empresas; (deve respeitar RLS)
-- SELECT * FROM in_app_notifications; (deve respeitar RLS)
-- SELECT * FROM users; (deve respeitar RLS)
-- SELECT * FROM expenses; (deve respeitar RLS)
--
-- Para testar views manualmente:
-- SELECT * FROM thebest_dashboard LIMIT 5;
-- SELECT * FROM analytics_device_metrics LIMIT 5;
-- SELECT * FROM user_activity_summary LIMIT 5;
-- SELECT * FROM analytics_popular_pages LIMIT 5;
-- SELECT * FROM analytics_daily_active_users LIMIT 5;
-- =====================================================

SELECT 
  '✨ VERIFICAÇÃO CONCLUÍDA' as resultado,
  'Execute este script após aplicar as correções' as instrucao,
  NOW() as executado_em;