# 📋 Plano de Ação - Segurança Supabase

**Última atualização:** 2026-05-20  
**Implementação no repositório:** migrações listadas em [supabase/migrations/README.md](supabase/migrations/README.md)

## 🎯 Objetivo
Este documento apresenta um plano de ação estruturado em fases para resolver todos os problemas de segurança identificados pelo Supabase Security Linter, priorizando vulnerabilidades críticas e implementando melhorias de segurança de forma sistemática.

## ▶️ Como executar agora

1. **Backup** no Dashboard Supabase → Database → Backups  
2. **SQL Editor** → executar, nesta ordem, o que ainda não estiver aplicado no projeto:
   - `20241225000001_add_user_id_to_servers.sql` (Fase 0/6)
   - `20241225000002_fix_security_advisor_issues.sql` (Fases 1–3 parcial)
   - `20260519120000_hub_control_rls_phase3.sql` (RLS consolidado HBCONTROL)
   - `20260519120100_revoke_anon_security_definer_execute.sql`
   - **`20260520140000_plano_acao_seguranca_supabase.sql`** ← lacunas deste plano (analytics, servers dono, search_path)
3. **Validar:** `node scripts/validar-plano-seguranca-pos-migracao.mjs` (recomendado) ou `scripts/verificar-plano-seguranca-supabase.mjs`  
4. **Fase 5 (manual):** [docs/GUIA_HUB_CONTROL.md](docs/GUIA_HUB_CONTROL.md) §4  
5. **Advisors:** Dashboard → Database → Security Advisor → confirmar alertas zerados ou documentados

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
- [x] RLS habilitado nas 6 tabelas críticas (`20260519120000` + `20241225000002`)
- [x] Políticas `hub_control_*` / legado por tabela
- [ ] Validar em produção: usuário A não vê dados do usuário B (teste manual pós-migração)

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
- [x] RLS em `plans`, `plan_groups`, `in_app_notifications` (`20260519120000`)
- [x] RLS em tabelas `analytics_*` (`20260520140000` — aplicar no Supabase)
- [ ] Dashboards analytics testados após migração

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
- [x] Views recriadas sem SECURITY DEFINER (`20241225000002`)
- [x] `user_activity_summary` com `security_invoker` (`20260519120000`)
- [x] Demais views com `security_invoker` (`20260520140000` — aplicar no Supabase)
- [ ] Confirmar no Security Advisor (0 erros de view)

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
- [x] Script legado: `fix-function-search-paths.sql` (raiz do repo)
- [x] Correção em lote na migração `20260520140000` (aplicar no Supabase)
- [ ] Query §4 em `scripts/verificar-plano-seguranca-supabase.sql` retorna 0 funções pendentes

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
- [ ] Proteção Have I Been Pwned (Pro) ou alternativas Free — ver [docs/GUIA_HUB_CONTROL.md](docs/GUIA_HUB_CONTROL.md) §4
- [ ] OTP expiry ≤ 30 min (1800 s) no Dashboard
- [ ] Teste de login / recuperação de senha

---

## 📋 FASE 6: Migração Pendente
**⏱️ Prazo: 30 minutos | 🔥 Prioridade: ALTA**

### 🔧 Ação Necessária
- **Arquivo**: `20241225000001_add_user_id_to_servers.sql`
- **Local**: Supabase SQL Editor
- **Descrição**: Aplicar migração manual para adicionar user_id à tabela servers

### ✅ Critérios de Sucesso
- [x] Migração `20241225000001_add_user_id_to_servers.sql` no repositório
- [x] Políticas por dono + admin (`20260520140000` — substitui política só-admin da fase 3)
- [x] `user_id` preenchido nos 3 servidores existentes (admin `efdc6c09-…`, 2026-05-20)
- [x] Validação automática RLS/anon/RPC (`scripts/validar-plano-seguranca-pos-migracao.mjs`, 2026-05-20)
- [ ] `/servidores` testado no browser após login manual

---

## 📊 Cronograma Consolidado

| Fase | Descrição | Prazo | Prioridade | Status |
|------|-----------|-------|------------|--------|
| 0 | Migração `servers.user_id` | 30 min | 🔥 CRÍTICA | ✅ Aplicado no HBCONTROL (2026-05-20) |
| 1 | RLS Tabelas Críticas | 1-2 dias | 🔥 CRÍTICA | ✅ Migrações `20241225` + `20260519120000` |
| 2 | RLS Analytics | 2-3 dias | 🔥 ALTA | ✅ `20260520140000` aplicado (2026-05-20) |
| 3 | Views SECURITY DEFINER | 1-2 dias | 🔥 ALTA | ✅ `20241225000002` + `20260520140000` |
| 4 | search_path Funções | 2-3 dias | 🟡 MÉDIA | ✅ `20260520140000` aplicado (2026-05-20) |
| 5 | Config Autenticação | 1 dia | 🟡 MÉDIA | ⏳ Manual — [GUIA_HUB_CONTROL.md](docs/GUIA_HUB_CONTROL.md) §4 |

### Pós-migração (HBCONTROL) — concluído em 2026-05-20

- [x] 3 servidores (NATV, CloudPlay, Rush) vinculados ao admin principal
- [x] `20260520140200_plano_acao_seguranca_advisor_hardening.sql` — revoke `anon` em RPCs SECURITY DEFINER e tabelas admin

**Validar na app:** login → **Servidores** → listar os 3 servidores → criar um de teste.

### Fase 7 — Advisor hardening (complementar)

| Item | Migração | Status |
|------|----------|--------|
| Revoke `anon` EXECUTE em SECURITY DEFINER | `20260520140200` | ✅ Aplicado |
| Revoke `anon` em tabelas/views admin | `20260520140200` | ✅ Aplicado |
| `clients` / `plans` públicos | RLS mantido | ✅ Sem revoke (área cliente) |
| Leaked password (Pro) | Dashboard | ⏳ Free — ver checklist Auth |
| Storage bucket `profiles` listing | Dashboard | ⏳ Revisar políticas storage |
| Advisor WARNs restantes | — | 44 (↓ de ~55); **0** `anon_security_definer` |

**Comando de validação:** `npm run verify:supabase-security`

**📅 Prazo Total Estimado: 7-11 dias úteis**

---

## 🛡️ Verificações de Segurança Pós-Implementação

### 🔍 Checklist de Validação
- [x] **Servers**: 0 órfãos com `user_id` NULL
- [x] **Anon bloqueado**: `servers`, `settings`, `profiles` → erro 42501; RPCs security bloqueadas
- [x] **App health**: `GET /api/health` OK (dev :8080)
- [x] **Login UI**: Playwright smoke — formulário de login visível
- [ ] **RLS Test**: segundo usuário não vê dados do primeiro (quando houver 2 contas)
- [ ] **Browser**: login admin → `/servidores` → listar NATV/CloudPlay/Rush
- [ ] **Auth Test**: OTP + regras de senha (Fase 5 manual)
- [ ] **Cliente público**: `/cliente/link_*` (sem clientes com `unique_link` no banco hoje)

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

**👤 Responsável:** Equipe de Desenvolvimento  
**🔄 Próxima revisão:** Após teste manual `/servidores` + Fase 5 Auth no Dashboard

**Checkout:** ver [docs/GUIA_HUB_CONTROL.md](docs/GUIA_HUB_CONTROL.md) §7 e auditoria P0/P1. Validação: `npm run verify:checkout`

---

*Este documento deve ser atualizado conforme o progresso das implementações e descoberta de novos requisitos de segurança.*