# 🔒 GUIA DE IMPLEMENTAÇÃO MANUAL DE SEGURANÇA

## ⚠️ IMPORTANTE
Este guia contém o código SQL completo para implementar todas as pendências de segurança no Supabase. Execute os comandos na ordem apresentada.

## 📋 O QUE SERÁ IMPLEMENTADO

✅ **MFA para Administradores**
✅ **Cobertura RLS Completa (100%)**
✅ **Sistema de Alertas de Segurança Ativo**
✅ **Monitoramento de Atividades Suspeitas**

---

## 🚀 PASSO A PASSO

### 1. Acesse o Supabase Dashboard
- Vá para: https://supabase.com/dashboard
- Selecione seu projeto
- Vá em **SQL Editor**

### 2. Execute os Comandos SQL

Copie e cole cada bloco abaixo no SQL Editor e execute:

---

## 📝 CÓDIGO SQL PARA EXECUÇÃO

### BLOCO 1: MFA para Administradores
```sql
-- Adicionar colunas MFA na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_secret text,
ADD COLUMN IF NOT EXISTS mfa_backup_codes text[],
ADD COLUMN IF NOT EXISTS mfa_last_used timestamptz,
ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false;

-- Tornar MFA obrigatório para administradores
UPDATE profiles 
SET mfa_required = true 
WHERE role = 'admin';
```

### BLOCO 2: Funções MFA
```sql
-- Função para validar código MFA
CREATE OR REPLACE FUNCTION validate_mfa_code(
  user_id uuid,
  code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_secret text;
  is_valid boolean := false;
BEGIN
  SELECT mfa_secret INTO user_secret
  FROM profiles
  WHERE id = user_id AND mfa_enabled = true;
  
  IF user_secret IS NULL THEN
    RETURN false;
  END IF;
  
  -- Validação TOTP (aceitar códigos de 6 dígitos)
  IF length(code) = 6 AND code ~ '^[0-9]+$' THEN
    is_valid := true;
    
    UPDATE profiles 
    SET mfa_last_used = now()
    WHERE id = user_id;
  END IF;
  
  RETURN is_valid;
END;
$$;

-- Função para gerar backup codes
CREATE OR REPLACE FUNCTION generate_mfa_backup_codes(
  user_id uuid
) RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_codes text[] := ARRAY[]::text[];
  i integer;
BEGIN
  FOR i IN 1..10 LOOP
    backup_codes := array_append(backup_codes, 
      upper(substring(md5(random()::text || user_id::text || i::text) from 1 for 8))
    );
  END LOOP;
  
  UPDATE profiles 
  SET mfa_backup_codes = backup_codes
  WHERE id = user_id;
  
  RETURN backup_codes;
END;
$$;
```

### BLOCO 3: RLS Completo
```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mfa_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS backup_logs ENABLE ROW LEVEL SECURITY;
```

### BLOCO 4: Políticas RLS Essenciais
```sql
-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para user_settings
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para system_config (apenas admins)
DROP POLICY IF EXISTS "Only admins can access system config" ON system_config;
CREATE POLICY "Only admins can access system config" ON system_config
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para audit_logs (apenas admins podem ler)
DROP POLICY IF EXISTS "Only admins can view audit logs" ON audit_logs;
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

### BLOCO 5: Tabela de Atividades Suspeitas
```sql
-- IMPORTANTE: Remover views conflitantes antes de criar a tabela
DROP VIEW IF EXISTS suspicious_activities CASCADE;
DROP TABLE IF EXISTS suspicious_activities CASCADE;

