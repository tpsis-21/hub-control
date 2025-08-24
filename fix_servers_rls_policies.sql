-- =====================================================
-- CORREÇÃO: Políticas RLS para tabela SERVERS
-- =====================================================
-- A tabela servers tem RLS habilitado mas sem políticas definidas,
-- causando bloqueio de todas as operações

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "servers_select_policy" ON servers;
DROP POLICY IF EXISTS "servers_insert_policy" ON servers;
DROP POLICY IF EXISTS "servers_update_policy" ON servers;
DROP POLICY IF EXISTS "servers_delete_policy" ON servers;

-- =====================================================
-- POLÍTICAS PARA TABELA SERVERS
-- =====================================================

-- Usuários autenticados podem ver todos os servidores
CREATE POLICY "servers_select_policy" ON servers
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Usuários autenticados podem criar servidores
CREATE POLICY "servers_insert_policy" ON servers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Apenas admins podem atualizar servidores
CREATE POLICY "servers_update_policy" ON servers
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (user_id = auth.uid() OR id = auth.uid()) 
      AND role = 'admin'
    )
  );

-- Apenas admins podem deletar servidores
CREATE POLICY "servers_delete_policy" ON servers
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (user_id = auth.uid() OR id = auth.uid()) 
      AND role = 'admin'
    )
  );

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'servers';

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'servers' AND schemaname = 'public';