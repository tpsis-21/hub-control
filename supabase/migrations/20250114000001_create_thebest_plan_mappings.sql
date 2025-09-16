-- Migration: Create TheBest Plan Mappings Table
-- Description: Implementa sistema de mapeamento entre pacotes TheBest e planos HubControl
-- Date: 2025-01-14
-- Author: Sistema de Integração TheBest ↔ HubControl

-- =====================================================
-- 1. CRIAR TABELA DE MAPEAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS thebest_plan_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  thebest_package_id UUID NOT NULL REFERENCES thebest_packages(id) ON DELETE CASCADE,
  hubcontrol_plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES thebest_configs(id) ON DELETE CASCADE,
  
  -- Configurações do mapeamento
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,              -- Mapeamento padrão para o pacote
  
  -- Configurações de sincronização
  sync_price BOOLEAN DEFAULT true,               -- Sincronizar preço
  sync_validity BOOLEAN DEFAULT true,            -- Sincronizar validade
  sync_screens BOOLEAN DEFAULT true,             -- Sincronizar telas
  
  -- Override de valores (opcional)
  override_price DECIMAL(10,2),                  -- Preço customizado
  override_validity INTEGER,                     -- Validade customizada (dias)
  override_screens INTEGER,                      -- Telas customizadas
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_package_plan_config UNIQUE(thebest_package_id, hubcontrol_plan_id, config_id),
  CONSTRAINT valid_override_price CHECK (override_price IS NULL OR override_price >= 0),
  CONSTRAINT valid_override_validity CHECK (override_validity IS NULL OR override_validity > 0),
  CONSTRAINT valid_override_screens CHECK (override_screens IS NULL OR override_screens > 0)
);

-- =====================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para busca por pacote TheBest
CREATE INDEX IF NOT EXISTS idx_thebest_mappings_package_id 
  ON thebest_plan_mappings(thebest_package_id);

-- Índice para busca por plano HubControl
CREATE INDEX IF NOT EXISTS idx_thebest_mappings_plan_id 
  ON thebest_plan_mappings(hubcontrol_plan_id);

-- Índice para busca por configuração
CREATE INDEX IF NOT EXISTS idx_thebest_mappings_config_id 
  ON thebest_plan_mappings(config_id);

-- Índice para mapeamentos ativos
CREATE INDEX IF NOT EXISTS idx_thebest_mappings_active 
  ON thebest_plan_mappings(is_active) WHERE is_active = true;

-- Índice para mapeamentos padrão
CREATE INDEX IF NOT EXISTS idx_thebest_mappings_default 
  ON thebest_plan_mappings(is_default, thebest_package_id) WHERE is_default = true;

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_thebest_mappings_config_active 
  ON thebest_plan_mappings(config_id, is_active) WHERE is_active = true;

-- Índice único para mapeamento padrão (substitui constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_thebest_mappings_unique_default 
  ON thebest_plan_mappings(thebest_package_id, config_id) 
  WHERE is_default = true;

-- =====================================================
-- 3. TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_thebest_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thebest_mappings_updated_at
  BEFORE UPDATE ON thebest_plan_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_thebest_mappings_updated_at();

-- =====================================================
-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE thebest_plan_mappings IS 'Tabela de mapeamento entre pacotes TheBest e planos HubControl';
COMMENT ON COLUMN thebest_plan_mappings.thebest_package_id IS 'ID do pacote TheBest';
COMMENT ON COLUMN thebest_plan_mappings.hubcontrol_plan_id IS 'ID do plano HubControl';
COMMENT ON COLUMN thebest_plan_mappings.config_id IS 'ID da configuração TheBest (isolamento por usuário)';
COMMENT ON COLUMN thebest_plan_mappings.is_active IS 'Se o mapeamento está ativo';
COMMENT ON COLUMN thebest_plan_mappings.is_default IS 'Se é o mapeamento padrão para o pacote';
COMMENT ON COLUMN thebest_plan_mappings.sync_price IS 'Se deve sincronizar preço do TheBest para HubControl';
COMMENT ON COLUMN thebest_plan_mappings.sync_validity IS 'Se deve sincronizar validade do TheBest para HubControl';
COMMENT ON COLUMN thebest_plan_mappings.sync_screens IS 'Se deve sincronizar número de telas do TheBest para HubControl';
COMMENT ON COLUMN thebest_plan_mappings.override_price IS 'Preço customizado (sobrescreve sincronização)';
COMMENT ON COLUMN thebest_plan_mappings.override_validity IS 'Validade customizada em dias (sobrescreve sincronização)';
COMMENT ON COLUMN thebest_plan_mappings.override_screens IS 'Número de telas customizado (sobrescreve sincronização)';

-- =====================================================
-- 5. HABILITAR RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE thebest_plan_mappings ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios mapeamentos
CREATE POLICY "Users can view their own mappings" ON thebest_plan_mappings
  FOR SELECT USING (
    config_id IN (
      SELECT id FROM thebest_configs 
      WHERE user_id = auth.uid()
    )
  );

-- Política para usuários criarem mapeamentos em suas configurações
CREATE POLICY "Users can create mappings for their configs" ON thebest_plan_mappings
  FOR INSERT WITH CHECK (
    config_id IN (
      SELECT id FROM thebest_configs 
      WHERE user_id = auth.uid()
    )
  );

-- Política para usuários atualizarem seus próprios mapeamentos
CREATE POLICY "Users can update their own mappings" ON thebest_plan_mappings
  FOR UPDATE USING (
    config_id IN (
      SELECT id FROM thebest_configs 
      WHERE user_id = auth.uid()
    )
  );

-- Política para usuários deletarem seus próprios mapeamentos
CREATE POLICY "Users can delete their own mappings" ON thebest_plan_mappings
  FOR DELETE USING (
    config_id IN (
      SELECT id FROM thebest_configs 
      WHERE user_id = auth.uid()
    )
  );

-- Política para administradores (acesso total)
CREATE POLICY "Admins have full access" ON thebest_plan_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 6. VERIFICAÇÃO DE INTEGRIDADE
-- =====================================================

-- Verificar se as tabelas referenciadas existem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thebest_packages') THEN
    RAISE EXCEPTION 'Tabela thebest_packages não encontrada. Execute as migrações do TheBest primeiro.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
    RAISE EXCEPTION 'Tabela plans não encontrada. Verifique a estrutura do HubControl.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thebest_configs') THEN
    RAISE EXCEPTION 'Tabela thebest_configs não encontrada. Execute as migrações do TheBest primeiro.';
  END IF;
  
  RAISE NOTICE 'Tabela thebest_plan_mappings criada com sucesso!';
END
$$;

-- =====================================================
-- 7. LOG DA MIGRAÇÃO
-- =====================================================

-- Log da migração
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250114000001_create_thebest_plan_mappings completed successfully';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Execute função convert_thebest_duration_to_days';
  RAISE NOTICE '2. Execute função auto_map_thebest_packages';
  RAISE NOTICE '3. Atualize view thebest_dashboard';
  RAISE NOTICE '4. Implemente interface de gerenciamento';
END $$;