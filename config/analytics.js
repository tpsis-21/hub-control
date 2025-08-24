/**
 * 📈 Configuração do Sistema de Analytics - Hub Control
 * 
 * Este arquivo define todas as configurações para coleta, processamento
 * e visualização de métricas de negócio e técnicas.
 */

const analyticsConfig = {
  // ============================================================================
  // 🔧 CONFIGURAÇÕES GERAIS
  // ============================================================================
  
  enabled: process.env.ANALYTICS_ENABLED === 'true',
  environment: process.env.NODE_ENV || 'development',
  
  // Configurações de coleta
  collection: {
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE) || 100,
    flushInterval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL) || 30000, // 30s
    maxQueueSize: parseInt(process.env.ANALYTICS_MAX_QUEUE_SIZE) || 10000,
    retryAttempts: 3,
    retryDelay: 1000, // 1s
  },
  
  // Retenção de dados
  retention: {
    events: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 365, // 1 ano
    sessions: 90, // 3 meses
    metrics: 730, // 2 anos
    logs: 30, // 1 mês
  },
  
  // ============================================================================
  // 📊 DEFINIÇÕES DE EVENTOS
  // ============================================================================
  
  events: {
    // Eventos de usuário
    user: {
      registration: {
        name: 'user_registration',
        properties: ['userId', 'email', 'source', 'referrer'],
        required: ['userId', 'source'],
        category: 'user_lifecycle'
      },
      login: {
        name: 'user_login',
        properties: ['userId', 'method', 'success', 'failureReason'],
        required: ['userId', 'method', 'success'],
        category: 'authentication'
      },
      logout: {
        name: 'user_logout',
        properties: ['userId', 'sessionDuration'],
        required: ['userId'],
        category: 'authentication'
      },
      profileUpdate: {
        name: 'user_profile_update',
        properties: ['userId', 'fieldsChanged'],
        required: ['userId'],
        category: 'user_engagement'
      }
    },
    
    // Eventos de transação
    transaction: {
      initiated: {
        name: 'transaction_initiated',
        properties: ['transactionId', 'userId', 'amount', 'currency', 'method'],
        required: ['transactionId', 'userId', 'amount'],
        category: 'financial'
      },
      completed: {
        name: 'transaction_completed',
        properties: ['transactionId', 'userId', 'amount', 'currency', 'method', 'processingTime'],
        required: ['transactionId', 'userId', 'amount'],
        category: 'financial'
      },
      failed: {
        name: 'transaction_failed',
        properties: ['transactionId', 'userId', 'amount', 'currency', 'method', 'errorCode', 'errorMessage'],
        required: ['transactionId', 'userId', 'errorCode'],
        category: 'financial'
      }
    },
    
    // Eventos de navegação
    navigation: {
      pageView: {
        name: 'page_view',
        properties: ['page', 'title', 'referrer', 'loadTime'],
        required: ['page'],
        category: 'navigation'
      },
      featureUsage: {
        name: 'feature_usage',
        properties: ['feature', 'action', 'userId', 'context'],
        required: ['feature', 'action'],
        category: 'product_usage'
      },
      search: {
        name: 'search_performed',
        properties: ['query', 'resultsCount', 'userId'],
        required: ['query'],
        category: 'product_usage'
      }
    },
    
    // Eventos de sistema
    system: {
      error: {
        name: 'system_error',
        properties: ['errorType', 'errorMessage', 'stackTrace', 'userId', 'endpoint'],
        required: ['errorType', 'errorMessage'],
        category: 'system_health'
      },
      performance: {
        name: 'performance_metric',
        properties: ['metric', 'value', 'endpoint', 'duration'],
        required: ['metric', 'value'],
        category: 'system_health'
      }
    }
  },
  
  // ============================================================================
  // 📈 DEFINIÇÕES DE MÉTRICAS
  // ============================================================================
  
  metrics: {
    // Métricas de usuário
    user: {
      dailyActiveUsers: {
        name: 'daily_active_users',
        description: 'Usuários únicos ativos por dia',
        type: 'count',
        aggregation: 'distinct',
        field: 'userId',
        timeframe: 'day',
        category: 'engagement'
      },
      weeklyActiveUsers: {
        name: 'weekly_active_users',
        description: 'Usuários únicos ativos por semana',
        type: 'count',
        aggregation: 'distinct',
        field: 'userId',
        timeframe: 'week',
        category: 'engagement'
      },
      monthlyActiveUsers: {
        name: 'monthly_active_users',
        description: 'Usuários únicos ativos por mês',
        type: 'count',
        aggregation: 'distinct',
        field: 'userId',
        timeframe: 'month',
        category: 'engagement'
      },
      registrationRate: {
        name: 'registration_rate',
        description: 'Taxa de novos registros',
        type: 'count',
        aggregation: 'count',
        filter: { event: 'user_registration' },
        timeframe: 'day',
        category: 'acquisition'
      },
      retentionRate: {
        name: 'retention_rate',
        description: 'Taxa de retenção de usuários',
        type: 'percentage',
        calculation: 'cohort',
        timeframe: 'month',
        category: 'engagement'
      }
    },
    
    // Métricas financeiras
    financial: {
      transactionVolume: {
        name: 'transaction_volume',
        description: 'Volume total de transações',
        type: 'sum',
        aggregation: 'sum',
        field: 'amount',
        filter: { event: 'transaction_completed' },
        timeframe: 'day',
        category: 'revenue'
      },
      transactionCount: {
        name: 'transaction_count',
        description: 'Número de transações',
        type: 'count',
        aggregation: 'count',
        filter: { event: 'transaction_completed' },
        timeframe: 'day',
        category: 'revenue'
      },
      averageTransactionValue: {
        name: 'average_transaction_value',
        description: 'Valor médio por transação',
        type: 'average',
        aggregation: 'avg',
        field: 'amount',
        filter: { event: 'transaction_completed' },
        timeframe: 'day',
        category: 'revenue'
      },
      successRate: {
        name: 'transaction_success_rate',
        description: 'Taxa de sucesso das transações',
        type: 'percentage',
        calculation: 'ratio',
        numerator: { event: 'transaction_completed' },
        denominator: { event: 'transaction_initiated' },
        timeframe: 'day',
        category: 'quality'
      }
    },
    
    // Métricas de performance
    performance: {
      responseTime: {
        name: 'api_response_time',
        description: 'Tempo de resposta das APIs',
        type: 'average',
        aggregation: 'avg',
        field: 'duration',
        filter: { category: 'system_health' },
        timeframe: 'hour',
        category: 'performance'
      },
      errorRate: {
        name: 'error_rate',
        description: 'Taxa de erros do sistema',
        type: 'percentage',
        calculation: 'ratio',
        numerator: { event: 'system_error' },
        denominator: { category: 'system_health' },
        timeframe: 'hour',
        category: 'quality'
      },
      uptime: {
        name: 'system_uptime',
        description: 'Disponibilidade do sistema',
        type: 'percentage',
        calculation: 'uptime',
        timeframe: 'day',
        category: 'availability'
      }
    }
  },
  
  // ============================================================================
  // 📊 CONFIGURAÇÕES DE DASHBOARD
  // ============================================================================
  
  dashboards: {
    executive: {
      name: 'Dashboard Executivo',
      description: 'Visão geral dos KPIs principais',
      widgets: [
        {
          type: 'metric_card',
          metric: 'monthly_active_users',
          title: 'Usuários Ativos (MAU)',
          size: 'small'
        },
        {
          type: 'metric_card',
          metric: 'transaction_volume',
          title: 'Volume de Transações',
          size: 'small',
          format: 'currency'
        },
        {
          type: 'line_chart',
          metric: 'daily_active_users',
          title: 'Usuários Ativos Diários',
          period: '30d',
          size: 'medium'
        },
        {
          type: 'pie_chart',
          metric: 'transaction_count',
          title: 'Transações por Método',
          groupBy: 'method',
          period: '7d',
          size: 'medium'
        }
      ],
      refreshInterval: 300000 // 5 minutos
    },
    
    operational: {
      name: 'Dashboard Operacional',
      description: 'Métricas técnicas e de sistema',
      widgets: [
        {
          type: 'metric_card',
          metric: 'system_uptime',
          title: 'Uptime',
          size: 'small',
          format: 'percentage'
        },
        {
          type: 'metric_card',
          metric: 'api_response_time',
          title: 'Tempo de Resposta',
          size: 'small',
          format: 'duration'
        },
        {
          type: 'line_chart',
          metric: 'error_rate',
          title: 'Taxa de Erros',
          period: '24h',
          size: 'large'
        },
        {
          type: 'bar_chart',
          metric: 'api_response_time',
          title: 'Performance por Endpoint',
          groupBy: 'endpoint',
          period: '1h',
          size: 'large'
        }
      ],
      refreshInterval: 60000 // 1 minuto
    },
    
    financial: {
      name: 'Dashboard Financeiro',
      description: 'Métricas de receita e transações',
      widgets: [
        {
          type: 'metric_card',
          metric: 'transaction_volume',
          title: 'Volume Diário',
          period: '1d',
          size: 'small',
          format: 'currency'
        },
        {
          type: 'metric_card',
          metric: 'transaction_success_rate',
          title: 'Taxa de Sucesso',
          period: '1d',
          size: 'small',
          format: 'percentage'
        },
        {
          type: 'line_chart',
          metric: 'transaction_volume',
          title: 'Volume de Transações',
          period: '30d',
          size: 'large'
        },
        {
          type: 'funnel_chart',
          metrics: ['transaction_initiated', 'transaction_completed'],
          title: 'Funil de Conversão',
          period: '7d',
          size: 'medium'
        }
      ],
      refreshInterval: 300000 // 5 minutos
    }
  },
  
  // ============================================================================
  // 🚨 CONFIGURAÇÕES DE ALERTAS
  // ============================================================================
  
  alerts: {
    // Alertas de sistema
    systemDown: {
      name: 'Sistema Indisponível',
      metric: 'system_uptime',
      condition: 'less_than',
      threshold: 95, // %
      period: '5m',
      severity: 'critical',
      channels: ['slack', 'email', 'sms']
    },
    
    highErrorRate: {
      name: 'Taxa de Erro Elevada',
      metric: 'error_rate',
      condition: 'greater_than',
      threshold: 5, // %
      period: '10m',
      severity: 'warning',
      channels: ['slack', 'email']
    },
    
    slowResponse: {
      name: 'Resposta Lenta',
      metric: 'api_response_time',
      condition: 'greater_than',
      threshold: 3000, // ms
      period: '5m',
      severity: 'warning',
      channels: ['slack']
    },
    
    // Alertas de negócio
    lowTransactionVolume: {
      name: 'Volume de Transações Baixo',
      metric: 'transaction_volume',
      condition: 'less_than',
      threshold: 1000, // valor mínimo esperado
      period: '1h',
      severity: 'info',
      channels: ['slack']
    },
    
    highFailureRate: {
      name: 'Alta Taxa de Falha em Transações',
      metric: 'transaction_success_rate',
      condition: 'less_than',
      threshold: 95, // %
      period: '15m',
      severity: 'warning',
      channels: ['slack', 'email']
    }
  },
  
  // ============================================================================
  // 🔌 INTEGRAÇÕES EXTERNAS
  // ============================================================================
  
  integrations: {
    googleAnalytics: {
      enabled: process.env.GOOGLE_ANALYTICS_ENABLED === 'true',
      measurementId: process.env.GOOGLE_ANALYTICS_ID,
      apiSecret: process.env.GOOGLE_ANALYTICS_API_SECRET,
      events: ['page_view', 'user_registration', 'transaction_completed']
    },
    
    mixpanel: {
      enabled: process.env.MIXPANEL_ENABLED === 'true',
      token: process.env.MIXPANEL_TOKEN,
      events: ['user_registration', 'transaction_completed', 'feature_usage']
    },
    
    slack: {
      enabled: process.env.SLACK_ANALYTICS_ENABLED === 'true',
      webhookUrl: process.env.SLACK_ANALYTICS_WEBHOOK,
      channels: {
        alerts: process.env.SLACK_ALERTS_CHANNEL || '#alerts',
        reports: process.env.SLACK_REPORTS_CHANNEL || '#analytics'
      }
    },
    
    email: {
      enabled: process.env.EMAIL_ANALYTICS_ENABLED === 'true',
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      from: process.env.ANALYTICS_EMAIL_FROM || 'analytics@hubcontrol.com',
      recipients: {
        alerts: (process.env.ANALYTICS_ALERT_EMAILS || '').split(','),
        reports: (process.env.ANALYTICS_REPORT_EMAILS || '').split(',')
      }
    }
  },
  
  // ============================================================================
  // 🔒 CONFIGURAÇÕES DE PRIVACIDADE
  // ============================================================================
  
  privacy: {
    // Campos que devem ser anonimizados
    anonymizeFields: ['email', 'phone', 'cpf', 'ip_address'],
    
    // Consentimento necessário para tracking
    requireConsent: true,
    
    // Tempo de retenção por tipo de dado
    dataRetention: {
      personalData: 365, // dias
      anonymizedData: 1095, // 3 anos
      aggregatedData: 2190 // 6 anos
    },
    
    // Configurações de LGPD/GDPR
    compliance: {
      lgpd: true,
      gdpr: true,
      ccpa: false
    }
  },
  
  // ============================================================================
  // 🛠️ CONFIGURAÇÕES DE DESENVOLVIMENTO
  // ============================================================================
  
  development: {
    // Logs detalhados em desenvolvimento
    verboseLogging: process.env.NODE_ENV === 'development',
    
    // Dados de teste
    generateTestData: process.env.GENERATE_TEST_DATA === 'true',
    
    // Mock de integrações externas
    mockExternalServices: process.env.MOCK_EXTERNAL_SERVICES === 'true',
    
    // Debug mode
    debugMode: process.env.ANALYTICS_DEBUG === 'true'
  }
};