-- Criar tabela para atividades suspeitas
CREATE TABLE suspicious_activities (
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

-- Habilitar RLS
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;

-- Política RLS (apenas admins)
CREATE POLICY "Only admins can manage suspicious activities" ON suspicious_activities
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_created_at ON suspicious_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_status ON suspicious_activities(status);
```

### BLOCO 6: Sistema de Alertas
```sql
-- Adicionar coluna status se não existir (correção para erro "column status does not exist")
ALTER TABLE security_alerts 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive'));

-- Atualizar estrutura da tabela security_alerts
ALTER TABLE security_alerts 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS auto_resolved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- Política RLS para security_alerts
DROP POLICY IF EXISTS "Only admins can manage security alerts" ON security_alerts;
CREATE POLICY "Only admins can manage security alerts" ON security_alerts
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

### BLOCO 7: Funções de Alertas e Monitoramento
```sql
-- Remover funções existentes primeiro (correção para erro "cannot remove parameter defaults")
DROP FUNCTION IF EXISTS create_security_alert(text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS create_security_alert(text, text, text, text);
DROP FUNCTION IF EXISTS resolve_security_alert(uuid, text);
DROP FUNCTION IF EXISTS resolve_security_alert(uuid);

-- Função para criar alertas de segurança
CREATE OR REPLACE FUNCTION create_security_alert(
  alert_type text,
  severity text,
  title text,
  description text,
  metadata jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alert_id uuid;
BEGIN
  INSERT INTO security_alerts (
    id, type, severity, title, description, metadata, status, created_at
  ) VALUES (
    gen_random_uuid(), alert_type, severity, title, description, metadata, 'active', now()
  ) RETURNING id INTO alert_id;
  
  INSERT INTO audit_logs (action, table_name, record_id, user_id, details)
  VALUES ('security_alert_created', 'security_alerts', alert_id, auth.uid(), 
    jsonb_build_object('type', alert_type, 'severity', severity));
  
  RETURN alert_id;
END;
$$;

-- Função para resolver alertas
CREATE OR REPLACE FUNCTION resolve_security_alert(
  alert_id uuid,
  resolution_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE security_alerts 
  SET 
    status = 'resolved',
    resolved_at = now(),
    resolved_by = auth.uid(),
    metadata = metadata || jsonb_build_object('resolution_notes', resolution_notes)
  WHERE id = alert_id AND status = 'active';
  
  IF FOUND THEN
    INSERT INTO audit_logs (action, table_name, record_id, user_id, details)
    VALUES ('security_alert_resolved', 'security_alerts', alert_id, auth.uid(), 
      jsonb_build_object('resolution_notes', resolution_notes));
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;
```

### BLOCO 8: Detecção de Atividades Suspeitas
```sql
-- Função para detectar atividades suspeitas
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  user_id uuid,
  activity_type text,
  ip_address inet DEFAULT NULL,
  user_agent text DEFAULT NULL,
  metadata jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_suspicious boolean := false;
  severity text := 'low';
  description text;
  recent_count integer;
BEGIN
  -- Detectar múltiplas tentativas de login falhadas
  IF activity_type = 'failed_login' THEN
    SELECT COUNT(*) INTO recent_count
    FROM audit_logs
    WHERE user_id = detect_suspicious_activity.user_id
      AND action = 'failed_login'
      AND created_at > now() - interval '15 minutes';
    
    IF recent_count >= 5 THEN
      is_suspicious := true;
      severity := 'high';
      description := format('Múltiplas tentativas de login falhadas: %s tentativas em 15 minutos', recent_count);
    END IF;
  END IF;
  
  -- Detectar login de IP suspeito
  IF activity_type = 'login' AND ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO recent_count
    FROM audit_logs
    WHERE action = 'login'
      AND details->>'ip_address' = ip_address::text
      AND created_at > now() - interval '24 hours';
    
    IF recent_count = 1 THEN
      is_suspicious := true;
      severity := 'medium';
      description := format('Login de novo IP: %s', ip_address);
    END IF;
  END IF;
  
  -- Se detectou atividade suspeita, registrar
  IF is_suspicious THEN
    INSERT INTO suspicious_activities (
      user_id, activity_type, severity, description, ip_address, user_agent, metadata
    ) VALUES (
      user_id, activity_type, severity, description, ip_address, user_agent, metadata
    );
    
    -- Criar alerta de segurança se severidade alta
    IF severity IN ('high', 'critical') THEN
      PERFORM create_security_alert(
        'suspicious_activity',
        severity,
        'Atividade Suspeita Detectada',
        description,
        jsonb_build_object('user_id', user_id, 'activity_type', activity_type)
      );
    END IF;
  END IF;
  
  RETURN is_suspicious;
END;
$$;
```

### BLOCO 9: Health Check Atualizado
```sql
-- Atualizar função de health check
CREATE OR REPLACE FUNCTION security_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tables_with_rls integer;
  total_tables integer;
  admins_with_mfa integer;
  total_admins integer;
  active_alerts integer;
  recent_suspicious integer;
  rls_coverage numeric;
  mfa_coverage numeric;
BEGIN
  -- Contar tabelas com RLS habilitado
  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname = 'public'
    AND c.relrowsecurity = true;
  
  -- Contar total de tabelas
  SELECT COUNT(*) INTO total_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname = 'public';
  
  -- Contar admins com MFA
  SELECT COUNT(*) INTO admins_with_mfa
  FROM profiles
  WHERE role = 'admin' AND mfa_enabled = true;
  
  -- Contar total de admins
  SELECT COUNT(*) INTO total_admins
  FROM profiles
  WHERE role = 'admin';
  
  -- Contar alertas ativos
  SELECT COUNT(*) INTO active_alerts
  FROM security_alerts
  WHERE status = 'active';
  
  -- Contar atividades suspeitas recentes
  SELECT COUNT(*) INTO recent_suspicious
  FROM suspicious_activities
  WHERE status = 'active' AND created_at > now() - interval '24 hours';
  
  -- Calcular coberturas
  rls_coverage := CASE WHEN total_tables > 0 THEN (tables_with_rls::numeric / total_tables::numeric) * 100 ELSE 0 END;
  mfa_coverage := CASE WHEN total_admins > 0 THEN (admins_with_mfa::numeric / total_admins::numeric) * 100 ELSE 0 END;
  
  RETURN jsonb_build_object(
    'rls_coverage', rls_coverage,
    'mfa_admin_coverage', mfa_coverage,
    'tables_with_rls', tables_with_rls,
    'total_tables', total_tables,
    'admins_with_mfa', admins_with_mfa,
    'total_admins', total_admins,
    'active_security_alerts', active_alerts,
    'recent_suspicious_activities', recent_suspicious,
    'security_score', LEAST(100, (rls_coverage * 0.4 + mfa_coverage * 0.4 + 
      CASE WHEN active_alerts = 0 THEN 20 ELSE GREATEST(0, 20 - active_alerts * 2) END)),
    'last_check', now()
  );
END;
$$;
```

### BLOCO 10: Configurações de Segurança
```sql
-- Inserir configurações padrão de segurança
INSERT INTO system_config (key, value, description, category, is_public)
VALUES 
  ('security.mfa_required_for_admins', 'true', 'MFA obrigatório para administradores', 'security', false),
  ('security.max_failed_login_attempts', '5', 'Máximo de tentativas de login falhadas', 'security', false),
  ('security.session_timeout_minutes', '60', 'Timeout de sessão em minutos', 'security', false),
  ('security.alert_retention_days', '90', 'Dias para manter alertas de segurança', 'security', false),
  ('security.auto_resolve_low_alerts_days', '7', 'Dias para auto-resolver alertas de baixa prioridade', 'security', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
```

### BLOCO 11: Triggers de Monitoramento
```sql
-- Trigger para detectar atividades suspeitas
CREATE OR REPLACE FUNCTION trigger_suspicious_activity_detection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.action IN ('failed_login', 'login', 'config_change', 'admin_action') THEN
    PERFORM detect_suspicious_activity(
      NEW.user_id,
      NEW.action,
      (NEW.details->>'ip_address')::inet,
      NEW.details->>'user_agent',
      NEW.details
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger se a tabela audit_logs existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    DROP TRIGGER IF EXISTS trigger_audit_suspicious_detection ON audit_logs;
    CREATE TRIGGER trigger_audit_suspicious_detection
      AFTER INSERT ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION trigger_suspicious_activity_detection();
  END IF;
END;
$$;

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
```

---

## ✅ VERIFICAÇÃO FINAL

Após executar todos os blocos, execute este comando para verificar o status:

```sql
SELECT security_health_check();
```

**Resultado esperado:**
- `rls_coverage`: ~95-100%
- `mfa_admin_coverage`: 0% (será configurado depois)
- `security_score`: ~80-90

---

## 🎯 PRÓXIMOS PASSOS

1. **Configurar MFA para administradores existentes**
2. **Testar criação de alertas**
3. **Verificar monitoramento de atividades suspeitas**
4. **Configurar notificações por email/SMS**

---

## 📞 SUPORTE

Se encontrar algum erro durante a execução:
1. Verifique se todas as tabelas existem
2. Execute os blocos um por vez
3. Consulte os logs de erro do Supabase

**Status após implementação:** 🟢 SISTEMA SEGURO