-- Script para corrigir permissões de UPDATE/INSERT na tabela profiles

-- Desabilitar RLS temporariamente para limpeza
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes
DO $$ 
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON profiles';
    END LOOP;
END $$;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Mais permissiva
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT
    TO authenticated
    USING (true); -- Permitir leitura para todos usuários autenticados

-- Política INSERT: Permitir criação para usuários autenticados
CREATE POLICY "profiles_insert_all" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política UPDATE: Permitir atualização para usuários autenticados
CREATE POLICY "profiles_update_all" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política DELETE: Apenas admin
CREATE POLICY "profiles_delete_admin" ON profiles
    FOR DELETE
    TO authenticated
    USING (
        (auth.jwt() ->> 'email') = 'topplaytv7@gmail.com'
    );

-- Garantir permissões adequadas
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Limpar cache
NOTIFY pgrst, 'reload schema';

-- Verificar políticas criadas
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd;