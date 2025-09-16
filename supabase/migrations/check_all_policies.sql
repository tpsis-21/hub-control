-- Verificar todas as políticas que fazem referência à tabela profiles
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
WHERE qual LIKE '%profiles%' OR with_check LIKE '%profiles%'
ORDER BY tablename, policyname;

-- Verificar políticas na tabela profiles especificamente
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
ORDER BY policyname;

-- Verificar status do RLS na tabela profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';