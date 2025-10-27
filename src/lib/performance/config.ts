// 📊 Configurações do Sistema de Performance
// Configurações padrão e constantes do sistema de monitoramento

import { MetricType, MonitoringConfig, OptimizationStrategy } from './types';

// Configuração padrão de monitoramento
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  retentionPeriod: 7, // 7 dias
  metricsCollection: {
    interval: 60, // 60 segundos
    batchSize: 100
  },
  thresholds: {
    response_time: {
      metricType: MetricType.RESPONSE_TIME,
      warning: 1000, // 1s
      critical: 2000, // 2s
      unit: 'ms',
      enabled: true,
      cooldownPeriod: 5 // 5 minutos
    },
    error_rate: {
      metricType: MetricType.ERROR_RATE,
      warning: 5, // 5%
      critical: 10, // 10%
      unit: '%',
      enabled: true,
      cooldownPeriod: 10 // 10 minutos
    },
    cpu_usage: {
      metricType: MetricType.CPU_USAGE,
      warning: 70, // 70%
      critical: 90, // 90%
      unit: '%',
      enabled: true,
      cooldownPeriod: 5 // 5 minutos
    },
    memory_usage: {
      metricType: MetricType.MEMORY_USAGE,
      warning: 80, // 80%
      critical: 95, // 95%
      unit: '%',
      enabled: true,
      cooldownPeriod: 5 // 5 minutos
    },
    database_query_time: {
      metricType: MetricType.DATABASE_QUERY_TIME,
      warning: 500, // 500ms
      critical: 2000, // 2s
      unit: 'ms',
      enabled: true,
      cooldownPeriod: 5 // 5 minutos
    }
  },
  alerts: {
    enabled: true,
    channels: ['email'],
    recipients: ['admin@company.com'],
    cooldownPeriod: 15 // 15 minutos
  },
  optimization: {
    autoOptimize: false,
    strategies: [],
    maxConcurrentOptimizations: 2
  }
};

// Estratégias de otimização padrão
export const DEFAULT_OPTIMIZATION_STRATEGIES: OptimizationStrategy[] = [
  {
    id: 'cache-optimization',
    name: 'Otimização de Cache',
    description: 'Implementar cache para reduzir tempo de resposta',
    type: 'cache',
    triggers: [
      {
        metricType: MetricType.RESPONSE_TIME,
        threshold: 2000, // 2s
        duration: 10 // 10 minutos
      }
    ],
    actions: [
      {
        id: 'enable-redis-cache',
        type: 'enable_cache',
        parameters: {
          type: 'redis',
          ttl: 300, // 5 minutos
          maxSize: '100MB'
        },
        timeout: 5,
        retryCount: 2
      }
    ],
    rollbackPlan: [
      {
        id: 'disable-cache',
        type: 'disable_cache',
        parameters: { type: 'redis' }
      }
    ],
    estimatedImpact: {
      performanceGain: 40, // 40% melhoria
      resourceCost: 3, // baixo custo
      implementationTime: 15 // 15 minutos
    },
    prerequisites: ['Redis disponível'],
    risks: ['Dados em cache podem ficar desatualizados']
  },
  {
    id: 'database-optimization',
    name: 'Otimização de Banco de Dados',
    description: 'Otimizar queries lentas do banco de dados',
    type: 'database',
    triggers: [
      {
        metricType: MetricType.DATABASE_QUERY_TIME,
        threshold: 1000, // 1s
        duration: 15 // 15 minutos
      }
    ],
    actions: [
      {
        id: 'add-database-indexes',
        type: 'optimize_query',
        parameters: {
          type: 'add_indexes',
          tables: ['users', 'orders', 'products']
        },
        timeout: 10,
        retryCount: 1
      }
    ],
    rollbackPlan: [
      {
        id: 'remove-indexes',
        type: 'remove_indexes',
        parameters: { tables: ['users', 'orders', 'products'] }
      }
    ],
    estimatedImpact: {
      performanceGain: 60, // 60% melhoria
      resourceCost: 2, // muito baixo custo
      implementationTime: 30 // 30 minutos
    },
    prerequisites: ['Acesso ao banco de dados'],
    risks: ['Índices podem aumentar uso de espaço']
  },
  {
    id: 'resource-scaling',
    name: 'Escalonamento de Recursos',
    description: 'Aumentar recursos do servidor quando necessário',
    type: 'infrastructure',
    triggers: [
      {
        metricType: MetricType.CPU_USAGE,
        threshold: 85, // 85%
        duration: 20 // 20 minutos
      },
      {
        metricType: MetricType.MEMORY_USAGE,
        threshold: 90, // 90%
        duration: 15 // 15 minutos
      }
    ],
    actions: [
      {
        id: 'scale-up-resources',
        type: 'scale_resources',
        parameters: {
          type: 'vertical',
          cpu: '+50%',
          memory: '+50%'
        },
        timeout: 15,
        retryCount: 2
      }
    ],
    rollbackPlan: [
      {
        id: 'scale-down-resources',
        type: 'scale_resources',
        parameters: {
          type: 'vertical',
          cpu: '-50%',
          memory: '-50%'
        }
      }
    ],
    estimatedImpact: {
      performanceGain: 50, // 50% melhoria
      resourceCost: 8, // alto custo
      implementationTime: 20 // 20 minutos
    },
    prerequisites: ['Infraestrutura escalável'],
    risks: ['Aumento significativo de custos']
  }
];

// Constantes do sistema
export const PERFORMANCE_CONSTANTS = {
  // Intervalos de coleta (em ms)
  METRICS_COLLECTION_INTERVAL: 60000, // 1 minuto
  SYSTEM_MONITORING_INTERVAL: 30000, // 30 segundos
  ALERT_CHECK_INTERVAL: 120000, // 2 minutos
  AUTO_OPTIMIZATION_INTERVAL: 300000, // 5 minutos
  METRICS_FLUSH_INTERVAL: 30000, // 30 segundos
  
  // Limites
  MAX_METRICS_BUFFER_SIZE: 1000,
  MAX_ALERTS_HISTORY: 500,
  MAX_OPTIMIZATION_HISTORY: 100,
  
  // Timeouts
  DEFAULT_OPTIMIZATION_TIMEOUT: 600000, // 10 minutos
  DEFAULT_ACTION_TIMEOUT: 300000, // 5 minutos
  
  // Períodos de retenção
  METRICS_RETENTION_DAYS: 30,
  ALERTS_RETENTION_DAYS: 90,
  OPTIMIZATION_RETENTION_DAYS: 180
};

// Configurações de ambiente
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      ...DEFAULT_MONITORING_CONFIG,
      metricsCollection: {
        interval: 30, // coleta mais frequente em dev
        batchSize: 50
      },
      alerts: {
        ...DEFAULT_MONITORING_CONFIG.alerts,
        enabled: false // desabilitar alertas em dev
      }
    },
    test: {
      ...DEFAULT_MONITORING_CONFIG,
      enabled: false, // desabilitar monitoramento em testes
      alerts: {
        ...DEFAULT_MONITORING_CONFIG.alerts,
        enabled: false
      }
    },
    production: {
      ...DEFAULT_MONITORING_CONFIG,
      optimization: {
        ...DEFAULT_MONITORING_CONFIG.optimization,
        autoOptimize: true // habilitar otimização automática em produção
      }
    }
  };
  
  return configs[env as keyof typeof configs] || configs.development;
};
