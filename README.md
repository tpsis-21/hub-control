# Hub Control — Painel administrativo

## 📋 Visão Geral

Hub Control é uma aplicação para gestão de clientes, assinaturas, planos, servidores e integrações (Gates2B, TheBest, NATV, n8n), desenvolvida com **Next.js 15** e **Supabase**.

## 🚀 Tecnologias Principais

- **Frontend:** Next.js 15, React 18, TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **UI:** Tailwind CSS, shadcn/ui
- **Autenticação:** Supabase Auth (cookies httpOnly + middleware)
- **Validação:** Zod
- **Notificações:** Push Notifications (Web Push API)

## 🔒 Status de Segurança (atualizado maio/2026)

**Em endurecimento** — Fases 1–3 da auditoria aplicadas no código e no HBCONTROL.

### Implementado recentemente
- Middleware **default-deny** (páginas + `/api/*`)
- RLS consolidado (`hub_control_rls_phase3`)
- Webhooks com validação de assinatura
- CSP + HSTS (produção)
- Cookies `httpOnly` na auth

### Ações manuais obrigatórias antes de produção
- Rotacionar **service_role** e senha do banco no Supabase
- Ativar **Leaked Password Protection** (Auth)
- Configurar URLs de callback (ver `docs/GUIA_HUB_CONTROL.md` §4)

Documentação principal:
- `docs/AUDITORIA_HUB_CONTROL_2026-05-21.md` — auditoria (diagnóstico)
- `docs/PLANO_ACAO_MELHORIAS.md` — plano de ação para aplicar melhorias
- `docs/GUIA_HUB_CONTROL.md` — operação (env, restore, testes, integrações)
- `PLANO_ACAO_SEGURANCA_SUPABASE.md` — checklist SQL/RLS
- `docs/README.md` — índice

## 🔧 Configuração

O projeto utiliza Supabase como backend principal. Configure as variáveis de ambiente no arquivo `.env.local`:

```env
# Variáveis públicas (frontend)
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima

# Variáveis privadas (backend apenas)
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
TMDB_API_KEY=sua_chave_tmdb
NATV_API_KEY=sua_chave_natv
BOT_API_KEY=sua_chave_bot

# ... outras variáveis (consulte .env.example)
```

**⚠️ Importante:** As chaves de API e Service Role Key devem estar apenas no backend (.env.local) e nunca expostas no frontend.

## 🚀 Antes de Iniciar

1. **Configure as variáveis de ambiente** conforme descrito acima
2. **Consulte a documentação** em `DOCUMENTATION.md` para funcionalidades
3. **Revise o status de segurança** em `SECURITY_IMPLEMENTATION_STATUS.md`
4. **Entenda a arquitetura** em `TECHNICAL_SPECIFICATIONS.md`

## ✅ Sistema Pronto para Produção

O Hub Control agora possui:
- 🔒 **Segurança robusta** com todas as vulnerabilidades críticas corrigidas
- 🛡️ **Proteção de dados** com mascaramento e criptografia
- 📊 **Monitoramento completo** com logs e auditoria
- 🚀 **Performance otimizada** com rate limiting e cache
- 📱 **Interface moderna** com UX aprimorada

**Status:** ✅ **APROVADO PARA PRODUÇÃO**

## 📖 Primeiros Passos

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas configurações

# Executar em desenvolvimento
npm run dev
```

**Importante:** Consulte `docs/GUIA_HUB_CONTROL.md` para configuração e operação.

## 🆘 Recuperação e backup

- Restore Supabase: `docs/GUIA_HUB_CONTROL.md` §4 e `scripts/recuperar-supabase.ps1`
- Scripts DR opcionais: `scripts/disaster-recovery/README.md`

### Configuração Rápida
```powershell
# Copiar arquivo de configuração
cp scripts/disaster-recovery/config.example.ps1 scripts/disaster-recovery/config.ps1

# Editar configurações (substitua CHANGE_ME_* pelos valores reais)
# notepad scripts/disaster-recovery/config.ps1

# Testar configuração
. scripts/disaster-recovery/config.ps1
Test-Configuration -Environment "test"

# Executar teste básico
scripts/disaster-recovery/disaster-recovery-test.ps1 -Environment test -TestType basic -DryRun
```

## 📊 Analytics e Métricas de Negócio

O Hub Control inclui um sistema completo de analytics para monitoramento de métricas de usuário, financeiras e operacionais.

### Funcionalidades
- **Tracking de Eventos:** Usuário, transações, navegação e sistema
- **Métricas Calculadas:** DAU/WAU/MAU, MRR/ARR, retenção, churn
- **Dashboards:** Executivo, operacional e financeiro
- **Alertas:** Sistema e negócio com notificações
- **Integrações:** Google Analytics, Mixpanel, webhooks
- **Privacidade:** Compliance LGPD/GDPR

### Configuração Rápida
```bash
# Executar setup de analytics
./scripts/setup-analytics.ps1 -Environment development

# Configurar sistema
cp config/analytics.example.js config/analytics.js
# Editar config/analytics.js com suas configurações

# Acessar dashboards
# http://localhost:3000/admin/analytics
```

### Documentação
- [📈 Guia de Setup de Analytics](docs/ANALYTICS_SETUP.md)
- [🔧 Configuração do Sistema](config/analytics.example.js)
- [📊 API de Métricas](src/routes/analytics.js)
- [⚛️ Componentes React](src/components/Analytics/)

### Estrutura do Sistema
```
src/
├── services/
│   ├── analyticsService.js     # Serviço principal
│   └── analyticsApi.js         # API client
├── middleware/
│   └── analyticsMiddleware.js  # Middleware HTTP
├── routes/
│   └── analytics.js           # Rotas da API
├── components/Analytics/
│   ├── AnalyticsDashboard.jsx # Dashboard principal
│   └── AnalyticsConfig.jsx    # Configurações
└── hooks/
    └── useAnalytics.js        # Hook React
```

### Métricas Disponíveis

#### 👥 Usuário
- Usuários ativos (diário, semanal, mensal)
- Taxa de retenção e churn
- Duração de sessão
- Páginas por sessão

#### 💰 Financeiras
- MRR/ARR (Monthly/Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- LTV (Customer Lifetime Value)
- Taxa de conversão
- Taxa de sucesso de pagamentos

#### ⚡ Performance
- Tempo de carregamento de páginas
- Tempo de resposta da API
- Taxa de erro
- Uptime
- Usuários concorrentes

### Privacidade e Compliance
- ✅ Anonimização automática de IPs
- ✅ Hash de IDs de usuário
- ✅ Consentimento do usuário
- ✅ Retenção configurável de dados
- ✅ Compliance LGPD/GDPR
- ✅ Limpeza automática de dados antigos
