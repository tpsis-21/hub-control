-- SOLUÇÃO RÁPIDA: Corrigir tipo da coluna manager_id
-- Execute este script no SQL Editor do Supabase

-- Passo 1: Desabilitar RLS temporariamente
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Passo 2: Alterar o tipo da coluna
ALTER TABLE clients ALTER COLUMN manager_id TYPE TEXT;

-- Passo 3: Reabilitar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Passo 4: Recriar política básica
DROP POLICY IF EXISTS "Acesso público aos clientes" ON clients;
CREATE POLICY "Acesso público aos clientes" ON clients
FOR ALL USING (true);

-- Verificar se funcionou
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'manager_id';

-- Resultado esperado: data_type = 'text'