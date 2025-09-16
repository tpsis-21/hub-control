-- =====================================================
-- EXEMPLOS DE USO DAS FUNÇÕES DE DURAÇÃO FLEXÍVEL
-- =====================================================

-- Execute estes comandos após aplicar as migrações

-- 1. TESTE BÁSICO DAS CONVERSÕES
SELECT 'Teste de Conversões Flexíveis' as titulo;

-- Testando diferentes formatos de entrada
SELECT 
  'Dias diretos' as tipo,
  '30' as entrada,
  convert_duration_flexible('30') as dias_resultado;

SELECT 
  'Enum padrão' as tipo,
  '3_MESES' as entrada,
  convert_duration_flexible('3_MESES') as dias_resultado;

SELECT 
  'Formato alternativo' as tipo,
  '1 ANO' as entrada,
  convert_duration_flexible('1 ANO') as dias_resultado;

-- 2. TESTE DE CONVERSÃO REVERSA
SELECT 'Conversão Reversa (Dias para Enum)' as titulo;

SELECT 
  30 as dias_entrada,
  convert_days_to_thebest_enum(30) as enum_resultado;

SELECT 
  100 as dias_entrada,
  convert_days_to_thebest_enum(100) as enum_resultado;

SELECT 
  200 as dias_entrada,
  convert_days_to_thebest_enum(200) as enum_resultado;

SELECT 
  400 as dias_entrada,
  convert_days_to_thebest_enum(400) as enum_resultado;

-- 3. TESTE COMPLETO COM A FUNÇÃO DE DEMONSTRAÇÃO
SELECT 'Teste Completo de Conversões' as titulo;

SELECT * FROM test_duration_conversions();

-- 4. EXEMPLOS PRÁTICOS DE USO

-- Exemplo 1: Validação de compatibilidade com tolerância
SELECT 'Exemplo: Validação de Compatibilidade' as titulo;

WITH exemplo_dados AS (
  SELECT 
    'Pacote A' as pacote,
    '1_MES' as duracao_pacote,
    28 as validade_plano
  UNION ALL
  SELECT 
    'Pacote B' as pacote,
    '90' as duracao_pacote,
    85 as validade_plano
  UNION ALL
  SELECT 
    'Pacote C' as pacote,
    '6 MESES' as duracao_pacote,
    180 as validade_plano
)
SELECT 
  pacote,
  duracao_pacote,
  convert_duration_flexible(duracao_pacote) as dias_pacote,
  validade_plano as dias_plano,
  ABS(convert_duration_flexible(duracao_pacote) - validade_plano) as diferenca_dias,
  ABS(convert_duration_flexible(duracao_pacote) - validade_plano) <= 7 as compativel
FROM exemplo_dados;

-- Exemplo 2: Normalização de dados de diferentes fontes
SELECT 'Exemplo: Normalização de Dados' as titulo;

WITH dados_diversos AS (
  SELECT '30' as duracao_original, 'Sistema A (dias)' as fonte
  UNION ALL
  SELECT '1_MES' as duracao_original, 'Sistema B (enum)' as fonte
  UNION ALL
  SELECT '3 MESES' as duracao_original, 'Sistema C (texto)' as fonte
  UNION ALL
  SELECT '180' as duracao_original, 'Sistema D (dias)' as fonte
  UNION ALL
  SELECT '1_ANO' as duracao_original, 'Sistema E (texto)' as fonte
)
SELECT 
  fonte,
  duracao_original,
  convert_duration_flexible(duracao_original) as dias_normalizados,
  convert_days_to_thebest_enum(convert_duration_flexible(duracao_original)) as enum_padrao
FROM dados_diversos
ORDER BY convert_duration_flexible(duracao_original);

-- Exemplo 3: Cálculo de datas de expiração
SELECT 'Exemplo: Cálculo de Expiração' as titulo;

WITH assinaturas AS (
  SELECT 
    'Usuario 1' as usuario,
    '2024-01-15'::date as data_ativacao,
    '1_MES' as duracao
  UNION ALL
  SELECT 
    'Usuario 2' as usuario,
    '2024-01-15'::date as data_ativacao,
    '90' as duracao
  UNION ALL
  SELECT 
    'Usuario 3' as usuario,
    '2024-01-15'::date as data_ativacao,
    '6 MESES' as duracao
)
SELECT 
  usuario,
  data_ativacao,
  duracao as duracao_original,
  convert_duration_flexible(duracao) as dias_duracao,
  data_ativacao + INTERVAL '1 day' * convert_duration_flexible(duracao) as data_expiracao,
  convert_days_to_thebest_enum(convert_duration_flexible(duracao)) as categoria_duracao
FROM assinaturas;

-- 5. TESTE DE CASOS EXTREMOS
SELECT 'Teste de Casos Extremos' as titulo;

-- Teste com valores inválidos (devem retornar defaults)
SELECT 
  'INVALIDO' as entrada,
  convert_duration_flexible('INVALIDO') as resultado,
  'Deve retornar 30 (default)' as esperado;

SELECT 
  'TEXTO_QUALQUER' as entrada,
  convert_duration_flexible('TEXTO_QUALQUER') as resultado,
  'Deve retornar 30 (default)' as esperado;

-- Teste com dias extremos
SELECT 
  1 as dias_entrada,
  convert_days_to_thebest_enum(1) as enum_resultado,
  'Deve retornar 1_MES' as esperado;

SELECT 
  1000 as dias_entrada,
  convert_days_to_thebest_enum(1000) as enum_resultado,
  'Deve retornar 12_MESES' as esperado;

-- 6. COMPARAÇÃO COM FUNÇÃO ORIGINAL
SELECT 'Comparação: Função Original vs Flexível' as titulo;

SELECT 
  '1_MES'::thebest_package_duration as enum_entrada,
  convert_thebest_duration_to_days('1_MES'::thebest_package_duration) as funcao_original,
  convert_duration_flexible('1_MES') as funcao_flexivel,
  convert_thebest_duration_to_days('1_MES'::thebest_package_duration) = convert_duration_flexible('1_MES') as resultados_iguais;

SELECT 
  '3_MESES'::thebest_package_duration as enum_entrada,
  convert_thebest_duration_to_days('3_MESES'::thebest_package_duration) as funcao_original,
  convert_duration_flexible('3_MESES') as funcao_flexivel,
  convert_thebest_duration_to_days('3_MESES'::thebest_package_duration) = convert_duration_flexible('3_MESES') as resultados_iguais;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/*
PARA EXECUTAR ESTES TESTES:

1. Certifique-se de que o Docker está rodando
2. Execute: npx supabase db reset
3. Copie e cole os comandos acima no SQL Editor do Supabase
4. Execute seção por seção para ver os resultados

RESULTADOS ESPERADOS:
- Todas as conversões devem funcionar sem erro
- Valores inválidos devem retornar defaults (30 dias / 1_MES)
- Função flexível deve dar os mesmos resultados que a original para enums
- Tolerância de 7 dias deve funcionar para validação de compatibilidade
*/