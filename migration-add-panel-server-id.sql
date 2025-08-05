-- Migração: Adicionar panel_server_id aos servidores
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna panel_server_id
ALTER TABLE servers ADD COLUMN panel_server_id TEXT;

-- 2. Adicionar comentário explicativo
COMMENT ON COLUMN servers.panel_server_id IS 'ID numérico de 2 dígitos usado em APIs e importações (10-99)';

-- 3. Criar índice único
CREATE UNIQUE INDEX idx_servers_panel_server_id ON servers(panel_server_id) WHERE panel_server_id IS NOT NULL;

-- 4. Função para gerar IDs únicos
CREATE OR REPLACE FUNCTION generate_unique_panel_server_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    id_exists BOOLEAN;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 90;
BEGIN
    LOOP
        -- Gerar ID de 2 dígitos (10-99)
        new_id := (10 + floor(random() * 90))::TEXT;
        
        -- Verificar se já existe
        SELECT EXISTS(
            SELECT 1 FROM servers 
            WHERE panel_server_id = new_id
        ) INTO id_exists;
        
        IF NOT id_exists THEN
            RETURN new_id;
        END IF;
        
        attempt_count := attempt_count + 1;
        
        -- Se esgotar tentativas de 2 dígitos, usar 3 dígitos
        IF attempt_count >= max_attempts THEN
            new_id := (100 + floor(random() * 900))::TEXT;
            
            SELECT EXISTS(
                SELECT 1 FROM servers 
                WHERE panel_server_id = new_id
            ) INTO id_exists;
            
            IF NOT id_exists THEN
                RETURN new_id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Atualizar servidores existentes com IDs únicos
UPDATE servers 
SET panel_server_id = generate_unique_panel_server_id() 
WHERE panel_server_id IS NULL;

-- 6. Verificar resultado
SELECT id, name, panel_server_id FROM servers ORDER BY created_at;