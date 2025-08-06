# 🧹 Guia de Limpeza de Tabelas Desnecessárias

## 📋 Visão Geral

Este guia orienta a remoção segura de tabelas duplicadas e desnecessárias do banco de dados Supabase, otimizando o espaço e organizando a estrutura.

## ⚠️ IMPORTANTE - Leia Antes de Executar

### Pré-requisitos
1. ✅ Backup completo do banco de dados
2. ✅ Acesso de administrador ao Supabase
3. ✅ Verificação de que não há processos críticos em execução
4. ✅ Confirmação de que as tabelas a serem removidas não são essenciais

### Tabelas que Serão Analisadas para Remoção

#### 🗑️ Tabelas de Backup/Teste
- `backup_history`
- `recovery_history`
- `push_subscriptions_old`
- `push_subscriptions_backup`

#### 🔧 Tabelas de Configuração Duplicadas
- `secure_configs` (se duplicada com `system_config`)
- `rate_limits` (se não utilizada)
- `notification_settings` (se duplicada)
- `user_blocks` (se não utilizada)

#### 📧 Tabelas de Marketing (Análise Condicional)
- `marketing_campaigns` (apenas se não houver campanhas ativas)
- `email_templates` (apenas se não houver templates em uso)
- `automation_rules` (apenas se não houver regras ativas)
- `email_logs` (apenas se não houver logs importantes)
- `smtp_configs` (apenas se não houver configurações ativas)
- `unsubscribe_records` (apenas se não houver registros importantes)
- `deliverability_metrics` (apenas se não houver métricas importantes)

#### 💰 Tabelas Financeiras (Consolidação)
- Múltiplas versões de `financial_transactions` serão consolidadas

#### 🔌 Tabelas de Integração
- `integration_configs` (apenas se não houver integrações ativas)

## 🚀 Instruções de Execução

### Passo 1: Verificação Inicial

1. Acesse o **Supabase Dashboard**
2. Vá para **SQL Editor**
3. Execute primeiro esta consulta para ver as tabelas atuais:

```sql
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size('public.'||table_name)) as tamanho
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size('public.'||table_name) DESC;
```

### Passo 2: Backup de Segurança

Antes de executar a limpeza, faça backup das tabelas importantes:

```sql
-- Backup de dados financeiros
CREATE TABLE backup_financial_data AS
SELECT * FROM financial_transactions;

-- Backup de configurações
CREATE TABLE backup_system_config AS
SELECT * FROM system_config;
```

### Passo 3: Executar Limpeza

1. Copie todo o conteúdo do arquivo `cleanup_unnecessary_tables.sql`
2. Cole no **SQL Editor** do Supabase
3. **REVISE** o script antes de executar
4. Clique em **Run** para executar

### Passo 4: Verificação Pós-Limpeza

Após a execução, verifique:

```sql
-- Verificar tabelas restantes
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar integridade dos dados
SELECT COUNT(*) as total_transacoes FROM financial_transactions;
SELECT COUNT(*) as total_configuracoes FROM system_config;

-- Verificar segurança
SELECT security_health_check();
```

## 📊 Benefícios Esperados

### 🎯 Organização
- ✅ Estrutura de banco mais limpa
- ✅ Redução de confusão entre tabelas similares
- ✅ Melhor manutenibilidade

### ⚡ Performance
- ✅ Redução do tamanho do banco
- ✅ Consultas mais rápidas
- ✅ Backups menores e mais rápidos

### 🔒 Segurança
- ✅ Menos superfície de ataque
- ✅ Políticas RLS mais focadas
- ✅ Auditoria simplificada

## 🛡️ Medidas de Segurança

### Antes da Execução
- [ ] Backup completo realizado
- [ ] Verificação de dependências
- [ ] Confirmação de que não há processos críticos
- [ ] Revisão do script de limpeza

### Durante a Execução
- [ ] Monitoramento de erros
- [ ] Verificação de logs
- [ ] Confirmação de cada etapa

### Após a Execução
- [ ] Verificação de integridade dos dados
- [ ] Teste de funcionalidades críticas
- [ ] Atualização da documentação
- [ ] Verificação de segurança

## 🚨 Plano de Rollback

Se algo der errado:

### Opção 1: Restaurar Backup
```sql
-- Restaurar dados financeiros
DROP TABLE IF EXISTS financial_transactions;
ALTER TABLE backup_financial_data RENAME TO financial_transactions;

-- Restaurar configurações
DROP TABLE IF EXISTS system_config;
ALTER TABLE backup_system_config RENAME TO system_config;
```

### Opção 2: Restaurar do Backup Completo
1. Acesse **Database** > **Backups** no Supabase
2. Selecione o backup mais recente
3. Clique em **Restore**

## 📝 Log de Execução

Após executar, documente:

- **Data/Hora**: _______________
- **Usuário**: _______________
- **Tabelas Removidas**: _______________
- **Espaço Liberado**: _______________
- **Problemas Encontrados**: _______________
- **Status Final**: _______________

## 🔍 Monitoramento Contínuo

### Verificações Semanais
```sql
-- Verificar crescimento do banco
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Verificar tabelas maiores
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size('public.'||table_name)) as tamanho
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size('public.'||table_name) DESC
LIMIT 10;
```

### Verificações Mensais
```sql
-- Verificar fragmentação
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

## ✅ Checklist Final

- [ ] Script de limpeza executado com sucesso
- [ ] Verificação de integridade concluída
- [ ] Testes de funcionalidade realizados
- [ ] Documentação atualizada
- [ ] Backup pós-limpeza criado
- [ ] Equipe notificada sobre as mudanças
- [ ] Monitoramento configurado

---

**⚠️ LEMBRE-SE**: Esta operação é irreversível sem backup. Sempre teste em ambiente de desenvolvimento primeiro!

**📞 Suporte**: Em caso de problemas, consulte a documentação do Supabase ou entre em contato com o suporte técnico.

**📅 Próxima Revisão**: Agende uma revisão trimestral para identificar novas tabelas desnecessárias.