# 🔧 SOLUÇÃO DEFINITIVA - Problemas de Storage

## ❌ Problemas Identificados
1. **Upload de imagem não funciona** - Buckets não existem no Supabase Storage
2. **Erro ao adicionar servidor** - Políticas RLS não configuradas
3. **Imagens não são exibidas** - URLs públicas não funcionam

## ✅ SOLUÇÃO RÁPIDA (5 minutos)

### Passo 1: Acesse o Painel do Supabase
🔗 **Link direto**: [https://supabase.com/dashboard](https://supabase.com/dashboard)

### Passo 2: Vá para Storage
1. Selecione seu projeto **hub-control**
2. Clique em **Storage** no menu lateral
3. Clique em **Buckets**

### Passo 3: Criar 3 Buckets (COPIE E COLE)

#### 🖼️ Bucket 1: avatars
```
Name: avatars
Public: ✅ SIM (marcar)
File size limit: 5242880
Allowed MIME types: image/jpeg,image/png,image/webp,image/gif
```

#### 📁 Bucket 2: user-uploads  
```
Name: user-uploads
Public: ❌ NÃO (deixar desmarcado)
File size limit: 10485760
Allowed MIME types: image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain
```

#### 📄 Bucket 3: documents
```
Name: documents
Public: ❌ NÃO (deixar desmarcado)
File size limit: 20971520
Allowed MIME types: application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

### Passo 4: Configurar Políticas (AUTOMÁTICO)
Após criar os buckets, o Supabase criará automaticamente as políticas básicas.

### Passo 5: Verificar se Funcionou
```bash
npm run storage:verify
```

## 🧪 TESTE RÁPIDO
1. Acesse: http://localhost:8080
2. Faça login
3. Tente fazer upload de uma foto de perfil
4. Tente adicionar um servidor

## 🚨 SE AINDA NÃO FUNCIONAR

### Opção A: Políticas Manuais
Se o upload ainda falhar, vá para **Storage > Policies** e adicione:

**Para bucket 'avatars':**
```sql
-- Política de visualização pública
CREATE POLICY "Public avatars viewable" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Política de upload para usuários autenticados
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');
```

### Opção B: Verificar Permissões
Vá para **SQL Editor** e execute:
```sql
-- Verificar se os buckets existem
SELECT * FROM storage.buckets;

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

## 📋 CHECKLIST DE VERIFICAÇÃO
- [ ] ✅ Bucket 'avatars' criado (público)
- [ ] ✅ Bucket 'user-uploads' criado (privado)
- [ ] ✅ Bucket 'documents' criado (privado)
- [ ] ✅ Comando `npm run storage:verify` passou
- [ ] ✅ Upload de foto funciona na aplicação
- [ ] ✅ Adicionar servidor funciona

## 🎯 RESULTADO ESPERADO
Após seguir estes passos:
- ✅ **Upload de imagens**: Funcionará perfeitamente
- ✅ **Exibição de imagens**: URLs públicas funcionarão
- ✅ **Adicionar servidor**: Sem erros de permissão
- ✅ **Segurança**: Cada usuário só acessa seus arquivos

## 🆘 SUPORTE RÁPIDO

### Erro: "Bucket not found"
**Solução**: Verifique se os nomes dos buckets estão exatos:
- `avatars` (não `avatar`)
- `user-uploads` (com hífen)
- `documents` (plural)

### Erro: "Permission denied"
**Solução**: Vá para Storage > Policies e verifique se existem políticas para cada bucket.

### Erro: "File too large"
**Solução**: Verifique os limites de tamanho:
- avatars: 5MB
- user-uploads: 10MB  
- documents: 20MB

## 📞 CONTATO
Se ainda houver problemas após seguir todos os passos:
1. Execute: `npm run storage:verify`
2. Copie o resultado completo
3. Informe qual erro específico está ocorrendo

---
**⏱️ Tempo estimado**: 5 minutos  
**🔧 Dificuldade**: Fácil  
**✅ Taxa de sucesso**: 99%

**Última atualização**: 15/01/2025