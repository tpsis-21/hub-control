# Guia de Configuração BPIX em Produção

## 📋 Visão Geral

Este guia detalha todos os passos necessários para configurar e validar a integração BPIX em ambiente de produção.

## 🔧 Pré-requisitos

### 1. Conta BPIX
- [ ] Conta BPIX ativa e verificada
- [ ] API Key de produção obtida
- [ ] Webhook URL configurada no painel BPIX
- [ ] Certificados SSL válidos

### 2. Infraestrutura
- [ ] Aplicação deployada em produção
- [ ] Banco de dados configurado
- [ ] SSL/TLS configurado
- [ ] Monitoramento ativo

## 🔑 Configuração de Variáveis de Ambiente

### Variáveis Obrigatórias

```bash
# API BPIX
BPIX_API_URL=https://api.bpix.com.br/v1
BPIX_API_KEY=sua_api_key_de_producao
BPIX_WEBHOOK_URL=https://seudominio.com/api/webhooks/bpix
BPIX_ENCRYPTION_KEY=sua_chave_de_criptografia_32_chars_min

# Configurações de Segurança
BPIX_WEBHOOK_SECRET=seu_webhook_secret
BPIX_RATE_LIMIT_MAX=100
BPIX_RATE_LIMIT_WINDOW=60000

# Monitoramento
BPIX_ENABLE_METRICS=true
BPIX_ENABLE_LOGS=true
BPIX_LOG_LEVEL=info
```

### Validação das Variáveis

```bash
# Execute o script de validação
npm run validate:bpix
```

## 🚀 Processo de Deploy

### 1. Preparação

```bash
# 1. Faça backup do banco de dados
npm run backup:database

# 2. Execute testes locais
npm run test
npm run test:e2e

# 3. Valide configurações
npm run pre-deploy
```

### 2. Deploy da Integração

```bash
# Deploy completo com validações
npm run deploy:full

# Ou deploy seguro (sem rebuild)
npm run deploy:safe
```

### 3. Validação Pós-Deploy

```bash
# Teste específico da integração BPIX
npm run test:bpix-prod

# Verificação de health check
curl https://seudominio.com/api/health/bpix
```

## 🔍 Checklist de Configuração

### Configuração Inicial
- [ ] Variáveis de ambiente configuradas
- [ ] Chaves de API válidas
- [ ] Webhook URL acessível
- [ ] Certificados SSL válidos
- [ ] Firewall configurado para IPs BPIX

### Segurança
- [ ] Chave de criptografia com 32+ caracteres
- [ ] Validação de assinatura de webhook ativa
- [ ] Rate limiting configurado
- [ ] Logs de segurança ativos
- [ ] IPs BPIX na whitelist

### Monitoramento
- [ ] Health check endpoint funcionando
- [ ] Métricas de performance ativas
- [ ] Alertas configurados
- [ ] Logs estruturados
- [ ] Dashboard de monitoramento

### Funcionalidades
- [ ] Criação de pagamentos
- [ ] Recebimento de webhooks
- [ ] Atualização de status
- [ ] Consulta de pagamentos
- [ ] Relatórios e métricas

## 🧪 Testes de Validação

### 1. Teste de Conectividade

```bash
# Teste manual da API
curl -X GET \
  https://api.bpix.com.br/v1/health \
  -H "Authorization: Bearer $BPIX_API_KEY" \
  -H "Content-Type: application/json"
```

### 2. Teste de Webhook

```bash
# Teste do endpoint de webhook
curl -X POST \
  https://seudominio.com/api/webhooks/bpix \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 3. Teste de Pagamento

```javascript
// Teste via interface ou API
const testPayment = {
  amount: 1000, // R$ 10,00
  description: "Teste de produção",
  customer: {
    name: "Cliente Teste",
    email: "teste@exemplo.com",
    document: "12345678901"
  }
};
```

## 📊 Monitoramento em Produção

### Métricas Importantes

1. **Performance**
   - Tempo de resposta da API BPIX
   - Taxa de sucesso de pagamentos
   - Latência de webhooks

2. **Negócio**
   - Volume de transações
   - Valor total processado
   - Taxa de conversão

3. **Erros**
   - Taxa de erro da API
   - Webhooks falhados
   - Timeouts

### Alertas Configurados

- 🚨 **Crítico**: Taxa de erro > 5%
- ⚠️ **Aviso**: Tempo de resposta > 5s
- 📊 **Info**: Volume alto de transações

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conectividade
```bash
# Verificar conectividade
telnet api.bpix.com.br 443

# Verificar DNS
nslookup api.bpix.com.br

# Verificar certificados
openssl s_client -connect api.bpix.com.br:443
```

#### 2. Webhook Não Funciona
```bash
# Verificar endpoint
curl -I https://seudominio.com/api/webhooks/bpix

# Verificar logs
tail -f /var/log/app/webhook.log

# Verificar firewall
iptables -L | grep 443
```

#### 3. Pagamentos Falhando
```bash
# Verificar logs da aplicação
tail -f /var/log/app/bpix.log

# Verificar banco de dados
psql -c "SELECT * FROM bpix_payments ORDER BY created_at DESC LIMIT 10;"

# Verificar métricas
curl https://seudominio.com/api/metrics/bpix
```

### Logs Importantes

```bash
# Logs da aplicação
tail -f /var/log/app/application.log | grep BPIX

# Logs do nginx/apache
tail -f /var/log/nginx/access.log | grep webhook

# Logs do sistema
journalctl -u your-app-service -f
```

## 🔄 Procedimentos de Rollback

### Em Caso de Problemas

1. **Rollback Imediato**
   ```bash
   # Desativar integração BPIX
   export BPIX_ENABLED=false
   
   # Restart da aplicação
   pm2 restart app
   ```

2. **Rollback Completo**
   ```bash
   # Voltar para versão anterior
   git checkout previous-stable-tag
   npm run deploy:safe
   ```

3. **Rollback do Banco**
   ```bash
   # Restaurar backup
   pg_restore -d database backup_file.sql
   ```

## 📞 Contatos de Emergência

- **Suporte BPIX**: suporte@bpix.com.br
- **Telefone**: +55 11 1234-5678
- **Status Page**: https://status.bpix.com.br
- **Documentação**: https://docs.bpix.com.br

## 📚 Documentação Adicional

- [API Reference BPIX](https://docs.bpix.com.br/api)
- [Webhook Guide](https://docs.bpix.com.br/webhooks)
- [Security Best Practices](https://docs.bpix.com.br/security)
- [Monitoring Guide](./MONITORING_GUIDE.md)
- [Backup Strategy](./BACKUP_STRATEGY.md)

## ✅ Checklist Final

Antes de considerar a integração como "pronta para produção":

- [ ] Todos os testes passando
- [ ] Monitoramento configurado
- [ ] Alertas funcionando
- [ ] Documentação atualizada
- [ ] Equipe treinada
- [ ] Procedimentos de emergência testados
- [ ] Backup strategy implementada
- [ ] Performance validada
- [ ] Segurança auditada
- [ ] Compliance verificado

---

**Última atualização**: $(date)
**Versão**: 1.0.0
**Responsável**: Equipe de Desenvolvimento