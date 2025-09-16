# 🚀 Guia de Deploy para Produção

## Pré-requisitos

### 1. Ferramentas Necessárias
```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer login no Vercel
vercel login

# Verificar projetos configurados
vercel ls
```

### 2. Variáveis de Ambiente
Crie um arquivo `.env.production` com as seguintes variáveis:

```env
# Supabase - Produção
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase_prod
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_prod
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_prod

# BPIX - Produção
BPIX_API_URL=https://api.bpix.com.br
BPIX_API_KEY=sua_chave_api_bpix_prod
BPIX_WEBHOOK_SECRET=seu_webhook_secret_prod

# Configurações de Produção
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app

# Monitoramento
SENTRY_DSN=seu_sentry_dsn
NEXT_PUBLIC_SENTRY_DSN=seu_sentry_dsn_publico

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=seu_google_analytics_id
```

## Scripts de Deploy

### Deploy Completo (Recomendado)
```bash
# Executa todos os checks e deploy
npm run deploy:full
```

### Deploy Rápido
```bash
# Deploy direto (sem testes)
npm run deploy:prod
```

### Deploy de Preview
```bash
# Deploy de preview (staging)
npm run deploy:preview
```

### Preview Local
```bash
# Testar localmente antes do deploy
npm run build:static
npm run dev
```

## Checklist de Deploy

### ✅ Pré-Deploy
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Testes passando (`npm test`)
- [ ] Lint sem erros (`npm run lint`)
- [ ] TypeScript sem erros (`npm run typecheck`)
- [ ] Build local funcionando (`npm run build:static`)
- [ ] Preview local testado (`npm run dev`)

### ✅ Configuração do Banco
- [ ] Políticas RLS configuradas no Supabase
- [ ] Tabelas criadas e migradas
- [ ] Usuário admin inicial criado
- [ ] Backup do banco configurado

### ✅ Integrações
- [ ] BPIX configurado e testado
- [ ] Webhooks configurados
- [ ] APIs externas funcionando

### ✅ Segurança
- [ ] Headers de segurança configurados
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] Logs de auditoria funcionando

### ✅ Monitoramento
- [ ] Sentry configurado
- [ ] Analytics configurado (se aplicável)
- [ ] Health checks funcionando
- [ ] Alertas configurados

## Configuração do Vercel

### 1. Configurar Domínio Customizado (Opcional)
```bash
# No dashboard do Vercel
# Project Settings > Domains > Add Domain
```

### 2. Configurar SSL
```bash
# SSL é automático no Vercel
# Certificados são renovados automaticamente
```

### 3. Configurar CDN
```bash
# CDN é automático no Vercel
# Cache configurado no vercel.json
```

## Monitoramento Pós-Deploy

### 1. Verificações Imediatas
```bash
# Verificar se o site está no ar
curl -I https://seu-projeto.vercel.app

# Verificar APIs
curl https://seu-projeto.vercel.app/api/health
```

### 2. Logs e Métricas
- Verificar logs no Vercel Dashboard
- Monitorar métricas no Sentry
- Verificar performance no Lighthouse

### 3. Testes de Funcionalidade
- [ ] Login/logout funcionando
- [ ] Dashboard carregando
- [ ] Integrações funcionando
- [ ] Webhooks recebendo dados

## Rollback

### Em caso de problemas:
```bash
# Voltar para versão anterior no Vercel Dashboard
# Deployments > Previous Deployment > Promote to Production

# Ou fazer deploy da versão anterior
git checkout versao-anterior
npm run deploy:prod
```

## Otimizações de Produção

### 1. Performance
- Bundle splitting automático configurado
- Lazy loading implementado
- Imagens otimizadas
- Cache configurado

### 2. SEO
- Meta tags configuradas
- Sitemap gerado automaticamente
- Robots.txt configurado

### 3. Segurança
- Headers de segurança
- CSP configurado
- Rate limiting
- Sanitização de dados

## Troubleshooting

### Problemas Comuns

#### Build falhando
```bash
# Limpar cache e reinstalar
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### Deploy falhando
```bash
# Verificar autenticação
vercel login

# Verificar projeto
vercel link
```

#### Site não carregando
- Verificar variáveis de ambiente no Vercel Dashboard
- Verificar configuração do Supabase
- Verificar logs no Vercel Dashboard
- Verificar build logs no Vercel

## Contatos de Emergência

- **Desenvolvedor Principal**: [seu-email]
- **Suporte Supabase**: support@supabase.io
- **Suporte Firebase**: Firebase Console > Suporte
- **Suporte BPIX**: [contato-bpix]

---

**Última atualização**: $(date)
**Versão do guia**: 1.0