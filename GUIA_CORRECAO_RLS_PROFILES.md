# 🔧 Guia de Correção: Recursão Infinita nas Políticas RLS da Tabela Profiles

## 🚨 Problema Identificado

O erro `infinite recursion detected in policy for relation "profiles"` está ocorrendo porque as políticas RLS atuais fazem referência circular à própria tabela `profiles`.

### Erro nos Logs:
```
Erro ao buscar clientes com vencimento próximo: {
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "profiles"'
}
```

## 🔍 Causa do Problema

As políticas RLS problemáticas contêm consultas como:
```sql
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

O problema está na parte `EXISTS (SELECT 1 FROM profiles WHERE...)` que cria uma recursão infinita.

## 📝 Solução Manual (Painel Supabase)

### Passo 1: Acessar o Painel
1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: `htwiupmnqlmwvzqzroal`

### Passo 2: Navegar para Políticas
1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Policies"**
3. Encontre a tabela **"profiles"**

### Passo 3: Remover Políticas Problemáticas
Remova TODAS as políticas existentes da tabela `profiles` que contenham:
- `EXISTS (SELECT 1 FROM profiles WHERE...)`
- Qualquer referência circular à própria tabela

Políticas a remover:
- ✅ "Users can view own profile"
- ✅ "Users can update own profile"
- ✅ "Admins can view all profiles"
- ✅ Qualquer outra política que faça SELECT na tabela profiles

### Passo 4: Criar Políticas Simples
Crie as seguintes políticas **SEM RECURSÃO**:

#### 1. Política SELECT
```sql
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

#### 2. Política INSERT
```sql
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

#### 3. Política UPDATE
```sql
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### 4. Política DELETE
```sql
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);
```

## 🔧 Solução Alternativa (SQL Editor)

Se preferir usar o SQL Editor do Supabase:

```sql
-- 1. Desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- 3. Criar políticas simples sem recursão
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- 4. Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;
```

## ✅ Verificação

Após aplicar as correções:

1. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Teste a página de perfil:**
   - Acesse: http://localhost:9002/perfil
   - Verifique se não há mais erros de recursão infinita
   - Confirme que os dados do perfil carregam corretamente

3. **Verifique os logs do terminal:**
   - Não deve mais aparecer: `infinite recursion detected in policy`
   - Os erros vazios `{}` devem desaparecer

## 🎯 Resultado Esperado

Após a correção:
- ✅ Usuários podem acessar apenas seus próprios perfis
- ✅ Não há mais recursão infinita
- ✅ A página de perfil carrega sem erros
- ✅ Os logs mostram dados válidos em vez de objetos vazios

## 📞 Suporte

Se ainda houver problemas após seguir este guia:
1. Verifique se todas as políticas antigas foram removidas
2. Confirme que as novas políticas foram criadas corretamente
3. Reinicie o servidor de desenvolvimento
4. Limpe o cache do navegador

---

**Data de criação:** $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
**Status:** Aguardando aplicação manual no painel Supabase