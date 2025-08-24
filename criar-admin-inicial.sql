-- =====================================================
-- SCRIPT PARA CRIAR USUÁRIO ADMIN INICIAL
-- =====================================================
-- Este script cria um novo usuário administrador após a limpeza
-- Data: 2024-12-23
-- Autor: Sistema de Reorganização Auth

-- =====================================================
-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================

SELECT 
  'VERIFICAÇÃO INICIAL' as status,
  COUNT(*) as total_usuarios_existentes
FROM auth.users;

-- Se houver usuários, mostrar aviso
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM auth.users) > 0 THEN
    RAISE NOTICE '⚠️  ATENÇÃO: Já existem usuários no sistema!';
    RAISE NOTICE 'Execute primeiro o script: limpar-todos-usuarios.sql';
  ELSE
    RAISE NOTICE '✅ Sistema limpo, pronto para criar admin';
  END IF;
END $$;

-- =====================================================
-- 2. CONFIGURAÇÕES DO ADMIN
-- =====================================================

-- Definir dados do admin (altere conforme necessário)
\set admin_email 'topplaytv7@gmail.com'
\set admin_password 'Admin123!@#'
\set admin_name 'Administrador Sistema'
\set admin_company 'TopPlay TV'

-- =====================================================
-- 3. CRIAR USUÁRIO ADMIN NO AUTH
-- =====================================================

-- Inserir usuário diretamente na tabela auth.users
-- Nota: Em produção, use o painel do Supabase ou API
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'topplaytv7@gmail.com',
  crypt('Admin123!@#', gen_salt('bf')), -- Hash da senha
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = now();

-- =====================================================
-- 4. OBTER ID DO USUÁRIO CRIADO
-- =====================================================

-- Verificar se o usuário foi criado
SELECT 
  id,
  email,
  created_at,
  'USUÁRIO CRIADO' as status
FROM auth.users 
WHERE email = 'topplaytv7@gmail.com';

-- =====================================================
-- 5. CRIAR PERFIL DO ADMIN
-- =====================================================

-- Inserir perfil do admin
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  is_approved,
  company,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  'Administrador Sistema',
  'admin',
  true,
  'TopPlay TV',
  now(),
  now()
FROM auth.users u
WHERE u.email = 'topplaytv7@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_approved = true,
  full_name = EXCLUDED.full_name,
  company = EXCLUDED.company,
  updated_at = now();

-- =====================================================
-- 6. CRIAR CONFIGURAÇÕES DO USUÁRIO
-- =====================================================

-- Inserir configurações padrão
INSERT INTO user_settings (
  user_id,
  theme,
  language,
  notifications_enabled,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'light',
  'pt-BR',
  true,
  now(),
  now()
FROM auth.users u
WHERE u.email = 'topplaytv7@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  updated_at = now();

-- =====================================================
-- 7. VERIFICAR CRIAÇÃO
-- =====================================================

-- Verificar usuário criado
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.role,
  p.is_approved,
  p.full_name,
  p.company,
  'ADMIN CRIADO COM SUCESSO' as status
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'topplaytv7@gmail.com';

-- Verificar configurações
SELECT 
  us.theme,
  us.language,
  us.notifications_enabled,
  'CONFIGURAÇÕES CRIADAS' as status
FROM user_settings us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'topplaytv7@gmail.com';

-- =====================================================
-- 8. TESTAR POLÍTICAS RLS
-- =====================================================

-- Verificar se as políticas estão funcionando
SELECT 
  'TESTE RLS' as teste,
  COUNT(*) as perfis_visiveis
FROM profiles;

-- =====================================================
-- 9. CRIAR LOG DE AUDITORIA
-- =====================================================

-- Registrar criação do admin (se tabela audit_logs existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      created_at
    )
    SELECT 
      u.id,
      'CREATE_ADMIN',
      'profiles',
      u.id::text,
      '{}',
      json_build_object(
        'email', u.email,
        'role', 'admin',
        'created_by', 'SYSTEM_SETUP'
      ),
      now()
    FROM auth.users u
    WHERE u.email = 'topplaytv7@gmail.com';
  END IF;
END $$;

-- =====================================================
-- 10. RELATÓRIO FINAL
-- =====================================================

SELECT '🎉 USUÁRIO ADMIN CRIADO COM SUCESSO!' as status;
SELECT '📧 Email: topplaytv7@gmail.com' as credencial_1;
SELECT '🔑 Senha: Admin123!@#' as credencial_2;
SELECT '👑 Role: admin' as credencial_3;
SELECT '✅ Aprovado: true' as credencial_4;
SELECT '🚀 Sistema pronto para uso!' as proximo_passo;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Execute este script APÓS limpar-todos-usuarios.sql
-- 2. Aguarde a conclusão
-- 3. Teste o login na aplicação:
--    - Email: topplaytv7@gmail.com
--    - Senha: Admin123!@#
-- 4. Acesse o painel admin para verificar permissões
-- 5. Altere a senha após o primeiro login
-- =====================================================

-- ⚠️  IMPORTANTE: 
-- - Altere a senha padrão após o primeiro login
-- - Este usuário tem privilégios de administrador
-- - Mantenha as credenciais seguras
-- - Em produção, use senhas mais complexas
-- =====================================================

-- =====================================================
-- PRÓXIMOS PASSOS RECOMENDADOS:
-- =====================================================
-- 1. Testar login na aplicação
-- 2. Verificar acesso ao painel admin
-- 3. Criar outros usuários pelo painel
-- 4. Configurar políticas de senha
-- 5. Implementar 2FA (se necessário)
-- =====================================================