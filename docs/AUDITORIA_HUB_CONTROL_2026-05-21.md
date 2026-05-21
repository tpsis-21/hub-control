# Auditoria Completa — Hub Control

**Data:** 21/05/2026  
**Escopo:** aplicação Next.js 14 + Supabase (painel admin, APIs, checkout, integrações Gates2B/TheBest/NATV/n8n)  
**Metodologia:** revisão de código, migrações SQL, scripts operacionais, CI, documentação e regras de projeto (`.trae/rules/project_rules.md`, regras de comunicação e nomenclatura de servidores).

Este documento **substitui** relatórios anteriores (`RELATORIO_AUDITORIA_*`, `RELATORIO_*`, `SECURITY_ANALYSIS_*`, fases 1–3 isoladas, etc.). Mantém apenas o que é acionável para operação e evolução.

---

## Sumário executivo

| Área | Nota (1–5) | Situação |
|------|------------|----------|
| Arquitetura / engenharia | 4 | Camadas claras (middleware, services, lib); duplicação de padrões de auth |
| Frontend / UX | 3,5 | Base shadcn sólida; débito mobile (tabelas, headers duplicados) |
| Backend / APIs | 3,5 | Default-deny forte; falhas pontuais críticas (Cakto, backdoor admin) |
| Banco / RLS | 4 | Fase maio/2026 bem estruturada; migrações legadas e colisões de timestamp |
| Segurança | 3 | Boa base; corrigir 3 itens críticos antes de confiar em produção |
| Backup / DR | 3 | Supabase + scripts PS1 OK; npm `backup:*` quebrado |
| CI / testes | 2,5 | E2E smoke útil; workflow security desalinhado; integração fora do CI |
| Documentação | 2 | ~80+ MD na raiz; `docs/` parcialmente organizado |

**Prioridade imediata (P0):** webhook Cakto sem assinatura obrigatória; UUID/email admin hardcoded; endpoint `database-operations` genérico; remover backdoors antes de qualquer exposição pública ampliada.

---

## 1. Especialista em Arquitetura e Engenharia de Software

### Pontos fortes

- **App Router** com segmento `(app)` para painel autenticado e rotas públicas separadas (`login`, `cliente/*`, APIs).
- **Camada de serviços** (`src/services/`) para pagamento, fulfillment, webhooks, integrações — reduz lógica nas rotas.
- **Cliente Supabase unificado** (`src/lib/supabase/unified-client.ts`) com bloqueio de service role no browser.
- **Validação de ambiente** (`src/lib/env-validation.ts`) com Zod por `NODE_ENV`.
- **Tratamento de erros centralizado** (`ErrorService`, boundaries em `error.tsx` / `not-found.tsx` / `loading.tsx`).
- **Convenção de servidores** documentada nas regras do projeto (TheBest, NaTv, etc.) com URLs base em integrações.

### Riscos e dívidas técnicas

| Item | Severidade | Detalhe |
|------|------------|---------|
| Três padrões de autorização | Médio | Middleware global + `api-auth.ts` + helpers locais em rotas admin (`getAuthenticatedUser` sem cookies) |
| Código legado na raiz | Médio | Dezenas de `.cjs`/`.js` de migração pontual (`check-profiles.cjs`, `fix-admin-role.cjs`) misturados com `scripts/` |
| Componentes não usados | Baixo | `navbar.tsx`, `main-nav.tsx`, `dashboard-content.tsx.backup` |
| Duplicação de tokens CSS | Médio | `globals.css` vs `hub-theme.css` |
| README desatualizado | Baixo | Cita NextAuth; stack real é Supabase Auth + cookies |

### Recomendações

1. **Padrão único de auth em API:** `requireApiAdmin()` / `requireApiUser()` de `src/lib/api-auth.ts` em todas as rotas que repetem checagem manual.
2. **Mover scripts one-off** da raiz para `scripts/archive/` ou remover após uso.
3. **Índice único de documentação:** `docs/README.md` (ver seção 8).
4. **Alinhar README** com stack real e link para esta auditoria.

### Impacto

- **Manutenibilidade:** consolidar auth evita 401 “fantasma” e regressões em deploy multi-instância.
- **Escalabilidade:** preparado para múltiplos usuários no painel; rate limit e cache ainda locais por instância.

---

## 2. Especialista em Frontend, Responsividade e UX

### Pontos fortes

- Layout `(app)` com **Sidebar shadcn** + Sheet em mobile (`useIsMobile` @ 768px).
- **ThemeProvider** (claro/escuro/sistema), toasts (Sonner + Radix).
- Formulários críticos com **react-hook-form + Zod + Form** (configurações, clientes, servidores).
- **LGPD:** `PrivacyBanner` responsivo.
- Login fora do shell admin; fluxo de recuperação de senha; smoke E2E em `e2e/smoke.spec.ts`.

