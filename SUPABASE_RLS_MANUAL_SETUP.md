# Guia: Configuração Manual das Políticas RLS no Supabase

## 🚨 Problema Identificado

**Erro:** `ERRO: 42501: deve ser proprietário dos objetos da tabela`

**Causa:** As políticas RLS (Row Level Security) para o Storage do Supabase não podem ser criadas via SQL direto por usuários normais. Apenas superusuários ou o painel web do Supabase têm privilégios para modificar as políticas da tabela `storage.objects`.

## 📋 Solução: Configuração Manual via Painel Web

### Passo 1: Acessar o Painel do Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta
3. Selecione seu projeto

### Passo 2: Navegar para Storage

1. No menu lateral esquerdo, clique em **"Storage"**
2. Você verá a lista de buckets, incluindo o bucket **"avatars"**

### Passo 3: Configurar Políticas RLS

1. Clique no bucket **"avatars"**
2. Clique na aba **"Policies"** (Políticas)
3. Você verá a opção para criar novas políticas

### Passo 4: Criar as 4 Políticas Necessárias

#### Política 1: Leitura Pública (SELECT)
```
Nome: avatars_public_read
Operação: SELECT
Target roles: public
USING expression: bucket_id = 'avatars'
```

#### Política 2: Upload Autenticado (INSERT)
```
Nome: avatars_authenticated_insert
Operação: INSERT
Target roles: authenticated
WITH CHECK expression: bucket_id = 'avatars' AND auth.role() = 'authenticated'
```

#### Política 3: Atualização Autenticada (UPDATE)
```
Nome: avatars_authenticated_update
Operação: UPDATE
Target roles: authenticated
USING expression: bucket_id = 'avatars' AND auth.role() = 'authenticated'
WITH CHECK expression: bucket_id = 'avatars' AND auth.role() = 'authenticated'
```

#### Política 4: Exclusão Autenticada (DELETE)
```
Nome: avatars_authenticated_delete
Operação: DELETE
Target roles: authenticated
USING expression: bucket_id = 'avatars' AND auth.role() = 'authenticated'
```

### Passo 5: Instruções Detalhadas para Cada Política

#### Como Criar Cada Política:

1. **Clique em "New Policy"** (Nova Política)
2. **Selecione a operação** (SELECT, INSERT, UPDATE, ou DELETE)
3. **Defina o nome** da política
4. **Configure os roles:**
   - Para leitura pública: selecione "public"
   - Para operações autenticadas: selecione "authenticated"
5. **Adicione as expressões:**
   - **USING:** Condição para quando a política se aplica
   - **WITH CHECK:** Condição para validar os dados (apenas para INSERT/UPDATE)
6. **Clique em "Save"** (Salvar)

### Passo 6: Verificar Configuração

Após criar todas as 4 políticas, você deve ver:

✅ **avatars_public_read** (SELECT - public)
✅ **avatars_authenticated_insert** (INSERT - authenticated)
✅ **avatars_authenticated_update** (UPDATE - authenticated)
✅ **avatars_authenticated_delete** (DELETE - authenticated)

## 🔍 Verificação Pós-Configuração

Após configurar as políticas manualmente, execute o script de verificação:

```bash
node verify-avatar-fix.js
```

**Resultado Esperado:**
- ✅ Leitura pública do bucket funciona
- ❌ Upload anônimo é bloqueado (erro 403)
- ✅ Upload autenticado funciona
- ✅ URLs públicas funcionam

## 🛡️ Segurança Implementada

### O que essas políticas fazem:

1. **Leitura Pública:** Qualquer pessoa pode visualizar avatares
2. **Upload Restrito:** Apenas usuários autenticados podem fazer upload
3. **Modificação Restrita:** Apenas usuários autenticados podem atualizar/deletar
4. **Proteção contra Spam:** Usuários anônimos não podem fazer upload

### Benefícios:

- ✅ Previne uploads anônimos maliciosos
- ✅ Mantém avatares publicamente visíveis
- ✅ Permite que usuários autenticados gerenciem seus avatares
- ✅ Protege contra ataques de negação de serviço

## 🚨 Importante

- **NÃO** tente executar o arquivo `fix-avatar-policies.sql` novamente
- **USE APENAS** o painel web do Supabase para configurar políticas de Storage
- **SEMPRE** teste após a configuração usando o script de verificação

## 📞 Suporte

Se encontrar problemas:

1. Verifique se todas as 4 políticas foram criadas
2. Confirme que os nomes e expressões estão corretos
3. Execute o script de verificação para diagnóstico
4. Consulte a documentação oficial do Supabase Storage

---

**Status:** ✅ Guia completo para configuração manual das políticas RLS
**Próximo passo:** Configurar as políticas no painel web e executar verificação