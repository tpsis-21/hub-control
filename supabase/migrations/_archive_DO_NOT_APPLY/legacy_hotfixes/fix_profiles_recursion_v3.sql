-- Correção definitiva da recursão infinita nas políticas RLS da tabela profiles
-- Esta migração remove TODAS as políticas existentes e cria novas políticas simples

-- Remover TODAS as políticas existentes da tabela profiles (incluindo as novas)
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_only" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_only" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_only" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own_only" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Desabilitar RLS temporariamente para limpeza completa
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples sem recursão com nomes únicos
-- Política para SELECT: usuários podem ver apenas seu próprio perfil
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para INSERT: usuários podem criar apenas seu próprio perfil
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: usuários podem deletar apenas seu próprio perfil
CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON POLICY "profiles_select_own" ON profiles IS 'Permite que usuários vejam apenas seu próprio perfil';
COMMENT ON POLICY "profiles_insert_own" ON profiles IS 'Permite que usuários criem apenas seu próprio perfil';
COMMENT ON POLICY "profiles_update_own" ON profiles IS 'Permite que usuários atualizem apenas seu próprio perfil';
COMMENT ON POLICY "profiles_delete_own" ON profiles IS 'Permite que usuários deletem apenas seu próprio perfil';