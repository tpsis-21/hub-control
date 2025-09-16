-- Script para verificar políticas RLS da tabela profiles

-- 1. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 2. Listar todas as políticas ativas
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 3. Verificar permissões da tabela
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
    AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 4. Verificar se há usuário autenticado atual
SELECT 
    auth.uid() as current_user_id,
    auth.jwt() ->> 'email' as current_user_email;

-- 5. Verificar estrutura da tabela profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;