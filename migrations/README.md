# Migrações do Sistema de Períodos e Monitoramento de Créditos

## 📋 Ordem de Execução

### 🚀 Opção 1: Migração Unificada para Supabase (RECOMENDADO)
Se você está usando Supabase, use o arquivo unificado que contém tudo:
```sql
-- Execute no SQL Editor do Supabase
-- Copie e cole todo o conteúdo de: migrations/supabase_migration.sql
```

### 🔧 Opção 2: Migração Separada (psql/PostgreSQL)

Para implementar o novo sistema de cálculo de períodos e monitoramento de créditos, execute as migrações na seguinte ordem:

#### 1. Migração Principal (OBRIGATÓRIA)

##### Opção A: Via psql (linha de comando)
```bash
# Conecte ao banco e execute:
psql -h seu_host -U seu_usuario -d seu_banco -f migrations/20241220000001_add_period_calculation_fields.sql
```

##### Opção B: Via psql interativo
```sql
-- Dentro do psql:
\i migrations/20241220000001_add_period_calculation_fields.sql
```

##### Opção C: Interface gráfica (Supabase, pgAdmin, etc.)
```sql
-- Copie e cole o conteúdo completo do arquivo:
-- migrations/20241220000001_add_period_calculation_fields.sql
-- diretamente no editor SQL
```

Esta migração adiciona:
- Campos de configuração de período nas tabelas `servers` e `plans`
- Campos de monitoramento de crédito na tabela `servers`
- Nova tabela `server_credit_notifications`
- Índices e políticas de segurança
- Constraints de validação

#### 2. Migração de Dados Existentes (RECOMENDADA)

##### Opção A: Via psql (linha de comando)
```bash
# Execute depois da migração principal:
psql -h seu_host -U seu_usuario -d seu_banco -f scripts/migrate-existing-data.sql
```

##### Opção B: Via psql interativo
```sql
-- Dentro do psql:
\i scripts/migrate-existing-data.sql
```

##### Opção C: Interface gráfica (Supabase, pgAdmin, etc.)
```sql
-- Copie e cole o conteúdo completo do arquivo:
-- scripts/migrate-existing-data.sql
-- diretamente no editor SQL
```

Esta migração configura:
- Valores padrão para servidores existentes
- Detecção automática de painéis NATV e The Best
- Configuração de planos baseada na validade em dias
- Configurações de notificação para usuários existentes

## Verificação da Aplicação

Após executar as migrações, verifique se foram aplicadas corretamente:

```sql
-- Verificar estrutura das tabelas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('servers', 'plans', 'server_credit_notifications')
    AND (column_name LIKE '%period%' OR column_name LIKE '%credit%')
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Verificar dados migrados
SELECT 
    'Servidores configurados' as tipo,
    COUNT(*) as quantidade
FROM servers 
WHERE period_calculation_type IS NOT NULL

UNION ALL

SELECT 
    'Planos configurados' as tipo,
    COUNT(*) as quantidade
FROM plans 
WHERE period_calculation_config IS NOT NULL;
```

## Rollback (Se Necessário)

Para reverter as migrações em caso de problemas:

```sql
-- ATENÇÃO: Isso removerá todos os dados das novas funcionalidades

-- Remover tabela de notificações
DROP TABLE IF EXISTS server_credit_notifications CASCADE;

-- Remover campos da tabela servers
ALTER TABLE servers 
DROP COLUMN IF EXISTS period_calculation_type,
DROP COLUMN IF EXISTS period_calculation_config,
DROP COLUMN IF EXISTS credit_monitoring_enabled,
DROP COLUMN IF EXISTS credit_warning_threshold,
DROP COLUMN IF EXISTS credit_critical_threshold,
DROP COLUMN IF EXISTS credit_notification_enabled;

-- Remover campos da tabela plans
ALTER TABLE plans 
DROP COLUMN IF EXISTS period_calculation_override,
DROP COLUMN IF EXISTS period_calculation_config;

-- Remover tabela de logs se criada
DROP TABLE IF EXISTS migration_logs CASCADE;
```

## Problemas Comuns

### Erro: "syntax error at or near '\\i'"
**Causa**: Comando `\i` é específico do psql e não funciona em interfaces gráficas.
**Solução**: 
- **Se usando Supabase/pgAdmin/interface web**: Copie e cole o conteúdo completo do arquivo SQL diretamente no editor
- **Se usando linha de comando**: Use `psql -f arquivo.sql` em vez de `\i`
- **Se usando psql interativo**: Certifique-se de estar no psql, não em outro cliente SQL

### Erro: "column does not exist"
**Causa**: Tentativa de executar o script de migração de dados antes da migração principal.
**Solução**: Execute primeiro `20241220000001_add_period_calculation_fields.sql`

### Erro: "relation does not exist"
**Causa**: Tabela não existe no banco de dados.
**Solução**: Verifique se está conectado ao banco correto e se as tabelas `servers` e `plans` existem.

### Erro de permissão
**Causa**: Usuário não tem permissões para alterar estrutura do banco.
**Solução**: Execute as migrações com um usuário que tenha privilégios de DDL (Data Definition Language).

### Erro: "42601: syntax error"
**Causa**: Problema de sintaxe SQL ou comando não reconhecido.
**Solução**: 
- Verifique se está usando o ambiente correto (psql vs interface gráfica)
- Certifique-se de que não há caracteres especiais ou encoding incorreto
- Execute linha por linha se necessário para identificar o problema

## Suporte

Em caso de problemas:
1. Verifique os logs do PostgreSQL
2. Confirme que está executando na ordem correta
3. Verifique se o usuário tem as permissões necessárias
4. Faça backup antes de executar em produção

## Notas Importantes

- ⚠️ **SEMPRE** faça backup do banco antes de executar migrações em produção
- ✅ Teste as migrações em ambiente de desenvolvimento primeiro
- 📝 As migrações são idempotentes (podem ser executadas múltiplas vezes)
- 🔒 As políticas RLS garantem que usuários só vejam suas próprias configurações
- 📊 O sistema de logs permite rastrear quando as migrações foram executadas