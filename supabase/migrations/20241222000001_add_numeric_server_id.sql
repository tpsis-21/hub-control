-- Migration: 20241222000001_add_numeric_server_id.sql
-- Adiciona ID numérico de 2 dígitos para servidores (similar aos planos)

-- Adicionar coluna para ID numérico do servidor
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS panel_server_id TEXT;

-- Comentário para documentação
COMMENT ON COLUMN servers.panel_server_id IS 'ID numérico de 2 dígitos usado em APIs e importações (10-99)';

-- Criar índice único para garantir que não haja IDs duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_panel_server_id 
ON servers(panel_server_id) WHERE panel_server_id IS NOT NULL;

-- Função para gerar ID único de servidor (2 dígitos)
CREATE OR REPLACE FUNCTION generate_unique_panel_server_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    id_exists BOOLEAN;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 90; -- 90 tentativas para IDs de 10-99
BEGIN
    LOOP
        -- Gerar ID de 2 dígitos (10-99)
        new_id := (10 + floor(random() * 90))::TEXT;
        
        -- Verificar se o ID já existe
        SELECT EXISTS(
            SELECT 1 FROM servers 
            WHERE panel_server_id = new_id
        ) INTO id_exists;
        
        -- Se não existe, retornar o ID
        IF NOT id_exists THEN
            RETURN new_id;
        END IF;
        
        -- Incrementar contador de tentativas
        attempt_count := attempt_count + 1;
        
        -- Se exceder o máximo de tentativas, gerar um ID de 3 dígitos como fallback
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

-- Atualizar servidores existentes com IDs numéricos únicos
DO $$
DECLARE
    server_record RECORD;
BEGIN
    FOR server_record IN SELECT id FROM servers WHERE panel_server_id IS NULL
    LOOP
        UPDATE servers 
        SET panel_server_id = generate_unique_panel_server_id()
        WHERE id = server_record.id;
    END LOOP;
END;
$$;

-- Verificar se os IDs foram atribuídos corretamente
SELECT name, panel_server_id 
FROM servers 
ORDER BY panel_server_id;