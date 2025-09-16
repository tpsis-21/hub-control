-- ===== TESTE FASE 1: CORREÇÃO TABELA PROFILES =====
BEGIN;

-- Desabilitar RLS temporariamente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que podem conflitar
DROP POLICY IF EXISTS "allow_all_delete" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_insert" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_select" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_access" ON public.profiles;

-- Criar política para inserção de perfil próprio
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Criar política para deleção por admin
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

COMMIT;

-- Verificação final
SELECT 'Fase 1 - Profiles: CONCLUÍDA' as status;