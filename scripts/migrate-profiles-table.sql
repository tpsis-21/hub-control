-- Migração para adicionar campos de perfil à tabela profiles
-- Execute este script no SQL Editor do Supabase

-- Adicionar novas colunas à tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Atualizar user_id para usuários existentes (caso não esteja preenchido)
UPDATE profiles 
SET user_id = id 
WHERE user_id IS NULL;

-- Criar bucket para armazenamento de imagens de perfil (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Política de segurança para o bucket profiles
-- Permitir que usuários vejam todas as imagens
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'profiles');

-- Permitir que usuários autenticados façam upload de suas próprias imagens
CREATE POLICY "Users can upload their own images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que usuários autenticados atualizem suas próprias imagens
CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que usuários autenticados deletem suas próprias imagens
CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Atualizar políticas RLS da tabela profiles para incluir novos campos
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Recriar políticas com novos campos
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE (user_id = auth.uid() OR id = auth.uid()) 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE (user_id = auth.uid() OR id = auth.uid()) 
    AND role = 'admin'
  )
);

-- Comentários para documentação
COMMENT ON COLUMN profiles.user_id IS 'Referência ao usuário do auth.users';
COMMENT ON COLUMN profiles.full_name IS 'Nome completo do usuário';
COMMENT ON COLUMN profiles.phone IS 'Telefone do usuário';
COMMENT ON COLUMN profiles.company IS 'Empresa do usuário';
COMMENT ON COLUMN profiles.avatar_url IS 'URL da foto de perfil do usuário';
COMMENT ON COLUMN profiles.logo_url IS 'URL da logomarca da empresa do usuário';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON profiles(approved);