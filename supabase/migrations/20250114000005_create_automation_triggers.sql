-- Migration: Create Automation Triggers
-- Description: Cria triggers para automação de sincronização e mapeamento
-- Date: 2025-01-14
-- Author: Sistema de Integração TheBest ↔ HubControl

-- =====================================================
-- 1. FUNÇÃO TRIGGER PARA AUTO-MAPEAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_map_new_packages()
RETURNS TRIGGER AS $$
DECLARE
  mapping_result RECORD;
  auto_mapping_enabled BOOLEAN := true;
BEGIN
  -- Verificar se auto-mapeamento está habilitado para esta configuração
  SELECT COALESCE(tc.auto_mapping_enabled, true) INTO auto_mapping_enabled
  FROM thebest_configs tc
  WHERE tc.id = NEW.config_id;
  
  -- Se auto-mapeamento estiver habilitado e o pacote estiver ativo
  IF auto_mapping_enabled AND NEW.is_active = true THEN
    -- Log do início do auto-mapeamento
    RAISE NOTICE 'Iniciando auto-mapeamento para novo pacote: % (ID: %)', NEW.name, NEW.id;
    
    -- Executar auto-mapeamento para este pacote específico
    BEGIN
      SELECT * INTO mapping_result
      FROM auto_map_thebest_packages(
        p_config_id := NEW.config_id,
        p_package_id := NEW.id,
        p_create_mappings := true,
        p_min_similarity := 0.7
      )
      LIMIT 1;
      
      -- Log do resultado
      IF mapping_result.mapping_created THEN
        RAISE NOTICE 'Auto-mapeamento criado: Pacote % → Plano % (similaridade: %)', 
          NEW.name, mapping_result.suggested_plan_name, mapping_result.similarity_score;
      ELSE
        RAISE NOTICE 'Nenhum mapeamento automático criado para pacote %: %', 
          NEW.name, mapping_result.reason;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro no auto-mapeamento do pacote %: %', NEW.name, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. FUNÇÃO TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_sync_on_package_change()
RETURNS TRIGGER AS $$
DECLARE
  sync_result RECORD;
  changes_detected BOOLEAN := false;
BEGIN
  -- Verificar se houve mudanças relevantes
  IF TG_OP = 'UPDATE' THEN
    changes_detected := (
      OLD.price IS DISTINCT FROM NEW.price OR
      OLD.telas IS DISTINCT FROM NEW.telas OR
      OLD.duracao IS DISTINCT FROM NEW.duracao OR
      OLD.is_active IS DISTINCT FROM NEW.is_active
    );
  ELSIF TG_OP = 'INSERT' THEN
    changes_detected := true;
  END IF;
  
  -- Se houve mudanças relevantes, executar sincronização
  IF changes_detected THEN
    -- Log da sincronização automática
    RAISE NOTICE 'Sincronização automática iniciada para pacote: % (operação: %)', 
      COALESCE(NEW.name, OLD.name), TG_OP;
    
    BEGIN
      -- Executar sincronização TheBest → HubControl para este pacote
      FOR sync_result IN
        SELECT * FROM sync_thebest_to_hubcontrol(
          p_config_id := COALESCE(NEW.config_id, OLD.config_id),
          p_package_id := COALESCE(NEW.id, OLD.id),
          p_dry_run := false
        )
      LOOP
        IF sync_result.success THEN
          RAISE NOTICE 'Sincronização automática: % - % → %', 
            sync_result.action, sync_result.old_value, sync_result.new_value;
        ELSE
          RAISE WARNING 'Erro na sincronização automática: %', sync_result.error_message;
        END IF;
      END LOOP;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro na sincronização automática do pacote %: %', 
          COALESCE(NEW.name, OLD.name), SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. FUNÇÃO TRIGGER PARA SINCRONIZAÇÃO DE PLANOS
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_sync_on_plan_change()
RETURNS TRIGGER AS $$
DECLARE
  sync_result RECORD;
  changes_detected BOOLEAN := false;
  affected_configs UUID[];
  config_id UUID;
