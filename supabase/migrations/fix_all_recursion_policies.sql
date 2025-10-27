-- Correção completa da recursão infinita em todas as tabelas
-- Remove todas as políticas que fazem referência à tabela profiles

-- =====================================================
-- 1. REMOVER POLÍTICAS DA TABELA SERVERS
-- =====================================================

-- Desabilitar RLS temporariamente na tabela servers
ALTER TABLE servers DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes da tabela servers
DROP POLICY IF EXISTS "servers_select_policy" ON servers;
DROP POLICY IF EXISTS "servers_insert_policy" ON servers;
DROP POLICY IF EXISTS "servers_update_policy" ON servers;
DROP POLICY IF EXISTS "servers_delete_policy" ON servers;

-- Reabilitar RLS
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples para servers (apenas para usuários autenticados)
CREATE POLICY "servers_select_authenticated" ON servers
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "servers_insert_authenticated" ON servers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "servers_update_authenticated" ON servers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "servers_delete_authenticated" ON servers
    FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- 2. VERIFICAR E CORRIGIR OUTRAS TABELAS
-- =====================================================

-- Remover políticas problemáticas de outras tabelas que referenciam profiles
DROP POLICY IF EXISTS "clients_select_policy" ON clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON clients;
DROP POLICY IF EXISTS "clients_update_policy" ON clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON clients;

DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON payments;

DROP POLICY IF EXISTS "financial_transactions_select_policy" ON financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_insert_policy" ON financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_update_policy" ON financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_delete_policy" ON financial_transactions;

-- =====================================================
-- 3. CRIAR POLÍTICAS SIMPLES PARA TODAS AS TABELAS
-- =====================================================

-- Políticas para clients (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "clients_authenticated_access" ON clients
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Políticas para payments (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "payments_authenticated_access" ON payments
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Políticas para financial_transactions (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions' AND table_schema = 'public') THEN
        ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "financial_transactions_authenticated_access" ON financial_transactions
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- 4. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se ainda há políticas que referenciam a tabela profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE (qual LIKE '%profiles%' OR with_check LIKE '%profiles%')
    AND tablename != 'profiles'
ORDER BY tablename, policyname;