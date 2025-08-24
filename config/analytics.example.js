/**
 * 📊 Configuração de Analytics - Hub Control
 * 
 * Este arquivo contém as configurações de exemplo para o sistema de analytics.
 * Copie este arquivo para analytics.js e ajuste as configurações conforme necessário.
 * 
 * 🔧 Ambientes suportados: development, staging, production
 * 📈 Métricas: usuário, financeiras, performance, sistema
 * 🔒 Privacidade: LGPD/GDPR compliance
 */

module.exports = {
  // ============================================================================
  // 🎯 CONFIGURAÇÕES GERAIS
  // ============================================================================
  
  system: {
    // Habilitar/desabilitar sistema de analytics
    enabled: process.env.ANALYTICS_ENABLED === 'true' || true,
    
    // Ambiente atual (development, staging, production)
    environment: process.env.NODE_ENV || 'development',
    
    // Taxa de amostragem (0-100) - reduz volume de dados em produção
    sampleRate: parseInt(process.env.ANALYTICS_SAMPLE_RATE) || 100,
    
    // Tamanho do lote para processamento em batch
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE) || 100,
    
    // Intervalo de flush da fila (ms)
    flushInterval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL) || 30000,
    
    // Timeout para requisições externas (ms)
    requestTimeout: parseInt(process.env.ANALYTICS_REQUEST_TIMEOUT) || 5000,
    
    // Debug mode - logs detalhados
    debug: process.env.ANALYTICS_DEBUG === 'true' || false
  },

  // ============================================================================
  // 📊 EVENTOS RASTREADOS
  // ============================================================================
  
  events: {
    // Eventos de usuário
    user: {
      enabled: true,
      types: [
        'user_login',
        'user_logout', 
        'user_register',
        'user_profile_update',
        'user_password_change',
        'user_email_verify',
        'user_subscription_change'
      ]
    },
    
    // Eventos de transação
    transaction: {
      enabled: true,
      types: [
        'payment_initiated',
        'payment_completed',
        'payment_failed',
        'subscription_created',
        'subscription_cancelled',
        'refund_processed',
        'invoice_generated'
      ]
    },
    
    // Eventos de navegação
    navigation: {
      enabled: true,
      types: [
        'page_view',
        'button_click',
        'form_submit',
        'download',
        'external_link',
        'search',
        'filter_applied'
      ]
    },
    
    // Eventos de sistema
    system: {
      enabled: true,
      types: [
        'api_request',
        'api_error',
        'database_query',
        'cache_hit',
        'cache_miss',
        'email_sent',
        'webhook_received'
      ]
    }
  },

  // ============================================================================
  // 📈 MÉTRICAS CALCULADAS
  // ============================================================================
  
  metrics: {
    // Métricas de usuário
    user: {
      enabled: true,
      calculations: [
        'daily_active_users',
        'weekly_active_users',
        'monthly_active_users',
        'user_retention_rate',
        'user_churn_rate',
        'session_duration',
        'pages_per_session'
      ]
    },
    
    // Métricas financeiras
    financial: {
      enabled: true,
      calculations: [
        'monthly_recurring_revenue',
        'annual_recurring_revenue',
        'average_revenue_per_user',
        'customer_lifetime_value',
        'conversion_rate',
        'payment_success_rate',
        'refund_rate'
      ]
    },
    
    // Métricas de performance
    performance: {
      enabled: true,
      calculations: [
        'page_load_time',
        'api_response_time',
        'database_query_time',
        'error_rate',
        'uptime_percentage',
        'throughput',
        'concurrent_users'
      ]
    }
  },

  // ============================================================================
  // 📊 DASHBOARDS
  // ============================================================================
  
  dashboards: {
    // Dashboard executivo
    executive: {
      enabled: true,
      refreshInterval: 300000, // 5 minutos
      widgets: [
        'revenue_overview',
        'user_growth',
        'key_metrics',
        'conversion_funnel',
        'geographic_distribution'
      ]
    },
    
    // Dashboard operacional
    operational: {
      enabled: true,
      refreshInterval: 60000, // 1 minuto
      widgets: [
        'system_health',
        'api_performance',
        'error_tracking',
        'user_activity',
        'real_time_events'
      ]
    },
    
    // Dashboard financeiro
    financial: {
      enabled: true,
      refreshInterval: 3600000, // 1 hora
      widgets: [
        'revenue_trends',
        'subscription_metrics',
        'payment_analytics',
        'churn_analysis',
        'forecasting'
      ]
    }
  },

  // ============================================================================
  // 🚨 ALERTAS E NOTIFICAÇÕES
  // ============================================================================
  
  alerts: {
    // Alertas de sistema
    system: {
      enabled: true,
      thresholds: {
        error_rate: 5, // % de erros
        response_time: 2000, // ms
        concurrent_users: 1000,
        disk_usage: 85 // %
      }
    },
    
    // Alertas de negócio
    business: {
      enabled: true,
      thresholds: {
        conversion_rate_drop: 20, // % de queda
        revenue_drop: 15, // % de queda
        churn_rate_increase: 10, // % de aumento
        failed_payments: 50 // número absoluto
      }
    },
    
    // Canais de notificação
    channels: {
      email: {
        enabled: process.env.ANALYTICS_EMAIL_ALERTS === 'true' || false,
        recipients: (process.env.ANALYTICS_EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        }
      },
      
      slack: {
        enabled: process.env.ANALYTICS_SLACK_ALERTS === 'true' || false,
        webhook: process.env.ANALYTICS_SLACK_WEBHOOK,
        channel: process.env.ANALYTICS_SLACK_CHANNEL || '#alerts',
        username: 'Hub Control Analytics'
      }
    }
  },

  // ============================================================================
  // 🔗 INTEGRAÇÕES EXTERNAS
  // ============================================================================
  
  integrations: {
    // Google Analytics
    googleAnalytics: {
      enabled: process.env.GA_ENABLED === 'true' || false,
      trackingId: process.env.GA_TRACKING_ID,
      apiKey: process.env.GA_API_KEY,
      viewId: process.env.GA_VIEW_ID,
      events: {
        pageViews: true,
        customEvents: true,
        ecommerce: true
      }
    },
    
    // Mixpanel
    mixpanel: {
      enabled: process.env.MIXPANEL_ENABLED === 'true' || false,
      token: process.env.MIXPANEL_TOKEN,
      apiSecret: process.env.MIXPANEL_API_SECRET,
      events: {
        userEvents: true,
        transactionEvents: true,
        systemEvents: false
      }
    },
    
    // Webhook personalizado
    webhook: {
      enabled: process.env.ANALYTICS_WEBHOOK_ENABLED === 'true' || false,
      url: process.env.ANALYTICS_WEBHOOK_URL,
      secret: process.env.ANALYTICS_WEBHOOK_SECRET,
      events: ['payment_completed', 'user_register', 'subscription_created']
    }
  },

  // ============================================================================
  // 🔒 PRIVACIDADE E COMPLIANCE
  // ============================================================================
  
  privacy: {
    // Anonimização de dados
    anonymization: {
      enabled: process.env.NODE_ENV === 'production',
      
      // Anonimizar IP do usuário
      anonymizeIp: true,
      
      // Anonimizar User Agent
      anonymizeUserAgent: true,
      
      // Hash de IDs de usuário
      hashUserIds: process.env.NODE_ENV === 'production',
      
      // Algoritmo de hash
      hashAlgorithm: 'sha256',
      
      // Salt para hash
      hashSalt: process.env.ANALYTICS_HASH_SALT || 'hub-control-analytics'
    },
    
    // Consentimento do usuário
    consent: {
      required: process.env.NODE_ENV === 'production',
      
      // Tipos de consentimento
      types: {
        analytics: true,
        marketing: false,
        functional: true
      },
      
      // Armazenar consentimento
      storage: {
        type: 'database', // 'database' ou 'cookie'
        duration: 365 // dias
      }
    },
    
    // Retenção de dados
    dataRetention: {
      // Período de retenção em dias
      events: parseInt(process.env.ANALYTICS_RETENTION_EVENTS) || 365,
      metrics: parseInt(process.env.ANALYTICS_RETENTION_METRICS) || 1095, // 3 anos
      sessions: parseInt(process.env.ANALYTICS_RETENTION_SESSIONS) || 90,
      
      // Limpeza automática
      autoCleanup: true,
      cleanupInterval: '0 2 * * *' // Cron: todo dia às 2h
    },
    
    // Compliance LGPD/GDPR
    compliance: {
      lgpd: {
        enabled: true,
        privacyPolicyUrl: process.env.PRIVACY_POLICY_URL || '/privacy',
        dataControllerContact: process.env.DATA_CONTROLLER_EMAIL
      },
      
      gdpr: {
        enabled: process.env.GDPR_ENABLED === 'true' || false,
        privacyPolicyUrl: process.env.PRIVACY_POLICY_URL || '/privacy',
        dataControllerContact: process.env.DATA_CONTROLLER_EMAIL
      }
    }
  },

  // ============================================================================
  // 💾 ARMAZENAMENTO E PERFORMANCE
  // ============================================================================
  
  storage: {
    // Configurações do banco de dados
    database: {
      // Particionamento de tabelas por data
      partitioning: {
        enabled: process.env.NODE_ENV === 'production',
        interval: 'monthly' // 'daily', 'weekly', 'monthly'
      },
      
      // Compressão de dados antigos
      compression: {
        enabled: true,
        threshold: 30, // dias
        level: 6 // 1-9
      },
      
      // Arquivamento automático
      archiving: {
        enabled: process.env.NODE_ENV === 'production',
        threshold: 180, // dias
        destination: 's3' // 's3', 'filesystem'
      }
    },
    
    // Cache de métricas
    cache: {
      enabled: true,
      
      // TTL para diferentes tipos de dados
      ttl: {
        realtime: 60, // segundos
        hourly: 3600, // 1 hora
        daily: 86400, // 1 dia
        weekly: 604800 // 1 semana
      },
      
      // Configuração do Redis
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0
      }
    }
  },

  // ============================================================================
  // 🧪 CONFIGURAÇÕES DE DESENVOLVIMENTO
  // ============================================================================
  
  development: {
    // Dados de teste
    mockData: {
      enabled: process.env.NODE_ENV === 'development',
      
      // Gerar eventos simulados
      generateEvents: true,
      eventsPerMinute: 10,
      
      // Usuários simulados
      mockUsers: 100,
      
      // Transações simuladas
      mockTransactions: true,
      transactionsPerHour: 5
    },
    
    // Logs detalhados
    logging: {
      level: 'debug',
      console: true,
      file: true,
      
      // Log de queries SQL
      sqlQueries: true,
      
      // Log de eventos externos
      externalRequests: true
    }
  },

  // ============================================================================
  // 🔧 FUNÇÕES AUXILIARES
  // ============================================================================
  
  /**
   * Validar configuração de evento
   * @param {string} eventType - Tipo do evento
   * @param {Object} properties - Propriedades do evento
   * @returns {boolean} - Se o evento é válido
   */
  validateEvent(eventType, properties = {}) {
    // Verificar se o tipo de evento está habilitado
    const eventConfig = this.getEventConfig(eventType);
    if (!eventConfig || !eventConfig.enabled) {
      return false;
    }
    
    // Validar propriedades obrigatórias
    const requiredProps = this.getRequiredProperties(eventType);
    for (const prop of requiredProps) {
      if (!(prop in properties)) {
        return false;
      }
    }
    
    return true;
  },
  
  /**
   * Obter configuração de evento
   * @param {string} eventType - Tipo do evento
   * @returns {Object|null} - Configuração do evento
   */
  getEventConfig(eventType) {
    for (const [category, config] of Object.entries(this.events)) {
      if (config.types && config.types.includes(eventType)) {
        return config;
      }
    }
    return null;
  },
  
  /**
   * Obter propriedades obrigatórias para um tipo de evento
   * @param {string} eventType - Tipo do evento
   * @returns {Array} - Lista de propriedades obrigatórias
   */
  getRequiredProperties(eventType) {
    const requiredProps = {
      'user_login': ['user_id'],
      'user_register': ['user_id', 'email'],
      'payment_completed': ['user_id', 'amount', 'currency'],
      'page_view': ['url', 'title'],
      'api_request': ['endpoint', 'method', 'status_code']
    };
    
    return requiredProps[eventType] || [];
  },
  
  /**
   * Obter configuração para ambiente específico
   * @param {string} environment - Ambiente (development, staging, production)
   * @returns {Object} - Configuração do ambiente
   */
  getEnvironmentConfig(environment = null) {
    const env = environment || this.system.environment;
    
    const envConfigs = {
      development: {
        sampleRate: 100,
        batchSize: 50,
        debug: true,
        anonymization: { enabled: false },
        dataRetention: { events: 30 }
      },
      staging: {
        sampleRate: 100,
        batchSize: 100,
        debug: false,
        anonymization: { enabled: true },
        dataRetention: { events: 90 }
      },
      production: {
        sampleRate: 100,
        batchSize: 200,
        debug: false,
        anonymization: { enabled: true },
        dataRetention: { events: 365 }
      }
    };
    
    return envConfigs[env] || envConfigs.development;
  }
};

