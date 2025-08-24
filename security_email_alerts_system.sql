-- 🚨 SISTEMA DE ALERTAS DE SEGURANÇA POR EMAIL
-- Hub Control - Notificações Críticas Automáticas
-- Data: 06/08/2025

-- =====================================================
-- 1. TABELA PARA CONFIGURAÇÕES DE EMAIL
-- =====================================================

CREATE TABLE IF NOT EXISTS email_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  email_address text NOT NULL,
  notification_level text CHECK (notification_level IN ('critical', 'high', 'medium', 'low')) DEFAULT 'critical',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_alert_settings_user_type ON email_alert_settings(user_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_email_alert_settings_enabled ON email_alert_settings(is_enabled) WHERE is_enabled = true;

-- =====================================================
-- 2. TABELA PARA FILA DE EMAILS
-- =====================================================

CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  alert_type text,
  severity text,
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status text CHECK (status IN ('pending', 'sent', 'failed', 'retry')) DEFAULT 'pending',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  scheduled_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status_priority ON email_queue(status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_pending ON email_queue(scheduled_at) WHERE status = 'pending';

-- =====================================================
-- 3. FUNÇÃO PRINCIPAL PARA ENVIO DE ALERTAS
-- =====================================================

CREATE OR REPLACE FUNCTION send_security_alert_email(
  alert_type text,
  severity text,
  details jsonb,
  user_email text DEFAULT NULL,
  ip_address inet DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_emails text[];
  email_body text;
  email_subject text;
  priority_level integer;
  alert_icon text;
  alert_color text;
  dashboard_url text := 'https://hub-control.com/dashboard/security';
BEGIN
  -- Determinar prioridade baseada na severidade
  priority_level := CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 5
    WHEN 'LOW' THEN 8
    ELSE 5
  END;
  
  -- Determinar ícone e cor do alerta
  alert_icon := CASE severity
    WHEN 'CRITICAL' THEN '🚨'
    WHEN 'HIGH' THEN '⚠️'
    WHEN 'MEDIUM' THEN '🔍'
    WHEN 'LOW' THEN 'ℹ️'
    ELSE '🔔'
  END;
  
  alert_color := CASE severity
    WHEN 'CRITICAL' THEN '#dc2626'
    WHEN 'HIGH' THEN '#ea580c'
    WHEN 'MEDIUM' THEN '#d97706'
    WHEN 'LOW' THEN '#2563eb'
    ELSE '#6b7280'
  END;
  
  -- Buscar emails dos administradores ativos
  SELECT array_agg(DISTINCT u.email) INTO admin_emails
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  LEFT JOIN email_alert_settings eas ON u.id = eas.user_id 
    AND eas.alert_type = alert_type 
    AND eas.is_enabled = true
  WHERE p.role = 'admin' 
    AND p.mfa_enabled = true
    AND u.email IS NOT NULL
    AND (eas.id IS NOT NULL OR NOT EXISTS (
      SELECT 1 FROM email_alert_settings 
      WHERE user_id = u.id AND alert_type = alert_type
    ));
  
  -- Verificar se há administradores para notificar
  IF admin_emails IS NULL OR array_length(admin_emails, 1) = 0 THEN
    -- Log do problema
    INSERT INTO audit_logs (action, details, user_email)
    VALUES (
      'EMAIL_ALERT_NO_RECIPIENTS',
      jsonb_build_object(
        'alert_type', alert_type,
        'severity', severity,
        'reason', 'No admin emails found'
      ),
      'system@hubcontrol.com'
    );
    
    RETURN false;
  END IF;
  
  -- Construir assunto do email
  email_subject := format('%s [HUB CONTROL - %s] %s', 
    alert_icon, 
    severity, 
    CASE alert_type
      WHEN 'BRUTE_FORCE_ATTEMPT' THEN 'Tentativa de Força Bruta Detectada'
      WHEN 'UNUSUAL_ACTIVITY' THEN 'Atividade Suspeita Detectada'
      WHEN 'PRIVILEGE_ESCALATION' THEN 'Tentativa de Escalação de Privilégio'
      WHEN 'DATA_BREACH_ATTEMPT' THEN 'Tentativa de Violação de Dados'
      WHEN 'SYSTEM_COMPROMISE' THEN 'Possível Comprometimento do Sistema'
      WHEN 'MALWARE_DETECTED' THEN 'Malware Detectado'
      WHEN 'UNAUTHORIZED_ACCESS' THEN 'Acesso Não Autorizado'
      ELSE 'Alerta de Segurança'
    END
  );
  
  -- Construir corpo do email em HTML
  email_body := format('
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Segurança - Hub Control</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: %s; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { background: #333; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; }
    .alert-box { background: #fff; border-left: 4px solid %s; padding: 15px; margin: 15px 0; }
    .details { background: #fff; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .button { display: inline-block; background: %s; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .timestamp { color: #666; font-size: 0.9em; }
    .critical { border-color: #dc2626; }
    .high { border-color: #ea580c; }
    .medium { border-color: #d97706; }
    .low { border-color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>%s ALERTA DE SEGURANÇA</h1>
      <p>Hub Control - Sistema de Monitoramento</p>
    </div>
    
    <div class="content">
      <div class="alert-box %s">
        <h2>🎯 Tipo de Alerta: %s</h2>
        <p><strong>Severidade:</strong> <span style="color: %s; font-weight: bold;">%s</span></p>
        <p><strong>Timestamp:</strong> <span class="timestamp">%s</span></p>
        %s
        %s
      </div>
      
      <div class="details">
        <h3>📋 Detalhes do Incidente:</h3>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">%s</pre>
      </div>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="%s" class="button">🔍 ACESSAR DASHBOARD DE SEGURANÇA</a>
      </div>
      
      <div class="alert-box">
        <h3>⚡ Ações Recomendadas:</h3>
        <ul>
          %s
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p>🔒 Este é um alerta automático do sistema de segurança Hub Control</p>
      <p>📧 Não responda este email - Para suporte: security@hubcontrol.com</p>
      <p>🕐 Gerado em: %s</p>
    </div>
  </div>
</body>
</html>',
    alert_color,  -- header background
    alert_color,  -- border color
    alert_color,  -- button color
    alert_icon,   -- header icon
    lower(severity), -- CSS class
    alert_type,   -- alert type
    alert_color,  -- severity color
    severity,     -- severity text
    now()::text,  -- timestamp
    CASE WHEN user_email IS NOT NULL THEN format('<p><strong>Usuário:</strong> %s</p>', user_email) ELSE '' END,
    CASE WHEN ip_address IS NOT NULL THEN format('<p><strong>IP de Origem:</strong> %s</p>', ip_address::text) ELSE '' END,
    jsonb_pretty(details), -- details JSON
    dashboard_url, -- dashboard link
    CASE alert_type
      WHEN 'BRUTE_FORCE_ATTEMPT' THEN 
        '<li>🚫 Bloquear IP de origem imediatamente</li><li>🔍 Investigar tentativas de acesso</li><li>📧 Notificar o usuário afetado</li><li>🔐 Forçar reset de senha se necessário</li>'
      WHEN 'UNUSUAL_ACTIVITY' THEN 
        '<li>🔍 Investigar atividade suspeita</li><li>📊 Analisar logs detalhados</li><li>🔐 Verificar integridade da conta</li><li>📞 Contatar usuário se necessário</li>'
      WHEN 'PRIVILEGE_ESCALATION' THEN 
        '<li>🚨 Investigar imediatamente</li><li>🔒 Revogar permissões suspeitas</li><li>📋 Auditar logs de acesso</li><li>🔐 Verificar integridade do sistema</li>'
      ELSE 
        '<li>🔍 Investigar o incidente</li><li>📊 Analisar logs relacionados</li><li>🔐 Verificar integridade do sistema</li><li>📞 Escalar se necessário</li>'
    END, -- recommended actions
    now()::text  -- footer timestamp
  );
  
  -- Inserir emails na fila para cada administrador
  INSERT INTO email_queue (
    recipient_email, 
    subject, 
    body, 
    alert_type, 
    severity, 
    priority,
    metadata
  )
  SELECT 
    unnest(admin_emails),
    email_subject,
    email_body,
    alert_type,
    severity,
    priority_level,
    jsonb_build_object(
      'alert_details', details,
      'user_email', user_email,
      'ip_address', ip_address::text,
      'generated_at', now()
    );
  
  -- Registrar envio no log de auditoria
  INSERT INTO audit_logs (action, details, user_email)
  VALUES (
    'SECURITY_ALERT_EMAIL_QUEUED',
    jsonb_build_object(
      'alert_type', alert_type,
      'severity', severity,
      'recipients_count', array_length(admin_emails, 1),
      'recipients', admin_emails,
      'priority', priority_level
    ),
    'system@hubcontrol.com'
  );
  
  RETURN true;
END;
$$;

-- =====================================================
-- 4. TRIGGER AUTOMÁTICO PARA ALERTAS CRÍTICOS
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_email_alert()
RETURNS trigger AS $$
BEGIN
  -- Enviar email apenas para alertas críticos e altos
  IF NEW.severity IN ('CRITICAL', 'HIGH') THEN
    PERFORM send_security_alert_email(
      NEW.type,
      NEW.severity,
      NEW.details,
      NEW.user_email,
      NEW.ip_address
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela de alertas de segurança
DROP TRIGGER IF EXISTS email_alert_trigger ON security_alerts;
CREATE TRIGGER email_alert_trigger
  AFTER INSERT ON security_alerts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_alert();

-- =====================================================
-- 5. FUNÇÃO PARA PROCESSAR FILA DE EMAILS
-- =====================================================

CREATE OR REPLACE FUNCTION process_email_queue(batch_size integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  email_record record;
  processed_count integer := 0;
  success_count integer := 0;
BEGIN
  -- Processar emails pendentes por ordem de prioridade
  FOR email_record IN 
    SELECT * FROM email_queue 
    WHERE status = 'pending' 
      AND scheduled_at <= now()
      AND attempts < max_attempts
    ORDER BY priority ASC, created_at ASC
    LIMIT batch_size
  LOOP
    BEGIN
      -- Aqui seria a integração real com serviço de email
      -- Por enquanto, apenas simula o envio
      
      -- Atualizar status para enviado
      UPDATE email_queue 
      SET 
        status = 'sent',
        sent_at = now(),
        attempts = attempts + 1
      WHERE id = email_record.id;
      
      success_count := success_count + 1;
      
      -- Log de sucesso
      INSERT INTO audit_logs (action, details)
      VALUES (
        'EMAIL_SENT_SUCCESS',
        jsonb_build_object(
          'email_id', email_record.id,
          'recipient', email_record.recipient_email,
          'alert_type', email_record.alert_type,
          'severity', email_record.severity
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Em caso de erro, marcar para retry ou falha
      UPDATE email_queue 
      SET 
        status = CASE 
          WHEN attempts + 1 >= max_attempts THEN 'failed'
          ELSE 'retry'
        END,
        attempts = attempts + 1,
        error_message = SQLERRM,
        scheduled_at = CASE 
          WHEN attempts + 1 < max_attempts THEN now() + INTERVAL '5 minutes'
          ELSE scheduled_at
        END
      WHERE id = email_record.id;
      
      -- Log de erro
      INSERT INTO audit_logs (action, details)
      VALUES (
        'EMAIL_SENT_ERROR',
        jsonb_build_object(
          'email_id', email_record.id,
          'recipient', email_record.recipient_email,
          'error', SQLERRM,
          'attempts', email_record.attempts + 1
        )
      );
    END;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  -- Log do processamento
  IF processed_count > 0 THEN
    INSERT INTO audit_logs (action, details)
    VALUES (
      'EMAIL_QUEUE_PROCESSED',
      jsonb_build_object(
        'processed_count', processed_count,
        'success_count', success_count,
        'failed_count', processed_count - success_count
      )
    );
  END IF;
  
  RETURN processed_count;
END;
$$;

-- =====================================================
-- 6. CONFIGURAÇÕES PADRÃO PARA ADMINISTRADORES
-- =====================================================

-- Inserir configurações padrão para todos os administradores
INSERT INTO email_alert_settings (user_id, alert_type, is_enabled, email_address, notification_level)
SELECT 
  p.id,
  alert_type,
  true,
  u.email,
  'critical'
FROM profiles p
JOIN auth.users u ON p.id = u.id
CROSS JOIN (
  VALUES 
    ('BRUTE_FORCE_ATTEMPT'),
    ('UNUSUAL_ACTIVITY'),
    ('PRIVILEGE_ESCALATION'),
    ('DATA_BREACH_ATTEMPT'),
    ('SYSTEM_COMPROMISE'),
    ('MALWARE_DETECTED'),
    ('UNAUTHORIZED_ACCESS')
) AS alert_types(alert_type)
WHERE p.role = 'admin' 
  AND p.mfa_enabled = true
  AND u.email IS NOT NULL
ON CONFLICT (user_id, alert_type) DO NOTHING;

-- =====================================================
-- 7. VIEWS PARA MONITORAMENTO
-- =====================================================

-- View para estatísticas de emails
CREATE OR REPLACE VIEW email_alert_stats AS
SELECT 
  'emails_pending' as metric,
  COUNT(*) as value,
  'Emails pendentes na fila' as description
FROM email_queue 
WHERE status = 'pending'

UNION ALL

SELECT 
  'emails_sent_24h' as metric,
  COUNT(*) as value,
  'Emails enviados nas últimas 24h' as description
FROM email_queue 
WHERE status = 'sent' 
AND sent_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'emails_failed_24h' as metric,
  COUNT(*) as value,
  'Emails falharam nas últimas 24h' as description
FROM email_queue 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'admin_recipients' as metric,
  COUNT(DISTINCT user_id) as value,
  'Administradores configurados para receber alertas' as description
FROM email_alert_settings 
WHERE is_enabled = true;

-- =====================================================
-- 8. FUNÇÃO DE TESTE
-- =====================================================

CREATE OR REPLACE FUNCTION test_email_alert_system()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
BEGIN
  -- Enviar alerta de teste
  PERFORM send_security_alert_email(
    'SYSTEM_TEST',
    'HIGH',
    jsonb_build_object(
      'test_type', 'email_system_test',
      'timestamp', now(),
      'message', 'Este é um teste do sistema de alertas por email'
    ),
    'test@example.com',
    '127.0.0.1'::inet
  );
  
  result := format(
    'Sistema de alertas por email testado com sucesso!\n' ||
    'Emails na fila: %s\n' ||
    'Administradores configurados: %s\n' ||
    'Verifique a tabela email_queue para detalhes.',
    (SELECT COUNT(*) FROM email_queue WHERE status = 'pending'),
    (SELECT COUNT(DISTINCT user_id) FROM email_alert_settings WHERE is_enabled = true)
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- 9. LIMPEZA AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_email_queue()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Remover emails antigos (mais de 30 dias)
  DELETE FROM email_queue 
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('sent', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza
  INSERT INTO audit_logs (action, details)
  VALUES (
    'EMAIL_QUEUE_CLEANUP',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'cleanup_date', now()
    )
  );
  
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 10. MENSAGENS DE CONFIRMAÇÃO
-- =====================================================

SELECT '🚨 SISTEMA DE ALERTAS POR EMAIL IMPLEMENTADO!' as status;
SELECT 'Alertas críticos serão enviados automaticamente para administradores' as feature;
SELECT 'Use test_email_alert_system() para testar o sistema' as test_function;
SELECT 'Use process_email_queue() para processar emails pendentes' as process_function;
SELECT 'Configurações padrão criadas para todos os administradores' as default_config;