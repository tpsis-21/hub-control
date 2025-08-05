-- Migração: Adicionar geração automática de panel_plan_id para planos
-- Execute este SQL no Supabase SQL Editor

-- 1. Verificar se a coluna panel_plan_id já existe (deve existir)
-- ALTER TABLE plans ADD COLUMN IF NOT EXISTS panel_plan_id TEXT;

-- 2. Adicionar comentário explicativo
COMMENT ON COLUMN plans.panel_plan_id IS 'ID numérico de 2 dígitos usado em APIs e importações (10-99)';

-- 3. Criar índice único para garantir que não haja IDs duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_panel_plan_id 
ON plans(panel_plan_id) WHERE panel_plan_id IS NOT NULL;

-- 4. Função para gerar IDs únicos de planos (2 dígitos)
CREATE OR REPLACE FUNCTION generate_unique_panel_plan_id()
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
            SELECT 1 FROM plans 
            WHERE panel_plan_id = new_id
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
                SELECT 1 FROM plans 
                WHERE panel_plan_id = new_id
            ) INTO id_exists;
            
            IF NOT id_exists THEN
                RETURN new_id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Atualizar planos existentes sem panel_plan_id com IDs únicos
UPDATE plans 
SET panel_plan_id = generate_unique_panel_plan_id() 
WHERE panel_plan_id IS NULL;

-- 6. Verificar resultado
SELECT id, name, panel_plan_id FROM plans ORDER BY created_at;

-- 7. Opcional: Criar trigger para garantir que novos planos sempre tenham panel_plan_id
-- (Comentado pois a aplicação já faz isso, mas pode ser útil como backup)
/*
CREATE OR REPLACE FUNCTION ensure_panel_plan_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Se panel_plan_id não foi fornecido, gerar automaticamente
    IF NEW.panel_plan_id IS NULL THEN
        NEW.panel_plan_id := generate_unique_panel_plan_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_panel_plan_id
    BEFORE INSERT ON plans
    FOR EACH ROW
    EXECUTE FUNCTION ensure_panel_plan_id();
*/