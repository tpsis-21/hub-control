-- =====================================================
-- VERIFICAÇÃO: Estrutura da tabela profiles
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Objetivo: Verificar colunas reais da tabela profiles
-- =====================================================

-- 1. Verificar se a tabela profiles existe
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'profiles';

-- 2. Listar todas as colunas da tabela profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Verificar colunas relacionadas a data/tempo
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND (
        column_name ILIKE '%date%' OR
        column_name ILIKE '%time%' OR
        column_name ILIKE '%at' OR
        column_name ILIKE '%login%' OR
        column_name ILIKE '%sign%' OR
        column_name ILIKE '%access%' OR
        column_name ILIKE '%created%' OR
        column_name ILIKE '%updated%'
    )
ORDER BY column_name;

-- 4. Verificar algumas linhas da tabela (se existir dados)
SELECT 
    id,
    email,
    created_at,
    updated_at
FROM public.profiles 
LIMIT 5;

-- =====================================================
-- RESULTADO: 
-- Este script mostrará a estrutura real da tabela profiles
-- para identificarmos as colunas corretas para usar na view
-- =====================================================