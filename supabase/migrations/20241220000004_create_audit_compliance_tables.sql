-- 🔒 Migração: Tabelas de Auditoria e Compliance
-- Cria estrutura para armazenar eventos de auditoria e relatórios de compliance

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum para tipos de eventos de auditoria
CREATE TYPE audit_event_type AS ENUM (
  'DATA_ACCESS',
  'DATA_MODIFICATION',
  'DATA_DELETION',
  'DATA_EXPORT',
  'USER_LOGIN',
  'USER_LOGOUT',
  'PERMISSION_CHANGE',
  'SYSTEM_CONFIGURATION',
  'SECURITY_INCIDENT',
  'COMPLIANCE_VIOLATION',
  'DATA_BREACH',
  'BACKUP_OPERATION',
  'RESTORE_OPERATION',
  'ADMIN_ACTION',
  'API_ACCESS'
);

-- Enum para frameworks de compliance
CREATE TYPE compliance_framework AS ENUM (
  'LGPD',
  'GDPR',
  'SOX',
  'HIPAA',
  'PCI_DSS',
  'ISO27001',
  'NIST',
  'CIS',
  'OWASP'
);

-- Enum para classificação de dados
CREATE TYPE data_classification AS ENUM (
  'public',
  'internal',
  'confidential',
  'restricted'
);

-- Enum para severidade
CREATE TYPE severity_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Enum para status de compliance
CREATE TYPE compliance_status AS ENUM (
  'compliant',
  'non_compliant',
  'partial',
  'unknown'
);

-- Enum para tipos de achados
CREATE TYPE finding_type AS ENUM (
  'violation',
  'risk',
  'gap',
  'improvement'
);

-- Enum para status de achados
CREATE TYPE finding_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'accepted'
);

-- Tabela principal de eventos de auditoria
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type audit_event_type NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  ip INET NOT NULL,
  user_agent TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  compliance compliance_framework[] NOT NULL DEFAULT '{}',
  severity severity_level NOT NULL DEFAULT 'medium',
  data_classification data_classification NOT NULL DEFAULT 'internal',
  retention INTEGER NOT NULL DEFAULT 365, -- dias
  encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ GENERATED ALWAYS AS (created_at + (retention || ' days')::INTERVAL) STORED
);

-- Índices para performance
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX idx_audit_events_type ON audit_events(type);
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_ip ON audit_events(ip);
CREATE INDEX idx_audit_events_compliance ON audit_events USING GIN(compliance);
CREATE INDEX idx_audit_events_severity ON audit_events(severity);
CREATE INDEX idx_audit_events_classification ON audit_events(data_classification);
CREATE INDEX idx_audit_events_expires_at ON audit_events(expires_at);
CREATE INDEX idx_audit_events_resource ON audit_events(resource);
CREATE INDEX idx_audit_events_details ON audit_events USING GIN(details);

