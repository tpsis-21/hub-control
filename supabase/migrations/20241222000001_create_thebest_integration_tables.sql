-- 📦 Migração: Tabelas para Integração The Best
-- Sistema para gerenciamento de pacotes e renovações The Best

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TABELA DE CONFIGURAÇÕES THE BEST
-- =====================================================

-- Tabela para configurações da API The Best por usuário
CREATE TABLE IF NOT EXISTS thebest_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Configurações da API
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL, -- Será criptografado
  api_secret TEXT, -- Será criptografado se necessário
  
  -- Configurações adicionais
  name TEXT NOT NULL DEFAULT 'Configuração The Best',
  description TEXT,
  
  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 1000,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_user_default_thebest UNIQUE(user_id) WHERE is_default = true,
  CONSTRAINT unique_user_name_thebest UNIQUE(user_id, name)
);

-- =====================================================
-- 2. TABELA DE PACOTES THE BEST
-- =====================================================

-- Enum para classificação de pacotes
CREATE TYPE thebest_package_classification AS ENUM (
  'COM_ADULTO',
  'SEM_ADULTO'
);

-- Enum para duração de pacotes
CREATE TYPE thebest_package_duration AS ENUM (
  '1_MES',
  '3_MESES',
  '6_MESES',
  '12_MESES'
);

-- Tabela para pacotes The Best
CREATE TABLE IF NOT EXISTS thebest_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES thebest_configs(id) ON DELETE CASCADE,
  
  -- Dados do pacote (baseado no CSV)
  external_id TEXT NOT NULL, -- ID do pacote na API The Best
  classificacao thebest_package_classification NOT NULL,
  duracao thebest_package_duration NOT NULL,
  telas INTEGER NOT NULL,
  creditos INTEGER NOT NULL,
  
  -- Informações adicionais
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_config_external_id UNIQUE(config_id, external_id)
);

-- =====================================================
-- 3. TABELA DE RENOVAÇÕES
-- =====================================================

-- Enum para status de renovação
CREATE TYPE thebest_renewal_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

