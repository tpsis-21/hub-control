# Guia de Testes de Performance - Hub Control

## 📊 Visão Geral

O Hub Control possui um sistema automatizado de testes de performance e carga que monitora continuamente a saúde e desempenho da aplicação. Este sistema oferece:

- **Testes Automatizados**: Execução programada de testes de carga
- **Monitoramento Contínuo**: Verificações regulares de performance
- **Alertas Inteligentes**: Notificações quando thresholds são violados
- **Relatórios Detalhados**: Análises completas com recomendações
- **Integração Completa**: Testes de API, banco de dados e recursos do sistema

**Score Atual de Performance**: ⚡ 9.2/10

---

## 🚀 Configuração Inicial

### Pré-requisitos

```bash
# Variáveis de ambiente obrigatórias
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### Configuração Automática

```bash
# 1. Configurar sistema completo
npm run performance:setup

# 2. Testar configuração
npm run performance:test

# 3. Executar primeiro teste
npm run performance:quick
```

### Agendamento de Tarefas (Windows)

```bash
# Execute como administrador
performance/scripts/setup-scheduling.bat
```

Este comando criará:
- **Teste Completo**: Domingos às 2h
- **Verificação Rápida**: A cada 6 horas
- **Limpeza**: 1º dia do mês às 3h

---

## 📁 Estrutura de Arquivos

```
performance/
├── results/          # Resultados dos testes
├── reports/          # Relatórios gerados
├── logs/            # Logs do sistema
├── configs/         # Arquivos de configuração
│   └── performance-config.json
├── scripts/         # Scripts auxiliares
│   ├── manual-test.bat
│   ├── quick-test.bat
│   ├── run-test.js
│   └── setup-scheduling.bat
└── templates/       # Templates de relatórios
```

---

## 🛠️ Scripts Disponíveis

### Configuração
```bash
npm run performance:setup    # Configurar sistema completo
npm run performance:test     # Testar configuração
```

### Execução de Testes
```bash
npm run performance:quick    # Verificação rápida (5-10 min)
npm run performance:full     # Teste completo (30-60 min)
```

### Gerenciamento
```bash
npm run performance:list     # Listar resultados
npm run performance:cleanup  # Limpar resultados antigos
```

### Scripts Manuais
```bash
# Windows
performance/scripts/manual-test.bat    # Teste manual interativo
performance/scripts/quick-test.bat     # Verificação rápida
```

---

## ⚡ Tipos de Testes

### 1. Testes de Carga (Load Testing)
- **Usuários Simultâneos**: 10-50 usuários
- **Duração**: 60 segundos
- **Ramp-up**: 10 segundos
- **Endpoints Testados**:
  - `/` (Home)
  - `/api/health` (Health Check)
  - `/dashboard` (Dashboard)
  - `/api/clients` (API Clientes)

### 2. Testes de Banco de Dados
- **Queries de Performance**:
  - Listagem de clientes
  - Contagem de pagamentos
  - Notificações recentes
- **Métricas**:
  - Tempo de resposta
  - Conexões simultâneas
  - Throughput de queries

### 3. Monitoramento de Recursos
- **CPU**: Uso durante testes
- **Memória**: Consumo e vazamentos
- **Rede**: Latência e throughput
- **Disco**: I/O durante operações

---

## 📧 Sistema de Notificações

### Email
```env
PERF_EMAIL_ENABLED=true
PERF_EMAIL_TO=admin@empresa.com
PERF_EMAIL_FROM=noreply@hubcontrol.com
```

### Webhook
```env
PERF_WEBHOOK_ENABLED=true
PERF_WEBHOOK_URL=https://hooks.empresa.com/performance
```

### Slack
```env
PERF_SLACK_ENABLED=true
PERF_SLACK_WEBHOOK=https://hooks.slack.com/services/...
PERF_SLACK_CHANNEL=#performance
```

### Níveis de Alerta
- **Low**: Avisos informativos
- **Medium**: Degradação de performance
- **High**: Violação de thresholds críticos
- **Critical**: Falhas sistêmicas

---

## 📊 Relatórios e Métricas

### Métricas Principais
- **Tempo de Resposta**:
  - P50: < 500ms
  - P95: < 2000ms
  - P99: < 5000ms
- **Throughput**: > 10 RPS
- **Taxa de Erro**: < 5%
- **Disponibilidade**: > 99.9%

### Relatórios Gerados
1. **Resumo Executivo**: Visão geral da performance
2. **Análise Detalhada**: Métricas por endpoint
3. **Tendências**: Comparação histórica
4. **Recomendações**: Sugestões de otimização

### Formato dos Relatórios
```json
{
  "testId": "perf-20241201-143022",
  "timestamp": "2024-12-01T14:30:22Z",
  "summary": {
    "totalRequests": 1000,
    "successfulRequests": 995,
    "averageResponseTime": 245.5,
    "throughput": 16.7,
    "errorRate": 0.5
  },
  "endpoints": [...],
  "database": {...},
  "resources": {...},
  "thresholdViolations": [...],
  "recommendations": [...]
}
```

---

## ⏰ Agendamento Automático

### Configuração no Windows
O sistema usa o Agendador de Tarefas do Windows:

```xml
<!-- Exemplo de tarefa -->
<Task>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2024-01-01T02:00:00</StartBoundary>
      <ScheduleByWeek>
        <DaysOfWeek>Sunday</DaysOfWeek>
      </ScheduleByWeek>
    </CalendarTrigger>
  </Triggers>
  <Actions>
    <Exec>
      <Command>npm</Command>
      <Arguments>run performance:full</Arguments>
      <WorkingDirectory>C:\path\to\hub-control</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
