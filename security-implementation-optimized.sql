
-- IMPLEMENTAÇÃO COMPLETA DE SEGURANÇA
-- Versão otimizada para execução manual

-- 1. MFA para Administradores
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_secret text,
ADD COLUMN IF NOT EXISTS mfa_backup_codes text[],
ADD COLUMN IF NOT EXISTS mfa_last_used timestamptz,
ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false;

UPDATE profiles SET mfa_required = true WHERE role = 'admin';

-- 2. RLS Completo
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de Atividades Suspeitas
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  investigated_by uuid REFERENCES auth.users(id),
  investigation_notes text
);

ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS Essenciais
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Only admins can access system config" ON system_config;
CREATE POLICY "Only admins can access system config" ON system_config
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Only admins can manage security alerts" ON security_alerts;
CREATE POLICY "Only admins can manage security alerts" ON security_alerts
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Only admins can manage suspicious activities" ON suspicious_activities;
CREATE POLICY "Only admins can manage suspicious activities" ON suspicious_activities
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Configurações de Segurança
INSERT INTO system_config (key, value, description, category, is_public)
VALUES 
  ('security.mfa_required_for_admins', 'true', 'MFA obrigatório para administradores', 'security', false),
  ('security.max_failed_login_attempts', '5', 'Máximo de tentativas de login falhadas', 'security', false),
  ('security.session_timeout_minutes', '60', 'Timeout de sessão em minutos', 'security', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
