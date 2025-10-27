-- Script SQL para corrigir estrutura da tabela thebest_configs
-- Execute este script diretamente no Supabase Dashboard

-- Remover colunas que não existem na nova estrutura
ALTER TABLE thebest_configs DROP COLUMN IF EXISTS username;
ALTER TABLE thebest_configs DROP COLUMN IF EXISTS password;
ALTER TABLE thebest_configs DROP COLUMN IF EXISTS config_data;

-- Adicionar colunas que estão faltando
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS api_url TEXT NOT NULL DEFAULT 'https://api.thebest.com';
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS api_secret TEXT;
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Configuração The Best';
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER DEFAULT 60;
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS rate_limit_per_day INTEGER DEFAULT 1000;
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE thebest_configs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Adicionar índices únicos que podem estar faltando
DROP INDEX IF EXISTS idx_unique_user_default_thebest;
CREATE UNIQUE INDEX idx_unique_user_default_thebest ON thebest_configs(user_id) WHERE is_default = true;

DROP INDEX IF EXISTS idx_unique_user_name_thebest;
CREATE UNIQUE INDEX idx_unique_user_name_thebest ON thebest_configs(user_id, name);

-- Comentários para documentação
COMMENT ON COLUMN thebest_configs.api_key IS 'Chave da API (criptografada)';
COMMENT ON COLUMN thebest_configs.api_secret IS 'Segredo da API (criptografado)';

-- Verificar estrutura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'thebest_configs' 
ORDER BY ordinal_position;