### Problemas (por severidade)

| # | Problema | Arquivos | Sev. |
|---|----------|----------|------|
| 1 | Tabelas sem estratégia mobile | `base-table.tsx`, `clientes/table.tsx`, `testes/table.tsx`, `plan-list.tsx`, `servers-table.tsx` | Alta |
| 2 | `ResponsiveTable` existe mas não é usada em produção | `src/components/ui/responsive-table.tsx` (ou equivalente) | Alta |
| 3 | Dois cabeçalhos por página (`ModernHeader` + `Header`) | `modern-header.tsx`, `header.tsx`, várias `page.tsx` | Alta |
| 4 | `userScalable: false` no viewport | `src/app/layout.tsx` | Alta (WCAG) |
| 5 | Rotas sem item no menu (Marketing, Pagamentos, Checkout) | `modern-sidebar.tsx` | Média |
| 6 | Dashboard: botões com largura fixa inline | `dashboard-content.tsx` | Média |
| 7 | Abas Integrações/Relatórios estouram em mobile | `integracoes/page.tsx`, `relatorios/page.tsx` | Média |
| 8 | Login: delay 1,5s artificial pós-sucesso | `login-form.tsx` | Média |
| 9 | Placeholder de usuário na sidebar antes do mount | `modern-sidebar.tsx` | Média |
| 10 | Metadata/README com termos “IPTV/streaming” | `layout.tsx`, `README.md` | Baixa (regra de comunicação) |

### Recomendações (roadmap UX)

**Sprint 1:** um único `<h1>` por rota (só `ModernHeader`); `overflow-x-auto` em tabelas; viewport com zoom permitido; completar sidebar.  
**Sprint 2:** adotar `ResponsiveTable` nas listagens; tabs com scroll ou `<Select>` em `<md`.  
**Sprint 3:** unificar tokens em `hub-theme.css`; E2E com viewport 375px; loading por rota pesada.

### Regras de projeto aplicáveis

- Datas para usuário final: **DD/MM/AAAA HH:MM:SS** (validar formatadores em listagens e notificações).
- Não expor detalhes técnicos em mensagens ao cliente final.
- Evitar termos “iptv”, “tv”, “streaming” em e-mails/WhatsApp e superfícies públicas (metadata ainda viola parcialmente).

---

## 3. Especialista em Backend e APIs

### Inventário

- ~97 rotas em `src/app/api/`
- Middleware **default-deny** (`src/middleware.ts`): público explícito (auth, health, webhooks, checkout público, bot API key); admin em `/api/admin/*`; demais exigem sessão.

### Pontos fortes

- Webhooks **Gates2B** e **TheBest** com HMAC (`webhook-auth.ts`, `webhook.service.ts`); produção sem secret → falha fechada (Gates2B).
- **Anti-IDOR** em notificações in-app (testado em `critical-apis.test.ts`).
- Login/registro: Zod + rate limit (`rate-limit.ts`).
- Proxy TMDB com allowlist + rate limit.
- Checkout Hub: fulfillment via service role; RLS nas tabelas de checkout.

### Riscos críticos e altos

| Risco | Sev. | Arquivo(s) |
|-------|------|------------|
| Webhook **Cakto**: se `CAKTO_WEBHOOK_SECRET` existe mas header de assinatura não vem, POST **continua** | **Crítico** | `src/app/api/webhooks/cakto/route.ts` |
| **Backdoor admin** por UUID `2f67bed8-...` e email fixo | **Crítico** | `admin/plan-groups`, `plans`, `period-config`, `credit-monitoring`, `planos/actions.ts` |
| **`/api/admin/database-operations`**: CRUD genérico em qualquer tabela com service role | **Crítico** | `database-operations/route.ts` |
| Rotas admin com `getUser()` sem cookies (sessão painel ignorada) | Alto | `gates2b-config`, `bpix-config`, `natv-config`, etc. |
| Checkout público sem rate limit | Alto | `public/checkout/create`, `options` |
| `marketing/send-campaign` sem checagem admin na rota | Alto | `marketing/send-campaign/route.ts` |
| Login retorna `session` completa no JSON | Alto | `auth/login/route.ts` |
| `GET /api/cache` sem admin | Médio | `cache/route.ts` |
| Rate limit só em memória (Map) | Médio | `rate-limit.ts` |

### Recomendações backend

1. **Cakto:** se secret configurado → assinatura obrigatória; em produção, sem secret → 503 (mesmo padrão Gates2B).
2. Remover UUID/email fixos; usar só `profiles.role` / `hub_control_is_admin()`.
3. Substituir `database-operations` por endpoints/RPC allowlisted.
4. Rate limit em `/api/public/checkout/*` e Redis/Upstash para multi-réplica.
5. Login: não retornar tokens no body; apenas cookies httpOnly.
6. Padronizar testes: Cakto, checkout abuse, admin com cookie.

