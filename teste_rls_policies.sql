-- =====================================================
-- SCRIPT DE TESTE - POLÍTICAS RLS FASES 1 E 2
-- =====================================================
-- Este script testa as políticas RLS implementadas nas
-- Fases 1 e 2 para verificar se estão funcionando corretamente.
--
-- IMPORTANTE: Execute este script como diferentes usuários
-- para testar os diferentes níveis de acesso.
-- =====================================================

-- =====================================================
-- 1. VERIFICAÇÃO GERAL DO STATUS RLS
-- =====================================================

-- Verificar se RLS está habilitado em todas as tabelas críticas
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    -- Fase 1: Tabelas críticas
    'profiles', 'servers', 'server_configs', 'notifications',
    'audit_logs', 'user_sessions', 'api_keys', 'webhooks',
    -- Fase 2: Analytics
    'analytics_config', 'analytics_events', 'analytics_funnels',
    'analytics_metrics', 'analytics_sessions'
  )
ORDER BY tablename;

-- =====================================================
-- 2. CONTAGEM DE POLÍTICAS POR TABELA
-- =====================================================

-- Verificar quantas políticas foram criadas para cada tabela
SELECT 
  tablename,
  COUNT(*) as total_policies,
  STRING_AGG(cmd, ', ') as operations
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'servers', 'server_configs', 'notifications',
    'audit_logs', 'user_sessions', 'api_keys', 'webhooks',
    'analytics_config', 'analytics_events', 'analytics_funnels',
    'analytics_metrics', 'analytics_sessions'
  )
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 3. TESTE DE ACESSO - USUÁRIO ATUAL
-- =====================================================

-- Verificar informações do usuário atual
SELECT 
  'Usuário Atual:' as info,
  auth.uid() as user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ Não autenticado'
    ELSE '✅ Autenticado'
  END as auth_status;

-- Verificar perfil do usuário atual (se existir)
SELECT 
  'Perfil do Usuário:' as info,
  p.user_id,
  p.role,
  p.full_name,
  p.email,
  CASE 
    WHEN p.role = 'admin' THEN '👑 Administrador'
    WHEN p.role = 'user' THEN '👤 Usuário'
    ELSE '❓ Papel desconhecido'
  END as role_description
FROM public.profiles p
WHERE p.user_id = auth.uid();

-- =====================================================
-- 4. TESTE DE ACESSO - TABELAS CRÍTICAS (FASE 1)
-- =====================================================

-- Teste de acesso à tabela profiles
SELECT 
  'Teste Profiles:' as teste,
  COUNT(*) as registros_visiveis
FROM public.profiles;

-- Teste de acesso à tabela servers
SELECT 
  'Teste Servers:' as teste,
  COUNT(*) as registros_visiveis
FROM public.servers;

-- Teste de acesso à tabela notifications
SELECT 
  'Teste Notifications:' as teste,
  COUNT(*) as registros_visiveis
FROM public.notifications;

-- Teste de acesso à tabela audit_logs
SELECT 
  'Teste Audit Logs:' as teste,
  COUNT(*) as registros_visiveis
FROM public.audit_logs;

-- =====================================================
-- 5. TESTE DE ACESSO - ANALYTICS (FASE 2)
-- =====================================================

-- Teste de acesso à tabela analytics_config
SELECT 
  'Teste Analytics Config:' as teste,
  COUNT(*) as registros_visiveis
FROM public.analytics_config;

-- Teste de acesso à tabela analytics_events
SELECT 
  'Teste Analytics Events:' as teste,
  COUNT(*) as registros_visiveis
FROM public.analytics_events;

-- Teste de acesso à tabela analytics_sessions
SELECT 
  'Teste Analytics Sessions:' as teste,
  COUNT(*) as registros_visiveis
FROM public.analytics_sessions;

-- =====================================================
-- 6. TESTE DE INSERÇÃO (CUIDADO!)
-- =====================================================
-- ATENÇÃO: Estes testes de inserção são apenas para verificar
-- se as políticas estão funcionando. Remova os dados de teste
-- após a verificação.

-- Teste de inserção em analytics_events (deve funcionar para usuários autenticados)
/*
INSERT INTO public.analytics_events (
  event_name, 
  event_type, 
  user_id, 
  properties
) VALUES (
  'teste_rls', 
  'test', 
  auth.uid(), 
  '{"teste": true}'
);
*/

-- Verificar se o evento de teste foi inserido
/*
SELECT 
  'Evento de Teste Inserido:' as info,
  event_name,
  user_id,
  created_at
FROM public.analytics_events 
WHERE event_name = 'teste_rls'
ORDER BY created_at DESC
LIMIT 1;
*/

-- =====================================================
-- 7. LIMPEZA DOS DADOS DE TESTE
-- =====================================================
-- Execute apenas se você inseriu dados de teste acima

/*
DELETE FROM public.analytics_events 
WHERE event_name = 'teste_rls';
*/

-- =====================================================
-- 8. RELATÓRIO FINAL
-- =====================================================

-- Resumo final do status RLS
SELECT 
  'RESUMO FINAL' as secao,
  COUNT(CASE WHEN rowsecurity THEN 1 END) as tabelas_com_rls,
  COUNT(*) as total_tabelas,
  ROUND(
    (COUNT(CASE WHEN rowsecurity THEN 1 END) * 100.0 / COUNT(*)), 
    2
  ) as percentual_rls
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'servers', 'server_configs', 'notifications',
    'audit_logs', 'user_sessions', 'api_keys', 'webhooks',
    'analytics_config', 'analytics_events', 'analytics_funnels',
    'analytics_metrics', 'analytics_sessions'
  );

-- Contagem total de políticas implementadas
SELECT 
  'POLÍTICAS IMPLEMENTADAS' as secao,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'servers', 'server_configs', 'notifications',
    'audit_logs', 'user_sessions', 'api_keys', 'webhooks',
    'analytics_config', 'analytics_events', 'analytics_funnels',
    'analytics_metrics', 'analytics_sessions'
  );

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
/*
📋 COMO USAR ESTE SCRIPT:

1. 👤 TESTE COMO USUÁRIO COMUM:
   - Faça login como um usuário comum (não admin)
   - Execute este script
   - Verifique se você só vê seus próprios dados

2. 👑 TESTE COMO ADMINISTRADOR:
   - Faça login como administrador
   - Execute este script
   - Verifique se você vê todos os dados

3. 🔒 TESTE SEM AUTENTICAÇÃO:
   - Execute sem estar logado
   - Deve retornar erro ou dados vazios

4. ✅ RESULTADOS ESPERADOS:
   - RLS habilitado em todas as tabelas
   - Políticas criadas para todas as operações
   - Acesso restrito baseado no usuário/papel

5. 🚨 SE ALGO ESTIVER ERRADO:
   - Verifique se as políticas foram criadas
   - Confirme se RLS está habilitado
   - Teste com diferentes usuários
   - Verifique logs de erro do Supabase

⚠️ IMPORTANTE:
- Execute este script em ambiente de desenvolvimento primeiro
- Não execute testes de inserção em produção
- Sempre limpe dados de teste após os testes
*/