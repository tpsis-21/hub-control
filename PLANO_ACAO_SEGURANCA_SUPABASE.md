# 📋 Plano de Ação - Segurança Supabase

## 🎯 Objetivo
Este documento apresenta um plano de ação estruturado em fases para resolver todos os problemas de segurança identificados pelo Supabase Security Linter, priorizando vulnerabilidades críticas e implementando melhorias de segurança de forma sistemática.

## 📊 Resumo dos Problemas Identificados

### 🚨 Problemas Críticos (ERROR)
- **5 Views com SECURITY DEFINER**: Bypass de RLS e permissões
- **14 Tabelas sem RLS**: Exposição de dados sensíveis

### ⚠️ Problemas de Alerta (WARN)
- **22 Funções com search_path mutável**: Vulnerabilidade de injeção
- **2 Configurações de Auth**: OTP longo e proteção de senhas desabilitada

---

## 🗓️ FASE 1: CORREÇÃO CRÍTICA - RLS em Tabelas Sensíveis
**⏱️ Prazo: 1-2 dias | 🔥 Prioridade: CRÍTICA**

### 📋 Tabelas a Corrigir
1. `public.users` - Dados de usuários
2. `public.empresas` - Dados empresariais
3. `public.financial_transactions` - Transações financeiras
4. `public.payments` - Pagamentos
5. `public.expenses` - Despesas
6. `public.settings` - Configurações do sistema

### 🔧 Ações Necessárias
```sql
-- Para cada tabela, executar:
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Criar políticas específicas por tabela:
-- Exemplo para users:
CREATE POLICY "users_policy" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Exemplo para empresas (isolamento por usuário):
CREATE POLICY "empresas_policy" ON public.empresas
  FOR ALL USING (user_id = auth.uid());
```

### ✅ Critérios de Sucesso
- [ ] RLS habilitado em todas as 6 tabelas críticas
- [ ] Políticas de acesso implementadas e testadas
- [ ] Verificação de que usuários só acessam seus próprios dados

---

## 📊 FASE 2: RLS em Tabelas de Analytics
**⏱️ Prazo: 2-3 dias | 🔥 Prioridade: ALTA**

### 📋 Tabelas a Corrigir
1. `public.analytics_events`
2. `public.analytics_sessions`
3. `public.analytics_metrics`
4. `public.analytics_config`
5. `public.analytics_funnels`
6. `public.in_app_notifications`
7. `public.plan_groups`
8. `public.plans`

### 🔧 Ações Necessárias
```sql
-- Habilitar RLS
ALTER TABLE public.TABELA_ANALYTICS ENABLE ROW LEVEL SECURITY;

-- Políticas para analytics (baseadas em user_id ou server_id)
CREATE POLICY "analytics_user_policy" ON public.analytics_events
  FOR ALL USING (
    user_id = auth.uid() OR 
    server_id IN (SELECT id FROM servers WHERE user_id = auth.uid())
  );
```

### ✅ Critérios de Sucesso
- [ ] RLS habilitado em todas as 8 tabelas de analytics
- [ ] Políticas que respeitam isolamento por usuário/servidor
- [ ] Dashboards funcionando corretamente após implementação

---

## 👁️ FASE 3: Correção de Views SECURITY DEFINER
**⏱️ Prazo: 1-2 dias | 🔥 Prioridade: ALTA**

### 📋 Views a Corrigir
1. `public.thebest_dashboard`
2. `public.analytics_device_metrics`
3. `public.user_activity_summary`
4. `public.analytics_popular_pages`
5. `public.analytics_daily_active_users`

### 🔧 Ações Necessárias
```sql
-- Para cada view, recriar sem SECURITY DEFINER:
DROP VIEW IF EXISTS public.NOME_VIEW;

CREATE VIEW public.NOME_VIEW AS
-- (manter a mesma query, removendo SECURITY DEFINER)
```

### ⚠️ Considerações Importantes
- **Backup**: Fazer backup das definições atuais das views
- **Teste**: Verificar se as views continuam funcionando após remoção do SECURITY DEFINER
- **Permissões**: Garantir que usuários tenham permissões adequadas nas tabelas base

### ✅ Critérios de Sucesso
- [ ] Todas as 5 views recriadas sem SECURITY DEFINER
- [ ] Funcionalidade mantida após alterações
- [ ] RLS das tabelas base sendo respeitado

---

## 🔧 FASE 4: Correção de search_path em Funções
**⏱️ Prazo: 2-3 dias | 🔥 Prioridade: MÉDIA**

### 📋 Funções a Corrigir (22 funções)
**Funções de Segurança:**
- `validate_password_strength`
- `validate_strong_password`
- `create_security_alert`
- `resolve_security_alert`
- `detect_suspicious_activity`
- `trigger_suspicious_activity_detection`
- `check_rate_limit`
- `security_health_check`
- `is_mfa_required`
- `sanitize_html`
- `sanitize_profile_data`

**Funções de Sistema:**
- `handle_new_user`
- `update_expenses_updated_at`
- `update_in_app_notifications_updated_at`
- `update_updated_at_column`
- `update_updated_at`
- `generate_unique_panel_plan_id`
- `ensure_panel_plan_id`
- `generate_unique_panel_server_id`
- `ensure_panel_server_id`
- `is_article_visible_for_server`
- `sync_thebest_packages_from_csv`