---

## 4. Especialista em Banco de Dados (Supabase / PostgreSQL)

### Migrações

- **41 arquivos** em `supabase/migrations/` (+ `_archive_DO_NOT_APPLY/`).
- Ordem canônica: `supabase/migrations/README.md`.
- **Maio/2026 (estado alvo):** `hub_control_rls_phase3`, revoke anon, `hub_checkout`, `plano_acao_seguranca_*`.

### Segurança de dados

| Item | Sev. | Notas |
|------|------|-------|
| RLS Fase 3 + hardening maio/2026 | Positivo | Revoke anon em tabelas admin; `security_invoker` em views |
| `hub_control_clients_anon_link` (SELECT anon se `unique_link` NOT NULL) | Médio | Risco de enumeração se links previsíveis |
| `checkout_orders` sem INSERT/UPDATE para authenticated | OK | Desde que 100% via service role nas APIs |
| Colisão de timestamps `20241220000001_*` (3 arquivos) | Alto | Ordem de apply não determinística no CLI |
| Migrações legadas 20241223–25 vs Fase 3 | Médio | Projeto novo: seguir só README + maio/2026 |
| Três migrações de revoke quase iguais | Baixo | Redundância operacional |

### Índices (checkout)

`idx_checkout_orders_client`, `_reseller`, `_status`, `_external_ref` em `20260519140000_hub_checkout.sql`.

### Validação pós-migração (local)

```bash
npm run verify:supabase-security
npm run verify:checkout
```

Plano detalhado de ações SQL: `PLANO_ACAO_SEGURANCA_SUPABASE.md` (manter como checklist operacional, não como relatório histórico).

### Recomendações DB

1. Renumerar ou fundir migrações com mesmo prefixo de timestamp.
2. Executar `verify:supabase-security` no HBCONTROL após cada restore.
3. Revisar política anon em `clients` e `plan_groups` (leitura pública intencional?).
4. Teste automatizado opcional: projeto Supabase de CI com RLS real (hoje integração usa mocks).

---

## 5. Especialista em Segurança

### Postura geral

O projeto está em **endurecimento ativo** (README maio/2026): middleware default-deny, RLS, webhooks assinados, CSP/HSTS em produção. Ainda há **superfícies críticas** que anulam parte do ganho se não corrigidas.

### Matriz OWASP simplificada

| Categoria | Status | Observação |
|-----------|--------|------------|
| Broken Access Control | ⚠️ | Backdoor UUID; cache GET; marketing send |
| Cryptographic failures | ✓ parcial | HMAC webhooks; login expõe session no JSON |
| Injection | ✓ razoável | Zod + input-validation em rotas principais |
| Insecure design | ⚠️ | database-operations; Cakto opcional |
| Security misconfiguration | ⚠️ | Webhook sem secret em dev aceito; CI security quebrado |
| SSRF | ✓ | Proxies com allowlist |
| Identification failures | ✓ parcial | Rate limit login; signup público depende do Auth Supabase |

### Segredos e ambiente

- `.env.example` como referência; **nunca** commitar `.env.local`.
- Produção: rotacionar service_role após restore; secrets de webhook obrigatórios.
- Checklist: `docs/GUIA_HUB_CONTROL.md` §4–5.

### Headers e middleware

- `attachSecurityHeaders` no middleware.
- CORS restrito em APIs autenticadas; login com `Access-Control-Allow-Origin: *` — revisar.

### Ações P0 (segurança)

1. Patch Cakto webhook  
2. Remover backdoor admin  
3. Desativar ou restringir `database-operations`  
4. `requireApiAdmin` em cache GET, marketing, rotas admin inconsistentes  
5. Desabilitar registro público em produção ou exigir convite  

---

## 6. Especialista em Backup, Recuperação e Operações

### Fontes de verdade (recomendado)

| Camada | Ferramenta | Documentação |
|--------|------------|--------------|
| Banco produção | Export Supabase Dashboard + `scripts/recuperar-supabase.ps1` | `docs/GUIA_HUB_CONTROL.md` §4 |
| Pós-restore | Checklist env + auth + migrações | `docs/GUIA_HUB_CONTROL.md` §4 |
| DR scripts | `scripts/disaster-recovery/*.ps1` | `scripts/disaster-recovery/README.md` |

### Lacunas

| Item | Impacto |
|------|---------|
| `npm run backup:full` etc. chamam `scripts/run-backup.js` — **arquivo inexistente** | Scripts npm enganam operador |
| `BACKUP_GUIDE.md` / `BACKUP_BACKEND_GUIDE.md` duplicam narrativa | Confusão |
| Storage (avatars) não coberto no runbook rápido | Perda parcial pós-restore |
| `docs/DISASTER_RECOVERY_PLAN.md` (~800 linhas teóricas) desconectado dos scripts | Baixo valor operacional |
| CI não valida backup nem `verify:supabase-security` | Sem rede de segurança automática |

