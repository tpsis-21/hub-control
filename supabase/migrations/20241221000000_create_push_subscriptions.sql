-- Criação da tabela push_subscriptions para o sistema de notificações push
-- Esta migração resolve o TODO crítico encontrado em push-notifications/route.ts

-- Tabela para armazenar subscriptions de push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  ip_address INET,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_user_endpoint UNIQUE(user_id, endpoint)
);

-- Índices para performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_created_at ON push_subscriptions(created_at);
CREATE INDEX idx_push_subscriptions_last_used ON push_subscriptions(last_used_at) WHERE last_used_at IS NOT NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- RLS (Row Level Security)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver apenas suas próprias subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Política: usuários podem inserir suas próprias subscriptions
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: usuários podem atualizar suas próprias subscriptions
CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Política: usuários podem deletar suas próprias subscriptions
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Política: admins podem gerenciar todas as subscriptions
CREATE POLICY "Admins can manage all push subscriptions" ON push_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Grants de permissão
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT ON push_subscriptions TO anon;

-- Comentários para documentação
COMMENT ON TABLE push_subscriptions IS 'Armazena subscriptions de push notifications dos usuários';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL do endpoint para envio de push notifications';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Chave pública P-256 para criptografia';
COMMENT ON COLUMN push_subscriptions.auth IS 'Chave de autenticação para push notifications';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'User agent do navegador que criou a subscription';
COMMENT ON COLUMN push_subscriptions.ip_address IS 'Endereço IP de onde a subscription foi criada';
COMMENT ON COLUMN push_subscriptions.is_active IS 'Indica se a subscription está ativa';
COMMENT ON COLUMN push_subscriptions.last_used_at IS 'Última vez que a subscription foi usada para envio';