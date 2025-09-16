-- 🔧 CORREÇÃO IMEDIATA: Recursão Infinita nas Políticas RLS da Tabela Profiles
-- Execute este script no SQL Editor do painel Supabase
-- URL: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql/new

-- ========================================
-- PASSO 1: DESABILITAR RLS TEMPORARIAMENTE
-- ========================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- PASSO 2: REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS
-- ========================================

-- Remover políticas que causam recursão infinita
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Remover outras políticas possíveis
DROP POLICY IF EXISTS "allow_all_delete" ON profiles;
DROP POLICY IF EXISTS "allow_all_insert" ON profiles;
DROP POLICY IF EXISTS "allow_all_select" ON profiles;
DROP POLICY IF EXISTS "allow_all_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- ========================================
-- PASSO 3: CRIAR POLÍTICAS SIMPLES SEM RECURSÃO
-- ========================================

-- Política SELECT: Usuários podem ver apenas seu próprio perfil
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política INSERT: Usuários podem criar apenas seu próprio perfil
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política UPDATE: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política DELETE: Usuários podem deletar apenas seu próprio perfil
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- ========================================
-- PASSO 4: REABILITAR RLS
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PASSO 5: VERIFICAR POLÍTICAS CRIADAS
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- ========================================
-- RESULTADO ESPERADO:
-- ========================================
-- Você deve ver 4 políticas:
-- 1. profiles_delete_own (DELETE)
-- 2. profiles_insert_own (INSERT)
-- 3. profiles_select_own (SELECT)
-- 4. profiles_update_own (UPDATE)
--
-- Todas usando apenas: auth.uid() = id
-- SEM referências à própria tabela profiles
-- ========================================

-- 🎯 APÓS EXECUTAR ESTE SCRIPT:
-- 1. Reinicie seu servidor: npm run dev
-- 2. Teste a página: http://localhost:9002/perfil
-- 3. Verifique se não há mais erros de recursão infinita
-- 4. Confirme que os dados do perfil carregam corretamente