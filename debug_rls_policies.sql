-- Consulta para verificar políticas RLS da tabela profiles
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
WHERE tablename = 'profiles';

-- Verificar se há políticas que referenciam a própria tabela profiles
SELECT 
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
AND (qual LIKE '%profiles%' OR with_check LIKE '%profiles%');