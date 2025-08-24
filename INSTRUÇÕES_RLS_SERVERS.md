# 🔒 CORREÇÃO URGENTE: Políticas RLS para Tabela Servers

## ❌ Problema Identificado
O erro **"new row violates row-level security policy for table 'servers'"** ocorre porque:
- A tabela `servers` tem RLS (Row Level Security) habilitado
- Mas não possui políticas RLS definidas
- Isso bloqueia TODAS as operações (INSERT, SELECT, UPDATE, DELETE)

## ✅ Solução
Execute o SQL abaixo no **Supabase SQL Editor** para corrigir o problema:

### 🔗 Link Direto
**Acesse:** https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql

### 📝 SQL para Executar
```sql
-- =====================================================
-- CORREÇÃO: Políticas RLS para tabela SERVERS
-- =====================================================

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "servers_select_policy" ON servers;
DROP POLICY IF EXISTS "servers_insert_policy" ON servers;
DROP POLICY IF EXISTS "servers_update_policy" ON servers;
DROP POLICY IF EXISTS "servers_delete_policy" ON servers;

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
```

## 🎯 O que essas políticas fazem:

1. **SELECT (Visualizar)**: Qualquer usuário autenticado pode ver servidores
2. **INSERT (Criar)**: Qualquer usuário autenticado pode criar servidores
3. **UPDATE (Editar)**: Apenas administradores podem editar servidores
4. **DELETE (Excluir)**: Apenas administradores podem excluir servidores

## ✅ Verificação
Após executar o SQL, teste:
1. Tente cadastrar um novo servidor
2. O erro RLS deve desaparecer
3. O cadastro deve funcionar normalmente

## 🚨 IMPORTANTE
- Execute TODO o SQL de uma vez
- Não execute comandos separadamente
- Se houver erro, copie a mensagem e reporte

---

**Status:** ⏳ Aguardando execução manual no Supabase
**Prioridade:** 🔴 ALTA - Bloqueia cadastro de servidores
**Tempo estimado:** 2 minutos