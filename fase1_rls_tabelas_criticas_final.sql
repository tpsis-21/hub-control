-- =====================================================
-- FASE 1: RLS para Tabelas Críticas - VERSÃO FINAL CORRIGIDA
-- =====================================================
-- Este script implementa RLS baseado na estrutura real das tabelas
-- Corrige erros de tipos de dados e colunas inexistentes

-- 1. PROFILES: Isolamento por user_id com suporte a admin
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários veem apenas seu próprio perfil, admins veem todos
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- INSERT: Usuários podem criar apenas seu próprio perfil
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Usuários podem atualizar apenas seu próprio perfil, admins podem atualizar todos
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE: Apenas admins podem deletar perfis
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- 2. CLIENTS: Isolamento por manager_id com suporte a admin
-- =====================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários veem apenas clientes que gerenciam, admins veem todos
CREATE POLICY "clients_select_policy" ON clients
  FOR SELECT
  USING (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- INSERT: Usuários podem criar clientes, manager_id deve ser o próprio usuário
CREATE POLICY "clients_insert_policy" ON clients
  FOR INSERT
  WITH CHECK (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- UPDATE: Usuários podem atualizar apenas clientes que gerenciam, admins podem atualizar todos
CREATE POLICY "clients_update_policy" ON clients
  FOR UPDATE
  USING (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE: Usuários podem deletar apenas clientes que gerenciam, admins podem deletar todos
CREATE POLICY "clients_delete_policy" ON clients
  FOR DELETE
  USING (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3. PAYMENTS: Isolamento baseado no client_id relacionado
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários veem apenas pagamentos de clientes que gerenciam, admins veem todos
CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- INSERT: Usuários podem criar pagamentos apenas para clientes que gerenciam
CREATE POLICY "payments_insert_policy" ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- UPDATE: Usuários podem atualizar apenas pagamentos de clientes que gerenciam
CREATE POLICY "payments_update_policy" ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE: Usuários podem deletar apenas pagamentos de clientes que gerenciam
CREATE POLICY "payments_delete_policy" ON payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- 4. FINANCIAL_TRANSACTIONS: Apenas administradores (sem coluna de usuário)
-- =====================================================
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas administradores podem ver transações financeiras
CREATE POLICY "financial_transactions_select_policy" ON financial_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- INSERT: Apenas administradores podem criar transações financeiras
CREATE POLICY "financial_transactions_insert_policy" ON financial_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- UPDATE: Apenas administradores podem atualizar transações financeiras
CREATE POLICY "financial_transactions_update_policy" ON financial_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE: Apenas administradores podem deletar transações financeiras
CREATE POLICY "financial_transactions_delete_policy" ON financial_transactions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- 5. SERVERS: Apenas administradores (sem coluna de usuário)
-- =====================================================
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas administradores podem ver servidores
CREATE POLICY "servers_select_policy" ON servers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- INSERT: Apenas administradores podem criar servidores
CREATE POLICY "servers_insert_policy" ON servers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- UPDATE: Apenas administradores podem atualizar servidores
CREATE POLICY "servers_update_policy" ON servers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE: Apenas administradores podem deletar servidores
CREATE POLICY "servers_delete_policy" ON servers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- 6. SETTINGS: Apenas administradores (sem coluna de usuário)
-- =====================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas administradores podem ver configurações
CREATE POLICY "settings_select_policy" ON settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- INSERT: Apenas administradores podem criar configurações
CREATE POLICY "settings_insert_policy" ON settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- UPDATE: Apenas administradores podem atualizar configurações
CREATE POLICY "settings_update_policy" ON settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE: Apenas administradores podem deletar configurações
CREATE POLICY "settings_delete_policy" ON settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
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
Este script implementa RLS nas tabelas críticas com as seguintes características:

1. PROFILES: Isolamento por user_id, admins veem todos
2. CLIENTS: Isolamento por manager_id, admins veem todos
3. PAYMENTS: Isolamento baseado no client_id relacionado
4. FINANCIAL_TRANSACTIONS: Apenas administradores
5. SERVERS: Apenas administradores
6. SETTINGS: Apenas administradores

Todas as políticas incluem verificação de role 'admin' para acesso total.
As políticas foram corrigidas para usar os tipos de dados corretos.
*/