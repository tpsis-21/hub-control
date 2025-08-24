# 🔒 Instruções para Aplicar Políticas RLS na Tabela Servers

## ⚠️ AÇÃO MANUAL NECESSÁRIA

Esta migração precisa ser aplicada **manualmente** no Supabase SQL Editor para implementar o isolamento de dados por usuário na tabela `servers`.

## 📋 Passos para Aplicação

### 1. Acesse o Supabase Dashboard
- Faça login no [Supabase Dashboard](https://supabase.com/dashboard)
- Selecione seu projeto
- Vá para **SQL Editor**

### 2. Execute a Migração

Copie e cole o conteúdo do arquivo `supabase/migrations/20241225000001_add_user_id_to_servers.sql` no SQL Editor e execute.

**Ou execute diretamente este SQL:**

```sql
-- =====================================================
-- MIGRAÇÃO: Adicionar user_id à tabela servers
-- =====================================================

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
```

### 3. Migração de Dados Existentes (Se Necessário)

⚠️ **IMPORTANTE**: Se você já possui servidores cadastrados no banco de dados, você precisa atribuir um `user_id` a eles.

**Opção 1 - Atribuir a um usuário específico:**
```sql
-- Substitua 'UUID_DO_USUARIO' pelo ID real do usuário
UPDATE servers SET user_id = 'UUID_DO_USUARIO' WHERE user_id IS NULL;
```

**Opção 2 - Deletar servidores órfãos:**
```sql
-- ⚠️ CUIDADO: Isso irá deletar todos os servidores sem user_id
DELETE FROM servers WHERE user_id IS NULL;
```

### 4. Verificação

Após executar a migração, execute estas consultas para verificar:

```sql
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
```

## ✅ Resultado Esperado

Após aplicar esta migração:

1. **Isolamento de Dados**: Cada usuário verá apenas seus próprios servidores
2. **Segurança**: Usuários não podem acessar ou modificar servidores de outros usuários
3. **Escalabilidade**: A aplicação suporta múltiplos usuários independentes
4. **Administração**: Admins ainda podem ver e gerenciar todos os servidores

## 🔧 Alterações no Código

As seguintes alterações já foram feitas no código da aplicação:

- ✅ **Actions atualizadas**: `getServers()`, `addServerAction()`, `editServerAction()`, `deleteServerAction()`
- ✅ **Autenticação**: Todas as operações agora verificam o usuário autenticado
- ✅ **Vinculação automática**: Novos servidores são automaticamente vinculados ao usuário logado
- ✅ **Validação de propriedade**: Usuários só podem editar/deletar seus próprios servidores

## 🚨 Importante

- Esta migração **deve ser aplicada manualmente** no Supabase SQL Editor
- Teste em ambiente de desenvolvimento primeiro
- Faça backup dos dados antes de aplicar em produção
- Certifique-se de que todos os usuários tenham perfis criados na tabela `profiles`

---

**Data de criação**: 25/12/2024  
**Versão da migração**: 20241225000001  
**Status**: ⏳ Pendente aplicação manual