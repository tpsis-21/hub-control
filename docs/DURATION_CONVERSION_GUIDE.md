# Guia de Conversão de Duração Flexível - TheBest

## Visão Geral

O sistema agora oferece funções flexíveis para trabalhar com durações, permitindo usar tanto enums padronizados quanto valores em dias diretamente.

## Funções Disponíveis

### 1. `convert_duration_flexible(duration_input TEXT)`

Função principal que aceita múltiplos formatos de entrada:

**Formatos Suportados:**
- **Dias diretos**: `'30'`, `'90'`, `'180'`, `'365'`
- **Enums padrão**: `'1_MES'`, `'3_MESES'`, `'6_MESES'`, `'12_MESES'`
- **Formatos alternativos**: `'1 MES'`, `'3 MESES'`, `'1_ANO'`, `'1 ANO'`
- **Formatos em inglês**: `'1_MONTH'`, `'3_MONTHS'`, `'6_MONTHS'`, `'12_MONTHS'`

**Exemplos de uso:**
```sql
-- Usando dias diretos
SELECT convert_duration_flexible('45'); -- Retorna: 45

-- Usando enums
SELECT convert_duration_flexible('3_MESES'); -- Retorna: 90

-- Usando formatos alternativos
SELECT convert_duration_flexible('1 ANO'); -- Retorna: 365
```

### 2. `convert_days_to_thebest_enum(days INTEGER)`

Converte dias para o enum TheBest mais próximo:

**Mapeamento:**
- `<= 45 dias` → `'1_MES'`
- `<= 135 dias` → `'3_MESES'`
- `<= 270 dias` → `'6_MESES'`
- `> 270 dias` → `'12_MESES'`

**Exemplos:**
```sql
SELECT convert_days_to_thebest_enum(30);  -- Retorna: '1_MES'
SELECT convert_days_to_thebest_enum(100); -- Retorna: '3_MESES'
SELECT convert_days_to_thebest_enum(200); -- Retorna: '6_MESES'
SELECT convert_days_to_thebest_enum(400); -- Retorna: '12_MESES'
```

### 3. `convert_thebest_duration_to_days(duration thebest_package_duration)`

Função original que converte enums para dias:

```sql
SELECT convert_thebest_duration_to_days('1_MES'::thebest_package_duration); -- Retorna: 30
```

## Função de Teste

### `test_duration_conversions()`

Execute esta função para ver exemplos de todas as conversões:

```sql
SELECT * FROM test_duration_conversions();
```

**Resultado esperado:**
```
input_value | converted_days | back_to_enum | description
------------|----------------|--------------|------------------
30          | 30             | 1_MES        | Dias diretos (30)
1_MES       | 30             | 1_MES        | Enum padrão (1_MES)
3 MESES     | 90             | 3_MESES      | Formato alternativo (3 MESES)
180         | 180            | 6_MESES      | Dias diretos (180 = 6 meses)
1_ANO       | 365            | 12_MESES     | Formato alternativo (1_ANO)
```

## Casos de Uso Práticos

### 1. Validação de Compatibilidade

```sql
-- Comparar duração de pacote com plano (com tolerância)
SELECT 
  package_id,
  plan_id,
  ABS(convert_duration_flexible(package_duration) - plan_validity) <= 7 as is_compatible
FROM mappings;
```

### 2. Normalização de Dados

```sql
-- Converter diferentes formatos para dias padronizados
SELECT 
  original_duration,
  convert_duration_flexible(original_duration) as normalized_days,
  convert_days_to_thebest_enum(convert_duration_flexible(original_duration)) as standard_enum
FROM imported_packages;
```

### 3. Cálculo de Renovação

```sql
-- Calcular data de expiração baseada em duração flexível
SELECT 
  user_id,
  activation_date,
  activation_date + INTERVAL '1 day' * convert_duration_flexible(package_duration) as expiration_date
FROM user_subscriptions;
```

## Vantagens da Abordagem Flexível

1. **Compatibilidade**: Aceita dados de diferentes fontes sem conversão prévia
2. **Flexibilidade**: Permite trabalhar com dias exatos quando necessário
3. **Padronização**: Mantém enums para consistência interna
4. **Tolerância**: Suporta formatos alternativos e variações de entrada
5. **Reversibilidade**: Permite conversão bidirecional entre formatos

## Migração de Código Existente

Para migrar código que usa valores fixos:

**Antes:**
```sql
30 as package_days -- Valor fixo
```

**Depois:**
```sql
convert_duration_flexible('1_MES') as package_days -- Flexível
```

Ou para aceitar entrada dinâmica:
```sql
convert_duration_flexible(tp.duration_field) as package_days -- Dinâmico
```

## Considerações de Performance

Todas as funções são marcadas como `IMMUTABLE`, permitindo otimizações do PostgreSQL:
- Cache de resultados para entradas idênticas
- Uso em índices funcionais
- Otimização de consultas

## Tratamento de Erros

Para entradas inválidas, as funções retornam valores padrão:
- `convert_duration_flexible()`: Retorna 30 dias (1 mês)
- `convert_days_to_thebest_enum()`: Retorna `'1_MES'` para valores negativos ou zero