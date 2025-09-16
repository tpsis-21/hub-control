-- Desabilitar completamente RLS na tabela profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas possíveis (mesmo que não existam)
DO $$ 
BEGIN
    -- Lista de todas as possíveis políticas que podem existir
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
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
    DROP POLICY IF EXISTS "Enable delete for users based on email" ON profiles;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erros se a política não existir
        NULL;
END $$;

-- Garantir permissões básicas
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;