### Recomendações

1. Marcar backup Supabase Dashboard como **oficial**; corrigir ou remover `backup:*` do `package.json`.
2. ~~Unificar guias de backup~~ → `docs/BACKUP_E_RECUPERACAO.md` (maio/2026).
3. Agendar (fora do repo) execução de `disaster-recovery-test.ps1` trimestral.
4. Incluir passo “export storage” no runbook se avatars forem críticos.

---

## 7. Especialista em CI/CD e Qualidade

### Estado atual

| Pipeline | Arquivo | Efetividade |
|----------|---------|-------------|
| E2E smoke | `.github/workflows/e2e-smoke.yml` | Node 20, Playwright, health + login |
| Security | `.github/workflows/security-tests.yml` | Node 20; audit high + `test:security` + `test:integration` (ver [PLANO_ACAO_CI_SEGURANCA.md](./PLANO_ACAO_CI_SEGURANCA.md)) |

### Testes no repositório

| Tipo | Config | Cobertura |
|------|--------|-----------|
| Unit | `jest.config.js` | Segurança simulada, notificações |
| Integração | `jest.integration.config.js` | ~22 testes APIs críticas + webhook-auth |
| E2E | `playwright.config.ts` | Smoke API + login desktop |

### Lacunas

- `test:ci` não roda no GitHub Actions.
- Sem `typecheck` / `lint` no CI.
- Sem teste mobile E2E.
- Sem teste RLS real.
- Integração Cakto, checkout público, `database-operations` ausentes.

### CI recomendado (`ci.yml` proposto)

```yaml
# ordem sugerida
npm run typecheck
npm run lint
npm run test:ci
# opcional com secrets:
# npm run verify:supabase-security
# npm run test:e2e
```

Revisar ou desativar `security-tests.yml` até alinhar com scripts reais.

---

## 8. Documentação — consolidação (atualizado)

### Canônicos (após limpeza 21/05/2026)

| Documento | Propósito |
|-----------|-----------|
| `docs/AUDITORIA_HUB_CONTROL_2026-05-21.md` | Este arquivo — auditoria e diagnóstico |
| `docs/PLANO_ACAO_MELHORIAS.md` | Plano de execução (P0/P1/P2) |
| `docs/GUIA_HUB_CONTROL.md` | Operação unificada (env, restore, testes, integrações) |
| `docs/README.md` | Índice |
| `docs/BACKUP_E_RECUPERACAO.md` | Backup/restore (Supabase + scripts) |
| `PLANO_ACAO_SEGURANCA_SUPABASE.md` | Checklist SQL/RLS |
| `supabase/migrations/README.md` | Ordem migrações |

Removidos: relatórios, resumos, fases, instruções de migração legadas, guias duplicados na raiz, pasta `testsprite_tests/`, SQL/JS soltos na raiz, pasta `migrations/` legada. Lista: `docs/archive/REMOVIDOS_2026-05-21.txt`.

---

## 9. Plano de ação (resumo)

O checklist executável completo — tarefas, arquivos, critérios de aceite, PRs e cronograma — está em:

**→ [PLANO_ACAO_MELHORIAS.md](./PLANO_ACAO_MELHORIAS.md)**

| Fase | Foco | Prazo |
|------|------|-------|
| **P0** | Cakto webhook, backdoor admin, `database-operations`, secrets | 1–3 dias |
| **P1** | Auth APIs, rate limit checkout, UX mobile, CI | 1–2 sprints |
| **P2** | Migrações DB, testes E2E, comunicação/metadata | ~1 mês |

**Banco/RLS (paralelo):** [PLANO_ACAO_SEGURANCA_SUPABASE.md](../PLANO_ACAO_SEGURANCA_SUPABASE.md)

---

## 10. Conclusão

O Hub Control evoluiu para uma base **profissional e defensiva** (middleware, RLS, webhooks, testes de integração), adequada a **múltiplos usuários** no painel desde que os itens P0 sejam tratados. O maior gap entre “código de segurança” e “risco real” está em **exceções** (Cakto, backdoor admin, CRUD genérico) e em **UX mobile** ainda desktop-first.

**Próximo passo recomendado:** executar **P0** em [PLANO_ACAO_MELHORIAS.md](./PLANO_ACAO_MELHORIAS.md) (PRs `fix/p0-*`), depois `npm run verify:supabase-security` no HBCONTROL.

---

*Documento gerado por auditoria automatizada + revisão de código. Para implementar correções, use o modo Agent e referencie os IDs P0/P1 acima.*