### 🔧 Ações Necessárias
```sql
-- Para cada função, adicionar SET search_path:
CREATE OR REPLACE FUNCTION public.NOME_FUNCAO(...)
RETURNS TIPO_RETORNO
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- corpo da função
END;
$$;
```

### ✅ Critérios de Sucesso
- [ ] Todas as 22 funções atualizadas com search_path fixo
- [ ] Testes de funcionalidade realizados
- [ ] Nenhuma quebra de funcionalidade

---

## 🔐 FASE 5: Configurações de Autenticação
**⏱️ Prazo: 1 dia | 🔥 Prioridade: MÉDIA**

### 📋 Configurações a Ajustar

#### 1. **Proteção contra Senhas Vazadas**
- **Problema**: Proteção desabilitada contra senhas comprometidas
- **Ação**: Habilitar verificação HaveIBeenPwned
- **Local**: Dashboard Supabase → Authentication → Settings

#### 2. **OTP Expiry**
- **Problema**: OTP com expiração superior a 1 hora
- **Ação**: Reduzir para máximo 30 minutos
- **Local**: Dashboard Supabase → Authentication → Email Templates

### 🔧 Ações Necessárias
1. **No Dashboard Supabase:**
   - Ir para Authentication → Settings
   - Habilitar "Password strength and leaked password protection"
   - Ajustar OTP expiry para 1800 segundos (30 min)

2. **Verificação:**
   - Testar login com senha comprometida
   - Testar expiração de OTP

### ✅ Critérios de Sucesso
- [ ] Proteção contra senhas vazadas habilitada
- [ ] OTP expiry configurado para ≤ 30 minutos
- [ ] Testes de segurança realizados

---

## 📋 FASE 6: Migração Pendente
**⏱️ Prazo: 30 minutos | 🔥 Prioridade: ALTA**

### 🔧 Ação Necessária
- **Arquivo**: `20241225000001_add_user_id_to_servers.sql`
- **Local**: Supabase SQL Editor
- **Descrição**: Aplicar migração manual para adicionar user_id à tabela servers

### ✅ Critérios de Sucesso
- [ ] Migração aplicada com sucesso
- [ ] Tabela servers com coluna user_id
- [ ] RLS funcionando na tabela servers

---

## 📊 Cronograma Consolidado

| Fase | Descrição | Prazo | Prioridade | Status |
|------|-----------|-------|------------|--------|
| 0 | Migração Pendente | 30 min | 🔥 CRÍTICA | ⏳ Pendente |
| 1 | RLS Tabelas Críticas | 1-2 dias | 🔥 CRÍTICA | ⏳ Pendente |
| 2 | RLS Analytics | 2-3 dias | 🔥 ALTA | ⏳ Pendente |
| 3 | Views SECURITY DEFINER | 1-2 dias | 🔥 ALTA | ⏳ Pendente |
| 4 | search_path Funções | 2-3 dias | 🟡 MÉDIA | ⏳ Pendente |
| 5 | Config Autenticação | 1 dia | 🟡 MÉDIA | ⏳ Pendente |

**📅 Prazo Total Estimado: 7-11 dias úteis**

---

## 🛡️ Verificações de Segurança Pós-Implementação

### 🔍 Checklist de Validação
- [ ] **RLS Test**: Usuário A não consegue acessar dados do usuário B
- [ ] **Function Test**: Todas as funções executam corretamente
- [ ] **View Test**: Views retornam dados corretos respeitando RLS
- [ ] **Auth Test**: Proteção contra senhas vazadas funcionando
- [ ] **OTP Test**: Códigos expirando no tempo configurado
- [ ] **Performance Test**: Nenhuma degradação significativa

### 📈 Monitoramento Contínuo
- **Security Health Check**: Executar função `security_health_check()` semanalmente
- **Audit Logs**: Revisar logs de segurança mensalmente
- **RLS Coverage**: Verificar cobertura RLS trimestralmente

---

## 🚨 Plano de Contingência

### 🔄 Rollback Procedures
1. **Backup de Schemas**: Antes de cada fase
2. **Scripts de Rollback**: Preparados para cada alteração
3. **Monitoramento**: Alertas para detectar problemas rapidamente

### 📞 Contatos de Emergência
- **DBA**: [Definir responsável]
- **DevOps**: [Definir responsável]
- **Security**: [Definir responsável]

---

## 📝 Notas Importantes

### ⚠️ Cuidados Especiais
1. **Backup Obrigatório**: Antes de qualquer alteração em produção
2. **Teste em Staging**: Todas as alterações devem ser testadas primeiro
3. **Horário de Manutenção**: Implementar fora do horário de pico
4. **Comunicação**: Notificar equipe sobre janelas de manutenção

### 🔧 Ferramentas Necessárias
- Acesso ao Dashboard Supabase
- SQL Editor do Supabase
- Scripts de backup e rollback
- Ambiente de staging para testes

---

**📅 Documento criado em:** $(date)
**👤 Responsável:** Equipe de Desenvolvimento
**🔄 Próxima revisão:** Após conclusão de cada fase

---

*Este documento deve ser atualizado conforme o progresso das implementações e descoberta de novos requisitos de segurança.*