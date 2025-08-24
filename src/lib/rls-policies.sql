-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) - HUB CONTROL
-- =====================================================
-- Este arquivo contém todas as políticas de segurança
-- para implementar RLS adequadamente no Supabase

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA TABELA PROFILES
-- =====================================================

-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar qualquer perfil
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA CLIENTS
-- =====================================================

-- Usuários podem ver apenas clientes que criaram
CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (created_by = auth.uid());

-- Usuários podem criar clientes
CREATE POLICY "Users can create clients" ON public.clients
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Usuários podem atualizar apenas clientes que criaram
CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (created_by = auth.uid());

-- Usuários podem deletar apenas clientes que criaram
CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (created_by = auth.uid());

-- Admins podem ver todos os clientes
CREATE POLICY "Admins can view all clients" ON public.clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem gerenciar todos os clientes
CREATE POLICY "Admins can manage all clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA PLANS
-- =====================================================

-- Todos os usuários autenticados podem ver planos
CREATE POLICY "Authenticated users can view plans" ON public.plans
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins podem criar planos
CREATE POLICY "Only admins can create plans" ON public.plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admins podem atualizar planos
CREATE POLICY "Only admins can update plans" ON public.plans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admins podem deletar planos
CREATE POLICY "Only admins can delete plans" ON public.plans
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA PLAN_GROUPS
-- =====================================================

-- Todos os usuários autenticados podem ver grupos de planos
CREATE POLICY "Authenticated users can view plan groups" ON public.plan_groups
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins podem gerenciar grupos de planos
CREATE POLICY "Only admins can manage plan groups" ON public.plan_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA TRANSACTIONS
-- =====================================================

-- Usuários podem ver apenas transações de clientes que criaram
CREATE POLICY "Users can view own client transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE id = transactions.client_id AND created_by = auth.uid()
    )
  );

-- Usuários podem criar transações para clientes que criaram
CREATE POLICY "Users can create transactions for own clients" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE id = client_id AND created_by = auth.uid()
    )
  );

-- Usuários podem atualizar transações de clientes que criaram
CREATE POLICY "Users can update own client transactions" ON public.transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE id = transactions.client_id AND created_by = auth.uid()
    )
  );

-- Admins podem ver todas as transações
CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem gerenciar todas as transações
CREATE POLICY "Admins can manage all transactions" ON public.transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA SETTINGS
-- =====================================================

-- Apenas admins podem ver configurações
CREATE POLICY "Only admins can view settings" ON public.settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admins podem gerenciar configurações
CREATE POLICY "Only admins can manage settings" ON public.settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA MARKETING_CAMPAIGNS
-- =====================================================

-- Usuários podem ver apenas campanhas que criaram
CREATE POLICY "Users can view own campaigns" ON public.marketing_campaigns
  FOR SELECT USING (created_by = auth.uid());

-- Usuários podem criar campanhas
CREATE POLICY "Users can create campaigns" ON public.marketing_campaigns
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Usuários podem atualizar apenas campanhas que criaram
CREATE POLICY "Users can update own campaigns" ON public.marketing_campaigns
  FOR UPDATE USING (created_by = auth.uid());

-- Usuários podem deletar apenas campanhas que criaram
CREATE POLICY "Users can delete own campaigns" ON public.marketing_campaigns
  FOR DELETE USING (created_by = auth.uid());

-- Admins podem ver todas as campanhas
CREATE POLICY "Admins can view all campaigns" ON public.marketing_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem gerenciar todas as campanhas
CREATE POLICY "Admins can manage all campaigns" ON public.marketing_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA MARKETING_LEADS
-- =====================================================

-- Usuários podem ver apenas leads de campanhas que criaram
CREATE POLICY "Users can view own campaign leads" ON public.marketing_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns 
      WHERE id = marketing_leads.campaign_id AND created_by = auth.uid()
    )
  );

-- Usuários podem criar leads para campanhas que criaram
CREATE POLICY "Users can create leads for own campaigns" ON public.marketing_leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns 
      WHERE id = campaign_id AND created_by = auth.uid()
    )
  );

-- Usuários podem atualizar leads de campanhas que criaram
CREATE POLICY "Users can update own campaign leads" ON public.marketing_leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns 
      WHERE id = marketing_leads.campaign_id AND created_by = auth.uid()
    )
  );

-- Admins podem ver todos os leads
CREATE POLICY "Admins can view all leads" ON public.marketing_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem gerenciar todos os leads
CREATE POLICY "Admins can manage all leads" ON public.marketing_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- FUNÇÕES AUXILIARES PARA SEGURANÇA
-- =====================================================

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é dono do cliente
CREATE OR REPLACE FUNCTION public.is_client_owner(client_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.clients 
    WHERE id = client_id AND created_by = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para otimizar consultas RLS
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON public.marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign_id ON public.marketing_leads(campaign_id);

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.profiles IS 'Perfis de usuários com RLS habilitado';
COMMENT ON TABLE public.clients IS 'Clientes com acesso restrito por criador';
COMMENT ON TABLE public.plans IS 'Planos visíveis para todos, editáveis apenas por admins';
COMMENT ON TABLE public.transactions IS 'Transações com acesso baseado na propriedade do cliente';
COMMENT ON TABLE public.settings IS 'Configurações restritas apenas para admins';

-- =====================================================
-- SCRIPT DE APLICAÇÃO
-- =====================================================
-- Para aplicar essas políticas, execute:
-- psql -h <host> -U <user> -d <database> -f rls-policies.sql
-- 
-- Ou use o Supabase SQL Editor para executar este arquivo