-- Migration: Create Synchronization Functions
-- Description: Implementa funções de sincronização bidirecional TheBest ↔ HubControl
-- Date: 2025-01-14
-- Author: Sistema de Integração TheBest ↔ HubControl

-- =====================================================
-- 1. FUNÇÃO DE SINCRONIZAÇÃO THEBEST → HUBCONTROL
-- =====================================================

CREATE OR REPLACE FUNCTION sync_thebest_to_hubcontrol(
  p_config_id UUID DEFAULT NULL,
  p_package_id UUID DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  action TEXT,
  package_id UUID,
  package_name TEXT,
  plan_id UUID,
  plan_name TEXT,
  field_updated TEXT,
  old_value TEXT,
  new_value TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  rec RECORD;
  mapping_rec RECORD;
  update_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Log início da sincronização
  RAISE NOTICE 'Iniciando sincronização TheBest → HubControl (config_id: %, package_id: %, dry_run: %)', 
    p_config_id, p_package_id, p_dry_run;
  
  -- Loop através dos mapeamentos ativos
  FOR mapping_rec IN
    SELECT 
      tpm.id as mapping_id,
      tpm.thebest_package_id,
      tpm.hubcontrol_plan_id,
      tpm.sync_price,
      tpm.sync_validity,
      tpm.sync_screens,
      tpm.override_price,
      tpm.override_validity,
      tpm.override_screens,
      tp.package_name as package_name,
      tp.price as thebest_price,
      'UM_MES' as thebest_duration, -- Valor padrão já que coluna não existe
      1 as thebest_screens, -- Valor padrão já que coluna telas não existe
      p.name as plan_name,
      p.price as plan_price,
      p.validity as plan_validity,
      p.screens as plan_screens
    FROM thebest_plan_mappings tpm
    JOIN thebest_packages tp ON tp.id = tpm.thebest_package_id
    JOIN plans p ON p.id = tpm.hubcontrol_plan_id
    WHERE tpm.is_active = true
    AND (p_config_id IS NULL OR tp.config_id = p_config_id)
    AND (p_package_id IS NULL OR tp.id = p_package_id)
    ORDER BY tp.package_name
  LOOP
    BEGIN
      -- Sincronizar preço
      IF mapping_rec.sync_price = true AND mapping_rec.thebest_price IS NOT NULL THEN
        DECLARE
          target_price DECIMAL := COALESCE(mapping_rec.override_price, mapping_rec.thebest_price);
        BEGIN
          IF mapping_rec.plan_price != target_price THEN
            -- Retornar resultado da sincronização de preço
            action := 'update_price';
            package_id := mapping_rec.thebest_package_id;
            package_name := mapping_rec.package_name;
            plan_id := mapping_rec.hubcontrol_plan_id;
            plan_name := mapping_rec.plan_name;
            field_updated := 'price';
            old_value := mapping_rec.plan_price::TEXT;
            new_value := target_price::TEXT;
            success := true;
            error_message := NULL;
            
            -- Executar update se não for dry run
            IF NOT p_dry_run THEN
              UPDATE plans 
              SET price = target_price, 
                  updated_at = NOW()
              WHERE id = mapping_rec.hubcontrol_plan_id;
              
              update_count := update_count + 1;
            END IF;
            
            RETURN NEXT;
          END IF;
        END;
      END IF;
      
      -- Sincronizar validade
      IF mapping_rec.sync_validity = true THEN
        DECLARE
          target_validity INTEGER := COALESCE(
            mapping_rec.override_validity, 
            convert_thebest_duration_to_days(mapping_rec.thebest_duration)
          );
        BEGIN
          IF mapping_rec.plan_validity != target_validity THEN
            -- Retornar resultado da sincronização de validade
            action := 'update_validity';
            package_id := mapping_rec.thebest_package_id;
            package_name := mapping_rec.package_name;
            plan_id := mapping_rec.hubcontrol_plan_id;
            plan_name := mapping_rec.plan_name;
            field_updated := 'validity';
            old_value := mapping_rec.plan_validity::TEXT;
            new_value := target_validity::TEXT;
            success := true;
            error_message := NULL;
            
            -- Executar update se não for dry run
            IF NOT p_dry_run THEN
              UPDATE plans 
              SET validity = target_validity, 
                  updated_at = NOW()
              WHERE id = mapping_rec.hubcontrol_plan_id;
              
              update_count := update_count + 1;
            END IF;
            
            RETURN NEXT;
          END IF;
        END;
      END IF;
      
      -- Sincronizar telas
      IF mapping_rec.sync_screens = true THEN
        DECLARE
          target_screens INTEGER := COALESCE(mapping_rec.override_screens, mapping_rec.thebest_screens);
        BEGIN
          IF mapping_rec.plan_screens != target_screens THEN
            -- Retornar resultado da sincronização de telas
            action := 'update_screens';
            package_id := mapping_rec.thebest_package_id;
            package_name := mapping_rec.package_name;
            plan_id := mapping_rec.hubcontrol_plan_id;
            plan_name := mapping_rec.plan_name;
            field_updated := 'screens';
            old_value := mapping_rec.plan_screens::TEXT;
            new_value := target_screens::TEXT;
            success := true;
            error_message := NULL;
            
            -- Executar update se não for dry run
            IF NOT p_dry_run THEN
              UPDATE plans 
              SET screens = target_screens, 
                  updated_at = NOW()
              WHERE id = mapping_rec.hubcontrol_plan_id;
              
              update_count := update_count + 1;
            END IF;
            
            RETURN NEXT;
          END IF;
        END;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Retornar erro
        action := 'error';
        package_id := mapping_rec.thebest_package_id;
        package_name := mapping_rec.package_name;
        plan_id := mapping_rec.hubcontrol_plan_id;
        plan_name := mapping_rec.plan_name;
        field_updated := NULL;
        old_value := NULL;
        new_value := NULL;
        success := false;
        error_message := SQLERRM;
        error_count := error_count + 1;
        
        RETURN NEXT;
    END;
  END LOOP;
  
  -- Log final da sincronização
  RAISE NOTICE 'Sincronização TheBest → HubControl concluída. Updates: %, Erros: %', 
    update_count, error_count;
    
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. FUNÇÃO DE SINCRONIZAÇÃO HUBCONTROL → THEBEST
-- =====================================================

CREATE OR REPLACE FUNCTION sync_hubcontrol_to_thebest(
  p_config_id UUID DEFAULT NULL,
  p_plan_id UUID DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  action TEXT,
  plan_id UUID,
  plan_name TEXT,
  package_id UUID,
  package_name TEXT,
  field_updated TEXT,
  old_value TEXT,
  new_value TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  rec RECORD;
  mapping_rec RECORD;
  update_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Log início da sincronização
  RAISE NOTICE 'Iniciando sincronização HubControl → TheBest (config_id: %, plan_id: %, dry_run: %)', 
    p_config_id, p_plan_id, p_dry_run;
  
  -- Loop através dos mapeamentos ativos (sincronização reversa)
  FOR mapping_rec IN
    SELECT 
      tpm.id as mapping_id,
      tpm.thebest_package_id,
      tpm.hubcontrol_plan_id,
      tpm.sync_price,
      tpm.sync_validity,
      tpm.sync_screens,
      tp.package_name as package_name,
      tp.price as thebest_price,
      'UM_MES' as thebest_duration, -- Valor padrão já que coluna não existe
      1 as thebest_screens, -- Valor padrão já que coluna telas não existe
      p.name as plan_name,
      p.price as plan_price,
      p.validity as plan_validity,
      p.screens as plan_screens
    FROM thebest_plan_mappings tpm
    JOIN thebest_packages tp ON tp.id = tpm.thebest_package_id
    JOIN plans p ON p.id = tpm.hubcontrol_plan_id
    WHERE tpm.is_active = true
    AND (p_config_id IS NULL OR tp.config_id = p_config_id)
    AND (p_plan_id IS NULL OR p.id = p_plan_id)
    ORDER BY p.name
  LOOP
    BEGIN
      -- Sincronizar preço (HubControl → TheBest)
      IF mapping_rec.sync_price = true AND mapping_rec.plan_price IS NOT NULL THEN
        IF mapping_rec.thebest_price IS NULL OR mapping_rec.thebest_price != mapping_rec.plan_price THEN
          -- Retornar resultado da sincronização de preço
          action := 'update_price';
          plan_id := mapping_rec.hubcontrol_plan_id;
          plan_name := mapping_rec.plan_name;
          package_id := mapping_rec.thebest_package_id;
          package_name := mapping_rec.package_name;
          field_updated := 'price';
          old_value := COALESCE(mapping_rec.thebest_price::TEXT, 'NULL');
          new_value := mapping_rec.plan_price::TEXT;
          success := true;
          error_message := NULL;
          
          -- Executar update se não for dry run
          IF NOT p_dry_run THEN
            UPDATE thebest_packages 
            SET price = mapping_rec.plan_price, 
                updated_at = NOW()
            WHERE id = mapping_rec.thebest_package_id;
            
            update_count := update_count + 1;
          END IF;
          
          RETURN NEXT;
        END IF;
      END IF;
      
      -- Sincronizar telas (HubControl → TheBest)
      IF mapping_rec.sync_screens = true THEN
        IF mapping_rec.thebest_screens != mapping_rec.plan_screens THEN
          -- Retornar resultado da sincronização de telas
          action := 'update_screens';
          plan_id := mapping_rec.hubcontrol_plan_id;
          plan_name := mapping_rec.plan_name;
          package_id := mapping_rec.thebest_package_id;
          package_name := mapping_rec.package_name;
          field_updated := 'screens';
          old_value := mapping_rec.thebest_screens::TEXT;
          new_value := mapping_rec.plan_screens::TEXT;
          success := true;
          error_message := NULL;
          
          -- Executar update se não for dry run
          IF NOT p_dry_run THEN
            UPDATE thebest_packages 
            SET telas = mapping_rec.plan_screens, 
                updated_at = NOW()
            WHERE id = mapping_rec.thebest_package_id;
            
            update_count := update_count + 1;
          END IF;
          
          RETURN NEXT;
        END IF;
      END IF;
      
      -- Nota: Duração não é sincronizada de HubControl → TheBest 
      -- pois é um enum específico do TheBest
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Retornar erro
        action := 'error';
        plan_id := mapping_rec.hubcontrol_plan_id;
        plan_name := mapping_rec.plan_name;
        package_id := mapping_rec.thebest_package_id;
        package_name := mapping_rec.package_name;
        field_updated := NULL;
        old_value := NULL;
        new_value := NULL;
        success := false;
        error_message := SQLERRM;
        error_count := error_count + 1;
        
        RETURN NEXT;
    END;
  END LOOP;
  
  -- Log final da sincronização
  RAISE NOTICE 'Sincronização HubControl → TheBest concluída. Updates: %, Erros: %', 
    update_count, error_count;
    
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. FUNÇÃO DE SINCRONIZAÇÃO BIDIRECIONAL
-- =====================================================

CREATE OR REPLACE FUNCTION sync_bidirectional(
  p_config_id UUID DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT FALSE,
  p_direction TEXT DEFAULT 'both' -- 'thebest_to_hubcontrol', 'hubcontrol_to_thebest', 'both'
)
RETURNS TABLE(
  direction TEXT,
  action TEXT,
  source_id UUID,
  source_name TEXT,
  target_id UUID,
  target_name TEXT,
  field_updated TEXT,
  old_value TEXT,
  new_value TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  sync_rec RECORD;
BEGIN
  -- Validar direção
  IF p_direction NOT IN ('thebest_to_hubcontrol', 'hubcontrol_to_thebest', 'both') THEN
    RAISE EXCEPTION 'Direção inválida: %. Use: thebest_to_hubcontrol, hubcontrol_to_thebest, ou both', p_direction;
  END IF;
  
  -- Log início da sincronização bidirecional
  RAISE NOTICE 'Iniciando sincronização bidirecional (config_id: %, direction: %, dry_run: %)', 
    p_config_id, p_direction, p_dry_run;
  
  -- Sincronização TheBest → HubControl
  IF p_direction IN ('thebest_to_hubcontrol', 'both') THEN
    FOR sync_rec IN
      SELECT 
        'thebest_to_hubcontrol' as sync_direction,
        s.action,
        s.package_id as source_id,
        s.package_name as source_name,
        s.plan_id as target_id,
        s.plan_name as target_name,
        s.field_updated,
        s.old_value,
        s.new_value,
        s.success,
        s.error_message
      FROM sync_thebest_to_hubcontrol(p_config_id, NULL, p_dry_run) s
    LOOP
      direction := sync_rec.sync_direction;
      action := sync_rec.action;
      source_id := sync_rec.source_id;
      source_name := sync_rec.source_name;
      target_id := sync_rec.target_id;
      target_name := sync_rec.target_name;
      field_updated := sync_rec.field_updated;
      old_value := sync_rec.old_value;
      new_value := sync_rec.new_value;
      success := sync_rec.success;
      error_message := sync_rec.error_message;
      
      RETURN NEXT;
    END LOOP;
  END IF;
  
  -- Sincronização HubControl → TheBest
  IF p_direction IN ('hubcontrol_to_thebest', 'both') THEN
    FOR sync_rec IN
      SELECT 
        'hubcontrol_to_thebest' as sync_direction,
        s.action,
        s.plan_id as source_id,
        s.plan_name as source_name,
        s.package_id as target_id,
        s.package_name as target_name,
        s.field_updated,
        s.old_value,
        s.new_value,
        s.success,
        s.error_message
      FROM sync_hubcontrol_to_thebest(p_config_id, NULL, p_dry_run) s
    LOOP
      direction := sync_rec.sync_direction;
      action := sync_rec.action;
      source_id := sync_rec.source_id;
      source_name := sync_rec.source_name;
      target_id := sync_rec.target_id;
      target_name := sync_rec.target_name;
      field_updated := sync_rec.field_updated;
      old_value := sync_rec.old_value;
      new_value := sync_rec.new_value;
      success := sync_rec.success;
      error_message := sync_rec.error_message;
      
      RETURN NEXT;
    END LOOP;
  END IF;
  
  -- Log final da sincronização bidirecional
  RAISE NOTICE 'Sincronização bidirecional concluída';
  
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNÇÃO DE VERIFICAÇÃO DE SINCRONIZAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION check_sync_status(
  p_config_id UUID DEFAULT NULL
)
RETURNS TABLE(
  mapping_id UUID,
  package_name TEXT,
  plan_name TEXT,
  sync_price BOOLEAN,
  sync_validity BOOLEAN,
  sync_screens BOOLEAN,
  price_in_sync BOOLEAN,
  validity_in_sync BOOLEAN,
  screens_in_sync BOOLEAN,
  overall_sync_status TEXT,
  last_sync_needed TIMESTAMP,
  recommendations TEXT[]
) AS $$
DECLARE
  rec RECORD;
  recommendations_array TEXT[];
BEGIN
  FOR rec IN
    SELECT 
      tpm.id as mapping_id,
      tp.package_name as package_name,
      p.name as plan_name,
      tpm.sync_price,
      tpm.sync_validity,
      tpm.sync_screens,
      tp.price as thebest_price,
      'UM_MES' as thebest_duration, -- Valor padrão já que coluna não existe
      1 as thebest_screens, -- Valor padrão já que coluna telas não existe
      p.price as plan_price,
      p.validity as plan_validity,
      p.screens as plan_screens,
      tpm.override_price,
      tpm.override_validity,
      tpm.override_screens,
      GREATEST(tp.updated_at, p.updated_at, tpm.updated_at) as last_update
    FROM thebest_plan_mappings tpm
    JOIN thebest_packages tp ON tp.id = tpm.thebest_package_id
    JOIN plans p ON p.id = tpm.hubcontrol_plan_id
    WHERE tpm.is_active = true
    AND (p_config_id IS NULL OR tp.config_id = p_config_id)
    ORDER BY tp.package_name
  LOOP
    -- Resetar array de recomendações
    recommendations_array := ARRAY[]::TEXT[];
    
    -- Verificar sincronização de preço
    DECLARE
      target_price DECIMAL := COALESCE(rec.override_price, rec.thebest_price);
      price_synced BOOLEAN := true;
    BEGIN
      IF rec.sync_price = true AND rec.thebest_price IS NOT NULL THEN
        price_synced := (rec.plan_price = target_price);
        IF NOT price_synced THEN
          recommendations_array := array_append(recommendations_array, 
            'Sincronizar preço: ' || COALESCE(rec.plan_price::TEXT, 'NULL') || ' → ' || target_price::TEXT);
        END IF;
      END IF;
      price_in_sync := price_synced;
    END;
    
    -- Verificar sincronização de validade
    DECLARE
      target_validity INTEGER := COALESCE(
        rec.override_validity, 
        convert_thebest_duration_to_days(rec.thebest_duration)
      );
      validity_synced BOOLEAN := true;
    BEGIN
      IF rec.sync_validity = true THEN
        validity_synced := (rec.plan_validity = target_validity);
        IF NOT validity_synced THEN
          recommendations_array := array_append(recommendations_array, 
            'Sincronizar validade: ' || rec.plan_validity::TEXT || ' → ' || target_validity::TEXT || ' dias');
        END IF;
      END IF;
      validity_in_sync := validity_synced;
    END;
    
    -- Verificar sincronização de telas
    DECLARE
      target_screens INTEGER := COALESCE(rec.override_screens, rec.thebest_screens);
      screens_synced BOOLEAN := true;
    BEGIN
      IF rec.sync_screens = true THEN
        screens_synced := (rec.plan_screens = target_screens);
        IF NOT screens_synced THEN
          recommendations_array := array_append(recommendations_array, 
            'Sincronizar telas: ' || rec.plan_screens::TEXT || ' → ' || target_screens::TEXT);
        END IF;
      END IF;
      screens_in_sync := screens_synced;
    END;
    
    -- Determinar status geral
    DECLARE
      overall_status TEXT;
    BEGIN
      IF price_in_sync AND validity_in_sync AND screens_in_sync THEN
        overall_status := 'in_sync';
      ELSIF array_length(recommendations_array, 1) > 0 THEN
        overall_status := 'needs_sync';
      ELSE
        overall_status := 'sync_disabled';
      END IF;
      overall_sync_status := overall_status;
    END;
    
    -- Adicionar recomendações gerais
    IF array_length(recommendations_array, 1) = 0 THEN
      recommendations_array := ARRAY['Mapeamento sincronizado'];
    END IF;
    
    -- Retornar resultado
    mapping_id := rec.mapping_id;
    package_name := rec.package_name;
    plan_name := rec.plan_name;
    sync_price := rec.sync_price;
    sync_validity := rec.sync_validity;
    sync_screens := rec.sync_screens;
    last_sync_needed := rec.last_update;
    recommendations := recommendations_array;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNÇÃO DE SINCRONIZAÇÃO AGENDADA
-- =====================================================

CREATE OR REPLACE FUNCTION scheduled_sync(
  p_config_id UUID DEFAULT NULL,
  p_max_updates INTEGER DEFAULT 100
)
RETURNS TABLE(
  sync_timestamp TIMESTAMP,
  config_id UUID,
  total_mappings INTEGER,
  updates_applied INTEGER,
  errors_encountered INTEGER,
  sync_duration INTERVAL,
  summary TEXT
) AS $$
DECLARE
  start_time TIMESTAMP := NOW();
  end_time TIMESTAMP;
  total_count INTEGER := 0;
  update_count INTEGER := 0;
  error_count INTEGER := 0;
  sync_rec RECORD;
BEGIN
  -- Contar mapeamentos ativos
  SELECT COUNT(*) INTO total_count
  FROM thebest_plan_mappings tpm
  JOIN thebest_packages tp ON tp.id = tpm.thebest_package_id
  WHERE tpm.is_active = true
  AND (p_config_id IS NULL OR tp.config_id = p_config_id);
  
  -- Executar sincronização bidirecional
  FOR sync_rec IN
    SELECT s.success, s.error_message
    FROM sync_bidirectional(p_config_id, false, 'both') s
    LIMIT p_max_updates
  LOOP
    IF sync_rec.success THEN
      update_count := update_count + 1;
    ELSE
      error_count := error_count + 1;
    END IF;
  END LOOP;
  
  end_time := NOW();
  
  -- Retornar resultado
  sync_timestamp := start_time;
  config_id := p_config_id;
  total_mappings := total_count;
  updates_applied := update_count;
  errors_encountered := error_count;
  sync_duration := end_time - start_time;
  summary := format(
    'Sincronização %s: %s mapeamentos, %s atualizações, %s erros em %s',
    CASE WHEN p_config_id IS NULL THEN 'global' ELSE 'por configuração' END,
    total_count,
    update_count,
    error_count,
    sync_duration
  );
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION sync_thebest_to_hubcontrol IS 'Sincroniza dados de pacotes TheBest para planos HubControl baseado nos mapeamentos ativos';
COMMENT ON FUNCTION sync_hubcontrol_to_thebest IS 'Sincroniza dados de planos HubControl para pacotes TheBest (sincronização reversa)';
COMMENT ON FUNCTION sync_bidirectional IS 'Executa sincronização bidirecional entre TheBest e HubControl';
COMMENT ON FUNCTION check_sync_status IS 'Verifica o status de sincronização dos mapeamentos e fornece recomendações';
COMMENT ON FUNCTION scheduled_sync IS 'Função para execução de sincronização agendada com limitação de atualizações';

-- =====================================================
-- 7. REGISTRAR MIGRAÇÃO
-- =====================================================

-- Migração registrada automaticamente pelo Supabase

-- Log da migração
-- Migration 20250114000004_create_sync_functions completed successfully
-- Funções de sincronização criadas:
-- - sync_thebest_to_hubcontrol(config_id, package_id, dry_run)
-- - sync_hubcontrol_to_thebest(config_id, plan_id, dry_run)
-- - sync_bidirectional(config_id, dry_run, direction)
-- - check_sync_status(config_id)
-- - scheduled_sync(config_id, max_updates)
-- Próximo passo: Criar triggers de automação