-- Script de diagnóstico para problema de chave duplicada na tabela profiles

-- 1. Verificar se há registros duplicados por ID (chave primária)
SELECT 
    id, 
    COUNT(*) as count
FROM profiles 
GROUP BY id 
HAVING COUNT(*) > 1;

-- 2. Verificar se há user_id duplicados (constraint única)
SELECT 
    user_id, 
    COUNT(*) as count
FROM profiles 
WHERE user_id IS NOT NULL
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- 3. Verificar todos os registros da tabela profiles
SELECT 
    id,
    user_id,
    full_name,
    role,
    created_at,
    updated_at
FROM profiles 
ORDER BY created_at DESC;

-- 4. Verificar se há registros órfãos (user_id que não existe em auth.users)
SELECT p.id, p.user_id, p.full_name
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL AND p.user_id IS NOT NULL;

-- 5. Verificar constraints da tabela
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass;