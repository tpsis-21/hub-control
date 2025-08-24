-- Migration: Security Implementation Clean
-- Date: 2024-12-23
-- Description: Implementa correções de segurança sem INSERT problemático

-- =====================================================
-- 1. CRIAÇÃO DE TABELAS ESSENCIAIS (SE NÃO EXISTIREM)
-- =====================================================

-- Criar tabela profiles com estrutura completa
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),
  full_name text,
  phone text,
  company text,
  avatar_url text,
  logo_url text,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language text DEFAULT 'pt-BR' CHECK (language IN ('pt-BR', 'en-US', 'es-ES')),
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  timezone text DEFAULT 'America/Sao_Paulo',
  date_format text DEFAULT 'DD/MM/YYYY',
  currency text DEFAULT 'BRL',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Criar tabela system_config
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela audit_logs (CORRIGIDA)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela mfa_tokens
CREATE TABLE IF NOT EXISTS mfa_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  token_type text DEFAULT 'totp' CHECK (token_type IN ('totp', 'sms', 'email')),
  is_verified boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token_type)
);

-- Criar tabela security_alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text,
  metadata jsonb,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. COLUMN-LEVEL SECURITY ADAPTATIVO
-- =====================================================

-- Revogar todos os acessos primeiro
REVOKE ALL ON profiles FROM anon, authenticated;
REVOKE ALL ON user_settings FROM anon, authenticated;
REVOKE ALL ON system_config FROM anon, authenticated;
REVOKE ALL ON audit_logs FROM anon, authenticated;
REVOKE ALL ON mfa_tokens FROM anon, authenticated;
REVOKE ALL ON security_alerts FROM anon, authenticated;

-- Aplicar permissões adaptativas para profiles
DO $$
DECLARE
    profile_columns text[];
    col text;
BEGIN
    -- Obter lista de colunas da tabela profiles
    SELECT array_agg(column_name) INTO profile_columns
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND table_schema = 'public';
    
    -- Conceder SELECT em colunas que existem
    FOREACH col IN ARRAY profile_columns
    LOOP
        IF col IN ('id', 'role', 'full_name', 'phone', 'company', 'avatar_url', 'logo_url', 'approved', 'created_at', 'updated_at') THEN
            EXECUTE format('GRANT SELECT (%I) ON profiles TO authenticated', col);
        END IF;
    END LOOP;
    
    -- Conceder UPDATE em colunas específicas se existirem
    FOREACH col IN ARRAY profile_columns
    LOOP
        IF col IN ('full_name', 'phone', 'company', 'avatar_url', 'logo_url') THEN
            EXECUTE format('GRANT UPDATE (%I) ON profiles TO authenticated', col);
        END IF;
    END LOOP;
END $$;

-- Permissões para user_settings
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;

-- Permissões para audit_logs (apenas leitura para usuários)
GRANT SELECT ON audit_logs TO authenticated;

-- =====================================================
-- 4. POLÍTICAS RLS
-- =====================================================

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para user_settings
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para system_config
DROP POLICY IF EXISTS "Public configs are readable" ON system_config;
CREATE POLICY "Public configs are readable" ON system_config
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Admins can manage all configs" ON system_config;
CREATE POLICY "Admins can manage all configs" ON system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para audit_logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para mfa_tokens
DROP POLICY IF EXISTS "Users can manage own MFA tokens" ON mfa_tokens;
CREATE POLICY "Users can manage own MFA tokens" ON mfa_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para security_alerts
DROP POLICY IF EXISTS "Admins can manage security alerts" ON security_alerts;
CREATE POLICY "Admins can manage security alerts" ON security_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. STORAGE RLS
-- =====================================================

-- Políticas para Storage
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- 6. FUNÇÕES DE SEGURANÇA
-- =====================================================

-- Função para verificar se MFA é obrigatório
CREATE OR REPLACE FUNCTION is_mfa_required(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar força da senha
CREATE OR REPLACE FUNCTION validate_password_strength(password text)
RETURNS jsonb AS $$
DECLARE
  score integer := 0;
  feedback text[] := ARRAY[]::text[];
BEGIN
  -- Verificar comprimento
  IF length(password) >= 8 THEN
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Senha deve ter pelo menos 8 caracteres');
  END IF;
  
  -- Verificar letras maiúsculas
  IF password ~ '[A-Z]' THEN
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Senha deve conter pelo menos uma letra maiúscula');
  END IF;
  
  -- Verificar letras minúsculas
  IF password ~ '[a-z]' THEN
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Senha deve conter pelo menos uma letra minúscula');
  END IF;
  
  -- Verificar números
  IF password ~ '[0-9]' THEN
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Senha deve conter pelo menos um número');
  END IF;
  
  -- Verificar caracteres especiais
  IF password ~ '[^A-Za-z0-9]' THEN
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Senha deve conter pelo menos um caractere especial');
  END IF;
  
  RETURN jsonb_build_object(
    'score', score,
    'max_score', 5,
    'is_strong', score >= 4,
    'feedback', feedback
  );
END;
$$ LANGUAGE plpgsql;

-- Função para sanitizar HTML
CREATE OR REPLACE FUNCTION sanitize_html(input_text text)
RETURNS text AS $$
BEGIN
  -- Remove tags HTML perigosos
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi'),
      '<iframe[^>]*>.*?</iframe>', '', 'gi'
    ),
    '<[^>]*>', '', 'g'
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS DE SEGURANÇA
-- =====================================================

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger para sanitização automática
CREATE OR REPLACE FUNCTION sanitize_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Sanitizar apenas campos que existem na tabela profiles
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := sanitize_html(NEW.full_name);
  END IF;
  
  -- Campo 'company' removido pois não existe na tabela profiles
  -- Se precisar adicionar, primeiro execute: ALTER TABLE profiles ADD COLUMN company text;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_profiles_trigger ON profiles;
