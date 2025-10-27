# Configuração Manual do Supabase Storage

## Problema
O arquivo de migração `20250115000007_create_storage_buckets.sql` não pode ser executado diretamente devido a restrições de permissão na tabela `storage.buckets`.

## Solução: Configuração Manual no Painel do Supabase

### Passo 1: Acessar o Painel do Supabase
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta
3. Selecione o projeto **hub-control**

### Passo 2: Navegar para Storage
1. No menu lateral esquerdo, clique em **Storage**
2. Você verá a seção "Buckets"

### Passo 3: Criar os Buckets Necessários

#### Bucket 1: avatars (Público)
1. Clique em **"New bucket"**
2. Preencha os campos:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Marcar como público**
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`
3. Clique em **"Create bucket"**

#### Bucket 2: user-uploads (Privado)
1. Clique em **"New bucket"**
2. Preencha os campos:
   - **Name**: `user-uploads`
   - **Public bucket**: ❌ **Deixar desmarcado (privado)**
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain`
3. Clique em **"Create bucket"**

#### Bucket 3: documents (Privado)
1. Clique em **"New bucket"**
2. Preencha os campos:
   - **Name**: `documents`
   - **Public bucket**: ❌ **Deixar desmarcado (privado)**
   - **File size limit**: `20971520` (20MB)
   - **Allowed MIME types**: `application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`
3. Clique em **"Create bucket"**

### Passo 4: Configurar Políticas RLS (Row Level Security)

#### Para o bucket 'avatars':
1. Vá para **Storage > Policies**
2. Clique em **"New policy"** para o bucket `avatars`
3. Crie as seguintes políticas:

**Política 1: Visualização pública**
- **Policy name**: `Public avatars viewable`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'avatars'`

**Política 2: Upload para usuários autenticados**
- **Policy name**: `Authenticated users upload avatars`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

**Política 3: Atualização própria**
- **Policy name**: `Users update own avatars`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

**Política 4: Exclusão própria**
- **Policy name**: `Users delete own avatars`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

#### Para os buckets 'user-uploads' e 'documents':
Repita o processo acima, mas substitua:
- `bucket_id = 'avatars'` por `bucket_id = 'user-uploads'` ou `bucket_id = 'documents'`
- Remova a política de visualização pública (apenas para usuários autenticados)

### Passo 5: Verificação
Após criar todos os buckets e políticas:
1. Vá para **Storage > Buckets**
2. Confirme que os 3 buckets foram criados:
   - ✅ `avatars` (público)
   - ✅ `user-uploads` (privado)
   - ✅ `documents` (privado)

### Passo 6: Testar a Funcionalidade
1. Acesse a aplicação em [http://localhost:8080](http://localhost:8080)
2. Faça login com um usuário
3. Teste o upload de foto de perfil
4. Teste a adição de um novo servidor

## Resultado Esperado
Após seguir estes passos:
- ✅ Upload de imagens funcionará corretamente
- ✅ Imagens serão exibidas após upload
- ✅ Erro ao adicionar servidor será resolvido
- ✅ Dados serão persistidos por usuário com segurança

## Observações Importantes
- Os buckets privados só permitem acesso aos próprios arquivos do usuário
- O bucket `avatars` é público para permitir visualização das fotos de perfil
- As políticas RLS garantem que cada usuário só acesse seus próprios arquivos
- Os limites de tamanho previnem uploads excessivamente grandes

## Suporte
Se encontrar algum problema durante a configuração, verifique:
1. Se você tem permissões de administrador no projeto Supabase
2. Se todos os campos foram preenchidos corretamente
3. Se as políticas RLS foram aplicadas para todos os buckets

---
**Data de criação**: 15/01/2025  
**Última atualização**: 15/01/2025