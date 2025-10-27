// 📊 Tipos e Interfaces do Sistema de Performance
// Definições de tipos centralizadas para o sistema de monitoramento

import { SecuritySeverity } from '../security-monitoring';

// Tipos de métricas
export enum MetricType {
  RESPONSE_TIME = 'response_time',
  THROUGHPUT = 'throughput',
  ERROR_RATE = 'error_rate',
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DATABASE_QUERY_TIME = 'database_query_time',
  CACHE_HIT_RATE = 'cache_hit_rate',
  CONCURRENT_USERS = 'concurrent_users',
  API_LATENCY = 'api_latency',
  DISK_IO = 'disk_io',
  NETWORK_IO = 'network_io',
  WORKFLOW_EXECUTION_TIME = 'workflow_execution_time',
  NOTIFICATION_DELIVERY_RATE = 'notification_delivery_rate'
}

// Severidade de alertas
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

// Status de otimização
export enum OptimizationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERTED = 'reverted'
}

// Interface para métricas de performance
export interface PerformanceMetric {
  id: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: Date;
  source: string; // API endpoint, database, etc.
  metadata?: Record<string, any>;
  tags?: string[];
}

// Interface para eventos de alerta
export interface AlertEvent {
  id: string;
  metricId: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  threshold: {
    value: number;
    operator: '>' | '<' | '=' | '>=' | '<=';
  };
  metadata?: Record<string, any>;
}

// Interface para configuração de thresholds
export interface ThresholdConfig {
  metricType: MetricType;
  warning: number;
  critical: number;
  unit: string;
  enabled: boolean;
  cooldownPeriod: number; // minutos
}

// Interface para configuração de monitoramento
export interface MonitoringConfig {
  enabled: boolean;
  retentionPeriod: number; // dias
  metricsCollection: {
    interval: number; // segundos
    batchSize: number;
  };
  thresholds: Record<string, ThresholdConfig>;
  alerts: {
    enabled: boolean;
    channels: string[];
    recipients: string[];
    cooldownPeriod: number; // minutos
  };
  optimization: {
    autoOptimize: boolean;
    strategies: OptimizationStrategy[];
    maxConcurrentOptimizations: number;
  };
}

// Interface para estratégias de otimização
export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  type: 'cache' | 'database' | 'api' | 'frontend' | 'infrastructure';
  triggers: {
    metricType: MetricType;
    threshold: number;
    duration: number; // minutos
  }[];
  actions: OptimizationAction[];
  rollbackPlan: RollbackAction[];
  estimatedImpact: {
    performanceGain: number; // %
    resourceCost: number; // escala 1-10
    implementationTime: number; // minutos
  };
  prerequisites: string[];
  risks: string[];
}

export interface OptimizationAction {
  id: string;
  type: 'enable_cache' | 'optimize_query' | 'scale_resources' | 'compress_assets' | 'cdn_setup';
  parameters: Record<string, any>;
  timeout: number; // minutos
  retryCount: number;
}

export interface RollbackAction {
  id: string;
  type: string;
  parameters: Record<string, any>;
}

// Interface para execução de otimização
export interface OptimizationExecution {
  id: string;
  strategyId: string;
  status: OptimizationStatus;
  startTime: Date;
  endTime?: Date;
  triggeredBy: {
    metricType: MetricType;
    value: number;
    threshold: number;
  };
  actions: {
    actionId: string;
    status: OptimizationStatus;
    startTime: Date;
    endTime?: Date;
    error?: string;
    result?: any;
  }[];
  rollbackExecuted: boolean;
  impact?: {
    beforeMetrics: Record<string, number>;
    afterMetrics: Record<string, number>;
    improvementPercentage: number;
  };
}

// Interface para recomendações de otimização
export interface OptimizationRecommendation {
  id: string;
  priority: SecuritySeverity;
  category: string;
  title: string;
  description: string;
  estimatedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  steps: string[];
}

// Interface para relatórios de performance
export interface PerformanceReport {
  id: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    peakConcurrentUsers: number;
  };
  trends: {
    metricType: MetricType;
    trend: 'improving' | 'stable' | 'degrading';
    changePercentage: number;
  }[];
  bottlenecks: {
    source: string;
    issue: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }[];
  optimizations: {
    applied: OptimizationExecution[];
    recommended: OptimizationRecommendation[];
  };
  alerts: AlertEvent[];
}

// Interface para estatísticas agregadas
export interface AggregatedStats {
  metricType: MetricType;
  period: '1m' | '5m' | '15m' | '1h' | '24h';
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  timestamp: Date;
}
