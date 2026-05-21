# Guia operacional — Hub Control

Documento único para **operação, ambiente, migrações, testes, restore e integrações**.  
Análise: [AUDITORIA_HUB_CONTROL_2026-05-21.md](./AUDITORIA_HUB_CONTROL_2026-05-21.md).  
Plano de execução: [PLANO_ACAO_MELHORIAS.md](./PLANO_ACAO_MELHORIAS.md).  
Checklist SQL/RLS detalhado: [PLANO_ACAO_SEGURANCA_SUPABASE.md](../PLANO_ACAO_SEGURANCA_SUPABASE.md).

---

## 1. Documentação canônica (mínima)

| Arquivo | Conteúdo |
|---------|----------|
| `docs/AUDITORIA_HUB_CONTROL_2026-05-21.md` | Auditoria completa, riscos P0/P1, UX/backend/DB |
| `docs/PLANO_ACAO_MELHORIAS.md` | Checklist de melhorias (código, UX, CI) |
| `docs/GUIA_HUB_CONTROL.md` | Este guia (operação) |
| `PLANO_ACAO_SEGURANCA_SUPABASE.md` | Migrações e validações RLS no Supabase |
| `supabase/migrations/README.md` | Ordem oficial das migrações |
| `.env.example` | Variáveis de ambiente |

---

## 2. Variáveis de ambiente e URLs

Projeto Supabase ativo (pós-restore): **HBCONTROL** — configurar em `.env.local` (nunca commitar).

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Apenas servidor (APIs, fulfillment) |
| `NEXT_PUBLIC_APP_URL` | URL do painel (CORS, callbacks) |
| `GATES2B_WEBHOOK_SECRET` / `THEBEST_WEBHOOK_SECRET` / `CAKTO_WEBHOOK_SECRET` | Webhooks |
| `GATES2B_API_BASE_URL` | API Gates2B (Bpix usa a mesma URL) |
| `THEBEST_API_BASE_URL` | Painel Best |
| `NATV_API_BASE_URL` | API revenda NATV |

**URLs base (fallback no código):**

| Provedor | Variável | Padrão |
|----------|----------|--------|
| Gates2B / Bpix | `GATES2B_API_BASE_URL` | `https://api.gates2b.com` |
| TheBest | `THEBEST_API_BASE_URL` | `https://api.painel.best` |
| NATV | `NATV_API_BASE_URL` | `https://revenda.pixbot.link` |

Código: `src/lib/integrations/server-base-urls.ts`.

---

## 3. Migrações Supabase

**Fonte da verdade:** apenas `supabase/migrations/*.sql` (CLI ignora subpastas).

**Ordem (resumo):** baseline `20241220*` → TheBest `20250114*` → RLS Fase 3 `20260519120000` → revoke anon `20260519120100` → checkout `20260519140000` → plano segurança `20260520140000` → hardening `20260520140200` → revoke execute `20260520140300`.

**Não aplicar:** `supabase/migrations/_archive_DO_NOT_APPLY/`.

**Após aplicar:**

```bash
npm run verify:supabase-security
npm run verify:checkout
```

**Não usar:** pasta legada `migrations/` na raiz do repo, scripts SQL soltos na raiz, nem `EXECUTE_SECURITY_MIGRATION*.md` — foram removidos.

---

## 4. Restore e operação pós-restore

### Restore rápido (4 passos)

1. Backup no Dashboard do projeto antigo → `C:\Backups\hub-control`
2. Novo projeto em https://database.new
3. `.\scripts\recuperar-supabase.ps1` (na raiz do repo)
4. Auth → Site URL `http://localhost:8080`, redirect `http://localhost:8080/auth/callback`

### Checklist pós-restore

