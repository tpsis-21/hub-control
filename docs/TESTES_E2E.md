# Testes E2E — Playwright (smoke)

Smoke tests de API e login via Playwright.

## Executar localmente

Pré-requisito: `.env.local` com Supabase HBCONTROL (ou dev server já rodando).

```bash
# Instalar browser (uma vez)
npx playwright install chromium

# Com servidor automático (sobe npm run dev)
npm run test:e2e

# Interface visual
npm run test:e2e:ui
```

Se `npm run dev` já estiver ativo em 8080, o Playwright reutiliza o processo.

## Login completo (opcional)

Defina no ambiente antes de rodar:

```env
E2E_TEST_EMAIL=admin@seu-dominio.com
E2E_TEST_PASSWORD=sua-senha
```

Sem essas variáveis, os testes de API + UI de login rodam; o teste de login autenticado é **ignorado**.

## CI (GitHub Actions)

Workflow: `.github/workflows/e2e-smoke.yml`

Secrets necessários no repositório:

| Secret | Obrigatório |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim |
| `E2E_TEST_EMAIL` | Não (habilita login → dashboard) |
| `E2E_TEST_PASSWORD` | Não |

## Mobile (375px)

O Playwright roda também o projeto `mobile-chrome` (viewport Pixel 5). Smoke mobile:

- Login sem overflow horizontal na viewport
- `/dashboard` sem sessão redireciona para `/login`

```bash
npx playwright test --project=mobile-chrome
```

## Cenários cobertos

- `GET /api/health` e `/api/status`
- Página `/login` (formulário)
- Credenciais inválidas (permanece em `/login`)
- Layout mobile (375px)
- Login admin → `/dashboard` (se secrets E2E configurados)
