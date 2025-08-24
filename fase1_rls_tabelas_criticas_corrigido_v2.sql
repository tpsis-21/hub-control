-- =====================================================
-- FASE 1: RLS para Tabelas Críticas - VERSÃO CORRIGIDA V2
-- =====================================================
-- Este script resolve os erros:
-- 1. Erro de tipo 'text = uuid' (convertendo auth.uid() para text)
-- 2. Erro de política já existente (usando DROP POLICY IF EXISTS)

-- =====================================================
-- REMOVER POLÍTICAS EXISTENTES (SE HOUVER)
-- =====================================================

-- Remover políticas da tabela profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Remover políticas da tabela clients
DROP POLICY IF EXISTS "clients_select_policy" ON clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON clients;
DROP POLICY IF EXISTS "clients_update_policy" ON clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON clients;

-- Remover políticas da tabela payments
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON payments;

-- Remover políticas da tabela financial_transactions
DROP POLICY IF EXISTS "financial_transactions_select_policy" ON financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_insert_policy" ON financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_update_policy" ON financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_delete_policy" ON financial_transactions;

-- Remover políticas da tabela servers
DROP POLICY IF EXISTS "servers_select_policy" ON servers;
DROP POLICY IF EXISTS "servers_insert_policy" ON servers;
DROP POLICY IF EXISTS "servers_update_policy" ON servers;
DROP POLICY IF EXISTS "servers_delete_policy" ON servers;

-- Remover políticas da tabela settings
DROP POLICY IF EXISTS "settings_select_policy" ON settings;
DROP POLICY IF EXISTS "settings_insert_policy" ON settings;
DROP POLICY IF EXISTS "settings_update_policy" ON settings;
DROP POLICY IF EXISTS "settings_delete_policy" ON settings;

-- =====================================================
-- 1. PROFILES: Isolamento por user_id com suporte a admin
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários veem apenas seu próprio perfil, admins veem todos
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (
    user_id = auth.uid()::text OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- INSERT: Usuários podem criar apenas seu próprio perfil
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- UPDATE: Usuários podem atualizar apenas seu próprio perfil, admins podem atualizar todos
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (
    user_id = auth.uid()::text OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- DELETE: Apenas admins podem deletar perfis
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- =====================================================
-- 2. CLIENTS: Isolamento por manager_id com suporte a admin
-- =====================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários veem apenas clientes que gerenciam, admins veem todos
CREATE POLICY "clients_select_policy" ON clients
  FOR SELECT
  USING (
    manager_id = auth.uid()::text OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- INSERT: Usuários podem criar clientes, manager_id deve ser o próprio usuário
CREATE POLICY "clients_insert_policy" ON clients
  FOR INSERT
  WITH CHECK (
    manager_id = auth.uid()::text OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- UPDATE: Usuários podem atualizar apenas clientes que gerenciam, admins podem atualizar todos
CREATE POLICY "clients_update_policy" ON clients
  FOR UPDATE
  USING (
    manager_id = auth.uid()::text OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- DELETE: Usuários podem deletar apenas clientes que gerenciam, admins podem deletar todos
CREATE POLICY "clients_delete_policy" ON clients
  FOR DELETE
  USING (
    manager_id = auth.uid()::text OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- =====================================================
-- 3. PAYMENTS: Isolamento baseado no client_id relacionado
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários veem apenas pagamentos de clientes que gerenciam, admins veem todos
CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()::text
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- INSERT: Usuários podem criar pagamentos apenas para clientes que gerenciam
CREATE POLICY "payments_insert_policy" ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()::text
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- UPDATE: Usuários podem atualizar apenas pagamentos de clientes que gerenciam
CREATE POLICY "payments_update_policy" ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()::text
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- DELETE: Usuários podem deletar apenas pagamentos de clientes que gerenciam
CREATE POLICY "payments_delete_policy" ON payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()::text
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- =====================================================
-- 4. FINANCIAL_TRANSACTIONS: Apenas administradores
-- =====================================================
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas administradores podem ver transações financeiras
CREATE POLICY "financial_transactions_select_policy" ON financial_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- INSERT: Apenas administradores podem criar transações financeiras
CREATE POLICY "financial_transactions_insert_policy" ON financial_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- UPDATE: Apenas administradores podem atualizar transações financeiras
CREATE POLICY "financial_transactions_update_policy" ON financial_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- DELETE: Apenas administradores podem deletar transações financeiras
CREATE POLICY "financial_transactions_delete_policy" ON financial_transactions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- =====================================================
-- 5. SERVERS: Apenas administradores
-- =====================================================
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas administradores podem ver servidores
CREATE POLICY "servers_select_policy" ON servers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- INSERT: Apenas administradores podem criar servidores
CREATE POLICY "servers_insert_policy" ON servers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- UPDATE: Apenas administradores podem atualizar servidores
CREATE POLICY "servers_update_policy" ON servers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- DELETE: Apenas administradores podem deletar servidores
CREATE POLICY "servers_delete_policy" ON servers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- =====================================================
-- 6. SETTINGS: Apenas administradores
-- =====================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas administradores podem ver configurações
CREATE POLICY "settings_select_policy" ON settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- INSERT: Apenas administradores podem criar configurações
CREATE POLICY "settings_insert_policy" ON settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- UPDATE: Apenas administradores podem atualizar configurações
CREATE POLICY "settings_update_policy" ON settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- DELETE: Apenas administradores podem deletar configurações
CREATE POLICY "settings_delete_policy" ON settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- =====================================================
-- VERIFICAÇÃO DE COBERTURA RLS
-- =====================================================

-- Verificar se todas as tabelas críticas têm RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'clients', 'payments', 'financial_transactions', 'servers', 'settings')
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'r' THEN 'SELECT'
    WHEN cmd = 'a' THEN 'INSERT'
    WHEN cmd = 'w' THEN 'UPDATE'
    WHEN cmd = 'd' THEN 'DELETE'
    WHEN cmd = '*' THEN 'ALL'
    ELSE cmd::text
  END as operation_name
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'clients', 'payments', 'financial_transactions', 'servers', 'settings')
ORDER BY tablename, operation_name;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

/*
Este script corrigido resolve os seguintes problemas:

1. ✅ ERRO DE TIPO RESOLVIDO: 
   - Convertido auth.uid() para ::text em todas as comparações
   - Evita erro "operator does not exist: text = uuid"

2. ✅ ERRO DE POLÍTICA EXISTENTE RESOLVIDO:
   - Adicionado DROP POLICY IF EXISTS antes de criar novas políticas
   - Permite re-execução do script sem erros

3. ✅ IMPLEMENTAÇÃO RLS COMPLETA:
   - PROFILES: Isolamento por user_id, admins veem todos
   - CLIENTS: Isolamento por manager_id, admins veem todos
   - PAYMENTS: Isolamento baseado no client_id relacionado
   - FINANCIAL_TRANSACTIONS: Apenas administradores
   - SERVERS: Apenas administradores
   - SETTINGS: Apenas administradores

4. ✅ VERIFICAÇÕES INCLUÍDAS:
   - Status RLS de todas as tabelas
   - Lista de políticas criadas
   - Relatório de cobertura de segurança

Próximos passos:
1. Aplicar este script no Supabase SQL Editor
2. Verificar se não há erros
3. Testar as políticas com usuários diferentes
4. Prosseguir com a Fase 2 (tabelas de analytics)
*/