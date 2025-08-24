-- =====================================================
-- MIGRAÇÃO THE BEST - EXECUÇÃO MANUAL NO SUPABASE
-- =====================================================
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/[SEU-PROJECT-ID]/sql

-- 1. Criar ENUM para status de pacotes
DO $$ BEGIN
  CREATE TYPE thebest_package_status AS ENUM ('active', 'suspended', 'cancelled', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Criar tabela thebest_configs
CREATE TABLE IF NOT EXISTS thebest_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  api_url TEXT NOT NULL DEFAULT 'https://api.thebest.com.br',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Criar tabela thebest_packages
CREATE TABLE IF NOT EXISTS thebest_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thebest_package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  status thebest_package_status DEFAULT 'active',
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  billing_cycle TEXT,
  next_due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, thebest_package_id)
);

-- 4. Criar tabela thebest_renewals
CREATE TABLE IF NOT EXISTS thebest_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES thebest_packages(id) ON DELETE CASCADE,
  renewal_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar tabela thebest_api_logs
CREATE TABLE IF NOT EXISTS thebest_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_thebest_configs_user_id ON thebest_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_thebest_packages_user_id ON thebest_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_thebest_packages_status ON thebest_packages(status);
CREATE INDEX IF NOT EXISTS idx_thebest_renewals_package_id ON thebest_renewals(package_id);
CREATE INDEX IF NOT EXISTS idx_thebest_renewals_date ON thebest_renewals(renewal_date);
CREATE INDEX IF NOT EXISTS idx_thebest_api_logs_user_id ON thebest_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_thebest_api_logs_created_at ON thebest_api_logs(created_at);

-- 7. Habilitar Row Level Security (RLS)
ALTER TABLE thebest_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE thebest_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE thebest_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE thebest_api_logs ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas de segurança

-- Políticas para thebest_configs
DROP POLICY IF EXISTS "Users can manage their own thebest configs" ON thebest_configs;
CREATE POLICY "Users can manage their own thebest configs" ON thebest_configs
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para thebest_packages
DROP POLICY IF EXISTS "Users can view their own thebest packages" ON thebest_packages;
CREATE POLICY "Users can view their own thebest packages" ON thebest_packages
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para thebest_renewals
DROP POLICY IF EXISTS "Users can view renewals of their packages" ON thebest_renewals;
CREATE POLICY "Users can view renewals of their packages" ON thebest_renewals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM thebest_packages 
      WHERE thebest_packages.id = thebest_renewals.package_id 
      AND thebest_packages.user_id = auth.uid()
    )
  );

-- Políticas para thebest_api_logs
DROP POLICY IF EXISTS "Users can view their own api logs" ON thebest_api_logs;
CREATE POLICY "Users can view their own api logs" ON thebest_api_logs
  FOR ALL USING (auth.uid() = user_id);

-- 9. Criar função para sincronizar pacotes de CSV
CREATE OR REPLACE FUNCTION sync_thebest_packages_from_csv(
  p_user_id UUID,
  p_csv_data TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  packages_synced INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_packages_count INTEGER := 0;
  v_line TEXT;
  v_fields TEXT[];
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN QUERY SELECT false, 'Usuário não encontrado', 0;
    RETURN;
  END IF;
  
  -- Processar CSV (implementação básica)
  -- Em produção, usar uma biblioteca CSV mais robusta
  FOR v_line IN SELECT unnest(string_to_array(p_csv_data, E'\n'))
  LOOP
    IF v_line IS NOT NULL AND trim(v_line) != '' THEN
      v_fields := string_to_array(v_line, ',');
      
      -- Inserir ou atualizar pacote
      INSERT INTO thebest_packages (
        user_id,
        thebest_package_id,
        package_name,
        status,
        price,
        currency,
        billing_cycle,
        synced_at
      ) VALUES (
        p_user_id,
        trim(v_fields[1]),
        trim(v_fields[2]),
        COALESCE(trim(v_fields[3])::thebest_package_status, 'active'),
        COALESCE(trim(v_fields[4])::DECIMAL(10,2), 0),
        COALESCE(trim(v_fields[5]), 'BRL'),
        COALESCE(trim(v_fields[6]), 'monthly'),
        NOW()
      )
      ON CONFLICT (user_id, thebest_package_id)
      DO UPDATE SET
        package_name = EXCLUDED.package_name,
        status = EXCLUDED.status,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        billing_cycle = EXCLUDED.billing_cycle,
        synced_at = NOW(),
        updated_at = NOW();
      
      v_packages_count := v_packages_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT true, 'Pacotes sincronizados com sucesso', v_packages_count;
END;
$$;

-- 10. Criar triggers para atualização automática de timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers nas tabelas
DROP TRIGGER IF EXISTS update_thebest_configs_updated_at ON thebest_configs;
CREATE TRIGGER update_thebest_configs_updated_at
  BEFORE UPDATE ON thebest_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_thebest_packages_updated_at ON thebest_packages;
CREATE TRIGGER update_thebest_packages_updated_at
  BEFORE UPDATE ON thebest_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_thebest_renewals_updated_at ON thebest_renewals;
CREATE TRIGGER update_thebest_renewals_updated_at
  BEFORE UPDATE ON thebest_renewals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Criar view para dashboard de pacotes
CREATE OR REPLACE VIEW thebest_dashboard AS
SELECT 
  p.id,
  p.user_id,
  p.thebest_package_id,
  p.package_name,
  p.status,
  p.price,
  p.currency,
  p.billing_cycle,
  p.next_due_date,
  p.created_at,
  p.updated_at,
  p.synced_at,
  COUNT(r.id) as renewal_count,
  MAX(r.renewal_date) as last_renewal_date
FROM thebest_packages p
LEFT JOIN thebest_renewals r ON p.id = r.package_id
GROUP BY p.id, p.user_id, p.thebest_package_id, p.package_name, 
         p.status, p.price, p.currency, p.billing_cycle, 
         p.next_due_date, p.created_at, p.updated_at, p.synced_at;

-- 12. Comentários nas tabelas para documentação
COMMENT ON TABLE thebest_configs IS 'Configurações da API The Best por usuário';
COMMENT ON TABLE thebest_packages IS 'Pacotes sincronizados da API The Best';
COMMENT ON TABLE thebest_renewals IS 'Histórico de renovações dos pacotes';
COMMENT ON TABLE thebest_api_logs IS 'Logs das chamadas para a API The Best';

COMMENT ON COLUMN thebest_configs.api_key IS 'Chave da API The Best do usuário';
COMMENT ON COLUMN thebest_configs.api_url IS 'URL base da API The Best';
COMMENT ON COLUMN thebest_packages.thebest_package_id IS 'ID do pacote na API The Best';
COMMENT ON COLUMN thebest_packages.status IS 'Status do pacote: active, suspended, cancelled, pending';
COMMENT ON COLUMN thebest_packages.synced_at IS 'Última sincronização com a API';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

-- Para verificar se tudo foi criado corretamente, execute:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'thebest_%';
-- SELECT * FROM thebest_dashboard LIMIT 5;