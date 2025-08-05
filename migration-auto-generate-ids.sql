-- Migração: Garantir geração automática de IDs únicos para planos e servidores
-- Execute este SQL no Supabase SQL Editor

-- =====================================================
-- PARTE 1: PLANOS (panel_plan_id)
-- =====================================================

-- 1. Garantir que a coluna panel_plan_id existe
ALTER TABLE plans ADD COLUMN IF NOT EXISTS panel_plan_id TEXT;

-- 2. Comentário explicativo
COMMENT ON COLUMN plans.panel_plan_id IS 'ID numérico de 2 dígitos usado em APIs e importações (10-99) - ÚNICO E INTRANSFERÍVEL';

-- 3. Criar índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_panel_plan_id 
ON plans(panel_plan_id) WHERE panel_plan_id IS NOT NULL;

-- 4. Função para gerar IDs únicos de planos
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

-- 5. Trigger para garantir que novos planos sempre tenham panel_plan_id
CREATE OR REPLACE FUNCTION ensure_panel_plan_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Se panel_plan_id não foi fornecido, gerar automaticamente
    IF NEW.panel_plan_id IS NULL OR NEW.panel_plan_id = '' THEN
        NEW.panel_plan_id := generate_unique_panel_plan_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_ensure_panel_plan_id ON plans;

-- Criar trigger
CREATE TRIGGER trigger_ensure_panel_plan_id
    BEFORE INSERT ON plans
    FOR EACH ROW
    EXECUTE FUNCTION ensure_panel_plan_id();

-- =====================================================
-- PARTE 2: SERVIDORES (panel_server_id)
-- =====================================================

-- 1. Garantir que a coluna panel_server_id existe
ALTER TABLE servers ADD COLUMN IF NOT EXISTS panel_server_id TEXT;

-- 2. Comentário explicativo
COMMENT ON COLUMN servers.panel_server_id IS 'ID numérico de 2 dígitos usado em APIs e importações (10-99) - ÚNICO E INTRANSFERÍVEL';

-- 3. Criar índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_panel_server_id 
ON servers(panel_server_id) WHERE panel_server_id IS NOT NULL;

-- 4. Função para gerar IDs únicos de servidores
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

-- 5. Trigger para garantir que novos servidores sempre tenham panel_server_id
CREATE OR REPLACE FUNCTION ensure_panel_server_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Se panel_server_id não foi fornecido, gerar automaticamente
    IF NEW.panel_server_id IS NULL OR NEW.panel_server_id = '' THEN
        NEW.panel_server_id := generate_unique_panel_server_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_ensure_panel_server_id ON servers;

-- Criar trigger
CREATE TRIGGER trigger_ensure_panel_server_id
    BEFORE INSERT ON servers
    FOR EACH ROW
    EXECUTE FUNCTION ensure_panel_server_id();

-- =====================================================
-- PARTE 3: ATUALIZAR REGISTROS EXISTENTES
-- =====================================================

-- Atualizar planos existentes sem panel_plan_id
UPDATE plans 
SET panel_plan_id = generate_unique_panel_plan_id() 
WHERE panel_plan_id IS NULL OR panel_plan_id = '';

-- Atualizar servidores existentes sem panel_server_id
UPDATE servers 
SET panel_server_id = generate_unique_panel_server_id() 
WHERE panel_server_id IS NULL OR panel_server_id = '';

-- =====================================================
-- PARTE 4: VERIFICAÇÃO E RELATÓRIO
-- =====================================================

-- Verificar planos
SELECT 'PLANOS' as tipo, COUNT(*) as total, 
       COUNT(panel_plan_id) as com_id,
       COUNT(*) - COUNT(panel_plan_id) as sem_id
FROM plans
UNION ALL
-- Verificar servidores
SELECT 'SERVIDORES' as tipo, COUNT(*) as total, 
       COUNT(panel_server_id) as com_id,
       COUNT(*) - COUNT(panel_server_id) as sem_id
FROM servers;

-- Mostrar todos os IDs gerados
SELECT 'PLANO' as tipo, name, panel_plan_id as id_numerico, created_at
FROM plans 
WHERE panel_plan_id IS NOT NULL
UNION ALL
SELECT 'SERVIDOR' as tipo, name, panel_server_id as id_numerico, created_at
FROM servers 
WHERE panel_server_id IS NOT NULL
ORDER BY tipo, id_numerico;

-- Mensagem de sucesso
SELECT '🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as status,
       'IDs únicos e intransferíveis configurados para planos e servidores' as detalhes,
       'Novos registros terão IDs gerados automaticamente' as info_adicional;