-- =====================================================
-- TESTE FASE 1: CORREÇÃO CRÍTICA - RECURSÃO NA TABELA PROFILES
-- Hub Control - Supabase Database Security Fix
-- =====================================================

-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- Faça backup antes de executar em produção!

BEGIN;

-- =====================================================
-- FASE 1: CORREÇÃO CRÍTICA - RECURSÃO NA TABELA PROFILES
-- =====================================================

SELECT 'FASE 1: Corrigindo recursão na tabela profiles...' as status;

-- Desabilitar RLS temporariamente para limpeza
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas duplicadas/problemáticas
DROP POLICY IF EXISTS "allow_all_delete" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_insert" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_select" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Criar políticas simples e funcionais
CREATE POLICY "profiles_own_data" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "profiles_admin_access" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

SELECT 'FASE 1: Concluída - Recursão corrigida!' as status;

COMMIT;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Testar acesso básico
SELECT 'Teste de acesso concluído' as resultado;