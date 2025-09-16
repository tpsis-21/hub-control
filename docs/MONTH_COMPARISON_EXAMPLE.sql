-- =====================================================
-- EXEMPLO PRÁTICO: MESES CALENDÁRIO vs MESES FIXOS
-- =====================================================
-- Este script demonstra as diferenças entre usar meses
-- de calendário reais versus meses comerciais fixos

-- 1. SISTEMA THEBEST (MESES CALENDÁRIO REAIS)
-- O TheBest usa meses calendário reais, respeitando variações:

SELECT 'SISTEMA THEBEST (MESES CALENDÁRIO)' as tipo_sistema;

-- Janeiro 2024
SELECT 
  'Janeiro 2024' as mes,
  31 as dias_reais,
  'Cliente ganha 31 dias' as resultado,
  'NATURAL: Respeita o calendário real' as vantagem;

-- Fevereiro 2024 (ano bissexto)
SELECT 
  'Fevereiro 2024' as mes,
  29 as dias_reais,
  'Cliente ganha 29 dias' as resultado,
  'NATURAL: Respeita ano bissexto' as vantagem;

-- Fevereiro 2023 (ano normal)
SELECT 
  'Fevereiro 2023' as mes,
  28 as dias_reais,
  'Cliente ganha 28 dias' as resultado,
  'NATURAL: Respeita ano normal' as vantagem;

-- Abril 2024
SELECT 
  'Abril 2024' as mes,
  30 as dias_reais,
  'Cliente ganha 30 dias' as resultado,
  'INTUITIVO: Como esperado pelo usuário' as vantagem;

-- =====================================================

-- 2. SISTEMA COMERCIAL FIXO (ALTERNATIVA ARTIFICIAL)
-- Com meses comerciais fixos (alternativa artificial), todos recebem o mesmo:

SELECT 'SISTEMA COMERCIAL FIXO (ARTIFICIAL)' as tipo_sistema;

SELECT 
  'Qualquer mês' as mes,
  30 as dias_fixos,
  'SEMPRE 30 dias' as resultado,
  'JUSTO: Todos recebem igual' as vantagem;

-- =====================================================

-- 3. COMPARAÇÃO LADO A LADO
-- Vamos simular um cliente comprando "1 mês" em diferentes épocas:

SELECT 'COMPARAÇÃO: CLIENTE COMPRANDO 1 MÊS' as cenario;

SELECT 
  data_compra,
  dias_mes_real,
  convert_duration_flexible('1_MES') as dias_thebest,
  (dias_mes_real - convert_duration_flexible('1_MES')) as diferenca,
  CASE 
    WHEN dias_mes_real > convert_duration_flexible('1_MES') 
    THEN 'Cliente ganharia mais'
    WHEN dias_mes_real < convert_duration_flexible('1_MES') 
    THEN 'Cliente ganharia menos'
    ELSE 'Igual'
  END as impacto_cliente
FROM (
  VALUES 
    ('2024-01-15', 31),  -- Janeiro
    ('2024-02-15', 29),  -- Fevereiro bissexto
    ('2024-03-15', 31),  -- Março
    ('2024-04-15', 30),  -- Abril
    ('2024-05-15', 31),  -- Maio
    ('2024-06-15', 30),  -- Junho
    ('2024-07-15', 31),  -- Julho
    ('2024-08-15', 31),  -- Agosto
    ('2024-09-15', 30),  -- Setembro
    ('2024-10-15', 31),  -- Outubro
    ('2024-11-15', 30),  -- Novembro
    ('2024-12-15', 31)   -- Dezembro
) AS meses(data_compra, dias_mes_real);

-- =====================================================

-- 4. IMPACTO FINANCEIRO
-- Simulando o impacto se cobrássemos por mês real:

SELECT 'IMPACTO FINANCEIRO (HIPOTÉTICO)' as analise;

SELECT 
  'Preço por dia: R$ 1,00' as premissa,
  'Pacote 1 mês TheBest: R$ 30,00' as preco_fixo;

SELECT 
  mes,
  dias_reais,
  (dias_reais * 1.00) as preco_se_fosse_por_dia,
  30.00 as preco_thebest_fixo,
  ((dias_reais * 1.00) - 30.00) as diferenca_preco,
  CASE 
    WHEN dias_reais > 30 THEN 'Empresa perderia dinheiro'
    WHEN dias_reais < 30 THEN 'Cliente pagaria mais caro'
    ELSE 'Preço justo'
  END as problema_comercial
FROM (
  VALUES 
    ('Janeiro', 31),
    ('Fevereiro (bissexto)', 29),
    ('Fevereiro (normal)', 28),
    ('Abril', 30),
    ('Maio', 31)
) AS exemplos(mes, dias_reais);

-- =====================================================

-- 5. NOSSO SISTEMA FLEXÍVEL EM AÇÃO
-- Demonstrando como nosso sistema resolve ambos os casos:

SELECT 'NOSSO SISTEMA FLEXÍVEL' as solucao;

-- Caso 1: Cliente TheBest padrão
SELECT 
  'Caso 1: Cliente TheBest padrão' as cenario,
  'Mês calendário real' as dias,
  'Usa mês calendário real (28-31 dias)' as explicacao;

-- Caso 2: Promoção especial "31 dias exatos"
SELECT 
  'Caso 2: Promoção "31 dias exatos"' as cenario,
  convert_duration_flexible('31') as dias,
  'Usa dias exatos quando necessário' as explicacao;

-- Caso 3: Conversão automática para relatórios
SELECT 
  'Caso 3: Relatório padronizado' as cenario,
  convert_days_to_thebest_enum(31) as enum_equivalente,
  'Converte automaticamente para categoria TheBest' as explicacao;

-- =====================================================

-- 6. TESTE PRÁTICO: DIFERENTES FORMATOS
-- Testando nossa flexibilidade:

SELECT 'TESTE DE FLEXIBILIDADE' as teste;

SELECT 
  formato_entrada,
  convert_duration_flexible(formato_entrada) as dias_resultado,
  convert_days_to_thebest_enum(convert_duration_flexible(formato_entrada)) as categoria_thebest
FROM (
  VALUES 
    ('1_MES'),           -- Enum padrão
    ('30'),              -- Dias diretos (igual ao TheBest)
    ('31'),              -- Dias diretos (janeiro real)
    ('28'),              -- Dias diretos (fevereiro)
    ('3_MESES'),         -- Enum 3 meses
    ('90'),              -- Dias diretos (igual ao TheBest)
    ('92'),              -- Dias diretos (3 meses reais)
    ('1_ANO'),           -- Enum alternativo
    ('365')              -- Dias diretos (igual ao TheBest)
) AS formatos(formato_entrada);

-- =====================================================

/*
CONCLUSÃO:

1. MESES CALENDÁRIO REAIS (THEBEST) = NATURAL
   - Variação de 28-31 dias (natural)
   - Intuitivo para usuários
   - Respeita o calendário real
   - Adapta-se a anos bissextos

2. MESES COMERCIAIS FIXOS = ARTIFICIAL
   - Sempre 30 dias fixos
   - Não respeita calendário real
   - Pode confundir usuários
   - Simplifica cálculos

3. NOSSO SISTEMA = MELHOR DOS DOIS
   - Compatível com TheBest (meses reais)
   - Flexível para casos especiais
   - Conversão automática
   - Transparente para o cliente

O TheBest escolheu meses calendário reais para manter
a naturalidade e intuitividade. Nosso sistema
mantém essa abordagem e adiciona flexibilidade.
*/