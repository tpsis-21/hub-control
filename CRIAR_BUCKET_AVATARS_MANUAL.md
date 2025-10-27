# 🪣 Guia: Criar Bucket 'avatars' no Supabase

## ❌ PROBLEMA IDENTIFICADO
O bucket 'avatars' não existe no seu projeto Supabase. Este bucket é essencial para o sistema de upload de avatares.

## 🎯 SOLUÇÃO: Criar Bucket Manualmente

### Passo 1: Acessar o Painel do Supabase
1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione seu projeto

### Passo 2: Navegar para Storage
1. No menu lateral, clique em **"Storage"**
2. Clique em **"Buckets"**

### Passo 3: Criar o Bucket 'avatars'
1. Clique no botão **"New bucket"**
2. Preencha os campos:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **MARQUE ESTA OPÇÃO** (muito importante!)
   - **File size limit**: `5242880` (5MB em bytes)
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`
3. Clique em **"Create bucket"**

### Passo 4: Configurar Políticas RLS
Após criar o bucket, você precisa configurar as políticas RLS:

1. Clique no bucket **"avatars"** que você acabou de criar
2. Vá para a aba **"Policies"**
3. Clique em **"New policy"**

#### Política 1: Leitura Pública (SELECT)
- **Policy name**: `avatars_public_read`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'avatars'`
- Clique em **"Review"** e depois **"Save policy"**

#### Política 2: Upload Autenticado (INSERT)
- **Policy name**: `avatars_authenticated_upload`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**: `bucket_id = 'avatars' AND auth.role() = 'authenticated'`
- Clique em **"Review"** e depois **"Save policy"**

#### Política 3: Atualização Autenticada (UPDATE)
- **Policy name**: `avatars_authenticated_update`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'avatars' AND auth.role() = 'authenticated'`
- **WITH CHECK expression**: `bucket_id = 'avatars' AND auth.role() = 'authenticated'`
- Clique em **"Review"** e depois **"Save policy"**

#### Política 4: Exclusão Autenticada (DELETE)
- **Policy name**: `avatars_authenticated_delete`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'avatars' AND auth.role() = 'authenticated'`
- Clique em **"Review"** e depois **"Save policy"**

## ✅ VERIFICAÇÃO
Após criar o bucket e configurar as políticas, execute:
```bash
node verify-avatar-policies-manual.js
```

## 🎯 RESULTADO ESPERADO
Todos os 5 testes devem passar:
- ✅ Bucket "avatars" existe
- ✅ Leitura pública funciona
- ✅ Upload anônimo bloqueado
- ✅ Upload autenticado funciona
- ✅ URL pública funciona

## 🚨 IMPORTANTE
- O bucket DEVE ser marcado como **público**
- As políticas RLS são essenciais para segurança
- Sem essas configurações, o sistema de avatar não funcionará

## 📞 SUPORTE
Se encontrar dificuldades:
1. Verifique se você tem permissões de administrador no projeto
2. Certifique-se de que está no projeto correto
3. Execute o script de verificação após cada etapa

---
**📝 Nota**: Este processo deve ser feito apenas uma vez por projeto.