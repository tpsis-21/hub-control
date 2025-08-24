-- Remove todas as políticas RLS existentes para evitar recursão
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Enable read access for current user only" ON profiles;
DROP POLICY IF EXISTS "Enable read for admins to all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Criar políticas simples SEM referências circulares
-- Política SELECT: usuários podem ver seu próprio perfil OU se forem admin
CREATE POLICY "profiles_select_simple" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    auth.uid() = user_id OR
    auth.jwt() ->> 'email' = 'topplaytv7@gmail.com'
  );

-- Política UPDATE: usuários podem atualizar seu próprio perfil OU se forem admin
CREATE POLICY "profiles_update_simple" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    auth.uid() = user_id OR
    auth.jwt() ->> 'email' = 'topplaytv7@gmail.com'
  )
  WITH CHECK (
    auth.uid() = id OR 
    auth.uid() = user_id OR
    auth.jwt() ->> 'email' = 'topplaytv7@gmail.com'
  );

-- Política INSERT: qualquer usuário autenticado pode criar perfil
CREATE POLICY "profiles_insert_simple" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política DELETE: apenas admin pode deletar
CREATE POLICY "profiles_delete_simple" ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'topplaytv7@gmail.com');

-- Verificar se RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verificar as políticas criadas
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';