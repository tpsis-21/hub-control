/**
 * Configurações de monitoramento para produção
 * Centraliza configurações de logs, métricas, alertas e health checks
 */

export interface MonitoringConfig {
  environment: string;
  logging: LoggingConfig;
  metrics: MetricsConfig;
  alerts: AlertsConfig;
  healthChecks: HealthCheckConfig;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  directory: string;
  maxFileSize: string;
  maxFiles: number;
  remote?: {
    endpoint: string;
    apiKey: string;
    timeout: number;
  };
}

export interface MetricsConfig {
  enabled: boolean;
  interval: number;
  retention: {
    raw: string;
    aggregated: string;
    summary: string;
  };
  endpoints: {
    health: string;
    metrics: string;
    dashboard: string;
  };
  thresholds: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    errorRate: number;
    responseTime: number;
  };
}

export interface AlertsConfig {
  enabled: boolean;
  channels: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    sms: boolean;
  };
  email?: {
    from: string;
    to: string[];
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };
  slack?: {
    webhookUrl: string;
    channel: string;
    username: string;
  };
  webhook?: {
    url: string;
    timeout: number;
    retries: number;
  };
  sms?: {
    provider: string;
    apiKey: string;
    from: string;
    to: string[];
  };
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  endpoints: {
    path: string;
    name: string;
    critical: boolean;
  }[];
  external?: {
    enabled: boolean;
    url: string;
    interval: number;
  };
}

/**
 * Configuração padrão de monitoramento
 */
const defaultConfig: MonitoringConfig = {
  environment: process.env.NODE_ENV || 'development',
  
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    enableRemote: process.env.LOG_ENABLE_REMOTE === 'true',
    directory: process.env.LOG_DIR || './logs',
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10MB',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    remote: process.env.LOG_REMOTE_ENDPOINT ? {
      endpoint: process.env.LOG_REMOTE_ENDPOINT,
      apiKey: process.env.LOG_REMOTE_API_KEY || '',
      timeout: parseInt(process.env.LOG_REMOTE_TIMEOUT || '5000'),
    } : undefined,
  },
  
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    interval: parseInt(process.env.METRICS_INTERVAL || '60000'), // 1 minuto
    retention: {
      raw: process.env.METRICS_RETENTION_RAW || '1h',
      aggregated: process.env.METRICS_RETENTION_AGGREGATED || '7d',
      summary: process.env.METRICS_RETENTION_SUMMARY || '30d',
    },
    endpoints: {
      health: '/api/health',
      metrics: '/api/metrics',
      dashboard: '/api/monitoring/dashboard',
    },
    thresholds: {
      memoryUsage: parseInt(process.env.THRESHOLD_MEMORY_USAGE || '80'),
      cpuUsage: parseInt(process.env.THRESHOLD_CPU_USAGE || '80'),
      diskUsage: parseInt(process.env.THRESHOLD_DISK_USAGE || '85'),
      errorRate: parseInt(process.env.THRESHOLD_ERROR_RATE || '5'),
      responseTime: parseInt(process.env.THRESHOLD_RESPONSE_TIME || '2000'),
    },
  },
  
  alerts: {
    enabled: process.env.NODE_ENV === 'production',
    channels: {
      email: process.env.ALERT_EMAIL_ENABLED === 'true',
      slack: process.env.ALERT_SLACK_ENABLED === 'true',
      webhook: process.env.ALERT_WEBHOOK_ENABLED === 'true',
      sms: process.env.ALERT_SMS_ENABLED === 'true',
    },
    email: process.env.ALERT_EMAIL_ENABLED === 'true' ? {
      from: process.env.ALERT_EMAIL_FROM || '',
      to: (process.env.ALERT_EMAIL_TO || '').split(',').filter(Boolean),
      smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
    } : undefined,
    slack: process.env.ALERT_SLACK_ENABLED === 'true' ? {
      webhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL || '',
      channel: process.env.ALERT_SLACK_CHANNEL || '#alerts',
      username: process.env.ALERT_SLACK_USERNAME || 'Hub Control',
    } : undefined,
    webhook: process.env.ALERT_WEBHOOK_ENABLED === 'true' ? {
      url: process.env.ALERT_WEBHOOK_URL || '',
      timeout: parseInt(process.env.ALERT_WEBHOOK_TIMEOUT || '5000'),
      retries: parseInt(process.env.ALERT_WEBHOOK_RETRIES || '3'),
    } : undefined,
    sms: process.env.ALERT_SMS_ENABLED === 'true' ? {
      provider: process.env.ALERT_SMS_PROVIDER || 'twilio',
      apiKey: process.env.ALERT_SMS_API_KEY || '',
      from: process.env.ALERT_SMS_FROM || '',
      to: (process.env.ALERT_SMS_TO || '').split(',').filter(Boolean),
    } : undefined,
  },
  
  healthChecks: {
    enabled: process.env.HEALTH_CHECKS_ENABLED !== 'false',
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 segundos
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
    endpoints: [
      {
        path: '/api/health',
        name: 'Sistema Principal',
        critical: true,
      },
      {
        path: '/api/health/bpix',
        name: 'Integração BPIX',
        critical: true,
      },
      {
        path: '/api/metrics',
        name: 'Métricas',
        critical: false,
      },
    ],
    external: process.env.EXTERNAL_HEALTH_CHECK_ENABLED === 'true' ? {
      enabled: true,
      url: process.env.EXTERNAL_HEALTH_CHECK_URL || '',
      interval: parseInt(process.env.EXTERNAL_HEALTH_CHECK_INTERVAL || '300000'), // 5 minutos
    } : undefined,
  },
};

