-- Tabela para configurações de integrações externas
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL, -- 'natv', 'whatsapp', 'email', etc.
  name VARCHAR(100) NOT NULL, -- Nome amigável da configuração
  base_url VARCHAR(255), -- URL base da API
  auth_token TEXT, -- Token de autenticação (criptografado)
  auth_type VARCHAR(20) DEFAULT 'bearer', -- 'bearer', 'api_key', 'basic', etc.
  config_data JSONB, -- Dados específicos da configuração em JSON
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Se é a configuração padrão para o provider
  rate_limit_per_minute INTEGER, -- Limite de requisições por minuto
  rate_limit_per_day INTEGER, -- Limite de requisições por dia
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_provider_name UNIQUE(provider, name),
  CONSTRAINT unique_default_provider UNIQUE(provider) WHERE is_default = true
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_integration_configs_provider ON integration_configs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_configs_active ON integration_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_integration_configs_default ON integration_configs(provider, is_default);

-- RLS (Row Level Security)
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "integration_configs_select" ON integration_configs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção/atualização apenas para administradores
CREATE POLICY "integration_configs_insert" ON integration_configs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "integration_configs_update" ON integration_configs
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "integration_configs_delete" ON integration_configs
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_integration_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_integration_configs_updated_at
  BEFORE UPDATE ON integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_configs_updated_at();

-- Inserir configuração padrão do NATV (exemplo)
INSERT INTO integration_configs (
  provider,
  name,
  base_url,
  auth_token,
  auth_type,
  config_data,
  is_active,
  is_default,
  rate_limit_per_minute,
  rate_limit_per_day
) VALUES (
  'natv',
  'NATV Revenda API',
  'https://revenda.pixbot.link',
  'SEU_TOKEN_AQUI', -- Substituir pelo token real
  'bearer',
  '{
    "endpoints": {
      "createUser": "/user",
      "activation": "/user/activation",
      "search": "/user/search",
      "test": "/test"
    },
    "limits": {
      "createUser": {
        "per30s": 5,
        "perDay": 50
      }
    }
  }'::jsonb,
  false, -- Inicialmente inativo até configurar o token
  true,
  60, -- 60 requisições por minuto (limite global)
  1000 -- 1000 requisições por dia
) ON CONFLICT (provider, name) DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE integration_configs IS 'Configurações para integrações com APIs externas';
COMMENT ON COLUMN integration_configs.provider IS 'Identificador do provedor da integração';
COMMENT ON COLUMN integration_configs.auth_token IS 'Token de autenticação (deve ser criptografado em produção)';
COMMENT ON COLUMN integration_configs.config_data IS 'Dados específicos da configuração em formato JSON';
COMMENT ON COLUMN integration_configs.rate_limit_per_minute IS 'Limite de requisições por minuto';
COMMENT ON COLUMN integration_configs.rate_limit_per_day IS 'Limite de requisições por dia';