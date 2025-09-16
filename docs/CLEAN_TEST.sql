-- Script SQL limpo para testar funções de duração
-- Execute este arquivo diretamente no PostgreSQL/Supabase

-- 1. Verificar se as funções existem
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%duration%'
AND routine_schema = 'public';

-- 2. Verificar se os tipos enum existem
SELECT 
  typname,
  typtype
FROM pg_type 
WHERE typname LIKE '%thebest%';

-- 3. Teste básico da função convert_duration_flexible
SELECT convert_duration_flexible('30'::TEXT) as teste_30_dias;

-- 4. Teste com enum
SELECT convert_duration_flexible('1_MES'::TEXT) as teste_1_mes;

-- 5. Teste da função convert_days_to_thebest_enum
SELECT convert_days_to_thebest_enum(30::INTEGER) as enum_30_dias;

-- 6. Teste da função test_duration_conversions (se existir)
SELECT * FROM test_duration_conversions();

-- IMPORTANTE:
-- Se alguma função não existir, execute primeiro:
-- docs/TEST_FUNCTIONS_STANDALONE.sql
-- para criar todas as funções necessárias