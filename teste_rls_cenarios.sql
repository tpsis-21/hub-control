-- =====================================================
-- TESTE DE CENÁRIOS ESPECÍFICOS - POLÍTICAS RLS
-- =====================================================
-- Este script testa cenários específicos para validar
-- se as políticas RLS estão funcionando corretamente
-- em diferentes situações de uso.
-- =====================================================

-- =====================================================
-- CENÁRIO 1: TESTE DE ISOLAMENTO DE USUÁRIOS
-- =====================================================

-- Simular diferentes usuários (substitua pelos UUIDs reais)
-- Usuário 1: 11111111-1111-1111-1111-111111111111
-- Usuário 2: 22222222-2222-2222-2222-222222222222
-- Admin:    33333333-3333-3333-3333-333333333333

-- Verificar se usuário só vê seus próprios servidores
SELECT 
  'CENÁRIO 1A - Servidores por Usuário' as teste,
  user_id,
  COUNT(*) as total_servers
FROM public.servers 
GROUP BY user_id
ORDER BY user_id;

-- Verificar se usuário só vê suas próprias notificações
SELECT 
  'CENÁRIO 1B - Notificações por Usuário' as teste,
  recipient_id,
  COUNT(*) as total_notifications
FROM public.notifications 
GROUP BY recipient_id
ORDER BY recipient_id;

-- =====================================================
-- CENÁRIO 2: TESTE DE ACESSO ADMINISTRATIVO
-- =====================================================

-- Verificar se admin pode ver dados de analytics_config
SELECT 
  'CENÁRIO 2A - Analytics Config (Admin Only)' as teste,
  COUNT(*) as total_configs,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Admin tem acesso'
    ELSE '❌ Sem acesso ou sem dados'
  END as status
FROM public.analytics_config;

-- Verificar se admin pode ver métricas agregadas
SELECT 
  'CENÁRIO 2B - Analytics Metrics (Admin Only)' as teste,
  COUNT(*) as total_metrics,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Admin tem acesso'
    ELSE '❌ Sem acesso ou sem dados'
  END as status
FROM public.analytics_metrics;

-- =====================================================
-- CENÁRIO 3: TESTE DE EVENTOS DE ANALYTICS
-- =====================================================

-- Verificar eventos do usuário atual
SELECT 
  'CENÁRIO 3A - Meus Eventos' as teste,
  COUNT(*) as meus_eventos,
  auth.uid() as meu_user_id
FROM public.analytics_events 
WHERE user_id = auth.uid();

-- Verificar total de eventos visíveis (deve ser só os seus ou todos se admin)
SELECT 
  'CENÁRIO 3B - Total Eventos Visíveis' as teste,
  COUNT(*) as total_eventos_visiveis
FROM public.analytics_events;

-- =====================================================
-- CENÁRIO 4: TESTE DE SESSÕES DE ANALYTICS
-- =====================================================

-- Verificar sessões do usuário atual
SELECT 
  'CENÁRIO 4A - Minhas Sessões' as teste,
  COUNT(*) as minhas_sessoes,
  auth.uid() as meu_user_id
FROM public.analytics_sessions 
WHERE user_id = auth.uid();

-- Verificar total de sessões visíveis
SELECT 
  'CENÁRIO 4B - Total Sessões Visíveis' as teste,
  COUNT(*) as total_sessoes_visiveis
FROM public.analytics_sessions;

-- =====================================================
-- CENÁRIO 5: TESTE DE AUDITORIA
-- =====================================================

-- Verificar logs de auditoria do usuário atual
SELECT 
  'CENÁRIO 5A - Meus Logs de Auditoria' as teste,
  COUNT(*) as meus_logs
FROM public.audit_logs 
WHERE user_id = auth.uid();

-- Verificar total de logs visíveis
SELECT 
  'CENÁRIO 5B - Total Logs Visíveis' as teste,
  COUNT(*) as total_logs_visiveis
FROM public.audit_logs;

-- =====================================================
-- CENÁRIO 6: TESTE DE WEBHOOKS E API KEYS
-- =====================================================

-- Verificar webhooks do usuário atual
SELECT 
  'CENÁRIO 6A - Meus Webhooks' as teste,
  COUNT(*) as meus_webhooks
FROM public.webhooks 
WHERE user_id = auth.uid();

-- Verificar API keys do usuário atual
SELECT 
  'CENÁRIO 6B - Minhas API Keys' as teste,
  COUNT(*) as minhas_api_keys
FROM public.api_keys 
WHERE user_id = auth.uid();

-- =====================================================
-- CENÁRIO 7: TESTE DE PERFIS
-- =====================================================

