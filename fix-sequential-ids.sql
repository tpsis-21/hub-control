-- Correção: Gerar IDs sequenciais em vez de aleatórios
-- Execute este SQL no Supabase SQL Editor

-- =====================================================
-- FUNÇÃO CORRIGIDA PARA PLANOS (IDs SEQUENCIAIS)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_unique_panel_plan_id()
RETURNS TEXT AS $$
DECLARE
    new_id INTEGER;
    max_id INTEGER;
BEGIN
    -- Buscar o maior ID existente
    SELECT COALESCE(MAX(panel_plan_id::INTEGER), 9) INTO max_id
    FROM plans 
    WHERE panel_plan_id IS NOT NULL 
    AND panel_plan_id ~ '^[0-9]+$'; -- Apenas IDs numéricos
    
    -- Próximo ID sequencial
    new_id := max_id + 1;
    
    -- Garantir que seja pelo menos 10 (2 dígitos)
    IF new_id < 10 THEN
        new_id := 10;
    END IF;
    
    RETURN new_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO CORRIGIDA PARA SERVIDORES (IDs SEQUENCIAIS)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_unique_panel_server_id()
RETURNS TEXT AS $$
DECLARE
    new_id INTEGER;
    max_id INTEGER;
BEGIN
    -- Buscar o maior ID existente
    SELECT COALESCE(MAX(panel_server_id::INTEGER), 9) INTO max_id
    FROM servers 
    WHERE panel_server_id IS NOT NULL 
    AND panel_server_id ~ '^[0-9]+$'; -- Apenas IDs numéricos
    
    -- Próximo ID sequencial
    new_id := max_id + 1;
    
    -- Garantir que seja pelo menos 10 (2 dígitos)
    IF new_id < 10 THEN
        new_id := 10;
    END IF;
    
    RETURN new_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Testar a função de planos
SELECT 'Próximo ID de plano será:' as info, generate_unique_panel_plan_id() as proximo_id;

-- Testar a função de servidores
SELECT 'Próximo ID de servidor será:' as info, generate_unique_panel_server_id() as proximo_id;

-- Mostrar IDs atuais
SELECT 'PLANOS ATUAIS' as tipo, panel_plan_id as id, name
FROM plans 
WHERE panel_plan_id IS NOT NULL
ORDER BY panel_plan_id::INTEGER
UNION ALL
SELECT 'SERVIDORES ATUAIS' as tipo, panel_server_id as id, name
FROM servers 
WHERE panel_server_id IS NOT NULL
ORDER BY panel_server_id::INTEGER;

SELECT '✅ FUNÇÕES ATUALIZADAS!' as status,
       'Agora os IDs serão gerados sequencialmente' as detalhes,
       'Próximo plano terá ID 18, próximo servidor seguirá a sequência' as info;