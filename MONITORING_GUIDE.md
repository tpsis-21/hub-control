# 📊 Guia de Monitoramento em Produção

## Visão Geral

Este guia detalha a configuração e uso do sistema de monitoramento em produção do Hub Control, incluindo logs, métricas, alertas e health checks.

## 🏗️ Arquitetura de Monitoramento

### Componentes Principais

1. **Sistema de Logs** (`src/lib/logger.ts`)
   - Logs estruturados em JSON
   - Múltiplos níveis (debug, info, warn, error, fatal)
   - Saída para console, arquivo e serviço remoto
   - Rotação automática de logs

2. **Sistema de Métricas** (`src/pages/api/metrics/index.ts`)
   - Coleta de métricas de sistema, aplicação e negócio
   - Exposição via API REST
   - Thresholds configuráveis

3. **Sistema de Alertas** (`src/lib/alerts.ts`)
   - Múltiplos canais (email, Slack, webhook, SMS)
   - Regras configuráveis
   - Severidades (low, medium, high, critical)

4. **Health Checks** (`src/pages/api/health/`)
   - Verificação de componentes críticos
   - Endpoints específicos por serviço
   - Monitoramento contínuo

5. **Dashboard de Monitoramento** (`src/pages/api/monitoring/dashboard.ts`)
   - Visão centralizada de todas as métricas
   - Status em tempo real
   - Histórico de alertas

## 🚀 Configuração Inicial

### 1. Variáveis de Ambiente

Crie ou atualize o arquivo `.env.production`:

```bash
# Ambiente
NODE_ENV=production

# Logging
LOG_LEVEL=info
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_ENABLE_REMOTE=true
LOG_DIR=./logs
LOG_MAX_FILE_SIZE=10MB
LOG_MAX_FILES=5
LOG_REMOTE_ENDPOINT=https://logs.exemplo.com/api/logs
LOG_REMOTE_API_KEY=sua_api_key_aqui
LOG_REMOTE_TIMEOUT=5000

# Métricas
METRICS_ENABLED=true
METRICS_INTERVAL=60000
METRICS_RETENTION_RAW=1h
METRICS_RETENTION_AGGREGATED=7d
METRICS_RETENTION_SUMMARY=30d

# Thresholds
THRESHOLD_MEMORY_USAGE=80
THRESHOLD_CPU_USAGE=80
THRESHOLD_DISK_USAGE=85
THRESHOLD_ERROR_RATE=5
THRESHOLD_RESPONSE_TIME=2000

# Alertas
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_FROM=alerts@seudominio.com
ALERT_EMAIL_TO=admin@seudominio.com,dev@seudominio.com

ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_SLACK_CHANNEL=#alerts
ALERT_SLACK_USERNAME=Hub Control

ALERT_WEBHOOK_ENABLED=false
ALERT_WEBHOOK_URL=https://webhook.exemplo.com/alerts
ALERT_WEBHOOK_TIMEOUT=5000
ALERT_WEBHOOK_RETRIES=3

ALERT_SMS_ENABLED=false
ALERT_SMS_PROVIDER=twilio
ALERT_SMS_API_KEY=sua_api_key_sms
ALERT_SMS_FROM=+5511999999999
ALERT_SMS_TO=+5511888888888

# SMTP (para alertas por email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app

# Health Checks
HEALTH_CHECKS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Monitoramento Externo
EXTERNAL_HEALTH_CHECK_ENABLED=true
EXTERNAL_HEALTH_CHECK_URL=https://uptime.exemplo.com/webhook
EXTERNAL_HEALTH_CHECK_INTERVAL=300000
```

### 2. Executar Configuração

```bash
# Configurar monitoramento
npm run monitoring:setup

# Verificar configuração
npm run monitoring:test
```

## 📋 Scripts Disponíveis

### Configuração
```bash
npm run monitoring:setup    # Configurar sistema de monitoramento
```

### Testes
```bash
npm run monitoring:test     # Testar todos os endpoints
npm run monitoring:health   # Testar health checks
npm run monitoring:metrics  # Testar métricas
npm run monitoring:dashboard # Testar dashboard
```

### Logs
```bash
npm run logs:view          # Visualizar logs em tempo real
npm run logs:errors        # Visualizar apenas erros
npm run logs:clear         # Limpar logs
```

