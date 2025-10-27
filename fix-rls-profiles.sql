-- =====================================================
-- CORREÇÃO CRÍTICA: Habilitar RLS na tabela profiles
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Problema: Tabela public.profiles sem RLS habilitado
-- Impacto: CRÍTICO - Exposição de dados de usuários
-- =====================================================

-- 1. Verificar estado atual da tabela profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS Habilitado'
        ELSE 'RLS Desabilitado'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'profiles';

-- 2. Verificar políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 3. CORREÇÃO PRINCIPAL: Habilitar RLS na tabela profiles
-- ATENÇÃO: Esta operação é crítica para segurança
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Verificar se RLS foi habilitado com sucesso
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    'RLS HABILITADO COM SUCESSO' as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'profiles'
    AND rowsecurity = true;

-- 5. Testar funcionamento das políticas RLS
-- (Execute como usuário autenticado para testar)
/*
-- Teste 1: Verificar se políticas estão ativas
SET ROLE authenticated;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.profiles LIMIT 1;
RESET ROLE;

-- Teste 2: Verificar contagem com RLS
SET ROLE authenticated;
SELECT COUNT(*) as total_profiles_with_rls FROM public.profiles;
RESET ROLE;
*/

-- 6. Verificação final - Listar todas as políticas ativas
SELECT 
    'POLÍTICA RLS ATIVA:' as status,
    policyname,
    cmd as operacao,
    CASE 
        WHEN roles = '{authenticated}' THEN 'Usuários Autenticados'
        WHEN roles = '{anon}' THEN 'Usuários Anônimos'
        ELSE array_to_string(roles, ', ')
    END as usuarios_permitidos,
    COALESCE(qual, 'Sem restrição') as condicao
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ RLS habilitado na tabela profiles
-- ✅ Políticas RLS funcionando corretamente
-- ✅ Acesso controlado por autenticação
-- =====================================================

-- PRÓXIMOS PASSOS:
-- 1. Executar este script no Supabase SQL Editor
-- 2. Verificar se não há erros de aplicação
-- 3. Testar funcionalidade de perfis na aplicação
-- 4. Monitorar logs para problemas de acesso

-- ROLLBACK (apenas se necessário):
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;