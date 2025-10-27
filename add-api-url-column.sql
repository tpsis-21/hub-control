-- Script para adicionar apenas a coluna api_url à tabela thebest_configs
-- Execute este script no Supabase Dashboard

ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS api_url TEXT NOT NULL DEFAULT 'https://api.thebest.com';

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'thebest_configs' AND column_name = 'api_url';