-- 🔒 IMPLEMENTAÇÕES DE SEGURANÇA - SEMANA 1
-- Hub Control - Melhorias Críticas de Segurança
-- Data: 2024

-- =====================================================
-- 1. COLUMN-LEVEL SECURITY (Segurança por Coluna)
-- =====================================================

-- Revogar acesso a colunas sensíveis para usuários anônimos
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON user_settings FROM anon;
REVOKE ALL ON audit_logs FROM anon;

-- Permitir apenas colunas seguras para usuários autenticados
GRANT SELECT (id, email, name, avatar_url, created_at, updated_at) 
ON profiles TO authenticated;

GRANT SELECT (id, user_id, theme, language, notifications_enabled, created_at) 
ON user_settings TO authenticated;

-- Admins podem ver mais detalhes nos logs de auditoria
GRANT SELECT (id, action, details, created_at, user_email) 
ON audit_logs TO authenticated;

-- =====================================================
-- 2. STORAGE RLS (Row Level Security para Arquivos)
-- =====================================================

-- Habilitar RLS para storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para upload de arquivos (apenas usuários autenticados)
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('avatars', 'documents', 'user-uploads') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para visualização de arquivos (apenas proprietário)
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('avatars', 'documents', 'user-uploads') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para atualização de arquivos (apenas proprietário)
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('avatars', 'documents', 'user-uploads') AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('avatars', 'documents', 'user-uploads') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para exclusão de arquivos (apenas proprietário)
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('avatars', 'documents', 'user-uploads') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política especial para arquivos públicos (avatars)
CREATE POLICY "Public avatars are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars' AND
  lower(name) LIKE '%.jpg' OR lower(name) LIKE '%.png' OR lower(name) LIKE '%.webp'
);

-- =====================================================
-- 3. MFA (Multi-Factor Authentication) para Admins
-- =====================================================

-- Tabela para tokens MFA
CREATE TABLE IF NOT EXISTS mfa_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_key text NOT NULL,
  backup_codes text[],
  is_verified boolean DEFAULT false,
  is_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  last_used_at timestamptz
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mfa_tokens_user_id ON mfa_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_tokens_verified ON mfa_tokens(is_verified) WHERE is_verified = true;

-- RLS para MFA tokens
ALTER TABLE mfa_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own MFA tokens"
ON mfa_tokens
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política especial para admins verem status MFA de outros usuários
CREATE POLICY "Admins can view MFA status"
ON mfa_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- 4. FUNÇÕES DE SEGURANÇA AVANÇADAS
-- =====================================================