-- Tabela de relatórios de compliance
CREATE TABLE compliance_reports (
  id TEXT PRIMARY KEY,
  framework compliance_framework NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status compliance_status NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  findings JSONB NOT NULL DEFAULT '[]',
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para relatórios
CREATE INDEX idx_compliance_reports_framework ON compliance_reports(framework);
CREATE INDEX idx_compliance_reports_period ON compliance_reports(period_start, period_end);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX idx_compliance_reports_score ON compliance_reports(score);
CREATE INDEX idx_compliance_reports_generated_at ON compliance_reports(generated_at DESC);

-- Tabela de achados de compliance
CREATE TABLE compliance_findings (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES compliance_reports(id) ON DELETE CASCADE,
  type finding_type NOT NULL,
  severity severity_level NOT NULL,
  control TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]',
  remediation TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  status finding_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para achados
CREATE INDEX idx_compliance_findings_report_id ON compliance_findings(report_id);
CREATE INDEX idx_compliance_findings_type ON compliance_findings(type);
CREATE INDEX idx_compliance_findings_severity ON compliance_findings(severity);
CREATE INDEX idx_compliance_findings_status ON compliance_findings(status);
CREATE INDEX idx_compliance_findings_control ON compliance_findings(control);
CREATE INDEX idx_compliance_findings_due_date ON compliance_findings(due_date);
CREATE INDEX idx_compliance_findings_assigned_to ON compliance_findings(assigned_to);

-- Tabela de configurações de compliance
CREATE TABLE compliance_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework compliance_framework NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  retention_days INTEGER NOT NULL DEFAULT 365,
  auto_reporting BOOLEAN NOT NULL DEFAULT TRUE,
  reporting_frequency_days INTEGER NOT NULL DEFAULT 30,
  critical_controls TEXT[] NOT NULL DEFAULT '{}',
  notification_emails TEXT[] NOT NULL DEFAULT '{}',
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de histórico de mudanças em achados
CREATE TABLE compliance_finding_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id TEXT REFERENCES compliance_findings(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

-- Índices para histórico
CREATE INDEX idx_compliance_finding_history_finding_id ON compliance_finding_history(finding_id);
CREATE INDEX idx_compliance_finding_history_changed_at ON compliance_finding_history(changed_at DESC);
CREATE INDEX idx_compliance_finding_history_changed_by ON compliance_finding_history(changed_by);

-- Tabela de métricas de compliance
CREATE TABLE compliance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework compliance_framework NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Índices para métricas
CREATE INDEX idx_compliance_metrics_framework ON compliance_metrics(framework);
CREATE INDEX idx_compliance_metrics_name ON compliance_metrics(metric_name);
CREATE INDEX idx_compliance_metrics_period ON compliance_metrics(period_start, period_end);
CREATE INDEX idx_compliance_metrics_calculated_at ON compliance_metrics(calculated_at DESC);

-- Função para validar integridade de eventos de auditoria
CREATE OR REPLACE FUNCTION validate_audit_event_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o hash está presente
  IF NEW.hash IS NULL OR NEW.hash = '' THEN
    RAISE EXCEPTION 'Hash de integridade é obrigatório para eventos de auditoria';
  END IF;
  
  -- Verificar se a classificação de dados está adequada para o tipo de evento
  IF NEW.type IN ('DATA_BREACH', 'SECURITY_INCIDENT') AND NEW.data_classification = 'public' THEN
    RAISE EXCEPTION 'Eventos críticos não podem ter classificação pública';
  END IF;
  
  -- Verificar se eventos críticos têm severidade adequada
  IF NEW.type IN ('DATA_BREACH', 'SECURITY_INCIDENT') AND NEW.severity = 'low' THEN
    NEW.severity = 'high';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validação de integridade
CREATE TRIGGER trigger_validate_audit_event_integrity
  BEFORE INSERT OR UPDATE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_audit_event_integrity();

-- Função para limpeza automática de eventos expirados
CREATE OR REPLACE FUNCTION cleanup_expired_audit_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar eventos expirados
  DELETE FROM audit_events 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza
  INSERT INTO audit_events (
    id,
    type,
    ip,
    user_agent,
    resource,
    action,
    details,
    severity,
    data_classification,
    hash
  ) VALUES (
    'cleanup_' || extract(epoch from now())::text,
    'SYSTEM_CONFIGURATION',
    '127.0.0.1',
    'audit-cleanup-system',
    'audit_events',
    'cleanup_expired',
    jsonb_build_object('deleted_count', deleted_count),
    'low',
    'internal',
    encode(digest('cleanup_' || deleted_count::text, 'sha256'), 'hex')
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular métricas de compliance
CREATE OR REPLACE FUNCTION calculate_compliance_metrics(
  p_framework compliance_framework,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_events BIGINT,
  critical_events BIGINT,
  violations BIGINT,
  compliance_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
    COUNT(*) FILTER (WHERE type = 'COMPLIANCE_VIOLATION') as violations,
    CASE 
      WHEN COUNT(*) = 0 THEN 100.0
      ELSE GREATEST(0, 100.0 - (COUNT(*) FILTER (WHERE severity = 'critical') * 25.0 / COUNT(*)))
    END as compliance_score
  FROM audit_events
  WHERE p_framework = ANY(compliance)
    AND timestamp BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar relatório automático de compliance
CREATE OR REPLACE FUNCTION generate_compliance_report(
  p_framework compliance_framework,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TEXT AS $$
DECLARE
  report_id TEXT;
  metrics RECORD;
  report_status compliance_status;
BEGIN
  -- Gerar ID do relatório
  report_id := 'report_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8);
  
  -- Calcular métricas
  SELECT * INTO metrics FROM calculate_compliance_metrics(p_framework, p_start_date, p_end_date);
  
  -- Determinar status
  IF metrics.violations > 0 OR metrics.critical_events > 0 THEN
    report_status := 'non_compliant';
  ELSIF metrics.compliance_score >= 90 THEN
    report_status := 'compliant';
  ELSIF metrics.compliance_score >= 70 THEN
    report_status := 'partial';
  ELSE
    report_status := 'non_compliant';
  END IF;
  
  -- Inserir relatório
  INSERT INTO compliance_reports (
    id,
    framework,
    period_start,
    period_end,
    status,
    score,
    findings,
    recommendations,
    generated_by
  ) VALUES (
    report_id,
    p_framework,
    p_start_date,
    p_end_date,
    report_status,
    metrics.compliance_score::INTEGER,
    jsonb_build_array(),
    ARRAY['Revisar eventos críticos', 'Implementar controles adicionais'],
    'auto-generator'
  );
  
  RETURN report_id;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar timestamp de modificação
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER trigger_compliance_reports_updated_at
  BEFORE UPDATE ON compliance_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_compliance_findings_updated_at
  BEFORE UPDATE ON compliance_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_compliance_configurations_updated_at
  BEFORE UPDATE ON compliance_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para histórico de mudanças em achados
CREATE OR REPLACE FUNCTION track_finding_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Rastrear mudanças de status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO compliance_finding_history (
      finding_id, field_name, old_value, new_value, changed_by
    ) VALUES (
      NEW.id, 'status', OLD.status::text, NEW.status::text, NEW.assigned_to
    );
  END IF;
  
  -- Rastrear mudanças de severidade
  IF OLD.severity IS DISTINCT FROM NEW.severity THEN
    INSERT INTO compliance_finding_history (
      finding_id, field_name, old_value, new_value, changed_by
    ) VALUES (
      NEW.id, 'severity', OLD.severity::text, NEW.severity::text, NEW.assigned_to
    );
  END IF;
  
  -- Rastrear mudanças de atribuição
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO compliance_finding_history (
      finding_id, field_name, old_value, new_value, changed_by
    ) VALUES (
      NEW.id, 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text, NEW.assigned_to
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_finding_changes
  AFTER UPDATE ON compliance_findings
  FOR EACH ROW
  EXECUTE FUNCTION track_finding_changes();

-- View para estatísticas de auditoria
CREATE VIEW audit_statistics AS
SELECT 
  DATE_TRUNC('day', timestamp) as date,
  type,
  severity,
  data_classification,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT ip) as unique_ips
FROM audit_events
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp), type, severity, data_classification
ORDER BY date DESC;

-- View para dashboard de compliance
CREATE VIEW compliance_dashboard AS
SELECT 
  framework,
  COUNT(*) as total_reports,
  AVG(score) as avg_score,
  COUNT(*) FILTER (WHERE status = 'compliant') as compliant_reports,
  COUNT(*) FILTER (WHERE status = 'non_compliant') as non_compliant_reports,
  COUNT(*) FILTER (WHERE status = 'partial') as partial_reports,
  MAX(generated_at) as last_report_date
FROM compliance_reports
WHERE generated_at >= NOW() - INTERVAL '90 days'
GROUP BY framework;

-- View para achados pendentes
CREATE VIEW pending_findings AS
SELECT 
  cf.*,
  cr.framework,
  u.email as assigned_to_email,
  CASE 
    WHEN cf.due_date < NOW() THEN 'overdue'
    WHEN cf.due_date < NOW() + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'on_track'
  END as urgency_status
FROM compliance_findings cf
JOIN compliance_reports cr ON cf.report_id = cr.id
LEFT JOIN auth.users u ON cf.assigned_to = u.id
WHERE cf.status IN ('open', 'in_progress')
ORDER BY 
  CASE cf.severity 
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  cf.due_date ASC NULLS LAST;

-- Inserir configurações padrão de compliance
INSERT INTO compliance_configurations (framework, enabled, retention_days, reporting_frequency_days, critical_controls) VALUES
('LGPD', true, 2555, 30, ARRAY['consent_management', 'data_subject_rights', 'breach_notification']),
('GDPR', true, 2555, 30, ARRAY['lawful_basis', 'data_minimization', 'privacy_by_design']),
('ISO27001', true, 1095, 90, ARRAY['risk_management', 'incident_management', 'access_control']),
('OWASP', true, 365, 30, ARRAY['injection_prevention', 'authentication', 'access_control'])
ON CONFLICT (framework) DO NOTHING;

-- Políticas de RLS (Row Level Security)
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_finding_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_metrics ENABLE ROW LEVEL SECURITY;

-- Política para eventos de auditoria (apenas admins e auditores)
CREATE POLICY "Audit events access" ON audit_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'auditor', 'compliance_officer')
    )
  );

-- Política para relatórios de compliance
CREATE POLICY "Compliance reports access" ON compliance_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'auditor', 'compliance_officer', 'manager')
    )
  );