- [ ] Rotacionar senha do banco se exposta
- [ ] Copiar `anon` + `service_role` para `.env.local`
- [ ] `npm install` → `npm run dev` → login em `/login`
- [ ] Admin: redefinir senha no Supabase Auth se necessário (`npm run admin:set-password`)
- [ ] `npm run verify:local`
- [ ] `GET /api/health` → 200
- [ ] `npm run test:integration`
- [ ] `profiles.role = admin` para usuário operacional

### Backup oficial

Ver **[BACKUP_E_RECUPERACAO.md](./BACKUP_E_RECUPERACAO.md)** — export Supabase Dashboard + `scripts/recuperar-supabase.ps1` (scripts `backup:full` não existem no npm).

---

## 5. Segurança da aplicação (resumo)

- Middleware **default-deny** em páginas e `/api/*`
- Admin: `profiles.role = admin` + prefixo `/api/admin`
- Webhooks: HMAC obrigatório em produção (Gates2B/TheBest); **corrigir Cakto** (ver auditoria P0)
- Cookies httpOnly na auth; não expor `service_role` no frontend
- CSP/HSTS em produção (`next.config.ts`)

**Antes de produção:** rotacionar `service_role`, configurar secrets de webhook, executar plano em `PLANO_ACAO_SEGURANCA_SUPABASE.md`.

**Itens P0 (código):** backdoor UUID admin, endpoint `database-operations` genérico — ver auditoria.

---

## 6. Testes

### Integração (APIs, sem servidor HTTP)

```bash
npm run test:integration
```

Incluído em `npm run test:ci`. Config: `jest.integration.config.js`, `src/__tests__/integration/`.

Rotas cobertas: health, auth/user, notificações (IDOR), cache/initialize (admin), webhooks Gates2B/TheBest (mocks).

### E2E (Playwright smoke)

```bash
npx playwright install chromium
npm run test:e2e
```

Opcional: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` para login completo.

CI: `.github/workflows/e2e-smoke.yml`.

### Unitários + segurança

```bash
npm test
npm run test:security
npm run check:prod   # typecheck + lint + test
```

### Verificações de ambiente

```bash
npm run verify:local
npm run verify:supabase-security
npm run verify:checkout
```

---

## 7. Integrações

| Integração | Painel | Webhook / API |
|------------|--------|----------------|
| Gates2B (PIX/cartão) | `/integracoes` → Gates2B | `POST /api/gates2b/webhook` |
| TheBest | `/integracoes` → mapeamento | `POST /api/thebest/webhook/payment` |
| NATV | `/integracoes` → NATV | Config em `integration_configs` |
| Checkout Hub | `/checkout/pedidos` | Fulfillment + Gates2B `hubco_*` |
| n8n | Fluxos externos | Eventos → Hub (ver scripts `scripts/n8n-*`) |

**n8n:** workflows versionados em `scripts/*.json` e `anexos/checkout_tp/n8n-upload-pronto/`. Automação documentada no código e variáveis `INTEGRACOES_*`.

**TheBest:** tabelas `thebest_configs`, `thebest_plan_mappings`; RPCs `get_mapping_statistics`, `get_unmapped_thebest_packages`, `auto_map_thebest_packages`.

---

## 8. Desenvolvimento local

```bash
npm install
npm run dev    # http://localhost:8080
```

Porta padrão: **8080** (`package.json`).

---

## 9. Comunicação e regras de projeto

- Datas para usuário: **DD/MM/AAAA HH:MM:SS**
- Evitar termos "iptv", "tv", "streaming" em e-mails, WhatsApp e superfícies públicas
- Nomenclatura de servidores: P2PTV, Genial, TheBest, Ninety, Cloudplay, NaTv, Now, Elite, Central
- URLs: TheBest `iejuf.one`, NaTv `hv48.in`
- Não expor detalhes técnicos ao cliente final

---

*Substitui dezenas de guias, relatórios, resumos e instruções de migração dispersos. Histórico de arquivos removidos: `docs/archive/REMOVIDOS_2026-05-21.txt`.*
