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

-- Desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples sem recursão
-- Política para SELECT: usuários podem ver apenas seu próprio perfil
CREATE POLICY "profiles_select_simple" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para INSERT: usuários podem criar apenas seu próprio perfil
CREATE POLICY "profiles_insert_simple" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_simple" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: usuários podem deletar apenas seu próprio perfil
CREATE POLICY "profiles_delete_simple" ON profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- Garantir permissões para roles
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;