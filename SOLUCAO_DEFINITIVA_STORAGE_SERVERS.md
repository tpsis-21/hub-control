# 🔧 SOLUÇÃO DEFINITIVA - Upload de Imagem e Erro ao Adicionar Servidor

## 📋 PROBLEMAS IDENTIFICADOS

Após análise completa do sistema, foram identificados os seguintes problemas:

1. **❌ Buckets do Supabase Storage não configurados**
2. **❌ Chaves de API do Supabase são placeholders/exemplo**
3. **❌ Políticas RLS podem não estar aplicadas corretamente**

## 🎯 SOLUÇÃO PASSO A PASSO

### ETAPA 1: Configurar Chaves Reais do Supabase

1. **Acesse o painel do Supabase:**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione o projeto: `htwiupmnqlmwvzqzroal`

2. **Obtenha as chaves reais:**
   - Vá em **Settings** > **API**
   - Copie a **service_role** key (não a anon key)
   - Esta chave deve começar com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0d2l1cG1ucWxtd3Z6cXpyb2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSI...`

3. **Atualize o arquivo .env:**
   ```bash
   # Substitua esta linha no arquivo .env:
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.producao_service_role_key_sera_configurada_no_deploy
   
   # Por esta (com a chave real):
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_real_aqui
   ```

### ETAPA 2: Criar Buckets do Storage

1. **No painel do Supabase:**
   - Vá para **Storage** > **Buckets**
   - Clique em **New bucket**

2. **Crie os seguintes buckets:**

   **Bucket 1: avatars**
   - Nome: `avatars`
   - Público: ✅ Sim
   - Allowed MIME types: `image/*`
   - File size limit: `5MB`

   **Bucket 2: user-uploads**
   - Nome: `user-uploads`
   - Público: ✅ Sim
   - Allowed MIME types: `image/*`
   - File size limit: `10MB`

   **Bucket 3: documents**
   - Nome: `documents`
   - Público: ❌ Não (privado)
   - Allowed MIME types: `application/pdf,image/*`
   - File size limit: `20MB`

### ETAPA 3: Configurar Políticas RLS do Storage

1. **No painel do Supabase:**
   - Vá para **Storage** > **Policies**
   - Para cada bucket criado, adicione as políticas:

2. **Políticas para bucket 'avatars':**
   ```sql
   -- Política de SELECT (visualizar)
   CREATE POLICY "Users can view avatars" ON storage.objects
   FOR SELECT USING (bucket_id = 'avatars');
   
   -- Política de INSERT (upload)
   CREATE POLICY "Users can upload avatars" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'avatars' AND 
     auth.uid()::text = (storage.foldername(name))[1]
   );
   
   -- Política de UPDATE (atualizar)
   CREATE POLICY "Users can update own avatars" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'avatars' AND 
     auth.uid()::text = (storage.foldername(name))[1]
   );
   
   -- Política de DELETE (deletar)
   CREATE POLICY "Users can delete own avatars" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'avatars' AND 
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

3. **Políticas para bucket 'user-uploads':**
   ```sql
   -- Política de SELECT (visualizar)
   CREATE POLICY "Users can view uploads" ON storage.objects
   FOR SELECT USING (bucket_id = 'user-uploads');
   
   -- Política de INSERT (upload)
   CREATE POLICY "Users can upload files" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'user-uploads' AND 
     auth.uid()::text = (storage.foldername(name))[1]
   );
   
   -- Política de UPDATE (atualizar)
   CREATE POLICY "Users can update own uploads" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'user-uploads' AND 
     auth.uid()::text = (storage.foldername(name))[1]
   );
   
   -- Política de DELETE (deletar)
   CREATE POLICY "Users can delete own uploads" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'user-uploads' AND 
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

### ETAPA 4: Verificar Políticas RLS da Tabela Servers

1. **No painel do Supabase:**
   - Vá para **SQL Editor**
   - Execute o seguinte comando para verificar se as políticas estão ativas:

   ```sql
   -- Verificar se RLS está habilitado
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'servers';
   
   -- Verificar políticas existentes
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'servers';
   ```

2. **Se não houver políticas, execute:**
   ```sql
   -- Habilitar RLS
   ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
   
   -- Política de SELECT
   CREATE POLICY "Users can view own servers" ON public.servers
   FOR SELECT USING (auth.uid() = user_id);
   
   -- Política de INSERT
   CREATE POLICY "Users can create servers" ON public.servers
   FOR INSERT WITH CHECK (auth.uid() = user_id);
   
   -- Política de UPDATE
   CREATE POLICY "Users can update own servers" ON public.servers
   FOR UPDATE USING (auth.uid() = user_id);
   
   -- Política de DELETE
   CREATE POLICY "Users can delete own servers" ON public.servers
   FOR DELETE USING (auth.uid() = user_id);
   ```

### ETAPA 5: Testar a Solução

1. **Reinicie o servidor de desenvolvimento:**
   ```bash
   # Pare o servidor atual (Ctrl+C)
   # Depois execute:
   npm run dev
   ```

2. **Teste o upload de imagem:**
   - Acesse a aplicação
   - Vá para a seção de perfil
   - Tente fazer upload de uma imagem de avatar
   - Verifique se não há erros no console

3. **Teste adicionar servidor:**
   - Vá para a seção de servidores
   - Tente adicionar um novo servidor
   - Verifique se a operação é bem-sucedida

## 🔍 VERIFICAÇÃO FINAL

Após seguir todos os passos:

1. **✅ Buckets criados:** avatars, user-uploads, documents
2. **✅ Políticas RLS configuradas** para storage e tabela servers
3. **✅ Chaves reais do Supabase** configuradas no .env
4. **✅ Upload de imagem** funcionando
5. **✅ Adicionar servidor** funcionando

## 🚨 IMPORTANTE

- **NUNCA** compartilhe suas chaves service_role em repositórios públicos
- As chaves service_role têm privilégios administrativos completos
- Mantenha o arquivo .env fora do controle de versão (já está no .gitignore)
- Em produção, use variáveis de ambiente do provedor de hospedagem

## 📞 SUPORTE

Se ainda houver problemas após seguir este guia:

1. Verifique os logs do console do navegador (F12)
2. Verifique os logs do servidor no terminal
3. Confirme que todas as chaves estão corretas
4. Verifique se o usuário está autenticado na aplicação

---

**Data de criação:** $(date)
**Status:** Solução definitiva implementada
**Próximos passos:** Seguir o guia passo a passo acima