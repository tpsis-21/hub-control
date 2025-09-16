-- =====================================================
-- TESTE FASE 3: Correção de Incompatibilidade de Tipos
-- =====================================================
-- Este script testa apenas a Fase 3 com as correções de tipos

-- Desabilitar RLS temporariamente para evitar conflitos
ALTER TABLE public.financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que podem causar conflito
DROP POLICY IF EXISTS "financial_transactions_admin_only" ON public.financial_transactions;
DROP POLICY IF EXISTS "payments_user_access" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_access" ON public.payments;

-- =====================================================
-- FASE 3: POLÍTICAS CORRIGIDAS
-- =====================================================

-- Política para transações financeiras: apenas administradores
-- CORREÇÃO: profiles.id é UUID, não precisa de conversão
CREATE POLICY "financial_transactions_admin_only" ON public.financial_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para pagamentos: usuários podem ver pagamentos de seus clientes
-- CORREÇÃO: profiles.id é UUID, clients.manager_id é TEXT
CREATE POLICY "payments_user_access" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = payments.client_id AND c.manager_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para administradores em pagamentos
-- CORREÇÃO: profiles.id é UUID, não precisa de conversão
CREATE POLICY "payments_admin_access" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Reabilitar RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar se as políticas foram criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('financial_transactions', 'payments')
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('financial_transactions', 'payments')
AND schemaname = 'public';

SELECT 'FASE 3 CORRIGIDA: Políticas criadas com tipos corretos' as resultado;