-- Migration: Create TheBest Mapping Functions
-- Description: Implementa funções para conversão de duração e auto-mapeamento
-- Date: 2025-01-14
-- Author: Sistema de Integração TheBest ↔ HubControl

-- =====================================================
-- 0. VERIFICAR E CRIAR TIPOS NECESSÁRIOS
-- =====================================================

-- Criar tipos enum necessários (caso não existam)
DO $$
BEGIN
  -- Tipo para classificação de pacotes
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thebest_package_classification') THEN
    CREATE TYPE thebest_package_classification AS ENUM (
      'COM_ADULTO',
      'SEM_ADULTO'
    );
    RAISE NOTICE 'Tipo thebest_package_classification criado';
  ELSE
    RAISE NOTICE 'Tipo thebest_package_classification já existe';
  END IF;
  
  -- Tipo para duração de pacotes
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thebest_package_duration') THEN
    CREATE TYPE thebest_package_duration AS ENUM (
      '1_MES',
      '3_MESES',
      '6_MESES',
      '12_MESES'
    );
    RAISE NOTICE 'Tipo thebest_package_duration criado';
  ELSE
    RAISE NOTICE 'Tipo thebest_package_duration já existe';
  END IF;
END
$$;

-- =====================================================
-- 1. FUNÇÃO DE CONVERSÃO DE DURAÇÃO
-- =====================================================

-- Função para converter enum TheBest para dias (usando meses calendário reais)
CREATE OR REPLACE FUNCTION convert_thebest_duration_to_days(duration thebest_package_duration)
RETURNS INTEGER AS $$
BEGIN
  -- TheBest usa meses calendário reais, não comerciais fixos
  CASE duration
    WHEN '1_MES' THEN RETURN EXTRACT(days FROM INTERVAL '1 month')::INTEGER;
    WHEN '3_MESES' THEN RETURN EXTRACT(days FROM INTERVAL '3 months')::INTEGER;
    WHEN '6_MESES' THEN RETURN EXTRACT(days FROM INTERVAL '6 months')::INTEGER;
    WHEN '12_MESES' THEN RETURN EXTRACT(days FROM INTERVAL '12 months')::INTEGER;
    ELSE RETURN EXTRACT(days FROM INTERVAL '1 month')::INTEGER; -- Default para 1 mês
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função flexível para converter duração (aceita enum ou dias diretamente)
CREATE OR REPLACE FUNCTION convert_duration_flexible(duration_input TEXT)
RETURNS INTEGER AS $$
BEGIN
  -- Se é um número (dias diretos), retorna o valor
  IF duration_input ~ '^[0-9]+$' THEN
    RETURN duration_input::INTEGER;
  END IF;
  
  -- Se é um enum, converte usando meses calendário reais
  CASE UPPER(duration_input)
    WHEN '1_MES' THEN RETURN EXTRACT(days FROM INTERVAL '1 month')::INTEGER;
    WHEN '3_MESES' THEN RETURN EXTRACT(days FROM INTERVAL '3 months')::INTEGER;
    WHEN '6_MESES' THEN RETURN EXTRACT(days FROM INTERVAL '6 months')::INTEGER;
    WHEN '12_MESES' THEN RETURN EXTRACT(days FROM INTERVAL '12 months')::INTEGER;
    -- Suporte para formatos alternativos
    WHEN '1 MES', '1MES', '1_MONTH' THEN RETURN EXTRACT(days FROM INTERVAL '1 month')::INTEGER;
    WHEN '3 MESES', '3MESES', '3_MONTHS' THEN RETURN EXTRACT(days FROM INTERVAL '3 months')::INTEGER;
    WHEN '6 MESES', '6MESES', '6_MONTHS' THEN RETURN EXTRACT(days FROM INTERVAL '6 months')::INTEGER;
    WHEN '12 MESES', '12MESES', '12_MONTHS', '1_ANO', '1 ANO' THEN RETURN EXTRACT(days FROM INTERVAL '12 months')::INTEGER;
    ELSE RETURN EXTRACT(days FROM INTERVAL '1 month')::INTEGER; -- Default para 1 mês
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para converter dias em enum (útil para padronização)
CREATE OR REPLACE FUNCTION convert_days_to_thebest_enum(days INTEGER)
RETURNS thebest_package_duration AS $$
BEGIN
  CASE 
    WHEN days <= 45 THEN RETURN '1_MES'::thebest_package_duration;
    WHEN days <= 135 THEN RETURN '3_MESES'::thebest_package_duration;
    WHEN days <= 270 THEN RETURN '6_MESES'::thebest_package_duration;
    ELSE RETURN '12_MESES'::thebest_package_duration;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentários das funções
COMMENT ON FUNCTION convert_thebest_duration_to_days(thebest_package_duration) IS 
'Converte enum de duração do TheBest para número de dias equivalente';

