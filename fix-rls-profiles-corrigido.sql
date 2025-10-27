-- =====================================================
-- CORREÇÃO CRÍTICA: Habilitar RLS na tabela profiles
-- =====================================================
-- Data: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
-- Problema: Tabela public.profiles sem RLS habilitado
-- Impacto: CRÍTICO - Exposição de dados de usuários
-- Versão: CORRIGIDA (sem erro hasrls)
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

-- 3. Verificar se a tabela profiles existe
SELECT 
    table_name,
    table_schema,
    table_type,
    'Tabela encontrada' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'profiles';

-- 4. CORREÇÃO PRINCIPAL: Habilitar RLS na tabela profiles
-- ATENÇÃO: Esta operação é crítica para segurança
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Verificar se RLS foi habilitado com sucesso
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO COM SUCESSO'
        ELSE '❌ RLS NÃO FOI HABILITADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'profiles';

-- 6. Verificar contagem de políticas RLS ativas
SELECT 
    COUNT(*) as total_politicas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Políticas RLS encontradas'
        ELSE '⚠️ Nenhuma política RLS encontrada'
    END as status_politicas
FROM pg_policies 
WHERE tablename = 'profiles';

-- 7. Testar funcionamento das políticas RLS
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

-- 8. Verificação final - Listar todas as políticas ativas
SELECT 
    '📋 POLÍTICA RLS ATIVA:' as status,
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

-- 9. Verificação de segurança adicional
SELECT 
    'RESUMO DE SEGURANÇA:' as categoria,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as politicas_select,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as politicas_insert,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as politicas_update,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as politicas_delete,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE tablename = 'profiles';

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ RLS habilitado na tabela profiles
-- ✅ Políticas RLS funcionando corretamente
-- ✅ Acesso controlado por autenticação
-- ✅ Sem erros de coluna hasrls
-- =====================================================

-- PRÓXIMOS PASSOS:
-- 1. Executar este script no Supabase SQL Editor
-- 2. Verificar se não há erros de aplicação
-- 3. Testar funcionalidade de perfis na aplicação
-- 4. Monitorar logs para problemas de acesso

-- ROLLBACK (apenas se necessário):
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- NOTAS TÉCNICAS:
-- - Removido hasrls (não existe em pg_tables)
-- - Adicionadas verificações extras de segurança
-- - Incluído teste de existência da tabela
-- - Melhorado feedback visual com emojis
-- =====================================================