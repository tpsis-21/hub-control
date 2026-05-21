-- Desabilitar temporariamente RLS em todas as tabelas para resolver recursão
-- ATENÇÃO: Isso é uma solução temporária para identificar o problema

-- Desabilitar RLS em todas as tabelas principais
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE servers DISABLE ROW LEVEL SECURITY;

-- Verificar se existem outras tabelas e desabilitar RLS se necessário
DO $$
BEGIN
    -- Clients
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Financial transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions' AND table_schema = 'public') THEN
        ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings' AND table_schema = 'public') THEN
        ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- In-app notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'in_app_notifications' AND table_schema = 'public') THEN
        ALTER TABLE in_app_notifications DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Verificar status do RLS após desabilitação
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS Ainda Habilitado'
        ELSE '✅ RLS Desabilitado'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;