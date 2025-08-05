-- Criação das tabelas para o sistema de marketing e automação
-- Migration: 20241220000001_create_marketing_tables.sql

-- Tabela de campanhas de marketing
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  segmentation JSONB NOT NULL DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de templates de email
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de regras de automação
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL,
  conditions JSONB DEFAULT '[]',
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de logs de email
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR(255),
  client_id UUID,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configurações SMTP
CREATE TABLE IF NOT EXISTS smtp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  secure BOOLEAN DEFAULT TRUE,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL, -- Será criptografado na aplicação
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_tested TIMESTAMPTZ,
  test_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de descadastros
CREATE TABLE IF NOT EXISTS unsubscribe_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255),
  reason VARCHAR(255),
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Tabela de métricas de deliverability
CREATE TABLE IF NOT EXISTS deliverability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  spam_complaints INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2),
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  spam_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_last_executed ON automation_rules(last_executed);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_client_id ON email_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_smtp_configs_default ON smtp_configs(is_default);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_records_email ON unsubscribe_records(email);
CREATE INDEX IF NOT EXISTS idx_deliverability_metrics_date ON deliverability_metrics(date);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smtp_configs_updated_at
  BEFORE UPDATE ON smtp_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir templates padrão do sistema
INSERT INTO email_templates (id, name, subject, html_content, text_content, variables, category, is_system) VALUES
(
  'expiration_reminder',
  'Lembrete de Vencimento',
  '⚠️ Seu plano vence em breve - {{nome}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #e74c3c;">⚠️ Atenção: Seu plano vence em breve!</h2>
    <p>Olá <strong>{{nome}}</strong>,</p>
    <p>Seu plano IPTV vence em <strong>{{vencimento}}</strong>.</p>
    <p>Para evitar a interrupção do serviço, renove seu plano o quanto antes.</p>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Detalhes da sua conta:</strong></p>
      <ul>
        <li>Usuário: {{usuario}}</li>
        <li>Status: {{status}}</li>
        <li>Data de vencimento: {{vencimento}}</li>
      </ul>
    </div>
    <p>Entre em contato conosco para renovar seu plano.</p>
    <p>Atenciosamente,<br>Equipe de Suporte</p>
  </div>',
  'Olá {{nome}}, seu plano vence em {{vencimento}}. Renove o quanto antes para evitar interrupções.',
  ARRAY['nome', 'vencimento', 'usuario', 'status'],
  'expiration',
  TRUE
),
(
  'welcome_message',
  'Mensagem de Boas-vindas',
  '🎉 Bem-vindo(a) ao nosso serviço IPTV - {{nome}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #27ae60;">🎉 Bem-vindo(a) ao nosso serviço!</h2>
    <p>Olá <strong>{{nome}}</strong>,</p>
    <p>Seja muito bem-vindo(a) ao nosso serviço de IPTV!</p>
    <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Seus dados de acesso:</strong></p>
      <ul>
        <li>Usuário: {{usuario}}</li>
        <li>Válido até: {{vencimento}}</li>
      </ul>
    </div>
    <p>Se tiver dúvidas, entre em contato conosco.</p>
    <p>Aproveite nosso serviço!</p>
  </div>',
  'Bem-vindo {{nome}}! Seu usuário: {{usuario}}, válido até {{vencimento}}.',
  ARRAY['nome', 'usuario', 'vencimento'],
  'welcome',
  TRUE
),
(
  'renewal_confirmation',
  'Confirmação de Renovação',
  '✅ Renovação confirmada - {{nome}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #27ae60;">✅ Renovação confirmada!</h2>
    <p>Olá <strong>{{nome}}</strong>,</p>
    <p>Sua renovação foi processada com sucesso!</p>
    <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Detalhes da renovação:</strong></p>
      <ul>
        <li>Nova data de vencimento: {{vencimento}}</li>
        <li>Status: {{status}}</li>
      </ul>
    </div>
    <p>Obrigado por continuar conosco!</p>
  </div>',
  'Renovação confirmada {{nome}}! Nova data de vencimento: {{vencimento}}.',
  ARRAY['nome', 'vencimento', 'status'],
  'renewal',
  TRUE
);

