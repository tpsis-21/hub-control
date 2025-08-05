-- Migração para adicionar campos de créditos na tabela servers
-- Execute este SQL no seu banco de dados Supabase

-- Adicionar campos de créditos na tabela servers
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS credits INTEGER,
ADD COLUMN IF NOT EXISTS last_credits_sync TIMESTAMPTZ;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN servers.credits IS 'Quantidade de créditos disponíveis no servidor (para integrações como NATV)';
COMMENT ON COLUMN servers.last_credits_sync IS 'Timestamp da última sincronização dos créditos';

-- Verificar se os campos foram adicionados corretamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'servers' 
AND column_name IN ('credits', 'last_credits_sync')
ORDER BY column_name;