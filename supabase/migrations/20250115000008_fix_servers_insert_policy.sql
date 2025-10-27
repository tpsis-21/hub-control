-- Corrigir política RLS para inserção de servidores
-- A política servers_insert_policy estava com valor null, impedindo inserções

-- Remover a política existente com problema
DROP POLICY IF EXISTS "servers_insert_policy" ON "public"."servers";

-- Criar nova política que permite inserção para usuários autenticados
CREATE POLICY "servers_insert_policy" ON "public"."servers"
    FOR INSERT
    WITH CHECK (
        -- Permitir inserção para qualquer usuário autenticado
        auth.uid() IS NOT NULL
    );

-- Verificar se a política foi criada corretamente
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'servers' AND policyname = 'servers_insert_policy';