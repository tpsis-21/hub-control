-- Migração: Criar tabela de notificações in-app e adicionar campo aos servidores
-- Data: $(date)
-- Descrição: Implementa sistema de notificações in-app para pagamentos

-- Primeiro, adicionar coluna user_id à tabela clients se não existir
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar tabela de notificações in-app
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment_activated', 'payment_pending', 'payment_confirmed', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_client_id ON in_app_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_read ON in_app_notifications(read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread ON in_app_notifications(user_id, read) WHERE read = FALSE;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_in_app_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_in_app_notifications_updated_at
  BEFORE UPDATE ON in_app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_in_app_notifications_updated_at();

-- Adicionar campo payment_notifications aos servidores
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS payment_notifications BOOLEAN DEFAULT TRUE;

-- Expandir tabela de pagamentos com novos status e campos
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments 
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('Pago', 'Pendente', 'Atrasado', 'Aguardando', 'Confirmado', 'Recusado', 'Pendente de ativação manual', 'Ativado'));

-- Adicionar novos campos à tabela de pagamentos
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'subscription',
ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES servers(id);

-- Comentários para documentação
COMMENT ON TABLE in_app_notifications IS 'Tabela para armazenar notificações in-app dos usuários';
COMMENT ON COLUMN in_app_notifications.type IS 'Tipo da notificação: payment_activated, payment_pending, payment_confirmed, system';
COMMENT ON COLUMN in_app_notifications.data IS 'Dados adicionais da notificação em formato JSON';
COMMENT ON COLUMN in_app_notifications.client_id IS 'Cliente associado à notificação (opcional)';
COMMENT ON COLUMN clients.user_id IS 'Usuário autenticado associado ao cliente (opcional)';
COMMENT ON COLUMN servers.payment_notifications IS 'Se o servidor deve enviar notificações de pagamento';
COMMENT ON COLUMN payments.notified IS 'Se o usuário foi notificado sobre este pagamento';
COMMENT ON COLUMN payments.payment_type IS 'Tipo do pagamento: subscription, renewal, upgrade, etc.';
COMMENT ON COLUMN payments.server_id IS 'Servidor associado ao pagamento';

-- Inserir dados de exemplo (opcional - remover em produção)
-- INSERT INTO in_app_notifications (user_id, type, title, message, data) 
-- VALUES 
-- ('user-uuid-here', 'payment_activated', 'Pagamento Ativado', 'Seu pagamento foi processado e o acesso foi liberado!', '{"payment_id": "payment-uuid"}');