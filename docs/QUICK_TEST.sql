-- =====================================================
-- TESTE RÁPIDO DAS FUNÇÕES DE DURAÇÃO
-- =====================================================
-- Este script testa rapidamente se as funções estão funcionando
-- Execute linha por linha se houver problemas

-- 1. VERIFICAR SE AS FUNÇÕES EXISTEM
SELECT 'Verificando se as funções existem...' as status;

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN (
  'convert_duration_flexible',
  'convert_days_to_thebest_enum', 
  'convert_thebest_duration_to_days'
)
AND routine_schema = 'public';

-- 2. VERIFICAR SE OS TIPOS ENUM EXISTEM
SELECT 'Verificando se os tipos enum existem...' as status;

SELECT 
  typname
FROM pg_type 
WHERE typname IN ('thebest_package_duration', 'thebest_package_classification');

-- 3. TESTE BÁSICO DA FUNÇÃO FLEXÍVEL
SELECT 'Testando função flexível...' as status;

-- Teste com conversão de tipo explícita
SELECT convert_duration_flexible('30'::TEXT) as teste_30_dias;
SELECT convert_duration_flexible('1_MES'::TEXT) as teste_1_mes;

-- 4. TESTE BÁSICO DA CONVERSÃO REVERSA
SELECT 'Testando conversão reversa...' as status;

SELECT convert_days_to_thebest_enum(30::INTEGER) as teste_30_para_enum;
SELECT convert_days_to_thebest_enum(90::INTEGER) as teste_90_para_enum;

-- 5. TESTE DE COMPATIBILIDADE
SELECT 'Testando compatibilidade...' as status;

SELECT 
  convert_thebest_duration_to_days('1_MES'::thebest_package_duration) as funcao_original,
  convert_duration_flexible('1_MES'::TEXT) as funcao_flexivel;

-- 6. RESULTADO FINAL
SELECT 'Teste concluído! Se você viu resultados acima, as funções estão funcionando.' as resultado;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 
-- 1. Se você vir erro "function does not exist":
--    - Execute o script TEST_FUNCTIONS_STANDALONE.sql primeiro
--    - Ou aplique as migrações: npx supabase db reset
--
-- 2. Se você vir erro "type does not exist":
--    - Os tipos enum não foram criados
--    - Execute o script completo TEST_FUNCTIONS_STANDALONE.sql
--
-- 3. Se tudo funcionar:
--    - Você pode usar as funções normalmente
--    - Lembre-se de usar ::TEXT ou ::INTEGER para conversões explícitas
--
-- =====================================================