-- =====================================================
-- FASE 1: RLS para Tabelas Críticas - CORRIGIDO
-- =====================================================
-- Este script implementa Row Level Security (RLS) nas tabelas críticas
-- baseado na estrutura real do banco de dados

-- =====================================================
-- 1. TABELA PROFILES
-- =====================================================
-- Estrutura: id (PK), user_id, role, approved, full_name, phone, company, avatar_url

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para visualização: usuários podem ver apenas seu próprio perfil
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: usuários podem criar apenas seu próprio perfil
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política para atualização: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 2. TABELA CLIENTS
-- =====================================================
-- Estrutura: id (PK), name, iptv_username, manager_id, email, whatsapp, etc.

-- Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Política para visualização: usuários podem ver apenas clientes que eles gerenciam
CREATE POLICY "clients_select_policy" ON public.clients
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: usuários podem criar clientes com eles como manager
CREATE POLICY "clients_insert_policy" ON public.clients
  FOR INSERT WITH CHECK (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: usuários podem atualizar apenas clientes que eles gerenciam
CREATE POLICY "clients_update_policy" ON public.clients
  FOR UPDATE USING (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: usuários podem deletar apenas clientes que eles gerenciam
CREATE POLICY "clients_delete_policy" ON public.clients
  FOR DELETE USING (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 3. TABELA PAYMENTS
-- =====================================================
-- Estrutura: id (PK), client_id, date, amount, status, plan_id, etc.

-- Habilitar RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Política para visualização: usuários podem ver pagamentos de clientes que eles gerenciam
CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = payments.client_id 
      AND (clients.manager_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  );

-- Política para inserção: usuários podem criar pagamentos para clientes que eles gerenciam
CREATE POLICY "payments_insert_policy" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = payments.client_id 
      AND (clients.manager_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  );

-- Política para atualização: usuários podem atualizar pagamentos de clientes que eles gerenciam
CREATE POLICY "payments_update_policy" ON public.payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = payments.client_id 
      AND (clients.manager_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  );

-- =====================================================
-- 4. TABELA FINANCIAL_TRANSACTIONS
-- =====================================================
-- Estrutura: id (PK), type, description, amount, category, transaction_date, notes
-- NOTA: Esta tabela não tem coluna de usuário, então apenas admins podem acessar

-- Habilitar RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Política para visualização: apenas administradores
CREATE POLICY "financial_transactions_select_policy" ON public.financial_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "financial_transactions_insert_policy" ON public.financial_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "financial_transactions_update_policy" ON public.financial_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "financial_transactions_delete_policy" ON public.financial_transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. TABELA SERVERS
-- =====================================================
-- Estrutura: id (PK), name, url, api_key, status, integration_type, etc.
-- NOTA: Esta tabela não tem coluna de usuário, então apenas admins podem acessar

-- Habilitar RLS
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Política para visualização: apenas administradores
CREATE POLICY "servers_select_policy" ON public.servers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "servers_insert_policy" ON public.servers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "servers_update_policy" ON public.servers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "servers_delete_policy" ON public.servers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 6. TABELA SETTINGS
-- =====================================================
-- Estrutura: id (PK), bot_api_key, company_name, primary_color
-- NOTA: Esta tabela não tem coluna de usuário, então apenas admins podem acessar

-- Habilitar RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Política para visualização: apenas administradores
CREATE POLICY "settings_select_policy" ON public.settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para inserção: apenas administradores
CREATE POLICY "settings_insert_policy" ON public.settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para atualização: apenas administradores
CREATE POLICY "settings_update_policy" ON public.settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para exclusão: apenas administradores
CREATE POLICY "settings_delete_policy" ON public.settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- VERIFICAÇÃO DE COBERTURA RLS
-- =====================================================

-- Query para verificar se RLS está habilitado nas tabelas críticas
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'clients', 'payments', 'financial_transactions', 'servers', 'settings')
ORDER BY tablename;

-- Query para verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'clients', 'payments', 'financial_transactions', 'servers', 'settings')
ORDER BY tablename, policyname;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================
-- Este script implementa RLS baseado na estrutura real das tabelas:
-- 
-- 1. PROFILES: Isolamento por user_id com suporte a admin
-- 2. CLIENTS: Isolamento por manager_id com suporte a admin
-- 3. PAYMENTS: Isolamento baseado no manager_id do cliente relacionado
-- 4. FINANCIAL_TRANSACTIONS: Apenas administradores (sem coluna de usuário)
-- 5. SERVERS: Apenas administradores (sem coluna de usuário)
-- 6. SETTINGS: Apenas administradores (sem coluna de usuário)
--
-- Todas as políticas incluem verificação de role 'admin' para acesso total
-- =====================================================