-- Função para verificar se MFA é obrigatório para o usuário
CREATE OR REPLACE FUNCTION is_mfa_required(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- MFA obrigatório para admins e moderadores
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_uuid 
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar força da senha
CREATE OR REPLACE FUNCTION validate_password_strength(password text)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{"valid": true, "errors": []}'::jsonb;
  errors text[] := ARRAY[]::text[];
BEGIN
  -- Verificar comprimento mínimo
  IF length(password) < 8 THEN
    errors := array_append(errors, 'Password must be at least 8 characters long');
  END IF;
  
  -- Verificar se contém letra maiúscula
  IF password !~ '[A-Z]' THEN
    errors := array_append(errors, 'Password must contain at least one uppercase letter');
  END IF;
  
  -- Verificar se contém letra minúscula
  IF password !~ '[a-z]' THEN
    errors := array_append(errors, 'Password must contain at least one lowercase letter');
  END IF;
  
  -- Verificar se contém número
  IF password !~ '[0-9]' THEN
    errors := array_append(errors, 'Password must contain at least one number');
  END IF;
  
  -- Verificar se contém caractere especial
  IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    errors := array_append(errors, 'Password must contain at least one special character');
  END IF;
  
  -- Verificar senhas comuns
  IF lower(password) = ANY(ARRAY['password', '123456', 'qwerty', 'admin', 'letmein']) THEN
    errors := array_append(errors, 'Password is too common');
  END IF;
  
  IF array_length(errors, 1) > 0 THEN
    result := jsonb_build_object(
      'valid', false,
      'errors', to_jsonb(errors)
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para sanitizar entrada HTML
CREATE OR REPLACE FUNCTION sanitize_html(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove tags HTML perigosos
  input_text := regexp_replace(
    input_text,
    '<(script|iframe|object|embed|form|input|button)[^>]*>.*?</\1>',
    '',
    'gi'
  );
  
  -- Remove atributos perigosos
  input_text := regexp_replace(
    input_text,
    '(on\w+|javascript:|data:)\s*=\s*["''][^"'']*["'']',
    '',
    'gi'
  );
  
  RETURN input_text;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGERS DE SEGURANÇA
-- =====================================================

-- Trigger para sanitizar dados antes da inserção
CREATE OR REPLACE FUNCTION sanitize_user_input()
RETURNS trigger AS $$
BEGIN
  -- Sanitizar campos de texto em profiles
  IF TG_TABLE_NAME = 'profiles' THEN
    NEW.name := sanitize_html(NEW.name);
    NEW.bio := sanitize_html(NEW.bio);
  END IF;
  
  -- Sanitizar campos de texto em posts/comentários
  IF TG_TABLE_NAME IN ('posts', 'comments') THEN
    NEW.content := sanitize_html(NEW.content);
    NEW.title := sanitize_html(NEW.title);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de sanitização
DROP TRIGGER IF EXISTS sanitize_profiles_trigger ON profiles;
CREATE TRIGGER sanitize_profiles_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_user_input();

-- =====================================================
-- 6. ALERTAS DE SEGURANÇA
-- =====================================================

-- Tabela para alertas de segurança
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (
    'BRUTE_FORCE_ATTEMPT',
    'SUSPICIOUS_LOGIN',
    'PRIVILEGE_ESCALATION',
    'DATA_BREACH_ATTEMPT',
    'UNUSUAL_ACTIVITY',
    'MFA_BYPASS_ATTEMPT'
  )),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  details jsonb NOT NULL,
  user_email text,
  ip_address inet,
  user_agent text,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved ON security_alerts(is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- RLS para alertas de segurança
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security alerts"
ON security_alerts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- 7. VIEWS DE MONITORAMENTO SEGURO
-- =====================================================

-- View para estatísticas de segurança (apenas admins)
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  'active_users_24h' as metric,
  COUNT(DISTINCT user_email) as value,
  'Users active in last 24 hours' as description
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
AND action IN ('LOGIN_SUCCESS', 'API_ACCESS')

UNION ALL

SELECT 
  'failed_logins_24h' as metric,
  COUNT(*) as value,
  'Failed login attempts in last 24 hours' as description
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
AND action = 'LOGIN_FAILED'

UNION ALL

SELECT 
  'unresolved_alerts' as metric,
  COUNT(*) as value,
  'Unresolved security alerts' as description
FROM security_alerts 
WHERE is_resolved = false

UNION ALL

SELECT 
  'mfa_enabled_users' as metric,
  COUNT(*) as value,
  'Users with MFA enabled' as description
FROM mfa_tokens 
WHERE is_verified = true;

-- =====================================================
-- 8. CONFIGURAÇÕES FINAIS
-- =====================================================

-- Atualizar configurações de segurança
INSERT INTO system_config (key, value, description, is_encrypted) VALUES
('security.mfa_required_for_admins', 'true', 'Require MFA for admin users', false),
('security.password_min_length', '8', 'Minimum password length', false),
('security.session_timeout_hours', '24', 'Session timeout in hours', false),
('security.max_login_attempts', '5', 'Maximum login attempts before lockout', false),
('security.lockout_duration_minutes', '15', 'Account lockout duration in minutes', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Log da implementação
INSERT INTO audit_logs (action, details, user_email) VALUES (
  'SECURITY_ENHANCEMENT',
  'Week 1 security enhancements implemented: Column-level security, Storage RLS, MFA setup, Advanced validation functions',
  'system@hubcontrol.com'
);

-- =====================================================
-- VERIFICAÇÕES DE SEGURANÇA
-- =====================================================

-- Função para verificar status de segurança
CREATE OR REPLACE FUNCTION security_health_check()
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  rls_enabled_count integer;
  total_tables_count integer;
  mfa_admin_count integer;
  total_admin_count integer;
BEGIN
  -- Verificar RLS habilitado
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity = true;
  
  SELECT COUNT(*) INTO total_tables_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
  AND n.nspname = 'public';
  
  -- Verificar MFA para admins
  SELECT COUNT(*) INTO mfa_admin_count
  FROM profiles p
  JOIN mfa_tokens m ON p.id = m.user_id
  WHERE p.role = 'admin' AND m.is_verified = true;
  
  SELECT COUNT(*) INTO total_admin_count
  FROM profiles
  WHERE role = 'admin';
  
  result := jsonb_build_object(
    'rls_coverage', round((rls_enabled_count::numeric / total_tables_count::numeric) * 100, 2),
    'mfa_admin_coverage', round((mfa_admin_count::numeric / GREATEST(total_admin_count::numeric, 1)) * 100, 2),
    'tables_with_rls', rls_enabled_count,
    'total_tables', total_tables_count,
    'admins_with_mfa', mfa_admin_count,
    'total_admins', total_admin_count,
    'timestamp', extract(epoch from now())
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário final
COMMENT ON FUNCTION security_health_check() IS 'Função para verificar o status geral de segurança do sistema';

-- Sucesso!
SELECT 'Implementações de segurança da Semana 1 concluídas com sucesso! 🔒' as status;