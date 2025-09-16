-- =====================================================
-- TESTE SIMPLES DAS FUNÇÕES DE DURAÇÃO
-- =====================================================
-- Execute este script no seu ambiente PostgreSQL/Supabase
-- para verificar se as funções estão funcionando

-- 1. Verificar se as funções existem
SELECT 'Verificando funções existentes...' as status;

SELECT routine_name
FROM information_schema.routines 
WHERE routine_name IN ('convert_duration_flexible', 'convert_days_to_thebest_enum')
AND routine_schema = 'public';

-- 2. Teste básico da função flexível
SELECT 'Testando função flexível...' as status;

-- Teste com dias diretos
SELECT convert_duration_flexible('30'::TEXT) as teste_30_dias;

-- Teste com enum
SELECT convert_duration_flexible('1_MES'::TEXT) as teste_1_mes;

-- 3. Teste da conversão reversa
SELECT 'Testando conversão reversa...' as status;

SELECT convert_days_to_thebest_enum(30::INTEGER) as teste_30_para_enum;

-- 4. Resultado
SELECT 'Teste concluído! Se você viu resultados numéricos acima, as funções estão OK.' as resultado;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 
-- ERRO COMUM: "syntax error at or near ##"
-- - Isso acontece quando você tenta executar um arquivo .md como SQL
-- - Arquivos .md são documentação, não código SQL
-- - Execute apenas arquivos .sql no banco de dados
--
-- SE AS FUNÇÕES NÃO EXISTIREM:
-- 1. Execute: docs/TEST_FUNCTIONS_STANDALONE.sql
-- 2. Ou aplique as migrações: npx supabase db reset
--
-- =====================================================