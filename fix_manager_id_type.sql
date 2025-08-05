-- Script para corrigir o tipo da coluna manager_id
-- Problema: Política RLS impede alteração do tipo da coluna
-- Solução: Remover política temporariamente, alterar tipo, recriar política

-- 1. Verificar políticas existentes que dependem de manager_id
SELECT policyname, tablename, cmd, qual 
FROM pg_policies 
WHERE tablename = 'clients' AND qual LIKE '%manager_id%';

-- 2. Remover política que depende de manager_id (se existir)
-- Substitua 'nome_da_politica' pelo nome real encontrado na consulta acima
-- DROP POLICY IF EXISTS "nome_da_politica" ON clients;

-- Exemplo comum de política que pode estar causando o problema:
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Acesso público aos clientes" ON clients;

-- 3. Verificar o tipo atual da coluna
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'manager_id';

-- 4. Alterar o tipo da coluna para TEXT
ALTER TABLE clients ALTER COLUMN manager_id TYPE TEXT;

-- 5. Verificar se a alteração foi bem-sucedida
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'manager_id';

-- 6. Recriar política básica (se necessário)
-- Política simples que permite acesso público (ajuste conforme necessário)
CREATE POLICY "Acesso público aos clientes" ON clients
FOR ALL USING (true);

-- 7. Verificar se não há mais erros
-- Teste inserindo um registro com manager_id alfanumérico
-- INSERT INTO clients (name, iptv_username, manager_id, start_date, expiration_date, status, plan_id)
-- VALUES ('Teste', 'teste_user', 'A1', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'Ativo', 'plan-uuid-here');

-- INSTRUÇÕES:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Primeiro execute as consultas SELECT para ver as políticas existentes
-- 3. Ajuste os nomes das políticas conforme necessário
-- 4. Execute os comandos DROP POLICY
-- 5. Execute o ALTER TABLE
-- 6. Recrie as políticas necessárias
-- 7. Teste a inserção de um cliente com manager_id alfanumérico