-- 🔧 CORREÇÃO PARA IMPLEMENTAÇÃO DE SEGURANÇA
-- Hub Control - Criação de tabelas faltantes e correções
-- Data: 2024

-- =====================================================
-- 1. CRIAR TABELA USER_SETTINGS (FALTANTE)
-- =====================================================

-- Criar tabela user_settings se não existir
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_theme ON user_settings(theme);
CREATE INDEX IF NOT EXISTS idx_user_settings_language ON user_settings(language);

-- Habilitar RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_settings
CREATE POLICY "Users can view their own settings"
ON user_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
ON user_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
ON user_settings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own settings"
ON user_settings
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Política especial para admins
CREATE POLICY "Admins can view all user settings"
ON user_settings
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
-- 2. CRIAR TABELA SYSTEM_CONFIG (SE NÃO EXISTIR)
-- =====================================================

CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  is_encrypted boolean DEFAULT false,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para system_config
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_public ON system_config(is_public) WHERE is_public = true;

-- Habilitar RLS para system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Políticas para system_config
CREATE POLICY "Public configs are viewable by everyone"
ON system_config
FOR SELECT
TO public
USING (is_public = true);

CREATE POLICY "Authenticated users can view non-encrypted configs"
ON system_config
FOR SELECT
TO authenticated
USING (is_encrypted = false);

CREATE POLICY "Only admins can view encrypted configs"
ON system_config
FOR SELECT
TO authenticated
USING (
  is_encrypted = true AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can modify system configs"
ON system_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- 3. VERIFICAR E CRIAR OUTRAS TABELAS NECESSÁRIAS
-- =====================================================

-- Verificar se audit_logs existe, se não, criar
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  user_email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);

-- Habilitar RLS para audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para audit_logs
CREATE POLICY "Users can view their own audit logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_email = auth.email());

CREATE POLICY "Admins can view all audit logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can insert audit logs"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 4. FUNÇÃO PARA INSERIR CONFIGURAÇÕES PADRÃO
-- =====================================================

CREATE OR REPLACE FUNCTION insert_default_user_settings()
RETURNS trigger AS $$
BEGIN
  -- Inserir configurações padrão para novo usuário
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar configurações padrão automaticamente
DROP TRIGGER IF EXISTS create_default_user_settings ON auth.users;
CREATE TRIGGER create_default_user_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION insert_default_user_settings();

-- =====================================================
-- 5. INSERIR CONFIGURAÇÕES PADRÃO DO SISTEMA
-- =====================================================

INSERT INTO system_config (key, value, description, is_public) VALUES
('app.name', 'Hub Control', 'Nome da aplicação', true),
('app.version', '1.0.0', 'Versão da aplicação', true),
('security.session_timeout', '24', 'Timeout da sessão em horas', false),
('security.max_login_attempts', '5', 'Máximo de tentativas de login', false),
('security.password_min_length', '8', 'Comprimento mínimo da senha', false),
('notifications.enabled', 'true', 'Notificações habilitadas', false),
('maintenance.mode', 'false', 'Modo de manutenção', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 6. LOG DA CORREÇÃO
-- =====================================================

INSERT INTO audit_logs (action, details, user_email) VALUES (
  'SECURITY_FIX',
  'Tabelas faltantes criadas: user_settings, system_config, audit_logs. Preparação para implementação de segurança.',
  'system@hubcontrol.com'
);

-- Sucesso!
SELECT 'Correções aplicadas com sucesso! Agora você pode executar o script de segurança. 🔧' as status;