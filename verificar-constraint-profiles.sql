-- ============================================
-- 🔍 VERIFICAR CONSTRAINT DA TABELA PROFILES
-- ============================================
-- Script para verificar a constraint que está causando erro
-- Data: 2024-12-23

-- ============================================
-- VERIFICAR ESTRUTURA E CONSTRAINTS
-- ============================================

-- 1. Verificar se a tabela profiles existe
SELECT 
    'TABELA PROFILES' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'profiles' AND table_schema = 'public'
        ) THEN 'EXISTE'
        ELSE 'NÃO EXISTE'
    END as status;

-- 2. Verificar todas as colunas da tabela profiles
SELECT 
    'COLUNAS DA TABELA' as verificacao,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar todas as constraints da tabela profiles
SELECT 
    'CONSTRAINTS' as verificacao,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 4. Verificar especificamente a constraint profiles_role_check
SELECT 
    'CONSTRAINT ROLE CHECK' as verificacao,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'profiles_role_check';

-- 5. Verificar dados existentes na tabela (se houver)
SELECT 
    'DADOS EXISTENTES' as verificacao,
    COUNT(*) as total_registros
FROM profiles;

-- 6. Verificar valores únicos na coluna role (se existir)
SELECT 
    'VALORES ROLE EXISTENTES' as verificacao,
    role,
    COUNT(*) as quantidade
FROM profiles 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

-- ============================================
-- INFORMAÇÕES ADICIONAIS
-- ============================================

-- Verificar se existe algum enum relacionado a roles
SELECT 
    'ENUMS RELACIONADOS' as verificacao,
    typname as enum_name,
    enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname LIKE '%role%' OR typname LIKE '%profile%'
ORDER BY typname, enumsortorder;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Este script vai mostrar:
-- 1. Se a tabela profiles existe
-- 2. Quais colunas ela tem
-- 3. Quais constraints existem
-- 4. Especificamente a constraint que está falhando
-- 5. Dados existentes
-- 6. Valores permitidos na coluna role

-- ============================================
-- PRÓXIMOS PASSOS:
-- ============================================
-- Após executar este script, vamos:
-- 1. Identificar os valores permitidos na constraint
-- 2. Corrigir o script de criação do admin
-- 3. Ou alterar a constraint se necessário