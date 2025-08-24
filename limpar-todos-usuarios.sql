-- =====================================================
-- SCRIPT DE LIMPEZA COMPLETA DE USUÁRIOS
-- =====================================================
-- ⚠️  ATENÇÃO: Este script remove TODOS os usuários e dados relacionados!
-- Execute apenas se tiver certeza de que deseja limpar tudo
-- Data: 2024-12-23
-- Autor: Sistema de Reorganização Auth

-- =====================================================
-- 1. BACKUP DE SEGURANÇA (OPCIONAL)
-- =====================================================

-- Criar backup da estrutura atual (descomente se necessário)
-- CREATE TABLE backup_auth_users AS SELECT * FROM auth.users;
-- CREATE TABLE backup_profiles AS SELECT * FROM profiles;
-- CREATE TABLE backup_user_settings AS SELECT * FROM user_settings;

-- =====================================================
-- 2. VERIFICAR USUÁRIOS EXISTENTES
-- =====================================================

SELECT 
  'USUÁRIOS ANTES DA LIMPEZA' as status,
  COUNT(*) as total_usuarios
FROM auth.users;

SELECT 
  'PERFIS ANTES DA LIMPEZA' as status,
  COUNT(*) as total_perfis
FROM profiles;

-- Listar todos os usuários que serão removidos
SELECT 
  u.email,
  u.created_at,
  p.role,
  'SERÁ REMOVIDO' as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- =====================================================
-- 3. DESABILITAR TRIGGERS TEMPORARIAMENTE
-- =====================================================

-- Desabilitar trigger de criação automática de perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sanitize_profiles_trigger ON profiles;

-- =====================================================
-- 4. REMOVER POLÍTICAS RLS CONFLITANTES
-- =====================================================

-- Desabilitar RLS temporariamente para limpeza
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DO $$ 
DECLARE
    pol_name text;
    table_name text;
BEGIN
    -- Remover políticas de todas as tabelas relacionadas
    FOR table_name IN VALUES ('profiles'), ('user_settings'), ('audit_logs'), ('mfa_tokens'), ('security_alerts')
    LOOP
        FOR pol_name IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_name AND schemaname = 'public'
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON ' || table_name;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 5. LIMPAR STORAGE DE PERFIS
-- =====================================================

-- Remover todas as imagens de perfil do storage
DELETE FROM storage.objects 
WHERE bucket_id = 'profiles';

-- =====================================================
-- 6. LIMPAR TABELAS RELACIONADAS
-- =====================================================

-- Limpar logs de auditoria
DELETE FROM audit_logs;

-- Limpar configurações de usuário
DELETE FROM user_settings;

-- Limpar tokens MFA
DELETE FROM mfa_tokens;

-- Limpar alertas de segurança
DELETE FROM security_alerts;

-- Limpar notificações in-app
DELETE FROM in_app_notifications;

-- Limpar sessões ativas
DELETE FROM auth.sessions;

-- Limpar refresh tokens
DELETE FROM auth.refresh_tokens;

-- =====================================================
-- 7. LIMPAR PERFIS
-- =====================================================

-- Remover todos os perfis
DELETE FROM profiles;

-- =====================================================
-- 8. LIMPAR USUÁRIOS DE AUTENTICAÇÃO
-- =====================================================

-- Remover todos os usuários do sistema de auth
DELETE FROM auth.users;

-- =====================================================
-- 9. RESETAR SEQUÊNCIAS (SE EXISTIREM)
-- =====================================================

-- Resetar sequências de IDs se existirem
-- ALTER SEQUENCE IF EXISTS profiles_id_seq RESTART WITH 1;

-- =====================================================
-- 10. VERIFICAR LIMPEZA
-- =====================================================

SELECT 
  'USUÁRIOS APÓS LIMPEZA' as status,
  COUNT(*) as total_usuarios
FROM auth.users;

SELECT 
  'PERFIS APÓS LIMPEZA' as status,
  COUNT(*) as total_perfis
FROM profiles;

SELECT 
  'CONFIGURAÇÕES APÓS LIMPEZA' as status,
  COUNT(*) as total_configuracoes
FROM user_settings;

SELECT 
  'STORAGE APÓS LIMPEZA' as status,
  COUNT(*) as total_arquivos
FROM storage.objects 
WHERE bucket_id = 'profiles';

-- =====================================================
-- 11. RECRIAR ESTRUTURA BÁSICA
-- =====================================================

-- Garantir que a tabela profiles existe com estrutura correta
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_approved boolean DEFAULT false,
  avatar_url text,
  phone text,
  company text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Garantir que a tabela user_settings existe
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  language text DEFAULT 'pt-BR',
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- =====================================================
-- 12. RECRIAR POLÍTICAS RLS SIMPLES
-- =====================================================

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Políticas simples para profiles
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_delete_admin" ON profiles
    FOR DELETE
    TO authenticated
    USING (role = 'admin');

-- Políticas simples para user_settings
CREATE POLICY "user_settings_all" ON user_settings
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- 13. RECRIAR TRIGGERS ESSENCIAIS
-- =====================================================

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role, is_approved)
  VALUES (NEW.id, NEW.email, 'user', false)
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 14. RELATÓRIO FINAL
-- =====================================================

SELECT '🧹 LIMPEZA COMPLETA REALIZADA COM SUCESSO!' as status;
SELECT '✅ Todos os usuários foram removidos' as acao_1;
SELECT '✅ Todas as tabelas relacionadas foram limpas' as acao_2;
SELECT '✅ Storage de perfis foi limpo' as acao_3;
SELECT '✅ Políticas RLS foram recriadas' as acao_4;
SELECT '✅ Triggers essenciais foram recriados' as acao_5;
SELECT '🚀 Sistema pronto para criar novo usuário admin' as proximo_passo;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Aguarde a conclusão (pode levar alguns minutos)
-- 3. Verifique se não há erros nos logs
-- 4. Execute o próximo script: criar-admin-inicial.sql
-- 5. Teste o login com o novo usuário admin
-- =====================================================

-- ⚠️  IMPORTANTE: 
-- - Este script remove TODOS os dados de usuários
-- - Não há como desfazer esta operação
-- - Execute apenas em ambiente de desenvolvimento
-- - Faça backup se necessário antes de executar