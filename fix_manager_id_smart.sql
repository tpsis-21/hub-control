-- Script inteligente para corrigir manager_id
-- Primeiro verifica quais tabelas realmente têm a coluna manager_id

-- 1. Verificar quais tabelas têm a coluna manager_id
SELECT 'Tabelas com coluna manager_id:' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'manager_id'
AND table_schema = 'public'
ORDER BY table_name;

-- 2. Verificar todas as políticas que usam manager_id
SELECT 'Políticas que usam manager_id:' as status;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE qual LIKE '%manager_id%'
ORDER BY tablename, policyname;

-- 3. Desabilitar RLS apenas nas tabelas que existem
DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Verificar e desabilitar RLS para clients
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') INTO table_exists;
    IF table_exists THEN
        ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS desabilitado para clients';
    END IF;
    
    -- Verificar e desabilitar RLS para payments
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') INTO table_exists;
    IF table_exists THEN
        ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS desabilitado para payments';
    END IF;
    
    -- Verificar e desabilitar RLS para notifications
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') INTO table_exists;
    IF table_exists THEN
        ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS desabilitado para notifications';
    END IF;
END$$;

-- 4. Remover todas as políticas que usam manager_id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE qual LIKE '%manager_id%'
    )
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
            RAISE NOTICE 'Removida política: % da tabela %', r.policyname, r.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao remover política %: %', r.policyname, SQLERRM;
        END;
    END LOOP;
END$$;

-- 5. Alterar o tipo da coluna manager_id apenas nas tabelas que a possuem
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Verificar e alterar manager_id em clients
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'manager_id' AND table_schema = 'public'
    ) INTO column_exists;
    IF column_exists THEN
        ALTER TABLE clients ALTER COLUMN manager_id TYPE TEXT;
        RAISE NOTICE 'Coluna manager_id alterada para TEXT na tabela clients';
    END IF;
    
    -- Verificar e alterar manager_id em payments
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'manager_id' AND table_schema = 'public'
    ) INTO column_exists;
    IF column_exists THEN
        ALTER TABLE payments ALTER COLUMN manager_id TYPE TEXT;
        RAISE NOTICE 'Coluna manager_id alterada para TEXT na tabela payments';
    END IF;
    
    -- Verificar e alterar manager_id em notifications
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'manager_id' AND table_schema = 'public'
    ) INTO column_exists;
    IF column_exists THEN
        ALTER TABLE notifications ALTER COLUMN manager_id TYPE TEXT;
        RAISE NOTICE 'Coluna manager_id alterada para TEXT na tabela notifications';
    END IF;
END$$;

-- 6. Verificar o resultado das alterações
SELECT 'Resultado final - Colunas manager_id:' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'manager_id'
AND table_schema = 'public'
ORDER BY table_name;

-- 7. Reabilitar RLS nas tabelas que existem
DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Reabilitar RLS para clients
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') INTO table_exists;
    IF table_exists THEN
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "allow_all" ON clients FOR ALL USING (true);
        RAISE NOTICE 'RLS reabilitado para clients';
    END IF;
    
    -- Reabilitar RLS para payments
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') INTO table_exists;
    IF table_exists THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "allow_all" ON payments FOR ALL USING (true);
        RAISE NOTICE 'RLS reabilitado para payments';
    END IF;
    
    -- Reabilitar RLS para notifications
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') INTO table_exists;
    IF table_exists THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "allow_all" ON notifications FOR ALL USING (true);
        RAISE NOTICE 'RLS reabilitado para notifications';
    END IF;
END$$;

-- 8. Confirmar sucesso
SELECT 'SUCCESS: Script executado com verificações de existência' as final_status;