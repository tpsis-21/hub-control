-- Script SQL para alterar a senha do usuário admin topplaytv7@gmail.com
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Verificar se o usuário existe
SELECT 
  id, 
  email, 
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'topplaytv7@gmail.com';

-- 2. Alterar a senha do usuário admin
-- IMPORTANTE: Substitua 'nova_senha_123' pela senha desejada
UPDATE auth.users 
SET 
  encrypted_password = crypt('admin123456', gen_salt('bf')),
  updated_at = now()
WHERE email = 'topplaytv7@gmail.com';

-- 3. Verificar se a alteração foi bem-sucedida
SELECT 
  id,
  email,
  updated_at,
  'Senha alterada com sucesso!' as status
FROM auth.users 
WHERE email = 'topplaytv7@gmail.com';

-- 4. (Opcional) Forçar logout de todas as sessões ativas
-- Isso força o usuário a fazer login novamente com a nova senha
DELETE FROM auth.sessions 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'topplaytv7@gmail.com'
);

-- 5. Verificar se existe perfil na tabela profiles
SELECT 
  id,
  email,
  full_name,
  role,
  is_approved
FROM profiles 
WHERE email = 'topplaytv7@gmail.com';

-- 6. (Se necessário) Criar ou atualizar perfil admin
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  is_approved,
  created_at,
  updated_at
) 
SELECT 
  u.id,
  u.email,
  'Administrador',
  'admin',
  true,
  now(),
  now()
FROM auth.users u
WHERE u.email = 'topplaytv7@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_approved = true,
  updated_at = now();

-- 7. Verificação final
SELECT 
  u.id,
  u.email,
  u.updated_at as senha_alterada_em,
  p.role,
  p.is_approved,
  'Configuração completa!' as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'topplaytv7@gmail.com';