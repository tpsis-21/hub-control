# Hub Control - Sistema de Gerenciamento IPTV

## 📋 Visão Geral

Hub Control é uma aplicação completa para gerenciamento de serviços IPTV, desenvolvida com Next.js 14 e Supabase. O sistema oferece funcionalidades avançadas para administração de clientes, testes, planos, servidores e automações.

## 🚀 Tecnologias Principais

- **Frontend:** Next.js 14, React 18, TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **UI:** Tailwind CSS, shadcn/ui
- **Autenticação:** NextAuth.js
- **Validação:** Zod
- **Notificações:** Push Notifications (Web Push API)

## 🔒 Status de Segurança

**🟢 SEGURO:** Sistema com segurança robusta implementada e pronto para produção.

### ✅ Implementações de Segurança Concluídas
- ✅ **Service Role Key** removida do frontend
- ✅ **Proxy para APIs externas** (TMDB, NATV, Bot)
- ✅ **Rate limiting avançado** por rota
- ✅ **Headers de segurança** (CSP, HSTS, etc.)
- ✅ **Mascaramento de dados sensíveis**
- ✅ **Sistema de auditoria completo**
- ✅ **Middleware de segurança robusto**

Consulte os seguintes arquivos para detalhes:
- `SECURITY_IMPLEMENTATION_STATUS.md` - Status completo das implementações
- `SECURITY_EXECUTIVE_SUMMARY.md` - Resumo executivo
- `DOCUMENTATION.md` - Documentação completa atualizada

## 📚 Documentação

### Para Desenvolvedores
- **Documentação Principal:** `DOCUMENTATION.md`
- **Especificações Técnicas:** `TECHNICAL_SPECIFICATIONS.md`
- **Análise de Segurança:** `SECURITY_ANALYSIS_REPORT.md`
- **Guia de Backup:** `BACKUP_BACKEND_GUIDE.md`
- **Configuração Supabase:** `README_SUPABASE.md`
- **Guia de Segurança:** `SECURITY_GUIDE.md`
- **Guia de Performance:** `PERFORMANCE_GUIDE.md`

### Para Usuários Finais
- **📖 Guia Completo do Usuário:** `docs/USER_GUIDE.md`
- **🚀 Guia de Início Rápido:** `docs/QUICK_START.md`
- **❓ Perguntas Frequentes:** `docs/FAQ.md`
- **🔧 Solução de Problemas:** `docs/TROUBLESHOOTING.md`

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

**Importante:** Consulte `APP_INITIALIZATION_GUIDE.md` para configuração completa.

## 🆘 Recuperação de Desastres

O Hub Control possui um sistema robusto de recuperação de desastres com scripts automatizados para backup, monitoramento e failover.

### Scripts Disponíveis
- **Backup Automatizado:** `scripts/disaster-recovery/backup-automation.ps1`
- **Failover de Emergência:** `scripts/disaster-recovery/emergency-failover.ps1`
- **Monitoramento de Saúde:** `scripts/disaster-recovery/monitoring-health-check.ps1`
- **Testes de DR:** `scripts/disaster-recovery/disaster-recovery-test.ps1`

### Documentação
- [📋 Plano de Recuperação de Desastres](docs/DISASTER_RECOVERY_PLAN.md)
- [🔧 Guia dos Scripts de DR](scripts/disaster-recovery/README.md)
- [👨‍🏫 Treinamento para Administradores](docs/ADMIN_TRAINING.md)
- [📝 Procedimentos Operacionais](docs/ADMIN_PROCEDURES.md)

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
