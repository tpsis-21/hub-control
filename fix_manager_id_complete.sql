-- Script completo para corrigir o tipo da coluna manager_id
-- Remove todas as políticas dependentes do manager_id em todas as tabelas

-- 1. Remover políticas da tabela clients
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Acesso público aos clientes" ON clients;

-- 2. Remover políticas da tabela payments
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Acesso público aos pagamentos" ON payments;

-- 3. Remover políticas de outras tabelas que possam usar manager_id
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

-- 4. Verificar se existem outras políticas que usam manager_id
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE qual LIKE '%manager_id%';

-- 5. Alterar o tipo da coluna manager_id para TEXT em todas as tabelas
ALTER TABLE clients ALTER COLUMN manager_id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN manager_id TYPE TEXT;
ALTER TABLE notifications ALTER COLUMN manager_id TYPE TEXT;

-- 6. Verificar as alterações
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'manager_id';

-- 7. Recriar políticas básicas de acesso público
CREATE POLICY "Public access to clients" ON clients
FOR ALL USING (true);

CREATE POLICY "Public access to payments" ON payments
FOR ALL USING (true);

CREATE POLICY "Public access to notifications" ON notifications
FOR ALL USING (true);

-- 8. Confirmar que as políticas foram criadas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('clients', 'payments', 'notifications');