-- Tabela para renovações The Best
CREATE TABLE IF NOT EXISTS thebest_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES thebest_configs(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES thebest_packages(id) ON DELETE CASCADE,
  
  -- Dados da renovação
  external_renewal_id TEXT, -- ID da renovação na API The Best
  customer_id UUID REFERENCES profiles(id), -- Cliente que fez a renovação
  customer_email TEXT,
  customer_name TEXT,
  
  -- Detalhes do pacote renovado
  package_external_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  package_classificacao thebest_package_classification NOT NULL,
  package_duracao thebest_package_duration NOT NULL,
  package_telas INTEGER NOT NULL,
  package_creditos INTEGER NOT NULL,
  
  -- Valores
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  -- Status e datas
  status thebest_renewal_status DEFAULT 'PENDING',
  renewal_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Dados adicionais
  metadata JSONB, -- Dados extras da API
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABELA DE LOGS DE API
-- =====================================================

-- Enum para tipos de operação
CREATE TYPE thebest_operation_type AS ENUM (
  'GET_PACKAGES',
  'CREATE_RENEWAL',
  'GET_RENEWAL',
  'UPDATE_RENEWAL',
  'CANCEL_RENEWAL',
  'SYNC_PACKAGES',
  'TEST_CONNECTION'
);

-- Tabela para logs de operações da API The Best
CREATE TABLE IF NOT EXISTS thebest_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES thebest_configs(id) ON DELETE CASCADE,
  
  -- Dados da operação
  operation_type thebest_operation_type NOT NULL,
  endpoint TEXT NOT NULL,
  http_method TEXT NOT NULL,
  
  -- Request/Response
  request_data JSONB,
  response_data JSONB,
  response_status INTEGER,
  
  -- Timing
  duration_ms INTEGER,
  
  -- Status
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para thebest_configs
CREATE INDEX IF NOT EXISTS idx_thebest_configs_user_id ON thebest_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_thebest_configs_active ON thebest_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_thebest_configs_default ON thebest_configs(user_id, is_default);

-- Índices para thebest_packages
CREATE INDEX IF NOT EXISTS idx_thebest_packages_config_id ON thebest_packages(config_id);
CREATE INDEX IF NOT EXISTS idx_thebest_packages_external_id ON thebest_packages(external_id);
CREATE INDEX IF NOT EXISTS idx_thebest_packages_active ON thebest_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_thebest_packages_classification ON thebest_packages(classificacao);
CREATE INDEX IF NOT EXISTS idx_thebest_packages_duration ON thebest_packages(duracao);

-- Índices para thebest_renewals
CREATE INDEX IF NOT EXISTS idx_thebest_renewals_config_id ON thebest_renewals(config_id);
CREATE INDEX IF NOT EXISTS idx_thebest_renewals_package_id ON thebest_renewals(package_id);
CREATE INDEX IF NOT EXISTS idx_thebest_renewals_customer_id ON thebest_renewals(customer_id);
CREATE INDEX IF NOT EXISTS idx_thebest_renewals_status ON thebest_renewals(status);
CREATE INDEX IF NOT EXISTS idx_thebest_renewals_renewal_date ON thebest_renewals(renewal_date);
CREATE INDEX IF NOT EXISTS idx_thebest_renewals_expiry_date ON thebest_renewals(expiry_date);

-- Índices para thebest_api_logs
CREATE INDEX IF NOT EXISTS idx_thebest_api_logs_config_id ON thebest_api_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_thebest_api_logs_operation_type ON thebest_api_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_thebest_api_logs_created_at ON thebest_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_thebest_api_logs_success ON thebest_api_logs(success);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE thebest_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE thebest_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE thebest_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE thebest_api_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para thebest_configs
CREATE POLICY "thebest_configs_select" ON thebest_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "thebest_configs_insert" ON thebest_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "thebest_configs_update" ON thebest_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "thebest_configs_delete" ON thebest_configs
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para thebest_packages
CREATE POLICY "thebest_packages_select" ON thebest_packages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_packages.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "thebest_packages_insert" ON thebest_packages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_packages.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "thebest_packages_update" ON thebest_packages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_packages.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "thebest_packages_delete" ON thebest_packages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_packages.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

-- Políticas para thebest_renewals
CREATE POLICY "thebest_renewals_select" ON thebest_renewals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_renewals.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "thebest_renewals_insert" ON thebest_renewals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_renewals.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "thebest_renewals_update" ON thebest_renewals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_renewals.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "thebest_renewals_delete" ON thebest_renewals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_renewals.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

-- Políticas para thebest_api_logs
CREATE POLICY "thebest_api_logs_select" ON thebest_api_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_api_logs.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "thebest_api_logs_insert" ON thebest_api_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM thebest_configs 
      WHERE thebest_configs.id = thebest_api_logs.config_id 
      AND thebest_configs.user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. TRIGGERS PARA AUDITORIA
-- =====================================================

-- Trigger para atualizar updated_at em thebest_configs
CREATE OR REPLACE FUNCTION update_thebest_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thebest_configs_updated_at
  BEFORE UPDATE ON thebest_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_thebest_configs_updated_at();

-- Trigger para definir created_by em thebest_configs
CREATE OR REPLACE FUNCTION set_thebest_configs_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_thebest_configs_created_by
  BEFORE INSERT ON thebest_configs
  FOR EACH ROW
  EXECUTE FUNCTION set_thebest_configs_created_by();

-- Trigger para atualizar updated_at em thebest_packages
CREATE OR REPLACE FUNCTION update_thebest_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thebest_packages_updated_at
  BEFORE UPDATE ON thebest_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_thebest_packages_updated_at();

-- Trigger para atualizar updated_at em thebest_renewals
CREATE OR REPLACE FUNCTION update_thebest_renewals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thebest_renewals_updated_at
  BEFORE UPDATE ON thebest_renewals
  FOR EACH ROW
  EXECUTE FUNCTION update_thebest_renewals_updated_at();

-- =====================================================
-- 8. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para sincronizar pacotes do CSV
CREATE OR REPLACE FUNCTION sync_thebest_packages_from_csv(
  p_config_id UUID,
  p_packages JSONB
)
RETURNS INTEGER AS $$
DECLARE
  package_record JSONB;
  inserted_count INTEGER := 0;
BEGIN
  -- Iterar sobre os pacotes do CSV
  FOR package_record IN SELECT * FROM jsonb_array_elements(p_packages)
  LOOP
    -- Inserir ou atualizar pacote
    INSERT INTO thebest_packages (
      config_id,
      external_id,
      classificacao,
      duracao,
      telas,
      creditos,
      name,
      description
    ) VALUES (
      p_config_id,
      package_record->>'ID',
      (package_record->>'Classificacao')::thebest_package_classification,
      (package_record->>'Duracao')::thebest_package_duration,
      (package_record->>'Telas')::INTEGER,
      (package_record->>'Creditos')::INTEGER,
      CONCAT(
        package_record->>'Classificacao', ' - ',
        package_record->>'Duracao', ' - ',
        package_record->>'Telas', ' telas'
      ),
      CONCAT(
        'Pacote ', package_record->>'Classificacao', 
        ' com duração de ', package_record->>'Duracao',
        ' para ', package_record->>'Telas', ' telas',
        ' (', package_record->>'Creditos', ' créditos)'
      )
    )
    ON CONFLICT (config_id, external_id) 
    DO UPDATE SET
      classificacao = EXCLUDED.classificacao,
      duracao = EXCLUDED.duracao,
      telas = EXCLUDED.telas,
      creditos = EXCLUDED.creditos,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = NOW(),
      last_sync_at = NOW();
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE thebest_configs IS 'Configurações da API The Best por usuário';
COMMENT ON TABLE thebest_packages IS 'Pacotes disponíveis na plataforma The Best';
COMMENT ON TABLE thebest_renewals IS 'Renovações de pacotes The Best';
COMMENT ON TABLE thebest_api_logs IS 'Logs de operações da API The Best';

COMMENT ON COLUMN thebest_configs.api_key IS 'Chave da API (criptografada)';
COMMENT ON COLUMN thebest_configs.api_secret IS 'Segredo da API (criptografado)';
COMMENT ON COLUMN thebest_packages.external_id IS 'ID do pacote na API The Best';
COMMENT ON COLUMN thebest_renewals.external_renewal_id IS 'ID da renovação na API The Best';

-- =====================================================
-- 10. DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Inserir dados dos pacotes do CSV (exemplo)
-- Isso pode ser feito via aplicação ou script separado

-- Exemplo de inserção de pacote
/*
INSERT INTO thebest_packages (
  config_id,
  external_id,
  classificacao,
  duracao,
  telas,
  creditos,
  name,
  description
) VALUES (
  'uuid-da-config',
  '1',
  'COM_ADULTO',
  '1_MES',
  1,
  30,
  'COM ADULTO - 1 MÊS - 1 tela',
  'Pacote COM ADULTO com duração de 1 MÊS para 1 tela (30 créditos)'
);
*/

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

-- Verificar se as tabelas foram criadas com sucesso
SELECT 
  'thebest_configs' as tabela,
  COUNT(*) as registros
FROM thebest_configs
UNION ALL
SELECT 
  'thebest_packages' as tabela,
  COUNT(*) as registros
FROM thebest_packages
UNION ALL
SELECT 
  'thebest_renewals' as tabela,
  COUNT(*) as registros
FROM thebest_renewals
UNION ALL
SELECT 
  'thebest_api_logs' as tabela,
  COUNT(*) as registros
FROM thebest_api_logs;

-- Mensagem de sucesso
SELECT 'Migração The Best concluída com sucesso!' as status;