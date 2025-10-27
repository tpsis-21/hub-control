-- CORREÇÃO DEFINITIVA DAS POLÍTICAS RLS PARA O BUCKET AVATARS
-- Execute estes comandos no painel do Supabase > SQL Editor

-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES (se houver)
DROP POLICY IF EXISTS "Avatar files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar files" ON storage.objects;

-- 2. CRIAR POLÍTICAS CORRETAS

-- Política 1: Leitura pública (SELECT) - Permite que qualquer um veja os avatares
CREATE POLICY "Avatar files are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Política 2: Upload apenas para usuários autenticados (INSERT)
CREATE POLICY "Avatar upload for authenticated users only" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Política 3: Atualização apenas para usuários autenticados (UPDATE)
CREATE POLICY "Avatar update for authenticated users only" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Política 4: Exclusão apenas para usuários autenticados (DELETE)
CREATE POLICY "Avatar delete for authenticated users only" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- 3. VERIFICAR SE AS POLÍTICAS FORAM CRIADAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 4. VERIFICAR PERMISSÕES DO BUCKET
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE name = 'avatars';

/*
RESUMO DAS POLÍTICAS:

✅ SELECT (Leitura): Público - Qualquer pessoa pode ver os avatares
✅ INSERT (Upload): Apenas usuários autenticados
✅ UPDATE (Atualização): Apenas usuários autenticados  
✅ DELETE (Exclusão): Apenas usuários autenticados

Esta configuração garante:
- Avatares são visíveis publicamente (necessário para exibir na interface)
- Apenas usuários logados podem fazer upload/modificar avatares
- Segurança contra uploads anônimos maliciosos
*/