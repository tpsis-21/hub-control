/**
 * Configurações de produção para integração BPIX
 * Este arquivo contém configurações específicas para ambiente de produção
 */

export interface BpixProductionConfig {
  apiUrl: string;
  webhookUrl: string;
  timeout: number;
  retryAttempts: number;
  rateLimiting: {
    maxRequests: number;
    windowMs: number;
  };
  security: {
    encryptionKey: string;
    signatureValidation: boolean;
    ipWhitelist: string[];
  };
  monitoring: {
    enableMetrics: boolean;
    enableLogs: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Configuração padrão para produção
 */
export const defaultProductionConfig: BpixProductionConfig = {
  apiUrl: process.env.BPIX_API_URL || 'https://api.bpix.com.br/v1',
  webhookUrl: process.env.BPIX_WEBHOOK_URL || '',
  timeout: 30000, // 30 segundos
  retryAttempts: 3,
  rateLimiting: {
    maxRequests: 100,
    windowMs: 60000, // 1 minuto
  },
  security: {
    encryptionKey: process.env.BPIX_ENCRYPTION_KEY || '',
    signatureValidation: true,
    ipWhitelist: [
      // IPs do BPIX para webhooks
      '177.54.144.0/20',
      '191.235.112.0/20',
    ],
  },
  monitoring: {
    enableMetrics: true,
    enableLogs: true,
    logLevel: 'info',
  },
};

/**
 * Validação de configuração para produção
 */
export function validateProductionConfig(config: BpixProductionConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validações obrigatórias
  if (!config.apiUrl) {
    errors.push('BPIX_API_URL é obrigatória');
  }

  if (!config.webhookUrl) {
    errors.push('BPIX_WEBHOOK_URL é obrigatória');
  }

  if (!config.security.encryptionKey) {
    errors.push('BPIX_ENCRYPTION_KEY é obrigatória');
  }

  // Validações de formato
  if (config.apiUrl && !config.apiUrl.startsWith('https://')) {
    errors.push('BPIX_API_URL deve usar HTTPS em produção');
  }

  if (config.webhookUrl && !config.webhookUrl.startsWith('https://')) {
    errors.push('BPIX_WEBHOOK_URL deve usar HTTPS em produção');
  }

  // Validações de segurança
  if (config.security.encryptionKey && config.security.encryptionKey.length < 32) {
    errors.push('BPIX_ENCRYPTION_KEY deve ter pelo menos 32 caracteres');
  }

  if (config.timeout < 5000) {
    errors.push('Timeout deve ser pelo menos 5 segundos em produção');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Configuração de monitoramento específica para BPIX
 */
export const bpixMonitoringConfig = {
  metrics: {
    // Métricas de performance
    responseTime: {
      name: 'bpix_response_time',
      description: 'Tempo de resposta das APIs BPIX',
      buckets: [100, 500, 1000, 2000, 5000, 10000],
    },
    requestCount: {
      name: 'bpix_requests_total',
      description: 'Total de requisições para BPIX',
      labels: ['method', 'endpoint', 'status'],
    },
    errorRate: {
      name: 'bpix_errors_total',
      description: 'Total de erros BPIX',
      labels: ['type', 'endpoint'],
    },
    // Métricas de negócio
    paymentsCreated: {
      name: 'bpix_payments_created_total',
      description: 'Total de pagamentos criados',
      labels: ['status'],
    },
    webhooksReceived: {
      name: 'bpix_webhooks_received_total',
      description: 'Total de webhooks recebidos',
      labels: ['event_type', 'status'],
    },
  },
  alerts: {
    // Alertas críticos
    highErrorRate: {
      condition: 'bpix_errors_total / bpix_requests_total > 0.05',
      description: 'Taxa de erro BPIX acima de 5%',
      severity: 'critical',
    },
    slowResponse: {
      condition: 'bpix_response_time > 5000',
      description: 'Resposta BPIX muito lenta (>5s)',
      severity: 'warning',
    },
    webhookFailure: {
      condition: 'bpix_webhooks_received_total{status="error"} > 10',
      description: 'Muitos webhooks falhando',
      severity: 'warning',
    },
  },
};

/**
 * Configuração de logs estruturados para BPIX
 */
export const bpixLoggingConfig = {
  fields: {
    service: 'bpix-integration',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
  },
  sensitiveFields: [
    'api_key',
    'encryption_key',
    'signature',
    'token',
    'password',
    'secret',
  ],
  logLevels: {
    payment_created: 'info',
    payment_updated: 'info',
    webhook_received: 'info',
    api_error: 'error',
    validation_error: 'warn',
    rate_limit_exceeded: 'warn',
  },
};

/**
 * Configuração de health check para BPIX
 */
export const bpixHealthCheckConfig = {
  endpoint: '/api/health/bpix',
  interval: 30000, // 30 segundos
  timeout: 5000, // 5 segundos
  checks: [
    {
      name: 'bpix_api_connectivity',
      description: 'Conectividade com API BPIX',
      critical: true,
    },
    {
      name: 'bpix_webhook_endpoint',
      description: 'Endpoint de webhook acessível',
      critical: true,
    },
    {
      name: 'bpix_database_connection',
      description: 'Conexão com banco de dados BPIX',
      critical: true,
    },
    {
      name: 'bpix_cache_status',
      description: 'Status do cache BPIX',
      critical: false,
    },
  ],
};