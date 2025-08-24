# 🚀 Guia de Deploy para Produção

## Pré-requisitos

### 1. Ferramentas Necessárias
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Fazer login no Firebase
firebase login

# Verificar projeto configurado
firebase projects:list
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
NEXT_PUBLIC_APP_URL=https://seu-dominio.web.app

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

### Deploy Apenas Estático
```bash
# Apenas build e deploy do frontend
npm run deploy:firebase
```

### Preview Local
```bash
# Testar localmente antes do deploy
npm run build:static
npm run preview:local
```

## Checklist de Deploy

### ✅ Pré-Deploy
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Testes passando (`npm test`)
- [ ] Lint sem erros (`npm run lint`)
- [ ] TypeScript sem erros (`npm run typecheck`)
- [ ] Build local funcionando (`npm run build:static`)
- [ ] Preview local testado (`npm run preview:local`)

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

## Configuração do Firebase

### 1. Configurar Domínio Customizado (Opcional)
```bash
# No console do Firebase
# Hosting > Domínio personalizado > Adicionar domínio
```

### 2. Configurar SSL
```bash
# SSL é automático no Firebase Hosting
# Certificados são renovados automaticamente
```

### 3. Configurar CDN
```bash
# CDN é automático no Firebase Hosting
# Cache configurado no firebase.json
```

## Monitoramento Pós-Deploy

### 1. Verificações Imediatas
```bash
# Verificar se o site está no ar
curl -I https://seu-dominio.web.app

# Verificar APIs
curl https://seu-dominio.web.app/api/health
```

### 2. Logs e Métricas
- Verificar logs no Firebase Console
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
# Voltar para versão anterior
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID

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
firebase login --reauth

# Verificar projeto
firebase use --add
```

#### Site não carregando
- Verificar variáveis de ambiente
- Verificar configuração do Supabase
- Verificar logs no Firebase Console

## Contatos de Emergência

- **Desenvolvedor Principal**: [seu-email]
- **Suporte Supabase**: support@supabase.io
- **Suporte Firebase**: Firebase Console > Suporte
- **Suporte BPIX**: [contato-bpix]

---

**Última atualização**: $(date)
**Versão do guia**: 1.0