-- Inserir regras de automação padrão
INSERT INTO automation_rules (id, name, description, trigger, conditions, actions, is_active) VALUES
(
  gen_random_uuid(),
  'Lembrete de Vencimento (1 dia antes)',
  'Envia lembrete automático 1 dia antes do vencimento',
  '{
    "event": "client_expiring",
    "frequency": "daily",
    "parameters": {
      "daysBeforeExpiration": 1
    }
  }',
  '[
    {
      "field": "hasEmail",
      "operator": "equals",
      "value": "true"
    }
  ]',
  '[
    {
      "type": "send_email",
      "parameters": {
        "templateId": "expiration_reminder",
        "subject": "⚠️ Seu plano vence amanhã - {{nome}}",
        "content": "<p>Olá {{nome}}, seu plano vence amanhã ({{vencimento}}). Renove agora para evitar interrupções!</p>"
      }
    }
  ]',
  TRUE
),
(
  gen_random_uuid(),
  'Boas-vindas para Novos Clientes',
  'Envia mensagem de boas-vindas para novos clientes',
  '{
    "event": "new_client",
    "frequency": "immediate",
    "parameters": {
      "hoursAfterCreation": 1
    }
  }',
  '[
    {
      "field": "hasEmail",
      "operator": "equals",
      "value": "true"
    },
    {
      "field": "status",
      "operator": "not_equals",
      "value": "Em teste"
    }
  ]',
  '[
    {
      "type": "send_email",
      "parameters": {
        "templateId": "welcome_message",
        "subject": "🎉 Bem-vindo(a) ao nosso serviço IPTV - {{nome}}",
        "content": "<p>Bem-vindo {{nome}}! Seus dados de acesso: {{usuario}}, válido até {{vencimento}}.</p>"
      }
    }
  ]',
  TRUE
);

-- Políticas RLS (Row Level Security)
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverability_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas para campanhas de marketing
CREATE POLICY "Users can view their own campaigns" ON marketing_campaigns
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create campaigns" ON marketing_campaigns
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own campaigns" ON marketing_campaigns
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own campaigns" ON marketing_campaigns
  FOR DELETE USING (auth.uid() = created_by);

-- Políticas para templates de email
CREATE POLICY "Users can view templates" ON email_templates
  FOR SELECT USING (is_system = TRUE OR auth.uid() = created_by);

CREATE POLICY "Users can create templates" ON email_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by AND is_system = FALSE);

CREATE POLICY "Users can update their own templates" ON email_templates
  FOR UPDATE USING (auth.uid() = created_by AND is_system = FALSE);

CREATE POLICY "Users can delete their own templates" ON email_templates
  FOR DELETE USING (auth.uid() = created_by AND is_system = FALSE);

-- Políticas para regras de automação
CREATE POLICY "Users can view their own automation rules" ON automation_rules
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create automation rules" ON automation_rules
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own automation rules" ON automation_rules
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own automation rules" ON automation_rules
  FOR DELETE USING (auth.uid() = created_by);

-- Políticas para logs de email (somente leitura)
CREATE POLICY "Users can view email logs" ON email_logs
  FOR SELECT USING (TRUE); -- Logs são visíveis para todos os usuários autenticados

-- Políticas para configurações SMTP
CREATE POLICY "Users can view their own SMTP configs" ON smtp_configs
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create SMTP configs" ON smtp_configs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own SMTP configs" ON smtp_configs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own SMTP configs" ON smtp_configs
  FOR DELETE USING (auth.uid() = created_by);

-- Políticas para descadastros (acesso público para o endpoint de descadastro)
CREATE POLICY "Anyone can create unsubscribe records" ON unsubscribe_records
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view unsubscribe records" ON unsubscribe_records
  FOR SELECT USING (TRUE);

-- Políticas para métricas de deliverability (somente leitura)
CREATE POLICY "Users can view deliverability metrics" ON deliverability_metrics
  FOR SELECT USING (TRUE);

-- Comentários nas tabelas
COMMENT ON TABLE marketing_campaigns IS 'Campanhas de marketing e email';
COMMENT ON TABLE email_templates IS 'Templates de email reutilizáveis';
COMMENT ON TABLE automation_rules IS 'Regras de automação para envios automáticos';
COMMENT ON TABLE email_logs IS 'Logs de todos os emails enviados';
COMMENT ON TABLE smtp_configs IS 'Configurações SMTP dos usuários';
COMMENT ON TABLE unsubscribe_records IS 'Registros de descadastro de emails';
COMMENT ON TABLE deliverability_metrics IS 'Métricas de entregabilidade de emails';