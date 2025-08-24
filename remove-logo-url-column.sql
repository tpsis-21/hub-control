-- Script para remover a coluna logo_url da tabela profiles
-- Execute no Supabase SQL Editor se desejar

-- Verificar se a coluna existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'logo_url';

-- Remover a coluna se existir
ALTER TABLE profiles DROP COLUMN IF EXISTS logo_url;

-- Verificar estrutura final
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;