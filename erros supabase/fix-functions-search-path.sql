-- Script para corrigir funções com search_path mutável
-- Este script identifica e corrige funções que não têm search_path seguro

-- 1. Criar tabela de backup para funções (se não existir)
CREATE TABLE IF NOT EXISTS backup_functions_search_path (
    id SERIAL PRIMARY KEY,
    function_schema TEXT NOT NULL,
    function_name TEXT NOT NULL,
    function_signature TEXT NOT NULL,
    original_definition TEXT NOT NULL,
    backup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restored BOOLEAN DEFAULT FALSE
);

-- 2. Função para fazer backup de uma função específica
CREATE OR REPLACE FUNCTION backup_function_definition(
    p_schema TEXT,
    p_function_name TEXT,
    p_function_signature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_definition TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Verificar se a função existe
    SELECT EXISTS(
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = p_schema 
        AND p.proname = p_function_name
    ) INTO v_exists;
    
    IF NOT v_exists THEN
        RAISE NOTICE 'Função %.% não encontrada', p_schema, p_function_name;
        RETURN FALSE;
    END IF;
    
    -- Obter definição completa da função
    SELECT pg_get_functiondef(p.oid) INTO v_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = p_schema 
    AND p.proname = p_function_name;
    
    -- Fazer backup
    INSERT INTO backup_functions_search_path (
        function_schema,
        function_name, 
        function_signature,
        original_definition
    ) VALUES (
        p_schema,
        p_function_name,
        p_function_signature,
        v_definition
    );
    
    RAISE NOTICE 'Backup realizado para função %.%', p_schema, p_function_name;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao fazer backup da função %.%: %', p_schema, p_function_name, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para restaurar uma função do backup
CREATE OR REPLACE FUNCTION restore_function_from_backup(
    p_schema TEXT,
    p_function_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_definition TEXT;
    v_backup_id INTEGER;
BEGIN
    -- Buscar backup mais recente
    SELECT id, original_definition INTO v_backup_id, v_definition
    FROM backup_functions_search_path
    WHERE function_schema = p_schema 
    AND function_name = p_function_name
    AND restored = FALSE
    ORDER BY backup_date DESC
    LIMIT 1;
    
    IF v_definition IS NULL THEN
        RAISE NOTICE 'Backup não encontrado para função %.%', p_schema, p_function_name;
        RETURN FALSE;
    END IF;
    
    -- Executar definição original
    EXECUTE v_definition;
    
    -- Marcar como restaurado
    UPDATE backup_functions_search_path 
    SET restored = TRUE 
    WHERE id = v_backup_id;
    
    RAISE NOTICE 'Função %.% restaurada do backup', p_schema, p_function_name;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao restaurar função %.%: %', p_schema, p_function_name, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Identificar funções com search_path mutável
DO $$
DECLARE
    func_record RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== IDENTIFICANDO FUNÇÕES COM SEARCH_PATH MUTÁVEL ===';
    RAISE NOTICE 'Data/Hora: %', NOW();
    
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args,
            CASE 
                WHEN p.prosecdef THEN 'SECURITY DEFINER'
                ELSE 'SECURITY INVOKER'
            END as security_type,
            CASE
                WHEN 'search_path' = ANY(string_to_array(p.proconfig::text, ',')) THEN 'CONFIGURADO'
                ELSE 'NÃO CONFIGURADO'
            END as search_path_status,
            p.proconfig as config_settings
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname IN ('public', 'auth', 'storage')
        AND p.prokind = 'f'  -- apenas funções, não procedures
        AND (
            p.proconfig IS NULL 
            OR NOT ('search_path' = ANY(string_to_array(p.proconfig::text, ',')))
        )
        ORDER BY n.nspname, p.proname
    LOOP
        v_count := v_count + 1;
        
        RAISE NOTICE '% - Função: %.%(%)', 
            v_count,
            func_record.schema_name, 
            func_record.function_name,
            func_record.args;
        RAISE NOTICE '    Segurança: % | Search Path: %', 
            func_record.security_type,
            func_record.search_path_status;
            
        -- Fazer backup da função antes de corrigir
        PERFORM backup_function_definition(
            func_record.schema_name,
            func_record.function_name,
            func_record.function_name || '(' || func_record.args || ')'
        );
    END LOOP;
    
    RAISE NOTICE '=== TOTAL DE FUNÇÕES IDENTIFICADAS: % ===', v_count;
END $$;

-- 5. Script para corrigir funções específicas (executar manualmente conforme necessário)
-- Exemplo de correção para uma função:
/*
CREATE OR REPLACE FUNCTION public.exemplo_funcao(param1 TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER  -- ou SECURITY DEFINER se necessário
SET search_path = public, pg_temp  -- search_path seguro
AS $$
BEGIN
    -- código da função
    RETURN param1;
END;
$$;
*/

-- 6. Função auxiliar para aplicar search_path seguro a uma função
CREATE OR REPLACE FUNCTION fix_function_search_path(
    p_schema TEXT,
    p_function_name TEXT,
    p_search_path TEXT DEFAULT 'public, pg_temp'
) RETURNS BOOLEAN AS $$
DECLARE
    v_function_def TEXT;
    v_new_def TEXT;
    v_oid OID;
BEGIN
    -- Obter OID da função
    SELECT p.oid INTO v_oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = p_schema 
    AND p.proname = p_function_name;
    
    IF v_oid IS NULL THEN
        RAISE NOTICE 'Função %.% não encontrada', p_schema, p_function_name;
        RETURN FALSE;
    END IF;
    
    -- Obter definição atual
    v_function_def := pg_get_functiondef(v_oid);
    
    -- Adicionar SET search_path se não existir
    IF v_function_def NOT ILIKE '%SET search_path%' THEN
        -- Encontrar posição para inserir SET search_path
        -- Isso é complexo e pode precisar de ajuste manual
        RAISE NOTICE 'Função %.% precisa de correção manual para search_path', p_schema, p_function_name;
        RAISE NOTICE 'Definição atual salva no backup';
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'Função %.% já tem search_path configurado', p_schema, p_function_name;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao corrigir função %.%: %', p_schema, p_function_name, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Relatório final
DO $$
DECLARE
    v_total_functions INTEGER;
    v_backed_up INTEGER;
    v_needs_fix INTEGER;
BEGIN
    RAISE NOTICE '=== RELATÓRIO DE FUNÇÕES ===';
    
    -- Contar total de funções
    SELECT COUNT(*) INTO v_total_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN ('public', 'auth', 'storage')
    AND p.prokind = 'f';
    
    -- Contar backups realizados
    SELECT COUNT(*) INTO v_backed_up
    FROM backup_functions_search_path
    WHERE backup_date >= CURRENT_DATE;
    
    -- Contar funções que precisam de correção
    SELECT COUNT(*) INTO v_needs_fix
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN ('public', 'auth', 'storage')
    AND p.prokind = 'f'
    AND (
        p.proconfig IS NULL 
        OR NOT ('search_path' = ANY(string_to_array(p.proconfig::text, ',')))
    );
    
    RAISE NOTICE 'Total de funções: %', v_total_functions;
    RAISE NOTICE 'Backups realizados hoje: %', v_backed_up;
    RAISE NOTICE 'Funções que precisam de correção: %', v_needs_fix;
    RAISE NOTICE 'Data/Hora: %', NOW();
END $$;