BEGIN
  -- Verificar se houve mudanças relevantes
  IF TG_OP = 'UPDATE' THEN
    changes_detected := (
      OLD.price IS DISTINCT FROM NEW.price OR
      OLD.validity IS DISTINCT FROM NEW.validity OR
      OLD.screens IS DISTINCT FROM NEW.screens
    );
  ELSIF TG_OP = 'INSERT' THEN
    changes_detected := true;
  END IF;
  
  -- Se houve mudanças relevantes, executar sincronização reversa
  IF changes_detected THEN
    -- Encontrar configurações afetadas por este plano
    SELECT ARRAY_AGG(DISTINCT tpm.config_id) INTO affected_configs
    FROM thebest_plan_mappings tpm
    WHERE tpm.hubcontrol_plan_id = COALESCE(NEW.id, OLD.id)
    AND tpm.is_active = true;
    
    -- Log da sincronização automática
    RAISE NOTICE 'Sincronização reversa automática iniciada para plano: % (operação: %, configurações afetadas: %)', 
      COALESCE(NEW.name, OLD.name), TG_OP, array_length(affected_configs, 1);
    
    -- Executar sincronização para cada configuração afetada
    IF affected_configs IS NOT NULL THEN
      FOREACH config_id IN ARRAY affected_configs
      LOOP
        BEGIN
          -- Executar sincronização HubControl → TheBest para este plano
          FOR sync_result IN
            SELECT * FROM sync_hubcontrol_to_thebest(
              p_config_id := config_id,
              p_plan_id := COALESCE(NEW.id, OLD.id),
              p_dry_run := false
            )
          LOOP
            IF sync_result.success THEN
              RAISE NOTICE 'Sincronização reversa automática: % - % → %', 
                sync_result.action, sync_result.old_value, sync_result.new_value;
            ELSE
              RAISE WARNING 'Erro na sincronização reversa automática: %', sync_result.error_message;
            END IF;
          END LOOP;
          
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Erro na sincronização reversa automática para configuração %: %', 
              config_id, SQLERRM;
        END;
      END LOOP;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNÇÃO TRIGGER PARA VALIDAÇÃO DE MAPEAMENTOS
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_validate_mapping_on_change()
RETURNS TRIGGER AS $$
DECLARE
  validation_result RECORD;
BEGIN
  -- Validar o mapeamento antes de inserir/atualizar
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Executar validação
    SELECT * INTO validation_result
    FROM validate_thebest_mapping(
      p_package_id := NEW.thebest_package_id,
      p_plan_id := NEW.hubcontrol_plan_id
    );
    
    -- Se a validação falhar com severidade alta, impedir a operação
    IF NOT validation_result.is_valid AND validation_result.severity = 'high' THEN
      RAISE EXCEPTION 'Mapeamento inválido: %', validation_result.message;
    END IF;
    
    -- Log de avisos para severidade média/baixa
    IF NOT validation_result.is_valid AND validation_result.severity IN ('medium', 'low') THEN
      RAISE WARNING 'Aviso no mapeamento: %', validation_result.message;
    END IF;
    
    -- Verificar se já existe um mapeamento padrão ativo para este pacote
    IF NEW.is_default = true AND NEW.is_active = true THEN
      -- Desativar outros mapeamentos padrão para o mesmo pacote
      UPDATE thebest_plan_mappings 
      SET is_default = false, 
          updated_at = NOW()
      WHERE thebest_package_id = NEW.thebest_package_id 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND is_default = true;
      
      IF FOUND THEN
        RAISE NOTICE 'Mapeamentos padrão anteriores desativados para pacote %', NEW.thebest_package_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNÇÃO TRIGGER PARA LOG DE AUDITORIA
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_log_mapping_changes()
RETURNS TRIGGER AS $$
DECLARE
  operation_type TEXT;
  old_values JSONB;
  new_values JSONB;