// ============================================================================
// 🔧 FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Valida se um evento está corretamente configurado
 */
function validateEvent(eventName, properties) {
  const eventConfig = findEventConfig(eventName);
  
  if (!eventConfig) {
    throw new Error(`Evento não configurado: ${eventName}`);
  }
  
  // Verificar propriedades obrigatórias
  for (const required of eventConfig.required) {
    if (!properties[required]) {
      throw new Error(`Propriedade obrigatória ausente: ${required}`);
    }
  }
  
  return true;
}

/**
 * Encontra a configuração de um evento
 */
function findEventConfig(eventName) {
  for (const category of Object.values(analyticsConfig.events)) {
    for (const event of Object.values(category)) {
      if (event.name === eventName) {
        return event;
      }
    }
  }
  return null;
}

/**
 * Obtém configuração de métrica
 */
function getMetricConfig(metricName) {
  for (const category of Object.values(analyticsConfig.metrics)) {
    if (category[metricName]) {
      return category[metricName];
    }
  }
  return null;
}

/**
 * Verifica se uma integração está habilitada
 */
function isIntegrationEnabled(integrationName) {
  return analyticsConfig.integrations[integrationName]?.enabled || false;
}

module.exports = {
  analyticsConfig,
  validateEvent,
  findEventConfig,
  getMetricConfig,
  isIntegrationEnabled
};

/**
 * Exemplo de uso:
 * 
 * const { analyticsConfig, validateEvent } = require('./config/analytics');
 * 
 * // Validar evento antes de enviar
 * try {
 *   validateEvent('user_registration', {
 *     userId: '123',
 *     email: 'user@example.com',
 *     source: 'organic'
 *   });
 *   // Evento válido, pode ser enviado
 * } catch (error) {
 *   console.error('Evento inválido:', error.message);
 * }
 */