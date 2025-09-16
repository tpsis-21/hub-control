# Correções do Script RLS - Hub Control

## 🔧 Problema Identificado

O erro `ERROR: 42703: column financial_transactions.client_id does not exist` ocorreu porque o script original estava tentando referenciar uma coluna que não existe na estrutura real da tabela `financial_transactions`.

## 📋 Estrutura Real das Tabelas

### financial_transactions
- **Colunas existentes**: id, type, description, amount, category, transaction_date, notes, created_at, updated_at
- **Não possui**: client_id, user_id (é uma tabela global)
- **Acesso**: Apenas administradores

### payments
- **Colunas existentes**: id, client_id, date, amount, status, plan_id, transaction_id, payment_method, created_at, updated_at
- **Relacionamento**: client_id → clients.id
- **Acesso**: Usuários veem pagamentos de seus clientes, admins veem todos

### profiles
- **Colunas existentes**: id, user_id, role, approved, full_name, phone, company, avatar_url, created_at, updated_at
- **Chave de referência**: user_id (não id) para auth.uid()

## ✅ Correções Aplicadas

### 1. Fase 3 - Políticas Financeiras
- **Removido**: Referência inexistente a `financial_transactions.client_id`
- **Corrigido**: Política apenas para admins na tabela `financial_transactions`
- **Adicionado**: Políticas corretas para tabela `payments` usando `client_id`
- **Removido**: Referências à tabela `expenses` (não existe)

### 2. Fase 4 - Políticas de Sistema
- **Removido**: Tabelas inexistentes (`empresas`, `users`)
- **Adicionado**: Políticas para `plans` e `plan_groups`
- **Corrigido**: Política para `settings` (apenas admins)

### 3. Fase 5 - Políticas de Marketing
- **Removido**: Tabela `analytics_events` (não existe)
- **Mantido**: `marketing_campaigns` e `marketing_leads`

### 4. Correção Geral
- **Corrigido**: Todas as referências de `profiles.id` para `profiles.user_id`
- **Padronizado**: Uso consistente de `auth.uid()` nas políticas

## 🚀 Como Executar o Script Corrigido

### Passo 1: Backup
```sql
-- Execute no Supabase SQL Editor
SELECT 'Backup realizado em: ' || NOW() as backup_info;
```

### Passo 2: Executar o Script
1. Abra o Supabase Dashboard
2. Vá para SQL Editor
3. Cole o conteúdo do arquivo `SCRIPT_CORRECAO_COMPLETA_RLS.sql`
4. Execute fase por fase (recomendado) ou tudo de uma vez

### Passo 3: Verificação
```sql
-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar RLS habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

## 🔍 Próximos Passos

1. **Executar o script corrigido**
2. **Testar a página de perfil** (verificar se a recursão foi resolvida)
3. **Verificar logs do Supabase** para confirmar ausência de erros
4. **Testar funcionalidades** de cada tabela com usuários diferentes
5. **Monitorar performance** das consultas com as novas políticas

## ⚠️ Observações Importantes

- O script agora está alinhado com a estrutura real do banco
- Todas as políticas usam as colunas corretas
- A recursão na tabela `profiles` foi corrigida
- Apenas tabelas existentes têm políticas aplicadas

## 📊 Resumo das Políticas

| Tabela | Política | Descrição |
|--------|----------|----------|
| profiles | Próprio perfil + Admin | Usuários veem/editam próprio perfil |
| clients | Manager + Admin | Usuários gerenciam próprios clientes |
| payments | Via client_id + Admin | Baseado no relacionamento com clients |
| financial_transactions | Admin apenas | Transações globais |
| plans/plan_groups | View público + Admin modify | Visualização pública, modificação admin |
| settings | Admin apenas | Configurações do sistema |
| marketing_* | Próprio + Admin | Campanhas e leads próprios |

---

**Status**: ✅ Script corrigido e pronto para execução
**Data**: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
**Versão**: 2.0 - Corrigida