BEGIN
  -- Determinar tipo de operação
  operation_type := TG_OP;
  
  -- Preparar valores para log
  IF TG_OP = 'DELETE' THEN
    old_values := to_jsonb(OLD);
    new_values := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_values := NULL;
    new_values := to_jsonb(NEW);
  ELSE -- UPDATE
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
  END IF;
  
  -- Inserir log de auditoria (se a tabela existir)
  BEGIN
    INSERT INTO thebest_mapping_audit_log (
      mapping_id,
      operation_type,
      old_values,
      new_values,
      changed_by,
      changed_at
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      operation_type,
      old_values,
      new_values,
      auth.uid(),
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Tabela de auditoria não existe, apenas log
      RAISE NOTICE 'Log de auditoria: % no mapeamento %', operation_type, COALESCE(NEW.id, OLD.id);
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CRIAR TRIGGERS
-- =====================================================

-- Trigger para auto-mapeamento de novos pacotes
DROP TRIGGER IF EXISTS auto_map_new_packages_trigger ON thebest_packages;
CREATE TRIGGER auto_map_new_packages_trigger
  AFTER INSERT ON thebest_packages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_map_new_packages();

-- Trigger para sincronização automática quando pacotes mudam
DROP TRIGGER IF EXISTS auto_sync_package_changes_trigger ON thebest_packages;
CREATE TRIGGER auto_sync_package_changes_trigger
  AFTER INSERT OR UPDATE ON thebest_packages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_sync_on_package_change();

-- Trigger para sincronização reversa quando planos mudam
DROP TRIGGER IF EXISTS auto_sync_plan_changes_trigger ON plans;
CREATE TRIGGER auto_sync_plan_changes_trigger
  AFTER INSERT OR UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_sync_on_plan_change();

-- Trigger para validação de mapeamentos
DROP TRIGGER IF EXISTS validate_mapping_trigger ON thebest_plan_mappings;
CREATE TRIGGER validate_mapping_trigger
  BEFORE INSERT OR UPDATE ON thebest_plan_mappings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validate_mapping_on_change();

-- Trigger para log de auditoria de mapeamentos
DROP TRIGGER IF EXISTS log_mapping_changes_trigger ON thebest_plan_mappings;
CREATE TRIGGER log_mapping_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON thebest_plan_mappings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_mapping_changes();

-- =====================================================
-- 7. CRIAR TABELA DE AUDITORIA (OPCIONAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS thebest_mapping_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT valid_operation CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mapping_audit_log_mapping_id ON thebest_mapping_audit_log(mapping_id);
CREATE INDEX IF NOT EXISTS idx_mapping_audit_log_changed_at ON thebest_mapping_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mapping_audit_log_changed_by ON thebest_mapping_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_mapping_audit_log_operation ON thebest_mapping_audit_log(operation_type);

-- RLS para tabela de auditoria
ALTER TABLE thebest_mapping_audit_log ENABLE ROW LEVEL SECURITY;

-- Política para visualização (usuários podem ver logs de seus próprios mapeamentos)
CREATE POLICY "Users can view their mapping audit logs" ON thebest_mapping_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM thebest_plan_mappings tpm
      JOIN thebest_configs tc ON tc.id = tpm.config_id
      WHERE tpm.id = mapping_id
      AND tc.user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Política para inserção (sistema pode inserir logs)
CREATE POLICY "System can insert audit logs" ON thebest_mapping_audit_log
  FOR INSERT
  WITH CHECK (true); -- Permite inserção pelo sistema

-- Comentários
COMMENT ON TABLE thebest_mapping_audit_log IS 'Log de auditoria para mudanças nos mapeamentos TheBest';
COMMENT ON COLUMN thebest_mapping_audit_log.mapping_id IS 'ID do mapeamento que foi alterado';
COMMENT ON COLUMN thebest_mapping_audit_log.operation_type IS 'Tipo de operação: INSERT, UPDATE ou DELETE';
COMMENT ON COLUMN thebest_mapping_audit_log.old_values IS 'Valores anteriores (JSON)';
COMMENT ON COLUMN thebest_mapping_audit_log.new_values IS 'Novos valores (JSON)';

-- =====================================================
-- 8. FUNÇÃO PARA CONTROLE DE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION set_trigger_enabled(
  p_trigger_name TEXT,
  p_table_name TEXT,
  p_enabled BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_enabled THEN
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER %I', p_table_name, p_trigger_name);
    RAISE NOTICE 'Trigger % habilitado na tabela %', p_trigger_name, p_table_name;
  ELSE
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', p_table_name, p_trigger_name);
    RAISE NOTICE 'Trigger % desabilitado na tabela %', p_trigger_name, p_table_name;
  END IF;
  
  RETURN p_enabled;
END;
$$ LANGUAGE plpgsql;

-- Função para desabilitar todos os triggers de automação
CREATE OR REPLACE FUNCTION disable_automation_triggers()
RETURNS TEXT AS $$
BEGIN
  PERFORM set_trigger_enabled('auto_map_new_packages_trigger', 'thebest_packages', false);
  PERFORM set_trigger_enabled('auto_sync_package_changes_trigger', 'thebest_packages', false);
  PERFORM set_trigger_enabled('auto_sync_plan_changes_trigger', 'plans', false);
  
  RETURN 'Triggers de automação desabilitados';
END;
$$ LANGUAGE plpgsql;

-- Função para habilitar todos os triggers de automação
CREATE OR REPLACE FUNCTION enable_automation_triggers()
RETURNS TEXT AS $$
BEGIN
  PERFORM set_trigger_enabled('auto_map_new_packages_trigger', 'thebest_packages', true);
  PERFORM set_trigger_enabled('auto_sync_package_changes_trigger', 'thebest_packages', true);
  PERFORM set_trigger_enabled('auto_sync_plan_changes_trigger', 'plans', true);
  
  RETURN 'Triggers de automação habilitados';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION trigger_auto_map_new_packages IS 'Trigger para auto-mapeamento de novos pacotes TheBest';
COMMENT ON FUNCTION trigger_auto_sync_on_package_change IS 'Trigger para sincronização automática quando pacotes TheBest mudam';
COMMENT ON FUNCTION trigger_auto_sync_on_plan_change IS 'Trigger para sincronização reversa quando planos HubControl mudam';
COMMENT ON FUNCTION trigger_validate_mapping_on_change IS 'Trigger para validação de mapeamentos antes de inserir/atualizar';
COMMENT ON FUNCTION trigger_log_mapping_changes IS 'Trigger para log de auditoria de mudanças nos mapeamentos';
COMMENT ON FUNCTION set_trigger_enabled IS 'Função utilitária para habilitar/desabilitar triggers';
COMMENT ON FUNCTION disable_automation_triggers IS 'Desabilita todos os triggers de automação';
COMMENT ON FUNCTION enable_automation_triggers IS 'Habilita todos os triggers de automação';

-- =====================================================
-- 10. REGISTRAR MIGRAÇÃO
-- =====================================================

-- Migração registrada automaticamente pelo Supabase

-- Log da migração
-- Migration 20250114000005_create_automation_triggers completed successfully
-- Triggers criados:
-- - auto_map_new_packages_trigger (thebest_packages)
-- - auto_sync_package_changes_trigger (thebest_packages)
-- - auto_sync_plan_changes_trigger (plans)
-- - validate_mapping_trigger (thebest_plan_mappings)
-- - log_mapping_changes_trigger (thebest_plan_mappings)
-- Tabela de auditoria: thebest_mapping_audit_log
-- Funções de controle: enable_automation_triggers(), disable_automation_triggers()
-- Próximo passo: Desenvolver interface de gerenciamento