/**
 * 📋 NOTAS DE CONFIGURAÇÃO:
 * 
 * 🔧 VARIÁVEIS DE AMBIENTE NECESSÁRIAS:
 * - ANALYTICS_ENABLED: Habilitar analytics (true/false)
 * - ANALYTICS_SAMPLE_RATE: Taxa de amostragem (0-100)
 * - ANALYTICS_BATCH_SIZE: Tamanho do lote
 * - GA_TRACKING_ID: ID do Google Analytics
 * - MIXPANEL_TOKEN: Token do Mixpanel
 * - ANALYTICS_HASH_SALT: Salt para hash de dados
 * - ANALYTICS_SLACK_WEBHOOK: Webhook do Slack
 * - ANALYTICS_EMAIL_RECIPIENTS: E-mails para alertas
 * 
 * 📊 MÉTRICAS DISPONÍVEIS:
 * - Usuário: DAU, WAU, MAU, retenção, churn
 * - Financeiras: MRR, ARR, ARPU, LTV, conversão
 * - Performance: tempo de resposta, uptime, throughput
 * 
 * 🔒 PRIVACIDADE:
 * - Anonimização automática em produção
 * - Compliance LGPD/GDPR
 * - Retenção configurável de dados
 * - Consentimento do usuário
 * 
 * 🚀 PRÓXIMOS PASSOS:
 * 1. Copiar para analytics.js
 * 2. Configurar variáveis de ambiente
 * 3. Testar integrações externas
 * 4. Configurar dashboards
 * 5. Treinar equipe
 */