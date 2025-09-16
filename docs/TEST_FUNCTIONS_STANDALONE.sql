-- =====================================================
-- SCRIPT STANDALONE PARA TESTAR FUNÇÕES DE DURAÇÃO
-- =====================================================
-- Este script pode ser executado em qualquer ambiente PostgreSQL
-- sem necessidade do Supabase local

-- 1. CRIAR OS TIPOS ENUM (se não existirem)
DO $$
BEGIN
  -- Tipo para classificação de pacotes
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thebest_package_classification') THEN
    CREATE TYPE thebest_package_classification AS ENUM (
      'SEM_ADULTO',
      'COM_ADULTO'
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

-- 2. CRIAR AS FUNÇÕES DE CONVERSÃO

-- Função original para converter enum TheBest para dias
CREATE OR REPLACE FUNCTION convert_thebest_duration_to_days(duration thebest_package_duration)
RETURNS INTEGER AS $$
BEGIN
  CASE duration
    WHEN '1_MES' THEN RETURN 30;
    WHEN '3_MESES' THEN RETURN 90;
    WHEN '6_MESES' THEN RETURN 180;
    WHEN '12_MESES' THEN RETURN 365;
    ELSE RETURN 30; -- Default para 1 mês
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
  
  -- Se é um enum, converte usando a função existente
  CASE UPPER(duration_input)
    WHEN '1_MES' THEN RETURN 30;
    WHEN '3_MESES' THEN RETURN 90;
    WHEN '6_MESES' THEN RETURN 180;
    WHEN '12_MESES' THEN RETURN 365;
    -- Suporte para formatos alternativos
    WHEN '1 MES', '1MES', '1_MONTH' THEN RETURN 30;
    WHEN '3 MESES', '3MESES', '3_MONTHS' THEN RETURN 90;
    WHEN '6 MESES', '6MESES', '6_MONTHS' THEN RETURN 180;
    WHEN '12 MESES', '12MESES', '12_MONTHS', '1_ANO', '1 ANO' THEN RETURN 365;
    ELSE RETURN 30; -- Default para 1 mês
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

-- 3. COMENTÁRIOS DAS FUNÇÕES
COMMENT ON FUNCTION convert_thebest_duration_to_days(thebest_package_duration) IS 
'Converte enum de duração do TheBest para número de dias equivalente';

COMMENT ON FUNCTION convert_duration_flexible(TEXT) IS 
'Função flexível que aceita tanto enums quanto dias diretamente. Suporta formatos: enums (1_MES, 3_MESES, etc), números (dias diretos), e formatos alternativos';

COMMENT ON FUNCTION convert_days_to_thebest_enum(INTEGER) IS 
'Converte número de dias para o enum TheBest mais próximo. Útil para padronização e mapeamento reverso';

COMMENT ON FUNCTION test_duration_conversions() IS 
'Função de demonstração que testa diferentes formatos de entrada para as conversões de duração flexíveis';

-- =====================================================
-- 4. TESTES IMEDIATOS
-- =====================================================

-- Teste 1: Função flexível com diferentes formatos
SELECT 'TESTE 1: Função Flexível' as teste;
SELECT convert_duration_flexible('45'::TEXT) as dias_diretos_45;
SELECT convert_duration_flexible('1_MES'::TEXT) as enum_1_mes;
SELECT convert_duration_flexible('3 MESES'::TEXT) as formato_alternativo;
SELECT convert_duration_flexible('1_ANO'::TEXT) as formato_ano;

-- Teste 2: Conversão reversa
SELECT 'TESTE 2: Conversão Reversa' as teste;
SELECT convert_days_to_thebest_enum(30::INTEGER) as enum_30_dias;
SELECT convert_days_to_thebest_enum(100::INTEGER) as enum_100_dias;
SELECT convert_days_to_thebest_enum(200::INTEGER) as enum_200_dias;
SELECT convert_days_to_thebest_enum(400::INTEGER) as enum_400_dias;

-- Teste 3: Função de demonstração completa
SELECT 'TESTE 3: Demonstração Completa' as teste;
SELECT * FROM test_duration_conversions();

-- Teste 4: Casos extremos
SELECT 'TESTE 4: Casos Extremos' as teste;
SELECT convert_duration_flexible('INVALIDO'::TEXT) as entrada_invalida;
SELECT convert_duration_flexible(''::TEXT) as entrada_vazia;
SELECT convert_days_to_thebest_enum(0::INTEGER) as zero_dias;
SELECT convert_days_to_thebest_enum(-10::INTEGER) as dias_negativos;

-- Teste 5: Compatibilidade com função original
SELECT 'TESTE 5: Compatibilidade' as teste;
SELECT 
  convert_thebest_duration_to_days('1_MES'::thebest_package_duration) as funcao_original,
  convert_duration_flexible('1_MES'::TEXT) as funcao_flexivel,
  convert_thebest_duration_to_days('1_MES'::thebest_package_duration) = convert_duration_flexible('1_MES'::TEXT) as sao_iguais;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/*
PARA EXECUTAR ESTE SCRIPT:

1. Copie todo o conteúdo deste arquivo
2. Cole em qualquer cliente PostgreSQL (pgAdmin, DBeaver, psql, etc.)
3. Execute o script completo
4. Verifique os resultados dos testes

RESULTADOS ESPERADOS:
- Todas as funções devem ser criadas sem erro
- Todos os testes devem retornar valores válidos
- Casos extremos devem retornar valores padrão (30 dias / 1_MES)
- Função flexível deve dar os mesmos resultados que a original para enums

SE HOUVER ERROS:
- Verifique se você tem permissões para criar funções
- Verifique se o PostgreSQL suporta a linguagem plpgsql
- Execute seção por seção para identificar onde está o problema
*/