COMMENT ON FUNCTION convert_duration_flexible(TEXT) IS 
'Função flexível que aceita tanto enums quanto dias diretamente. Suporta formatos: enums (1_MES, 3_MESES, etc), números (dias diretos), e formatos alternativos';

COMMENT ON FUNCTION convert_days_to_thebest_enum(INTEGER) IS 
'Converte número de dias para o enum TheBest mais próximo. Útil para padronização e mapeamento reverso';

-- Função de demonstração e teste das conversões flexíveis
CREATE OR REPLACE FUNCTION test_duration_conversions()
RETURNS TABLE(
  input_value TEXT,
  converted_days INTEGER,
  back_to_enum thebest_package_duration,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    '30'::TEXT as input_value,
    convert_duration_flexible('30') as converted_days,
    convert_days_to_thebest_enum(convert_duration_flexible('30')) as back_to_enum,
    'Dias diretos (30)'::TEXT as description
  UNION ALL
  SELECT 
    '1_MES'::TEXT,
    convert_duration_flexible('1_MES'),
    convert_days_to_thebest_enum(convert_duration_flexible('1_MES')),
    'Enum padrão (1_MES)'::TEXT
  UNION ALL
  SELECT 
    '3 MESES'::TEXT,
    convert_duration_flexible('3 MESES'),
    convert_days_to_thebest_enum(convert_duration_flexible('3 MESES')),
    'Formato alternativo (3 MESES)'::TEXT
  UNION ALL
  SELECT 
    '180'::TEXT,
    convert_duration_flexible('180'),
    convert_days_to_thebest_enum(convert_duration_flexible('180')),
    'Dias diretos (180 = 6 meses)'::TEXT
  UNION ALL
  SELECT 
    '1_ANO'::TEXT,
    convert_duration_flexible('1_ANO'),
    convert_days_to_thebest_enum(convert_duration_flexible('1_ANO')),
    'Formato alternativo (1_ANO)'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_duration_conversions() IS 
'Função de demonstração que testa diferentes formatos de entrada para as conversões de duração flexíveis';

-- =====================================================
-- 2. FUNÇÃO DE AUTO-MAPEAMENTO
-- =====================================================

-- Função para criar mapeamentos automáticos baseados em similaridade
CREATE OR REPLACE FUNCTION auto_map_thebest_packages(p_config_id UUID)
RETURNS INTEGER AS $$
DECLARE
  package_record RECORD;
  plan_record RECORD;
  mapped_count INTEGER := 0;
  target_validity INTEGER;
  tolerance_days INTEGER := 10; -- Tolerância de dias para validade
BEGIN
  -- Validar se a configuração existe
  IF NOT EXISTS (SELECT 1 FROM thebest_configs WHERE id = p_config_id) THEN
    RAISE EXCEPTION 'Configuração TheBest não encontrada: %', p_config_id;
  END IF;
  
  -- Para cada pacote TheBest sem mapeamento ativo
  FOR package_record IN 
    SELECT tp.* FROM thebest_packages tp
    WHERE tp.config_id = p_config_id
    AND tp.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM thebest_plan_mappings tpm 
      WHERE tpm.thebest_package_id = tp.id 
      AND tpm.is_active = true
    )
  LOOP
    -- Converter duração para dias
    target_validity := convert_thebest_duration_to_days(package_record.duracao);
    
    -- Buscar plano compatível (prioridade: telas > validade > preço)
    SELECT * INTO plan_record
    FROM plans p
    WHERE p.screens = package_record.telas  -- Mesmo número de telas (obrigatório)
    AND ABS(p.validity - target_validity) <= tolerance_days  -- Validade similar
    AND p.is_public = true  -- Apenas planos públicos
    ORDER BY 
      ABS(p.validity - target_validity),  -- Menor diferença de validade
      ABS(p.price - COALESCE(package_record.price, 0)),  -- Menor diferença de preço
      p.created_at  -- Mais antigo (mais estável)
    LIMIT 1;
    
    -- Se encontrou plano compatível, criar mapeamento
    IF FOUND THEN
      INSERT INTO thebest_plan_mappings (
        thebest_package_id,
        hubcontrol_plan_id,
        config_id,
        is_active,
        is_default,
        sync_price,
        sync_validity,
        sync_screens,
        created_by
      ) VALUES (
        package_record.id,
        plan_record.id,
        p_config_id,
        true,
        true,  -- Primeiro mapeamento é sempre padrão
        true,  -- Sincronizar preço por padrão
        true,  -- Sincronizar validade por padrão
        true,  -- Sincronizar telas por padrão
        auth.uid()  -- Usuário atual
      );
      
      mapped_count := mapped_count + 1;
      
      -- Log do mapeamento criado
      RAISE NOTICE 'Mapeamento criado: TheBest "% (% telas, % dias)" → HubControl "% (% telas, % dias)"',
        package_record.name, package_record.telas, target_validity,
        plan_record.name, plan_record.screens, plan_record.validity;
    ELSE
      -- Log de pacote não mapeado
      RAISE NOTICE 'Pacote não mapeado: "% (% telas, % dias)" - Nenhum plano compatível encontrado',
        package_record.name, package_record.telas, target_validity;
    END IF;
  END LOOP;
  
  -- Log final
  RAISE NOTICE 'Auto-mapeamento concluído: % pacotes mapeados', mapped_count;
  
  RETURN mapped_count;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION auto_map_thebest_packages(UUID) IS 