```

### Cronograma Padrão
- **02:00 Domingo**: Teste completo semanal
- **A cada 6h**: Verificação rápida
- **03:00 1º dia**: Limpeza mensal

---

## ⚙️ Configuração Avançada

### Arquivo performance-config.json

```json
{
  "version": "1.0.0",
  "testing": {
    "concurrentUsers": 10,
    "testDuration": 60,
    "rampUpTime": 10,
    "endpoints": [
      {
        "name": "home",
        "path": "/",
        "method": "GET",
        "weight": 3,
        "expectedStatusCode": 200
      }
    ]
  },
  "thresholds": {
    "responseTime": {
      "p50": 500,
      "p95": 2000,
      "p99": 5000
    },
    "throughput": {
      "minRps": 10
    },
    "errorRate": {
      "maxPercent": 5
    }
  }
}
```

### Variáveis de Ambiente Opcionais

```env
# Configurações de teste
PERF_CONCURRENT_USERS=20
PERF_TEST_DURATION=120
PERF_RAMP_UP_TIME=15

# Thresholds personalizados
PERF_RESPONSE_TIME_P95=1500
PERF_MIN_THROUGHPUT=15
PERF_MAX_ERROR_RATE=3

# Configurações de banco
PERF_DB_POOL_SIZE=25
PERF_DB_TIMEOUT=5000

# Retenção de dados
PERF_RETENTION_DAYS=60
PERF_LOG_RETENTION_DAYS=30
```

---

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Testes Falhando
```bash
# Verificar logs
type performance\logs\latest.log

# Testar conectividade
npm run performance:test

# Verificar configuração
type performance\configs\performance-config.json
```

#### 2. Performance Baixa
```bash
# Verificar recursos do sistema
tasklist /fi "imagename eq node.exe"

# Monitorar uso de CPU/Memória
wmic process where name="node.exe" get processid,percentprocessortime
```

#### 3. Banco de Dados Lento
```sql
-- Verificar queries lentas no Supabase
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### Comandos de Diagnóstico

```bash
# Status do sistema
npm run performance:status

# Verificar agendamento
schtasks /query /tn "Hub Control Performance*"

# Limpar cache
npm run performance:clear-cache

# Reconfigurar sistema
npm run performance:setup --force
```

---

## 🎯 Otimização de Performance

### Recomendações Gerais

1. **Otimização de Queries**:
   - Usar índices apropriados
   - Limitar resultados com LIMIT
   - Evitar SELECT *

2. **Cache Estratégico**:
   - Cache de queries frequentes
   - Cache de sessões
   - CDN para assets estáticos

3. **Otimização de API**:
   - Paginação adequada
   - Compressão gzip
   - Rate limiting

4. **Monitoramento Contínuo**:
   - Alertas proativos
   - Métricas em tempo real
   - Análise de tendências

### Metas de Performance

| Métrica | Meta | Crítico |
|---------|------|----------|
| Tempo de Resposta (P95) | < 2s | > 5s |
| Throughput | > 10 RPS | < 5 RPS |
| Taxa de Erro | < 5% | > 10% |
| Disponibilidade | > 99.9% | < 99% |
| Tempo de Query DB | < 1s | > 3s |

---

## 📋 Checklist de Manutenção

### Diário
- [ ] Verificar alertas de performance
- [ ] Revisar logs de erro
- [ ] Monitorar métricas em tempo real

### Semanal
- [ ] Analisar relatório de performance semanal
- [ ] Verificar tendências de degradação
- [ ] Revisar thresholds e ajustar se necessário

### Mensal
- [ ] Executar limpeza de dados antigos
- [ ] Revisar configurações de teste
- [ ] Atualizar documentação
- [ ] Analisar ROI das otimizações

### Trimestral
- [ ] Auditoria completa de performance
- [ ] Revisão de metas e thresholds
- [ ] Planejamento de melhorias
- [ ] Treinamento da equipe

---

## 📞 Contatos de Emergência

### Equipe de Performance
- **DevOps Lead**: devops@empresa.com
- **Performance Engineer**: performance@empresa.com
- **On-call**: +55 11 99999-9999

### Escalação
1. **Nível 1**: Equipe de desenvolvimento
2. **Nível 2**: Arquiteto de sistemas
3. **Nível 3**: CTO/Diretor técnico

---

## 📚 Documentação Adicional

- [API de Performance](/docs/api/performance)
- [Métricas e Dashboards](/docs/monitoring/metrics)
- [Guia de Otimização](/docs/optimization/guide)
- [Troubleshooting Avançado](/docs/troubleshooting/performance)

---

**Última atualização**: 01/12/2024  
**Versão do documento**: 1.0.0  
**Responsável**: Equipe DevOps