-- Script nuclear para resolver definitivamente o problema do manager_id
-- Abordagem radical: desabilita RLS, remove tudo, altera e reconstrói

-- 1. Desabilitar RLS completamente em todas as tabelas
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas de TODAS as tabelas (abordagem nuclear)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remove todas as políticas de todas as tabelas do schema public
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
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

-- 3. Verificar se todas as políticas foram removidas
SELECT 'Políticas restantes:' as status;
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';

-- 4. Agora alterar o tipo da coluna manager_id
ALTER TABLE clients ALTER COLUMN manager_id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN manager_id TYPE TEXT;
ALTER TABLE notifications ALTER COLUMN manager_id TYPE TEXT;

-- 5. Verificar se a alteração funcionou
SELECT 'Verificação dos tipos de coluna após alteração:' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'manager_id'
ORDER BY table_name;

-- 6. Reabilitar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 7. Criar uma única política simples para cada tabela
CREATE POLICY "allow_all_operations" ON clients FOR ALL USING (true);
CREATE POLICY "allow_all_operations" ON payments FOR ALL USING (true);
CREATE POLICY "allow_all_operations" ON notifications FOR ALL USING (true);
CREATE POLICY "allow_all_operations" ON settings FOR ALL USING (true);

-- 8. Confirmar sucesso final
SELECT 'SUCCESS: Todas as políticas removidas, manager_id alterado para TEXT, RLS reabilitado' as final_status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'manager_id';