# 📈 Analytics e Métricas de Negócio - Hub Control

Este documento descreve a implementação de analytics e métricas de negócio para o Hub Control, fornecendo insights valiosos sobre o uso da plataforma, performance e comportamento dos usuários.

## 🎯 Objetivos

### Métricas de Negócio
- **Crescimento de Usuários:** Novos registros, ativação, retenção
- **Receita:** Transações, volume financeiro, conversão
- **Engajamento:** Sessões, tempo na plataforma, funcionalidades mais usadas
- **Satisfação:** NPS, feedback, suporte

### Métricas Técnicas
- **Performance:** Tempo de resposta, disponibilidade, erros
- **Uso de Recursos:** CPU, memória, banco de dados
- **Segurança:** Tentativas de login, atividades suspeitas
- **Integrações:** Status de APIs externas, webhooks

## 🏗️ Arquitetura de Analytics

### Camadas do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Analytics     │
│                 │    │                 │    │                 │
│ • Event Tracking│───▶│ • Event API     │───▶│ • Data Storage  │
│ • User Actions  │    │ • Metrics API   │    │ • Processing    │
│ • Performance   │    │ • Aggregation   │    │ • Dashboards    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   External      │
                       │                 │
                       │ • Google Anal.  │
                       │ • Mixpanel      │
                       │ • Custom APIs   │
                       └─────────────────┘
```

### Componentes

1. **Coleta de Dados**
   - Event tracking no frontend
   - Logs estruturados no backend
   - Métricas de sistema
   - Dados de negócio

2. **Processamento**
   - Agregação em tempo real
   - Processamento em lote
   - Limpeza e validação
   - Enriquecimento de dados

3. **Armazenamento**
   - Banco de dados principal
   - Data warehouse
   - Cache para consultas rápidas
   - Arquivos de log

4. **Visualização**
   - Dashboards internos
   - Relatórios automatizados
   - Alertas em tempo real
   - APIs para integrações

## 📊 Métricas Implementadas

### 1. Métricas de Usuário

#### Registro e Ativação
- **Novos Registros:** Usuários registrados por período
- **Taxa de Ativação:** % de usuários que completam onboarding
- **Tempo para Ativação:** Tempo médio até primeira transação
- **Fonte de Aquisição:** Canal de origem dos usuários

#### Engajamento
- **Usuários Ativos:** DAU, WAU, MAU
- **Sessões:** Duração, páginas visitadas, bounce rate
- **Funcionalidades:** Uso de cada feature da plataforma
- **Retenção:** Cohort analysis, churn rate

### 2. Métricas Financeiras

#### Transações
- **Volume de Transações:** Quantidade e valor por período
- **Taxa de Sucesso:** % de transações bem-sucedidas
- **Tempo de Processamento:** Latência das transações
- **Métodos de Pagamento:** Distribuição por tipo

#### Receita
- **MRR/ARR:** Monthly/Annual Recurring Revenue
- **LTV:** Lifetime Value dos clientes
- **CAC:** Customer Acquisition Cost
- **Churn Rate:** Taxa de cancelamento

### 3. Métricas Operacionais

#### Performance
- **Tempo de Resposta:** API endpoints, páginas web
- **Disponibilidade:** Uptime, downtime, SLA
- **Throughput:** Requests per second, concurrent users
- **Erros:** Taxa de erro, tipos de erro

#### Recursos
- **Infraestrutura:** CPU, memória, disco, rede
- **Banco de Dados:** Queries, locks, performance
- **Cache:** Hit rate, miss rate, evictions
- **CDN:** Bandwidth, cache hit ratio

### 4. Métricas de Segurança

#### Autenticação
- **Tentativas de Login:** Sucessos, falhas, bloqueios
- **2FA:** Adoção, uso, bypass attempts
- **Sessões:** Duração, concurrent sessions
- **Passwords:** Força, resets, políticas

#### Atividades Suspeitas
- **IPs Bloqueados:** Tentativas maliciosas
- **Rate Limiting:** Requests bloqueados
- **API Abuse:** Uso anômalo de endpoints
- **Data Access:** Acessos sensíveis, exports

## 🛠️ Implementação Técnica

### 1. Event Tracking (Frontend)

```javascript
// analytics.js
class HubControlAnalytics {
  constructor(config) {
    this.config = config;
    this.queue = [];
    this.init();
  }

  init() {
    // Inicializar Google Analytics
    if (this.config.googleAnalytics.enabled) {
      this.initGA();
    }

    // Inicializar tracking customizado
    this.initCustomTracking();
  }

