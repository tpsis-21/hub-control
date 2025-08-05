-- SQL para criar as tabelas de marketing no Supabase
-- Execute este código no SQL Editor do Supabase Dashboard

-- 1. Criar tabela marketing_campaigns
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  template_id UUID,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela automation_rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela email_logs
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- 5. Criar tabela smtp_configs
CREATE TABLE IF NOT EXISTS public.smtp_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_encrypted TEXT NOT NULL,
  use_tls BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar tabela unsubscribe_records
CREATE TABLE IF NOT EXISTS public.unsubscribe_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  reason VARCHAR(500),
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL
);

-- 7. Criar tabela deliverability_metrics
CREATE TABLE IF NOT EXISTS public.deliverability_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_unsubscribed INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2) DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 8. Habilitar RLS (Row Level Security) para todas as tabelas
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unsubscribe_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverability_metrics ENABLE ROW LEVEL SECURITY;

-- 9. Criar políticas RLS para marketing_campaigns
CREATE POLICY "Users can view their own campaigns" ON public.marketing_campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON public.marketing_campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.marketing_campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.marketing_campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Criar políticas RLS para email_templates
CREATE POLICY "Users can view their own templates" ON public.email_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates" ON public.email_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.email_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.email_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 11. Criar políticas RLS para automation_rules
CREATE POLICY "Users can view their own automation rules" ON public.automation_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation rules" ON public.automation_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation rules" ON public.automation_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation rules" ON public.automation_rules
  FOR DELETE USING (auth.uid() = user_id);

-- 12. Criar políticas RLS para email_logs
CREATE POLICY "Users can view their own email logs" ON public.email_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email logs" ON public.email_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 13. Criar políticas RLS para smtp_configs
CREATE POLICY "Users can view their own SMTP configs" ON public.smtp_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SMTP configs" ON public.smtp_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMTP configs" ON public.smtp_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMTP configs" ON public.smtp_configs
  FOR DELETE USING (auth.uid() = user_id);

-- 14. Criar políticas RLS para unsubscribe_records
CREATE POLICY "Users can view unsubscribe records" ON public.unsubscribe_records
  FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can insert unsubscribe records" ON public.unsubscribe_records
  FOR INSERT WITH CHECK (TRUE);

-- 15. Criar políticas RLS para deliverability_metrics
CREATE POLICY "Users can view their own metrics" ON public.deliverability_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics" ON public.deliverability_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics" ON public.deliverability_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- 16. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_user_id ON public.marketing_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON public.email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_records_email ON public.unsubscribe_records(email);
CREATE INDEX IF NOT EXISTS idx_deliverability_metrics_user_date ON public.deliverability_metrics(user_id, date);

-- 17. Inserir template padrão
INSERT INTO public.email_templates (name, subject, content, variables) VALUES
('Template Padrão', 'Bem-vindo ao nosso sistema!', 
'<h1>Olá {{nome}}!</h1><p>Bem-vindo ao nosso sistema. Estamos felizes em tê-lo conosco.</p><p>Atenciosamente,<br>Equipe Hub Control</p>', 
'{"nome": "Nome do usuário"}'
) ON CONFLICT DO NOTHING;

-- 18. Comentários nas tabelas
COMMENT ON TABLE public.marketing_campaigns IS 'Campanhas de marketing e email';
COMMENT ON TABLE public.email_templates IS 'Templates de email reutilizáveis';
COMMENT ON TABLE public.automation_rules IS 'Regras de automação para envios automáticos';
COMMENT ON TABLE public.email_logs IS 'Logs de todos os emails enviados';
COMMENT ON TABLE public.smtp_configs IS 'Configurações SMTP dos usuários';
COMMENT ON TABLE public.unsubscribe_records IS 'Registros de descadastro de emails';
COMMENT ON TABLE public.deliverability_metrics IS 'Métricas de entregabilidade de emails';

-- Pronto! Todas as tabelas de marketing foram criadas com sucesso.