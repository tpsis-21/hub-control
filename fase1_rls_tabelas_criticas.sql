-- =====================================================
-- FASE 1: RLS EM TABELAS CRÍTICAS
-- =====================================================
-- Este script implementa Row Level Security (RLS) nas tabelas críticas
-- para garantir isolamento de dados por usuário

-- =====================================================
-- 1. HABILITAR RLS NAS TABELAS CRÍTICAS
-- =====================================================

-- Tabela profiles (perfis de usuário)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela financial_transactions (transações financeiras)
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Tabela payments (pagamentos)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Tabela settings (configurações)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Tabela clients (clientes - dados sensíveis)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Tabela servers (servidores - dados sensíveis)
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CRIAR POLÍTICAS DE ACESSO
-- =====================================================

-- Política para tabela profiles
-- Usuários só podem ver e modificar seus próprios perfis
CREATE POLICY "profiles_policy" ON public.profiles
  FOR ALL USING (user_id = auth.uid());

-- Política para tabela financial_transactions
-- Transações financeiras são globais (sem user_id na estrutura atual)
-- Apenas admins podem acessar
CREATE POLICY "financial_transactions_policy" ON public.financial_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para tabela payments
-- Usuários podem ver pagamentos dos seus clientes
CREATE POLICY "payments_policy" ON public.payments
  FOR ALL USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para tabela settings
-- Settings são globais, apenas admins podem acessar
CREATE POLICY "settings_policy" ON public.settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para tabela clients
-- Usuários só podem ver clientes que gerenciam
CREATE POLICY "clients_policy" ON public.clients
  FOR ALL USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para tabela servers
-- Servers precisam de user_id (migração pendente)
-- Por enquanto, apenas admins podem acessar
CREATE POLICY "servers_policy" ON public.servers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- VERIFICAÇÃO DE IMPLEMENTAÇÃO
-- =====================================================
-- =====================================================
-- VERIFICAÇÃO DE IMPLEMENTAÇÃO
-- =====================================================
-- Execute esta query para verificar se RLS foi habilitado:
/*
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'financial_transactions', 'payments', 'settings', 'clients', 'servers')
ORDER BY tablename;
*/

-- Execute esta query para verificar as políticas criadas:
/*
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'financial_transactions', 'payments', 'settings', 'clients', 'servers')
ORDER BY tablename, policyname;
*/