CREATE TRIGGER sanitize_profiles_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sanitize_profile_data();

-- =====================================================
-- 8. SISTEMA DE ALERTAS DE SEGURANÇA
-- =====================================================

-- Função para criar alerta de segurança
CREATE OR REPLACE FUNCTION create_security_alert(
  alert_type text,
  severity text,
  title text,
  description text DEFAULT NULL,
  metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  alert_id uuid;
BEGIN
  INSERT INTO security_alerts (alert_type, severity, title, description, metadata)
  VALUES (alert_type, severity, title, description, metadata)
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. VIEWS DE MONITORAMENTO
-- =====================================================

-- View do dashboard de segurança
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  'users_total' as metric,
  COUNT(*)::text as value,
  'Total de usuários registrados' as description
FROM auth.users
UNION ALL
SELECT 
  'admins_total' as metric,
  COUNT(*)::text as value,
  'Total de administradores' as description
FROM profiles WHERE role = 'admin'
UNION ALL
SELECT 
  'mfa_enabled' as metric,
  COUNT(*)::text as value,
  'Usuários com MFA habilitado' as description
FROM mfa_tokens WHERE is_verified = true
UNION ALL
SELECT 
  'security_alerts_open' as metric,
  COUNT(*)::text as value,
  'Alertas de segurança em aberto' as description
FROM security_alerts WHERE is_resolved = false;

-- =====================================================
-- 10. CONFIGURAÇÕES INICIAIS
-- =====================================================

-- Inserir configurações de segurança padrão
INSERT INTO system_config (key, value, description, category, is_public) VALUES
('security.password_min_length', '8', 'Comprimento mínimo da senha', 'security', false),
('security.mfa_required_for_admins', 'true', 'MFA obrigatório para administradores', 'security', false),
('security.session_timeout', '3600', 'Timeout da sessão em segundos', 'security', false),
('security.max_login_attempts', '5', 'Máximo de tentativas de login', 'security', false),
('app.name', '"Hub Control"', 'Nome da aplicação', 'general', true),
('app.version', '"1.0.0"', 'Versão da aplicação', 'general', true)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- =====================================================
-- 11. FUNÇÃO DE VERIFICAÇÃO DE SAÚDE
-- =====================================================

CREATE OR REPLACE FUNCTION security_health_check()
RETURNS jsonb AS $$
DECLARE
  rls_tables integer;
  total_tables integer;
  admins_with_mfa integer;
  total_admins integer;
  rls_coverage numeric;
  mfa_coverage numeric;
BEGIN
  -- Contar tabelas com RLS habilitado
  SELECT COUNT(*) INTO rls_tables
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public' 
  AND c.relrowsecurity = true;
  
  -- Contar total de tabelas
  SELECT COUNT(*) INTO total_tables
  FROM pg_tables 
  WHERE schemaname = 'public';
  
  -- Calcular cobertura RLS
  rls_coverage := CASE 
    WHEN total_tables > 0 THEN (rls_tables::numeric / total_tables::numeric) * 100
    ELSE 0
  END;
  
  -- Contar admins com MFA
  SELECT COUNT(DISTINCT p.id) INTO admins_with_mfa
  FROM profiles p
  JOIN mfa_tokens m ON p.id = m.user_id
  WHERE p.role = 'admin' AND m.is_verified = true;
  
  -- Contar total de admins
  SELECT COUNT(*) INTO total_admins
  FROM profiles 
  WHERE role = 'admin';
  
  -- Calcular cobertura MFA
  mfa_coverage := CASE 
    WHEN total_admins > 0 THEN (admins_with_mfa::numeric / total_admins::numeric) * 100
    ELSE 0
  END;
  
  RETURN jsonb_build_object(
    'rls_coverage', rls_coverage,
    'mfa_admin_coverage', mfa_coverage,
    'tables_with_rls', rls_tables,
    'total_tables', total_tables,
    'admins_with_mfa', admins_with_mfa,
    'total_admins', total_admins,
    'timestamp', extract(epoch from now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. COMENTÁRIOS FINAIS
-- =====================================================

-- Comentários para as funções
COMMENT ON FUNCTION security_health_check() IS 'Função para verificar o status geral de segurança do sistema';
COMMENT ON FUNCTION validate_password_strength(text) IS 'Função para validar a força de senhas';
COMMENT ON FUNCTION sanitize_html(text) IS 'Função para sanitizar entrada HTML e prevenir XSS';
COMMENT ON FUNCTION is_mfa_required(uuid) IS 'Função para verificar se MFA é obrigatório para o usuário';

-- Sucesso!
SELECT 'Implementação completa de segurança concluída com sucesso! 🔒✨' as status,
       'Execute SELECT security_health_check(); para verificar o status' as next_step;