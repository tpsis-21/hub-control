-- =====================================================
-- CORREÇÃO: Recursão Infinita nas Políticas RLS da Tabela Profiles
-- =====================================================
-- Este script corrige o problema de recursão infinita causado por
-- políticas que fazem referência à própria tabela profiles

-- Remover TODAS as políticas RLS existentes da tabela profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;
DROP POLICY IF EXISTS "User access to own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_update_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_simple" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Garantir que RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- NOVAS POLÍTICAS SEM RECURSÃO
-- =====================================================

-- Política para SELECT: usuários podem ver apenas seu próprio perfil
-- Usando user_id (UUID) que referencia auth.users(id)
CREATE POLICY "profiles_select_own_only" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para INSERT: usuários podem criar apenas seu próprio perfil
CREATE POLICY "profiles_insert_own_only" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_own_only" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: usuários podem deletar apenas seu próprio perfil
CREATE POLICY "profiles_delete_own_only" ON profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';