/**
 * Validar configuração de monitoramento
 */
export function validateMonitoringConfig(config: MonitoringConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validar logging
  if (config.logging.enableFile && !config.logging.directory) {
    errors.push('Diretório de logs não configurado');
  }
  
  if (config.logging.enableRemote && !config.logging.remote?.endpoint) {
    errors.push('Endpoint remoto de logs não configurado');
  }
  
  // Validar alertas
  if (config.alerts.enabled) {
    const enabledChannels = Object.values(config.alerts.channels).some(Boolean);
    if (!enabledChannels) {
      warnings.push('Nenhum canal de alerta configurado');
    }
    
    if (config.alerts.channels.email && !config.alerts.email?.from) {
      errors.push('Email de origem não configurado para alertas');
    }
    
    if (config.alerts.channels.slack && !config.alerts.slack?.webhookUrl) {
      errors.push('Webhook do Slack não configurado para alertas');
    }
  }
  
  // Validar métricas
  if (config.metrics.enabled) {
    if (config.metrics.interval < 10000) {
      warnings.push('Intervalo de métricas muito baixo (< 10s)');
    }
    
    if (config.metrics.thresholds.memoryUsage > 95) {
      warnings.push('Threshold de memória muito alto (> 95%)');
    }
  }
  
  // Validar health checks
  if (config.healthChecks.enabled) {
    if (config.healthChecks.interval < 5000) {
      warnings.push('Intervalo de health check muito baixo (< 5s)');
    }
    
    const criticalEndpoints = config.healthChecks.endpoints.filter(e => e.critical);
    if (criticalEndpoints.length === 0) {
      warnings.push('Nenhum endpoint crítico configurado');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Obter configuração de monitoramento
 */
export function getMonitoringConfig(): MonitoringConfig {
  return defaultConfig;
}

/**
 * Verificar se está em ambiente de produção
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Verificar se monitoramento está habilitado
 */
export function isMonitoringEnabled(): boolean {
  const config = getMonitoringConfig();
  return config.metrics.enabled || config.alerts.enabled || config.healthChecks.enabled;
}

/**
 * Obter configuração específica por tipo
 */
export function getLoggingConfig(): LoggingConfig {
  return getMonitoringConfig().logging;
}

export function getMetricsConfig(): MetricsConfig {
  return getMonitoringConfig().metrics;
}

export function getAlertsConfig(): AlertsConfig {
  return getMonitoringConfig().alerts;
}

export function getHealthCheckConfig(): HealthCheckConfig {
  return getMonitoringConfig().healthChecks;
}

/**
 * Configurações específicas para diferentes ambientes
 */
export const environmentConfigs = {
  development: {
    logging: {
      level: 'debug' as const,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
    },
    alerts: {
      enabled: false,
    },
    metrics: {
      interval: 30000, // 30 segundos
    },
  },
  
  test: {
    logging: {
      level: 'warn' as const,
      enableConsole: false,
      enableFile: false,
      enableRemote: false,
    },
    alerts: {
      enabled: false,
    },
    metrics: {
      enabled: false,
    },
  },
  
  production: {
    logging: {
      level: 'info' as const,
      enableConsole: true,
      enableFile: true,
      enableRemote: true,
    },
    alerts: {
      enabled: true,
    },
    metrics: {
      interval: 60000, // 1 minuto
    },
    healthChecks: {
      interval: 30000, // 30 segundos
    },
  },
};

export default defaultConfig;