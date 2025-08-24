-- ============================================
-- 🔍 VERIFICAR ESTRUTURA DA TABELA PROFILES
-- ============================================
-- Execute no SQL Editor do Supabase

-- Verificar se a tabela profiles existe
SELECT 
    'TABELA PROFILES' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'profiles' 
            AND table_schema = 'public'
        ) THEN 'EXISTE'
        ELSE 'NÃO EXISTE'
    END as status;

-- Verificar estrutura da tabela profiles
SELECT 
    'ESTRUTURA DA TABELA' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se existem registros
SELECT 
    'TOTAL DE REGISTROS' as info,
    COUNT(*) as total
FROM profiles;

-- Tentar uma consulta básica para ver se funciona
SELECT 
    'TESTE DE CONSULTA' as info,
    'SUCESSO' as resultado
FROM profiles
LIMIT 1;