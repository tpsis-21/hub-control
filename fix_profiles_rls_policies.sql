-- Script para corrigir políticas RLS da tabela profiles
-- Permite operações CRUD adequadas para usuários autenticados

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

-- Garantir permissões básicas para authenticated
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- Criar políticas RLS simples e funcionais

-- 1. SELECT: Usuários podem ver seu próprio perfil + admins veem todos
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        user_id::uuid = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id::uuid = auth.uid() AND p.role = 'admin'
        )
    );

-- 2. INSERT: Usuários autenticados podem criar seu próprio perfil
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id::uuid = auth.uid()
    );

-- 3. UPDATE: Usuários podem atualizar seu próprio perfil + admins podem atualizar todos
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    TO authenticated
    USING (
        user_id::uuid = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id::uuid = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        user_id::uuid = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id::uuid = auth.uid() AND p.role = 'admin'
        )
    );

-- 4. DELETE: Apenas admins podem deletar perfis
CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id::uuid = auth.uid() AND p.role = 'admin'
        )
    );

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verificar políticas criadas
SELECT 
    'Políticas RLS da tabela profiles:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;