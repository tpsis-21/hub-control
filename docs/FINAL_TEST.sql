-- Script SQL Final para Testar Funções de Duração
-- Execute este código diretamente no seu ambiente PostgreSQL

-- 1. Verificar se as funções existem
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%duration%'
AND routine_schema = 'public';

-- 2. Verificar se os tipos enum existem
SELECT 
  typname
FROM pg_type 
WHERE typname LIKE '%thebest%';

-- 3. Teste básico da função (se existir)
SELECT convert_duration_flexible('30'::TEXT) as teste_30_dias;

-- 4. Teste com enum (se existir)
SELECT convert_duration_flexible('1_MES'::TEXT) as teste_1_mes;

-- 5. Teste de conversão reversa (se existir)
SELECT convert_days_to_thebest_enum(30::INTEGER) as teste_reverso;

-- IMPORTANTE:
-- Se você receber erro "function does not exist", significa que as funções
-- não foram criadas ainda. Neste caso, execute primeiro o arquivo:
-- TEST_FUNCTIONS_STANDALONE.sql para criar as funções.

-- Se você receber erro de sintaxe, certifique-se de que está executando
-- este arquivo .sql e não um arquivo .md (markdown).