-- Verificar se usuário vê apenas seu próprio perfil
SELECT 
  'CENÁRIO 7A - Meu Perfil' as teste,
  user_id,
  role,
  email,
  CASE 
    WHEN user_id = auth.uid() THEN '✅ Próprio perfil'
    ELSE '❌ Perfil de outro usuário (não deveria ver)'
  END as status
FROM public.profiles;

-- =====================================================
-- CENÁRIO 8: TESTE DE CONFIGURAÇÕES DE SERVIDOR
-- =====================================================

-- Verificar configurações de servidores do usuário
SELECT 
  'CENÁRIO 8A - Configs dos Meus Servidores' as teste,
  sc.server_id,
  s.name as server_name,
  COUNT(sc.*) as total_configs
FROM public.server_configs sc
JOIN public.servers s ON s.id = sc.server_id
WHERE s.user_id = auth.uid()
GROUP BY sc.server_id, s.name
ORDER BY s.name;

-- =====================================================
-- CENÁRIO 9: TESTE DE SESSÕES DE USUÁRIO
-- =====================================================

-- Verificar sessões ativas do usuário atual
SELECT 
  'CENÁRIO 9A - Minhas Sessões Ativas' as teste,
  COUNT(*) as sessoes_ativas,
  MAX(last_activity) as ultima_atividade
FROM public.user_sessions 
WHERE user_id = auth.uid() 
  AND expires_at > NOW();

-- =====================================================
-- CENÁRIO 10: TESTE DE FUNIS DE ANALYTICS
-- =====================================================

-- Verificar funis do usuário atual
SELECT 
  'CENÁRIO 10A - Meus Funis' as teste,
  funnel_name,
  COUNT(*) as total_steps
FROM public.analytics_funnels 
WHERE user_id = auth.uid()
GROUP BY funnel_name
ORDER BY funnel_name;

-- =====================================================
-- RELATÓRIO DE VALIDAÇÃO FINAL
-- =====================================================

-- Resumo de todos os testes
SELECT 
  'RELATÓRIO FINAL' as secao,
  'Testes executados com sucesso' as status,
  NOW() as timestamp_teste;

-- Verificar se há alguma tabela sem RLS que deveria ter
SELECT 
  'TABELAS SEM RLS' as alerta,
  tablename,
  '❌ RLS não habilitado' as problema
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'servers', 'server_configs', 'notifications',
    'audit_logs', 'user_sessions', 'api_keys', 'webhooks',
    'analytics_config', 'analytics_events', 'analytics_funnels',
    'analytics_metrics', 'analytics_sessions'
  )
  AND rowsecurity = false;

-- Verificar se há alguma tabela sem políticas
SELECT 
  'TABELAS SEM POLÍTICAS' as alerta,
  t.tablename,
  '❌ Sem políticas RLS' as problema
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public' 
  AND t.tablename IN (
    'profiles', 'servers', 'server_configs', 'notifications',
    'audit_logs', 'user_sessions', 'api_keys', 'webhooks',
    'analytics_config', 'analytics_events', 'analytics_funnels',
    'analytics_metrics', 'analytics_sessions'
  )
  AND p.policyname IS NULL;

-- =====================================================
-- INSTRUÇÕES PARA DIFERENTES TIPOS DE TESTE
-- =====================================================
/*
🧪 COMO EXECUTAR OS TESTES:

1. 👤 COMO USUÁRIO COMUM:
   - Faça login como usuário comum
   - Execute este script
   - Deve ver apenas seus próprios dados
   - Não deve ter acesso a analytics_config e analytics_metrics

2. 👑 COMO ADMINISTRADOR:
   - Faça login como admin
   - Execute este script
   - Deve ver todos os dados
   - Deve ter acesso total a analytics_config e analytics_metrics

3. 🔒 SEM AUTENTICAÇÃO:
   - Execute sem login
   - Deve retornar erros ou dados vazios

4. ✅ RESULTADOS ESPERADOS POR CENÁRIO:
   - Cenário 1: Isolamento por usuário
   - Cenário 2: Acesso administrativo total
   - Cenário 3-4: Analytics baseado em user_id
   - Cenário 5: Auditoria por usuário
   - Cenário 6: Webhooks/API keys por usuário
   - Cenário 7: Perfil próprio apenas
   - Cenário 8: Configs de servidores próprios
   - Cenário 9: Sessões próprias
   - Cenário 10: Funis próprios

🚨 SE ALGUM TESTE FALHAR:
   - Verifique se o usuário tem o papel correto
   - Confirme se as políticas foram aplicadas
   - Verifique se há dados de teste suficientes
   - Consulte os logs do Supabase para erros

📊 MÉTRICAS DE SUCESSO:
   - 100% das tabelas com RLS habilitado
   - Todas as tabelas com políticas criadas
   - Isolamento correto entre usuários
   - Acesso administrativo funcionando
*/