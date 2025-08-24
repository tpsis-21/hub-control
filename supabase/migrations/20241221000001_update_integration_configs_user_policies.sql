-- Atualizar políticas RLS da tabela integration_configs para suportar configurações por usuário

-- Remover políticas antigas
DROP POLICY IF EXISTS "integration_configs_select" ON integration_configs;
DROP POLICY IF EXISTS "integration_configs_insert" ON integration_configs;
DROP POLICY IF EXISTS "integration_configs_update" ON integration_configs;
DROP POLICY IF EXISTS "integration_configs_delete" ON integration_configs;

-- Política para permitir que usuários vejam apenas suas próprias configurações
-- Administradores podem ver todas
CREATE POLICY "integration_configs_select_user" ON integration_configs
  FOR SELECT USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para permitir que usuários criem suas próprias configurações
CREATE POLICY "integration_configs_insert_user" ON integration_configs
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    auth.role() = 'authenticated'
  );

-- Política para permitir que usuários atualizem apenas suas próprias configurações
-- Administradores podem atualizar todas
CREATE POLICY "integration_configs_update_user" ON integration_configs
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  ) WITH CHECK (
    auth.uid() = updated_by
  );

-- Política para permitir que usuários deletem apenas suas próprias configurações
-- Administradores podem deletar todas
CREATE POLICY "integration_configs_delete_user" ON integration_configs
  FOR DELETE USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Atualizar trigger para definir updated_by automaticamente
CREATE OR REPLACE FUNCTION update_integration_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar trigger para definir created_by automaticamente em inserções
CREATE OR REPLACE FUNCTION set_integration_configs_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_integration_configs_created_by
  BEFORE INSERT ON integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION set_integration_configs_created_by();

-- Remover a configuração padrão NATV global (cada usuário terá a sua)
DELETE FROM integration_configs WHERE provider = 'natv' AND name = 'NATV Revenda API';

-- Comentários atualizados
COMMENT ON TABLE integration_configs IS 'Configurações para integrações com APIs externas - cada usuário pode ter suas próprias configurações';
COMMENT ON COLUMN integration_configs.created_by IS 'ID do usuário que criou a configuração';
COMMENT ON COLUMN integration_configs.updated_by IS 'ID do usuário que atualizou a configuração pela última vez';