-- =====================================================
-- BACKUP DAS VIEWS COM SECURITY DEFINER
-- =====================================================
-- Este script faz backup das definições atuais das views
-- que possuem SECURITY DEFINER antes da correção
-- 
-- Data: ${new Date().toLocaleDateString('pt-BR')}
-- Responsável: Correção de Segurança Supabase
-- =====================================================

-- Criar tabela para armazenar backup das views
CREATE TABLE IF NOT EXISTS backup_views_security_definer (
    id SERIAL PRIMARY KEY,
    view_name TEXT NOT NULL,
    view_schema TEXT NOT NULL DEFAULT 'public',
    original_definition TEXT NOT NULL,
    backup_date TIMESTAMP DEFAULT NOW(),
    restored BOOLEAN DEFAULT FALSE
);

-- Função para fazer backup de uma view
CREATE OR REPLACE FUNCTION backup_view_definition(p_schema TEXT, p_view_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    view_definition TEXT;
    view_exists BOOLEAN;
BEGIN
    -- Verificar se a view existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_schema = p_schema 
        AND table_name = p_view_name
    ) INTO view_exists;
    
    IF NOT view_exists THEN
        RAISE NOTICE 'View %.% não encontrada, pulando backup', p_schema, p_view_name;
        RETURN FALSE;
    END IF;
    
    -- Obter definição completa da view
    SELECT pg_get_viewdef(c.oid, true)
    INTO view_definition
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = p_view_name 
    AND n.nspname = p_schema
    AND c.relkind = 'v';
    
    -- Inserir backup
    INSERT INTO backup_views_security_definer (
        view_name, 
        view_schema, 
        original_definition
    ) VALUES (
        p_view_name, 
        p_schema, 
        view_definition
    );
    
    RAISE NOTICE 'Backup da view %.% realizado com sucesso', p_schema, p_view_name;
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao fazer backup da view %.%: %', p_schema, p_view_name, SQLERRM;
        RETURN FALSE;
END;
$$;

-- =====================================================
-- EXECUTAR BACKUP DAS VIEWS IDENTIFICADAS
-- =====================================================

DO $$
DECLARE
    views_to_backup TEXT[] := ARRAY[
        'analytics_device_metrics',
        'thebest_dashboard', 
        'user_activity_summary',
        'analytics_daily_active_users',
        'analytics_popular_pages',
        'thebest_mapping_quality_analysis',
        'thebest_mapping_summary',
        'thebest_mapping_issues'
    ];
    view_name TEXT;
    backup_count INTEGER := 0;
    total_views INTEGER;
BEGIN
    total_views := array_length(views_to_backup, 1);
    
    RAISE NOTICE '=== INICIANDO BACKUP DE % VIEWS ===', total_views;
    RAISE NOTICE 'Data/Hora: %', NOW();
    
    -- Fazer backup de cada view
    FOREACH view_name IN ARRAY views_to_backup
    LOOP
        IF backup_view_definition('public', view_name) THEN
            backup_count := backup_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== BACKUP CONCLUÍDO ===';
    RAISE NOTICE 'Views com backup realizado: %/%', backup_count, total_views;
    RAISE NOTICE 'Views não encontradas: %', total_views - backup_count;
    
    -- Mostrar resumo dos backups
    RAISE NOTICE '=== RESUMO DOS BACKUPS ===';
    FOR view_name IN 
        SELECT v.view_name 
        FROM backup_views_security_definer v 
        WHERE v.backup_date >= NOW() - INTERVAL '1 hour'
        ORDER BY v.view_name
    LOOP
        RAISE NOTICE 'Backup realizado: %', view_name;
    END LOOP;
    
END;
$$;

-- =====================================================
-- VERIFICAR BACKUPS REALIZADOS
-- =====================================================

-- Consultar backups realizados
SELECT 
    view_schema,
    view_name,
    backup_date,
    LENGTH(original_definition) as definition_size,
    restored
FROM backup_views_security_definer 
WHERE backup_date >= NOW() - INTERVAL '1 day'
ORDER BY backup_date DESC;

-- =====================================================
-- FUNÇÃO PARA RESTAURAR VIEW (SE NECESSÁRIO)
-- =====================================================

CREATE OR REPLACE FUNCTION restore_view_from_backup(p_schema TEXT, p_view_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    view_definition TEXT;
BEGIN
    -- Buscar backup mais recente
    SELECT original_definition
    INTO view_definition
    FROM backup_views_security_definer
    WHERE view_schema = p_schema 
    AND view_name = p_view_name
    AND NOT restored
    ORDER BY backup_date DESC
    LIMIT 1;
    
    -- Verificar se encontrou backup usando FOUND diretamente
    IF NOT FOUND THEN
        RAISE NOTICE 'Backup não encontrado para view %.%', p_schema, p_view_name;
        RETURN FALSE;
    END IF;
    
    -- Dropar view atual se existir
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', p_schema, p_view_name);
    
    -- Recriar view com definição original
    EXECUTE format('CREATE VIEW %I.%I AS %s', p_schema, p_view_name, view_definition);
    
    -- Marcar backup como restaurado
    UPDATE backup_views_security_definer 
    SET restored = TRUE 
    WHERE view_schema = p_schema 
    AND view_name = p_view_name
    AND NOT restored;
    
    RAISE NOTICE 'View %.% restaurada com sucesso do backup', p_schema, p_view_name;
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao restaurar view %.% do backup: %', p_schema, p_view_name, SQLERRM;
        RETURN FALSE;
END;
$$;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/*
INSTRUÇÕES PARA USO:

1. EXECUTAR BACKUP:
   - Execute este script completo para fazer backup das views
   - Verifique se todos os backups foram realizados com sucesso

2. VERIFICAR BACKUPS:
   SELECT * FROM backup_views_security_definer ORDER BY backup_date DESC;

3. RESTAURAR VIEW (SE NECESSÁRIO):
   SELECT restore_view_from_backup('public', 'nome_da_view');

4. LIMPAR BACKUPS ANTIGOS (APÓS CONFIRMAÇÃO):
   DELETE FROM backup_views_security_definer WHERE backup_date < NOW() - INTERVAL '30 days';

IMPORTANTE:
- Execute este backup ANTES de aplicar as correções
- Mantenha os backups até confirmar que tudo está funcionando
- Teste as views após a correção antes de remover os backups
*/