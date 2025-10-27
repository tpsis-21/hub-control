# 🔧 CORREÇÃO DEFINITIVA - Política RLS Servers

## ❌ Problema Identificado
A política `servers_insert_policy` na tabela `servers` estava com valor `null` no campo `qual`, impedindo a inserção de novos servidores.

## ✅ Solução Criada
Foi criada a migração: `supabase/migrations/20250115000008_fix_servers_insert_policy.sql`

## 📋 INSTRUÇÕES PARA APLICAR A CORREÇÃO

### Passo 1: Acessar o Painel do Supabase
1. Acesse: https://supabase.com/dashboard
2. Entre no seu projeto HubControl
3. Vá para **SQL Editor** no menu lateral

### Passo 2: Executar a Migração
1. Clique em **New Query**
2. Cole o seguinte código SQL:

```sql
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
```

3. Clique em **Run** para executar
4. Verifique se a consulta final retorna a política corrigida

### Passo 3: Verificar a Correção
Após executar, você deve ver:
- `policyname`: servers_insert_policy
- `cmd`: INSERT
- `qual`: null (isso é normal para políticas INSERT)
- `with_check`: (auth.uid() IS NOT NULL)

## 🎯 Resultado Esperado
Após aplicar esta correção:
- ✅ Usuários autenticados poderão adicionar novos servidores
- ✅ O erro "permission denied" ao cadastrar servidor será resolvido
- ✅ A funcionalidade de adicionar servidor voltará a funcionar normalmente

## 🔍 Como Testar
1. Faça login na aplicação
2. Tente adicionar um novo servidor
3. Verifique se o servidor é criado sem erros

---
**⚠️ IMPORTANTE**: Execute esta migração no painel do Supabase para resolver definitivamente o problema de adicionar servidores.