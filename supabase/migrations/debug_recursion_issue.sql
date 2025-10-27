-- Script para debugar o problema de recursão infinita
-- Vamos verificar todas as políticas que ainda existem

-- 1. Verificar todas as políticas da tabela profiles
SELECT 
    'POLÍTICAS PROFILES' as tipo,
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. Verificar todas as políticas que fazem referência à tabela profiles
SELECT 
    'POLÍTICAS QUE REFERENCIAM PROFILES' as tipo,
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE (qual LIKE '%profiles%' OR with_check LIKE '%profiles%')
    AND tablename != 'profiles'
ORDER BY tablename, policyname;

-- 3. Verificar se RLS está habilitado nas tabelas
SELECT 
    'STATUS RLS' as tipo,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'servers', 'clients', 'payments', 'financial_transactions')
ORDER BY tablename;

-- 4. Verificar se há funções que fazem referência à tabela profiles
SELECT 
    'FUNÇÕES QUE REFERENCIAM PROFILES' as tipo,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_definition ILIKE '%profiles%'
ORDER BY routine_name;