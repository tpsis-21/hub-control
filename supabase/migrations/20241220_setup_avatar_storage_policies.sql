-- Configuração de políticas RLS para o bucket 'avatars'
-- Este arquivo configura as permissões necessárias para o sistema de avatars

-- Habilitar RLS na tabela storage.objects (se não estiver habilitado)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver (para evitar conflitos)
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Avatar Upload" ON storage.objects;
DROP POLICY IF EXISTS "Own Avatar Update" ON storage.objects;
DROP POLICY IF EXISTS "Own Avatar Delete" ON storage.objects;

-- 1. Política para permitir leitura pública de avatars
-- Permite que qualquer pessoa visualize os avatars (necessário para exibir imagens)
CREATE POLICY "Public Avatar Access" ON storage.objects
FOR SELECT 
USING (bucket_id = 'avatars');

-- 2. Política para permitir upload de avatars por usuários autenticados
-- Permite que usuários autenticados façam upload de avatars em suas próprias pastas
CREATE POLICY "Authenticated Avatar Upload" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Política para permitir atualização de avatars pelo próprio usuário
-- Permite que usuários atualizem apenas seus próprios avatars
CREATE POLICY "Own Avatar Update" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Política para permitir exclusão de avatars pelo próprio usuário
-- Permite que usuários excluam apenas seus próprios avatars
CREATE POLICY "Own Avatar Delete" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Garantir que o bucket 'avatars' tenha as configurações corretas
-- Atualizar configurações do bucket para garantir acesso público
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

-- Comentários explicativos:
-- - O bucket 'avatars' é configurado como público para permitir visualização das imagens
-- - As políticas RLS garantem que apenas usuários autenticados possam fazer upload
-- - Cada usuário só pode gerenciar avatars em sua própria pasta (baseada no auth.uid())
-- - O limite de 5MB e tipos MIME específicos garantem qualidade e segurança
-- - A estrutura de pastas será: avatars/{user_id}/{filename}