-- Política para achados de compliance
CREATE POLICY "Compliance findings access" ON compliance_findings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'auditor', 'compliance_officer', 'manager')
    )
    OR assigned_to = auth.uid()
  );

-- Política para configurações (apenas admins)
CREATE POLICY "Compliance configurations access" ON compliance_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Política para histórico (apenas leitura para auditores)
CREATE POLICY "Compliance finding history access" ON compliance_finding_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'auditor', 'compliance_officer')
    )
  );

-- Política para métricas
CREATE POLICY "Compliance metrics access" ON compliance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'auditor', 'compliance_officer', 'manager')
    )
  );

-- Comentários para documentação
COMMENT ON TABLE audit_events IS 'Armazena todos os eventos de auditoria do sistema';
COMMENT ON TABLE compliance_reports IS 'Relatórios de compliance gerados automaticamente ou manualmente';
COMMENT ON TABLE compliance_findings IS 'Achados específicos identificados nos relatórios de compliance';
COMMENT ON TABLE compliance_configurations IS 'Configurações dos frameworks de compliance habilitados';
COMMENT ON TABLE compliance_finding_history IS 'Histórico de mudanças nos achados de compliance';
COMMENT ON TABLE compliance_metrics IS 'Métricas calculadas para monitoramento de compliance';

COMMENT ON FUNCTION cleanup_expired_audit_events() IS 'Remove eventos de auditoria expirados baseado no período de retenção';
COMMENT ON FUNCTION calculate_compliance_metrics(compliance_framework, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Calcula métricas de compliance para um framework e período específicos';
COMMENT ON FUNCTION generate_compliance_report(compliance_framework, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Gera relatório automático de compliance';

-- Criar job para limpeza automática (executar diariamente às 2:00 AM)
-- Nota: Isso requer a extensão pg_cron em produção
-- SELECT cron.schedule('cleanup-audit-events', '0 2 * * *', 'SELECT cleanup_expired_audit_events();');