# Plano de ação — CI e pipeline de segurança

**Origem:** logs GitHub Actions `anexos/logs_70065482477` (run `26208370570`, commit `e6f109b`, 21/05/2026)  
**Relacionado:** [AUDITORIA_HUB_CONTROL_2026-05-21.md](./AUDITORIA_HUB_CONTROL_2026-05-21.md), [PLANO_ACAO_MELHORIAS.md](./PLANO_ACAO_MELHORIAS.md)

---

## O que falhou no run analisado

| Job (workflow antigo) | Status | Causa |
|----------------------|--------|--------|
| Auditoria de dependências | Falhou | 2 critical + 12 high (`next`, `basic-ftp`, etc.) |
| Testes automatizados | Falhou | `testPathPattern` obsoleto (Jest 30), `db:migrate:test` inexistente, SQL Supabase em Postgres CI |
| SAST | Passou* | ESLint quebrado ignorado (`\|\| true`); Semgrep não instalado |
| Compliance | Passou | Lista de MDs legados; avisos `helmet`/`jwt` irrelevantes para Next+Supabase |

---

## Estado atual (após correções no repo)

| Item | Situação |
|------|----------|
| Workflow | `.github/workflows/security-tests.yml` — Node 20, `npm audit --audit-level=high`, `test:security`, `test:integration` |
| CI principal | `.github/workflows/ci.yml` — inclui audit + `test:security` |
| Dependências | `next@15.5.18`; override `postcss@^8.5.10` |
| Scripts mortos | Removidos do workflow: `db:migrate:test`, `psql` + SQL Supabase, Semgrep/ESLint legacy |

---

## Checklist de execução

### Fase 0 — Dependências (bloqueio)

- [x] `next` ≥ 15.5.7 (RCE React Flight)
- [x] Override `postcss` ≥ 8.5.10
- [x] Após `npm install`, confirmar: `npm audit` → 0 vulnerabilidades (postcss 8.5.10 + uuid via overrides)
- [ ] Deploy com secrets webhook (P0.4 em PLANO_ACAO_MELHORIAS)

```bash
npm install
npm audit --audit-level=high
npm run check:prod
```

### Fase 1 — Pipeline (este PR / branch)

- [x] `security-tests.yml` alinhado aos scripts reais
- [x] `ci.yml` com audit + `test:security`
- [x] Trigger em `push`/`pull_request` em `main` e `develop`
- [ ] Validar run verde no GitHub após push

### Fase 2 — Opcional (backlog)

- [ ] SAST real: ESLint flat config + regras security (sem `\|\| true`)
- [ ] Semgrep via action oficial ou remover definitivamente
- [ ] Notificação real no job de falha (Slack/Telegram)
- [ ] Job Supabase branch + RLS (P2.1)

---

## Política de audit no CI

| Severidade | Comportamento |
|------------|----------------|
| critical / high | **Falha** o job (`--audit-level=high`) |
| moderate | Reportado localmente; não bloqueia CI até política explícita |

---

## Comandos locais (espelho do CI)

```bash
npm ci
npm audit --audit-level=high
npm run test:security
npm run test:integration -- --forceExit
npm run typecheck
npm run test:unit
```

---

*Atualizado em 21/05/2026 — substitui interpretação ad hoc dos logs em `anexos/logs_70065482477`.*
