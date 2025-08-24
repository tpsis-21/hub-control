-- =====================================================
-- MIGRAÇÃO: Adicionar user_id à tabela servers
-- =====================================================
-- Esta migração adiciona a coluna user_id à tabela servers
-- e atualiza as políticas RLS para permitir que usuários
-- gerenciem apenas seus próprios servidores

-- Adicionar coluna user_id à tabela servers
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_servers_user_id ON servers(user_id);

-- =====================================================
-- ATUALIZAR POLÍTICAS RLS PARA ISOLAMENTO POR USUÁRIO
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "servers_select_policy" ON servers;
DROP POLICY IF EXISTS "servers_insert_policy" ON servers;
DROP POLICY IF EXISTS "servers_update_policy" ON servers;
DROP POLICY IF EXISTS "servers_delete_policy" ON servers;

-- =====================================================
-- NOVAS POLÍTICAS RLS - ISOLAMENTO POR USUÁRIO
-- =====================================================

-- Usuários podem ver apenas seus próprios servidores
CREATE POLICY "servers_select_policy" ON servers
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- Usuários podem criar servidores vinculados ao seu ID
CREATE POLICY "servers_insert_policy" ON servers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- Usuários podem atualizar apenas seus próprios servidores
CREATE POLICY "servers_update_policy" ON servers
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- Usuários podem deletar apenas seus próprios servidores
CREATE POLICY "servers_delete_policy" ON servers
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- =====================================================
-- POLÍTICAS ADMINISTRATIVAS (OPCIONAL)
-- =====================================================
-- Admins podem ver todos os servidores (para administração)
CREATE POLICY "servers_admin_select_policy" ON servers
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (user_id = auth.uid() OR id = auth.uid()) 
      AND role = 'admin'
    )
  );

-- Admins podem atualizar qualquer servidor (para suporte)
CREATE POLICY "servers_admin_update_policy" ON servers
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (user_id = auth.uid() OR id = auth.uid()) 
      AND role = 'admin'
    )
  );

-- =====================================================
-- MIGRAÇÃO DE DADOS EXISTENTES (OPCIONAL)
-- =====================================================
-- ATENÇÃO: Esta seção deve ser executada manualmente
-- se houver servidores existentes no banco de dados

-- Para servidores existentes sem user_id, você pode:
-- 1. Atribuir a um usuário específico:
-- UPDATE servers SET user_id = 'UUID_DO_USUARIO' WHERE user_id IS NULL;

-- 2. Ou deletar servidores órfãos:
-- DELETE FROM servers WHERE user_id IS NULL;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'servers'
ORDER BY policyname;

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'servers' AND schemaname = 'public';

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'servers' AND table_schema = 'public'
ORDER BY ordinal_position;