  track(event, properties = {}) {
    const eventData = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
        page: window.location.pathname,
        userAgent: navigator.userAgent
      }
    };

    // Enviar para backend
    this.sendToBackend(eventData);

    // Enviar para Google Analytics
    if (this.config.googleAnalytics.enabled) {
      this.sendToGA(eventData);
    }
  }

  // Eventos específicos do negócio
  trackUserRegistration(userId, source) {
    this.track('user_registration', { userId, source });
  }

  trackTransaction(transactionData) {
    this.track('transaction', transactionData);
  }

  trackPageView(page) {
    this.track('page_view', { page });
  }

  trackFeatureUsage(feature, action) {
    this.track('feature_usage', { feature, action });
  }
}
```

### 2. Metrics API (Backend)

```javascript
// metrics/controller.js
class MetricsController {
  async recordEvent(req, res) {
    try {
      const { event, properties } = req.body;
      
      // Validar evento
      const validatedEvent = await this.validateEvent(event, properties);
      
      // Salvar no banco
      await this.saveEvent(validatedEvent);
      
      // Processar métricas em tempo real
      await this.processRealTimeMetrics(validatedEvent);
      
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error recording event:', error);
      res.status(500).json({ error: 'Failed to record event' });
    }
  }

  async getMetrics(req, res) {
    try {
      const { metric, period, filters } = req.query;
      
      const data = await this.metricsService.getMetric({
        metric,
        period,
        filters: JSON.parse(filters || '{}')
      });
      
      res.json(data);
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  async getDashboardData(req, res) {
    try {
      const { dashboard } = req.params;
      
      const data = await this.dashboardService.getDashboard(dashboard);
      
      res.json(data);
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
}
```

### 3. Banco de Dados

```sql
-- Tabela de eventos
CREATE TABLE analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    user_id UUID,
    session_id VARCHAR(100),
    properties JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_properties ON analytics_events USING GIN(properties);

-- Tabela de métricas agregadas
CREATE TABLE analytics_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    dimensions JSONB,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    granularity VARCHAR(20), -- hour, day, week, month
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sessões de usuário
CREATE TABLE analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_start TIMESTAMP WITH TIME ZONE,
    session_end TIMESTAMP WITH TIME ZONE,
    page_views INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    referrer TEXT,
    landing_page TEXT,
    exit_page TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(2),
    city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Processamento de Dados

```javascript
// metrics/processor.js
class MetricsProcessor {
  async processRealTimeMetrics(event) {
    // Atualizar contadores em tempo real
    await this.updateRealTimeCounters(event);
    
    // Detectar anomalias
    await this.detectAnomalies(event);
    
    // Enviar alertas se necessário
    await this.checkAlerts(event);
  }

  async processBatchMetrics() {
    // Executar agregações diárias
    await this.aggregateDailyMetrics();
    
    // Calcular métricas de cohort
    await this.calculateCohortMetrics();
    
    // Gerar relatórios
    await this.generateReports();
  }

  async aggregateDailyMetrics() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Usuários ativos diários
    await this.calculateDAU(yesterday);
    
    // Volume de transações
    await this.calculateTransactionVolume(yesterday);
    
    // Métricas de performance
    await this.calculatePerformanceMetrics(yesterday);
  }

  async calculateDAU(date) {
    const query = `
      INSERT INTO analytics_metrics (metric_name, metric_value, period_start, period_end, granularity)
      SELECT 
        'daily_active_users',
        COUNT(DISTINCT user_id),
        $1::date,
        $1::date + interval '1 day',
        'day'
      FROM analytics_events 
      WHERE timestamp >= $1::date 
        AND timestamp < $1::date + interval '1 day'
        AND user_id IS NOT NULL
    `;
    
    await db.query(query, [date]);
  }
}
```

## 📱 Dashboards e Relatórios

### 1. Dashboard Executivo

**KPIs Principais:**
- Usuários ativos (DAU/MAU)
- Receita mensal (MRR)
- Taxa de conversão
- NPS Score
- Uptime do sistema

**Gráficos:**
- Crescimento de usuários (linha)
- Distribuição de receita (pizza)
- Funil de conversão (funil)
- Mapa de calor de uso

### 2. Dashboard Operacional

**Métricas Técnicas:**
- Performance de APIs
- Status de serviços
- Uso de recursos
- Logs de erro
- Métricas de segurança

**Alertas:**
- Sistema indisponível
- Performance degradada
- Erros críticos
- Atividade suspeita

### 3. Dashboard de Produto

**Análise de Uso:**
- Funcionalidades mais usadas
- Jornada do usuário
- Pontos de abandono
- A/B tests
- Feedback dos usuários

### 4. Dashboard Financeiro

**Métricas de Receita:**
- Volume de transações
- Taxa de sucesso
- Métodos de pagamento
- Chargeback rate
- Análise de cohort

## 🔧 Configuração e Deploy

### 1. Variáveis de Ambiente

```bash
# Analytics
ANALYTICS_ENABLED=true
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
MIXPANEL_TOKEN=MIXPANEL_PROJECT_TOKEN

# Data Warehouse
DATA_WAREHOUSE_URL=postgresql://user:pass@warehouse:5432/analytics
REDIS_ANALYTICS_URL=redis://analytics-cache:6379

# Processamento
ANALYTICS_BATCH_SIZE=1000
ANALYTICS_FLUSH_INTERVAL=30000
ANALYTICS_RETENTION_DAYS=365

# Alertas
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_EMAIL_TO=analytics@hubcontrol.com
```

### 2. Scripts de Deploy

```bash
#!/bin/bash
# deploy-analytics.sh

echo "🚀 Deploying Analytics System..."

# Criar tabelas
psql $DATABASE_URL -f sql/analytics_schema.sql

# Instalar dependências
npm install --production

# Executar migrações
npm run migrate:analytics

# Iniciar processamento em lote
pm2 start ecosystem.analytics.config.js

# Configurar cron jobs
crontab -l | { cat; echo "0 2 * * * /app/scripts/process-daily-metrics.sh"; } | crontab -

echo "✅ Analytics System deployed successfully!"
```

### 3. Monitoramento

```javascript
// monitoring/analytics-health.js
class AnalyticsHealthCheck {
  async checkHealth() {
    const checks = {
      database: await this.checkDatabase(),
      eventIngestion: await this.checkEventIngestion(),
      processing: await this.checkProcessing(),
      dashboards: await this.checkDashboards()
    };
    
    const isHealthy = Object.values(checks).every(check => check.status === 'ok');
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    };
  }

  async checkEventIngestion() {
    // Verificar se eventos estão sendo recebidos
    const recentEvents = await db.query(`
      SELECT COUNT(*) as count 
      FROM analytics_events 
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `);
    
    return {
      status: recentEvents.rows[0].count > 0 ? 'ok' : 'warning',
      eventsLast5Min: recentEvents.rows[0].count
    };
  }
}
```

## 📈 Métricas de Sucesso

### KPIs do Sistema de Analytics

1. **Cobertura de Dados**
   - % de eventos capturados
   - % de usuários trackados
   - % de transações monitoradas

2. **Qualidade dos Dados**
   - Taxa de eventos válidos
   - Latência de processamento
   - Precisão das métricas

3. **Uso dos Dashboards**
   - Usuários ativos dos dashboards
   - Frequência de acesso
   - Tempo gasto analisando dados

4. **Impacto no Negócio**
   - Decisões baseadas em dados
   - Melhoria de KPIs
   - ROI do sistema de analytics

## 🔒 Privacidade e Compliance

### LGPD/GDPR
- **Consentimento:** Opt-in para tracking
- **Anonimização:** Dados pessoais protegidos
- **Retenção:** Política de retenção de dados
- **Direito ao Esquecimento:** Processo de exclusão

### Segurança
- **Criptografia:** Dados em trânsito e repouso
- **Acesso:** Controle baseado em roles
- **Auditoria:** Log de acessos aos dados
- **Backup:** Estratégia de backup seguro

## 🚀 Roadmap

### Fase 1 (Atual)
- ✅ Event tracking básico
- ✅ Métricas fundamentais
- ✅ Dashboard executivo
- ✅ Alertas críticos

### Fase 2 (Próximos 3 meses)
- 🔄 Machine Learning para predições
- 🔄 Análise de cohort avançada
- 🔄 A/B testing framework
- 🔄 Real-time analytics

### Fase 3 (6 meses)
- 📋 Data warehouse completo
- 📋 BI self-service
- 📋 APIs públicas de analytics
- 📋 Integração com ferramentas externas

## 📞 Suporte

### Contatos
- **Equipe de Analytics:** analytics@hubcontrol.com
- **Suporte Técnico:** devops@hubcontrol.com
- **Documentação:** [Analytics Wiki](wiki/analytics)

### Recursos
- [Guia de Implementação](ANALYTICS_IMPLEMENTATION.md)
- [API Reference](api/analytics)
- [Dashboard Templates](dashboards/)
- [Troubleshooting](ANALYTICS_TROUBLESHOOTING.md)

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0.0  
**Responsável:** Equipe de Analytics Hub Control