## 🔍 Endpoints de Monitoramento

### Health Checks

#### `/api/health`
**Descrição:** Health check principal do sistema

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": { "status": "healthy", "responseTime": 45 },
    "cache": { "status": "healthy", "responseTime": 12 },
    "external_apis": { "status": "healthy", "responseTime": 234 }
  }
}
```

#### `/api/health/bpix`
**Descrição:** Health check específico da integração BPIX

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "api_connectivity": { "status": "healthy", "responseTime": 156 },
    "webhook_endpoint": { "status": "healthy", "responseTime": 89 },
    "database": { "status": "healthy", "responseTime": 34 },
    "cache": { "status": "healthy", "responseTime": 8 }
  }
}
```

### Métricas

#### `/api/metrics`
**Descrição:** Métricas do sistema e aplicação

**Resposta:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "system": {
    "memory": {
      "used": 512,
      "total": 1024,
      "percentage": 50
    },
    "cpu": {
      "usage": 25.5
    },
    "uptime": 3600
  },
  "application": {
    "users": {
      "total": 150,
      "active": 45,
      "online": 12
    },
    "requests": {
      "total": 1500,
      "errors": 15,
      "avgResponseTime": 245
    }
  },
  "bpix": {
    "payments": {
      "total": 89,
      "successful": 87,
      "failed": 2
    },
    "webhooks": {
      "received": 156,
      "processed": 154,
      "failed": 2
    }
  },
  "alerts": [
    {
      "type": "warning",
      "message": "Uso de memória acima de 80%",
      "value": 85,
      "threshold": 80
    }
  ]
}
```

### Dashboard

#### `/api/monitoring/dashboard`
**Descrição:** Dashboard completo de monitoramento

**Resposta:** Combinação de todas as métricas, logs recentes e alertas ativos.

### Alertas

#### `/api/monitoring/alerts`
**Métodos:** GET, POST, PUT, DELETE

**GET:** Listar alertas
**POST:** Criar regra de alerta
**PUT:** Atualizar alerta (reconhecer/resolver)
**DELETE:** Remover regra de alerta

## 🚨 Sistema de Alertas

### Tipos de Severidade

- **low:** Informativo, não requer ação imediata
- **medium:** Atenção necessária, mas não crítico
- **high:** Problema sério, ação necessária
- **critical:** Sistema comprometido, ação imediata

### Canais de Notificação

#### Email
- Configuração via SMTP
- Templates HTML personalizados
- Agrupamento de alertas

#### Slack
- Webhook integration
- Canais específicos por severidade
- Formatação rica com botões de ação

#### Webhook
- Integração com sistemas externos
- Payload JSON customizável
- Retry automático

#### SMS
- Suporte a múltiplos provedores
- Apenas para alertas críticos
- Rate limiting

### Regras de Alerta Padrão

1. **Uso de Memória > 80%**
   - Severidade: medium
   - Canais: email, slack

2. **Taxa de Erro > 5%**
   - Severidade: high
   - Canais: email, slack, webhook

3. **Tempo de Resposta > 2s**
   - Severidade: medium
   - Canais: slack

4. **BPIX API Indisponível**
   - Severidade: critical
   - Canais: email, slack, sms

5. **Banco de Dados Lento (> 1s)**
   - Severidade: high
   - Canais: email, slack

## 📊 Métricas Coletadas

### Sistema
- Uso de memória (MB e %)
- Uso de CPU (%)
- Uso de disco (%)
- Uptime (segundos)
- Load average

### Aplicação
- Número de usuários (total, ativos, online)
- Requisições HTTP (total, por minuto, tempo de resposta)
- Erros (total, por tipo, taxa)
- Conexões de banco de dados
- Cache hits/misses

### Negócio
- Canais criados
- Streams ativas
- Pagamentos processados
- Webhooks recebidos

### BPIX
- Pagamentos (total, sucessos, falhas)
- Webhooks (recebidos, processados, falhas)
- Tempo de resposta da API
- Status da conectividade

## 🔧 Configuração Avançada

### Rotação de Logs

Configure o logrotate (Linux/Unix):

```bash
# /etc/logrotate.d/hub-control
/caminho/para/logs/*.log {
  daily
  missingok
  rotate 30
  compress
  delaycompress
  notifempty
  create 0644 www-data www-data
  postrotate
    systemctl reload hub-control
  endscript
}
```

### Monitoramento Externo

Configure serviços como:
- **Uptime Robot:** Para health checks externos
- **New Relic:** Para APM avançado
- **DataDog:** Para métricas e logs centralizados
- **Grafana:** Para dashboards visuais

### Backup de Logs

Configure backup automático:

```bash
#!/bin/bash
# Script de backup de logs
DATE=$(date +%Y%m%d)
tar -czf /backup/logs-$DATE.tar.gz /caminho/para/logs/
aws s3 cp /backup/logs-$DATE.tar.gz s3://bucket-backup/logs/
```

## 🚨 Troubleshooting

### Problemas Comuns

#### Logs não estão sendo gerados
1. Verificar permissões do diretório de logs
2. Verificar variável `LOG_ENABLE_FILE`
3. Verificar espaço em disco

#### Alertas não estão sendo enviados
1. Verificar configuração SMTP
2. Testar webhook do Slack
3. Verificar variáveis de ambiente
4. Verificar logs de erro do sistema de alertas

#### Métricas não estão sendo coletadas
1. Verificar se `METRICS_ENABLED=true`
2. Verificar conectividade com banco de dados
3. Verificar logs do coletor de métricas

#### Health checks falhando
1. Verificar conectividade de rede
2. Verificar status dos serviços dependentes
3. Verificar timeouts configurados

### Comandos de Diagnóstico

```bash
# Verificar status dos serviços
npm run monitoring:test

# Verificar logs de erro
npm run logs:errors

# Testar conectividade BPIX
npm run test:bpix-prod

# Verificar métricas em tempo real
curl http://localhost:3000/api/metrics

# Verificar health checks
curl http://localhost:3000/api/health
```

## 📈 Otimização de Performance

### Configurações Recomendadas

#### Produção
```bash
# Intervalo de coleta otimizado
METRICS_INTERVAL=60000  # 1 minuto
HEALTH_CHECK_INTERVAL=30000  # 30 segundos

# Retenção de dados
METRICS_RETENTION_RAW=1h
METRICS_RETENTION_AGGREGATED=7d
METRICS_RETENTION_SUMMARY=30d

# Logs otimizados
LOG_LEVEL=info
LOG_MAX_FILE_SIZE=10MB
LOG_MAX_FILES=5
```

#### Desenvolvimento
```bash
# Intervalo mais frequente para debug
METRICS_INTERVAL=30000  # 30 segundos
HEALTH_CHECK_INTERVAL=15000  # 15 segundos

# Logs detalhados
LOG_LEVEL=debug
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=false
```

## 📚 Documentação Adicional

- [Configuração BPIX](./BPIX_PRODUCTION_SETUP.md)
- [Guia de Deploy](./DEPLOY_GUIDE.md)
- [Documentação da API](./API_DOCUMENTATION.md)

## 🆘 Contatos de Emergência

### Equipe Técnica
- **DevOps:** devops@seudominio.com
- **Backend:** backend@seudominio.com
- **Suporte:** suporte@seudominio.com

### Serviços Externos
- **BPIX Suporte:** suporte@bpix.com.br
- **Hosting Provider:** suporte@provedor.com
- **Monitoramento:** suporte@monitoring.com

## ✅ Checklist de Monitoramento

### Configuração Inicial
- [ ] Variáveis de ambiente configuradas
- [ ] Sistema de logs funcionando
- [ ] Métricas sendo coletadas
- [ ] Health checks respondendo
- [ ] Alertas configurados
- [ ] Dashboard acessível

### Testes
- [ ] Health checks testados
- [ ] Métricas validadas
- [ ] Alertas testados
- [ ] Logs sendo gerados
- [ ] Rotação de logs configurada

### Produção
- [ ] Monitoramento externo configurado
- [ ] Backup de logs configurado
- [ ] Equipe notificada sobre alertas
- [ ] Documentação atualizada
- [ ] Runbooks criados

---

**Última atualização:** Janeiro 2024
**Versão:** 1.0.0
**Responsável:** Equipe DevOps