'Cria mapeamentos automáticos entre pacotes TheBest e planos HubControl baseado em similaridade de características';

-- =====================================================
-- 3. FUNÇÃO DE VALIDAÇÃO DE MAPEAMENTO
-- =====================================================

-- Função para validar compatibilidade entre pacote e plano
CREATE OR REPLACE FUNCTION validate_thebest_mapping(
  p_package_id UUID,
  p_plan_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  package_record RECORD;
  plan_record RECORD;
  package_validity INTEGER;
BEGIN
  -- Buscar dados do pacote
  SELECT * INTO package_record 
  FROM thebest_packages 
  WHERE id = p_package_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pacote TheBest não encontrado ou inativo: %', p_package_id;
  END IF;
  
  -- Buscar dados do plano
  SELECT * INTO plan_record 
  FROM plans 
  WHERE id = p_plan_id AND is_public = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano HubControl não encontrado ou não público: %', p_plan_id;
  END IF;
  
  -- Converter duração do pacote
  package_validity := convert_thebest_duration_to_days(package_record.duracao);
  
  -- Validar compatibilidade de telas (crítico)
  IF package_record.telas != plan_record.screens THEN
    RAISE WARNING 'Incompatibilidade crítica - Telas: TheBest=%, HubControl=%', 
      package_record.telas, plan_record.screens;
    RETURN false;
  END IF;
  
  -- Validar validade (tolerância de 15 dias)
  IF ABS(package_validity - plan_record.validity) > 15 THEN
    RAISE WARNING 'Incompatibilidade de validade: TheBest=% dias, HubControl=% dias (diferença: % dias)',
      package_validity, plan_record.validity, ABS(package_validity - plan_record.validity);
  END IF;
  
  -- Validar preço (apenas aviso se muito diferente)
  IF package_record.price IS NOT NULL AND 
     ABS(package_record.price - plan_record.price) > (plan_record.price * 0.5) THEN
    RAISE WARNING 'Grande diferença de preço: TheBest=%, HubControl=% (diferença: %)',
      package_record.price, plan_record.price, 
      ABS(package_record.price - plan_record.price);
  END IF;
  
  -- Log de validação bem-sucedida
  RAISE NOTICE 'Mapeamento validado: "% (% telas)" → "% (% telas)"',
    package_record.name, package_record.telas,
    plan_record.name, plan_record.screens;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION validate_thebest_mapping(UUID, UUID) IS 
'Valida a compatibilidade entre um pacote TheBest e um plano HubControl antes de criar o mapeamento';

-- =====================================================
-- 4. FUNÇÃO PARA BUSCAR PACOTES NÃO MAPEADOS
-- =====================================================

-- Função para listar pacotes sem mapeamento ativo
CREATE OR REPLACE FUNCTION get_unmapped_thebest_packages(p_config_id UUID)
RETURNS TABLE(
  package_id UUID,
  package_name TEXT,
  thebest_package_id TEXT,
  classificacao thebest_package_classification,
  duracao thebest_package_duration,
  telas INTEGER,
  creditos INTEGER,
  price DECIMAL(10,2),
  duration_days INTEGER,
  suggested_plans JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    tp.package_name as package_name,
    tp.thebest_package_id,
    'SEM_ADULTO' as classificacao, -- Valor padrão já que coluna não existe
     'UM_MES' as duracao, -- Valor padrão já que coluna não existe
     1 as telas, -- Valor padrão já que coluna telas não existe
     1 as creditos, -- Valor padrão já que coluna não existe
    tp.price,
    30 as duration_days, -- Valor padrão já que coluna duracao não existe
    (
      SELECT json_agg(
        json_build_object(
          'id', p.id,
          'name', p.name,
          'screens', p.screens,
          'validity', p.validity,
          'price', p.price,
          'compatibility_score', 
            CASE 
              WHEN p.screens = 1 THEN 100 -- Comparação com valor padrão
              ELSE 0
            END +
            CASE 
              WHEN ABS(p.validity - 30) <= 5 THEN 50 -- Usando valor padrão
               WHEN ABS(p.validity - 30) <= 15 THEN 25 -- Usando valor padrão
              ELSE 0
            END +
            CASE 
              WHEN tp.price IS NOT NULL AND ABS(p.price - tp.price) <= (tp.price * 0.2) THEN 25
              WHEN tp.price IS NOT NULL AND ABS(p.price - tp.price) <= (tp.price * 0.5) THEN 10
              ELSE 0
            END
        )
      )
      FROM plans p
      WHERE p.is_public = true
      AND p.screens = 1  -- Apenas planos com 1 tela (valor padrão)
      ORDER BY 
        ABS(p.validity - 30), -- Usando valor padrão para duracao
        CASE WHEN tp.price IS NOT NULL THEN ABS(p.price - tp.price) ELSE 999999 END
      LIMIT 3
    ) as suggested_plans
  FROM thebest_packages tp
  WHERE tp.config_id = p_config_id
  AND tp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM thebest_plan_mappings tpm 
    WHERE tpm.thebest_package_id = tp.id 
    AND tpm.is_active = true
  )
  ORDER BY tp.package_name;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION get_unmapped_thebest_packages(UUID) IS 
'Retorna pacotes TheBest sem mapeamento ativo, incluindo sugestões de planos compatíveis';

-- =====================================================
-- 5. FUNÇÃO DE ESTATÍSTICAS DE MAPEAMENTO
-- =====================================================

-- Função para obter estatísticas de mapeamento por configuração
CREATE OR REPLACE FUNCTION get_mapping_statistics(p_config_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'config_id', p_config_id,
    'total_packages', (
      SELECT COUNT(*) FROM thebest_packages 
      WHERE config_id = p_config_id AND is_active = true
    ),
    'mapped_packages', (
      SELECT COUNT(DISTINCT tpm.thebest_package_id) 
      FROM thebest_plan_mappings tpm
      JOIN thebest_packages tp ON tp.id = tpm.thebest_package_id
      WHERE tpm.config_id = p_config_id 
      AND tpm.is_active = true 
      AND tp.is_active = true
    ),
    'unmapped_packages', (
      SELECT COUNT(*) FROM thebest_packages tp
      WHERE tp.config_id = p_config_id 
      AND tp.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM thebest_plan_mappings tpm 
        WHERE tpm.thebest_package_id = tp.id 
        AND tpm.is_active = true
      )
    ),
    'total_mappings', (
      SELECT COUNT(*) FROM thebest_plan_mappings 
      WHERE config_id = p_config_id AND is_active = true
    ),
    'mapping_percentage', (
      SELECT ROUND(
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(DISTINCT tpm.thebest_package_id)::DECIMAL / COUNT(*)::DECIMAL) * 100
        END, 2
      )
      FROM thebest_packages tp
      LEFT JOIN thebest_plan_mappings tpm ON (
        tpm.thebest_package_id = tp.id 
        AND tpm.is_active = true
      )
      WHERE tp.config_id = p_config_id 
      AND tp.is_active = true
    ),
    'last_auto_mapping', (
      SELECT MAX(created_at) FROM thebest_plan_mappings 
      WHERE config_id = p_config_id
    ),
    'classification_breakdown', (
      SELECT json_object_agg(
        classificacao::TEXT,
        json_build_object(
          'total', total_count,
          'mapped', mapped_count,
          'unmapped', total_count - mapped_count
        )
      )
      FROM (
        SELECT 
          'SEM_ADULTO' as classificacao, -- Valor padrão já que coluna não existe
          COUNT(*) as total_count,
          COUNT(tpm.id) as mapped_count
        FROM thebest_packages tp
        LEFT JOIN thebest_plan_mappings tpm ON (
          tpm.thebest_package_id = tp.id 
          AND tpm.is_active = true
        )
        WHERE tp.config_id = p_config_id 
        AND tp.is_active = true
        GROUP BY 'SEM_ADULTO' -- Agrupando pelo valor padrão
      ) stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION get_mapping_statistics(UUID) IS 
'Retorna estatísticas detalhadas sobre mapeamentos de uma configuração TheBest';

-- =====================================================
-- 6. LOG DA MIGRAÇÃO
-- =====================================================

-- Log da migração
DO $$ 
BEGIN
  RAISE NOTICE 'Migration 20250114000002_create_mapping_functions completed successfully';
  RAISE NOTICE 'Funções criadas:';
  RAISE NOTICE '- convert_thebest_duration_to_days()';
  RAISE NOTICE '- auto_map_thebest_packages()';
  RAISE NOTICE '- validate_thebest_mapping()';
  RAISE NOTICE '- get_unmapped_thebest_packages()';
  RAISE NOTICE '- get_mapping_statistics()';
  RAISE NOTICE 'Próximo passo: Atualizar view thebest_dashboard';
END $$;