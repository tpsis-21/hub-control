-- =====================================================
-- CORREÇÃO: Políticas RLS para tabela SERVERS
-- =====================================================
-- Este arquivo corrige o erro "new row violates row-level security policy for table 'servers'"
-- aplicando as políticas RLS necessárias para permitir operações na tabela servers

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "servers_select_policy" ON servers;
DROP POLICY IF EXISTS "servers_insert_policy" ON servers;
DROP POLICY IF EXISTS "servers_update_policy" ON servers;
DROP POLICY IF EXISTS "servers_delete_policy" ON servers;

-- Política para SELECT: Usuários autenticados podem ver apenas seus próprios servidores
CREATE POLICY "servers_select_policy" ON servers
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Política para INSERT: Usuários autenticados podem criar servidores
CREATE POLICY "servers_insert_policy" ON servers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Política para UPDATE: Usuários podem atualizar apenas seus próprios servidores
CREATE POLICY "servers_update_policy" ON servers
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Política para DELETE: Usuários podem deletar apenas seus próprios servidores
CREATE POLICY "servers_delete_policy" ON servers
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Garantir que RLS está habilitado na tabela servers
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

-- Comentários explicativos
COMMENT ON POLICY "servers_select_policy" ON servers IS 'Permite que usuários vejam apenas seus próprios servidores';
COMMENT ON POLICY "servers_insert_policy" ON servers IS 'Permite que usuários autenticados criem servidores vinculados ao seu user_id';
COMMENT ON POLICY "servers_update_policy" ON servers IS 'Permite que usuários atualizem apenas seus próprios servidores';
COMMENT ON POLICY "servers_delete_policy" ON servers IS 'Permite que usuários deletem apenas seus próprios servidores';