// 📊 Sistema de Monitoramento de Performance
// Monitora métricas de performance, recursos e saúde do sistema em tempo real

// import { logSecurityEvent } from './security-config';
import { SecuritySeverity } from './security';
import { logger } from '@/utils/production-logger'

// Tipos de métricas coletadas
export type MetricType = 
  | 'response_time'     // Tempo de resposta de APIs
  | 'memory_usage'      // Uso de memória
  | 'cpu_usage'         // Uso de CPU
  | 'database_query'    // Performance de queries
  | 'cache_hit_rate'    // Taxa de acerto do cache
  | 'error_rate'        // Taxa de erro
  | 'throughput'        // Throughput de requests
  | 'user_activity'     // Atividade de usuários
  | 'file_upload'       // Performance de uploads
  | 'security_event';   // Eventos de segurança

// Severidade dos alertas
export type AlertSeverity = SecuritySeverity;

// Status de saúde do sistema
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'down';

// Interface para métricas
interface Metric {
  id: string;
  type: MetricType;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

// Interface para alertas
interface Alert {
  id: string;
  metricType: MetricType;
  severity: AlertSeverity;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

// Interface para configuração de thresholds
interface ThresholdConfig {
  metricType: MetricType;
  warning: number;
  critical: number;
  unit: string;
  enabled: boolean;
  cooldown: number; // Tempo em ms antes de disparar novo alerta
}

// Interface para estatísticas agregadas
interface AggregatedStats {
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

// Interface para saúde do sistema
interface SystemHealth {
  overall: HealthStatus;
  components: Record<string, {
    status: HealthStatus;
    lastCheck: Date;
    message?: string;
    metrics?: Record<string, number>;
  }>;
  uptime: number;
  version: string;
  environment: string;
}

// Configurações padrão de thresholds
const DEFAULT_THRESHOLDS: ThresholdConfig[] = [
  {
    metricType: 'response_time',
    warning: 1000,
    critical: 5000,
    unit: 'ms',
    enabled: true,
    cooldown: 60000 // 1 minuto
  },
  {
    metricType: 'memory_usage',
    warning: 80,
    critical: 95,
    unit: '%',
    enabled: true,
    cooldown: 300000 // 5 minutos
  },
  {
    metricType: 'cpu_usage',
    warning: 70,
    critical: 90,
    unit: '%',
    enabled: true,
    cooldown: 300000
  },
  {
    metricType: 'database_query',
    warning: 2000,
    critical: 10000,
    unit: 'ms',
    enabled: true,
    cooldown: 60000
  },
  {
    metricType: 'cache_hit_rate',
    warning: 70,
    critical: 50,
    unit: '%',
    enabled: true,
    cooldown: 600000 // 10 minutos
  },
  {
    metricType: 'error_rate',
    warning: 5,
    critical: 15,
    unit: '%',
    enabled: true,
    cooldown: 120000 // 2 minutos
  },
  {
    metricType: 'throughput',
    warning: 1000,
    critical: 2000,
    unit: 'req/min',
    enabled: true,
    cooldown: 300000
  }
];

// Classe principal do sistema de monitoramento
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, Metric[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private thresholds: Map<MetricType, ThresholdConfig> = new Map();
  private aggregatedStats: Map<string, AggregatedStats> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private isEnabled = true;
  private retentionPeriod = 24 * 60 * 60 * 1000; // 24 horas
  private aggregationInterval = 60 * 1000; // 1 minuto
  private cleanupInterval = 60 * 60 * 1000; // 1 hora
  private startTime = Date.now();

  private constructor() {
    // Inicializar thresholds padrão
    DEFAULT_THRESHOLDS.forEach(threshold => {
      this.thresholds.set(threshold.metricType, threshold);
    });

    // Iniciar agregação periódica
    setInterval(() => this.aggregateMetrics(), this.aggregationInterval);
    
    // Iniciar limpeza periódica
    setInterval(() => this.cleanupOldData(), this.cleanupInterval);
    
    // Monitoramento de recursos do sistema
    this.startSystemMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Registrar métrica
  public recordMetric(
    type: MetricType,
    name: string,
    value: number,
    unit: string = '',
    tags: Record<string, string> = {},
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const metric: Metric = {
      id: this.generateId(),
      type,
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
      metadata
    };

    // Armazenar métrica
    const key = `${type}_${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(metric);

    // Verificar thresholds
    this.checkThresholds(metric);

    // Log para métricas críticas
    if (type === 'security_event' || value > this.getCriticalThreshold(type)) {
      this.logMetric(metric);
    }
  }

  // Medir tempo de execução de função
  public async measureExecutionTime<T>(
    fn: () => Promise<T> | T,
    metricName: string,
    tags: Record<string, string> = {}
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const executionTime = performance.now() - startTime;
      
      this.recordMetric(
        'response_time',
        metricName,
        executionTime,
        'ms',
        { ...tags, status: 'success' }
      );
      
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.recordMetric(
        'response_time',
        metricName,
        executionTime,
        'ms',
        { ...tags, status: 'error' },
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      throw error;
    }
  }

  // Decorator para medir performance de métodos
  public measurePerformance(
    metricName?: string,
    tags: Record<string, string> = {}
  ) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      const finalMetricName = metricName || `${target.constructor.name}.${propertyKey}`;
      
      descriptor.value = async function (...args: any[]) {
        return PerformanceMonitor.getInstance().measureExecutionTime(
          () => originalMethod.apply(this, args),
          finalMetricName,
          tags
        );
      };
      
      return descriptor;
    };
  }

  // Verificar thresholds e gerar alertas
  private checkThresholds(metric: Metric): void {
    const threshold = this.thresholds.get(metric.type);
    if (!threshold || !threshold.enabled) return;

    const alertKey = `${metric.type}_${metric.name}`;
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;
    const now = Date.now();

    // Verificar cooldown
    if (now - lastAlert < threshold.cooldown) return;

    let severity: AlertSeverity | null = null;
    let thresholdValue = 0;

    if (metric.value >= threshold.critical) {
      severity = SecuritySeverity.CRITICAL;
      thresholdValue = threshold.critical;
    } else if (metric.value >= threshold.warning) {
      severity = SecuritySeverity.HIGH;
      thresholdValue = threshold.warning;
    }

    if (severity) {
      this.createAlert(metric, severity, thresholdValue);
      this.lastAlertTime.set(alertKey, now);
    }
  }

  // Criar alerta
  private createAlert(
    metric: Metric,
    severity: AlertSeverity,
    threshold: number
  ): void {
    const alert: Alert = {
      id: this.generateId(),
      metricType: metric.type,
      severity,
      message: `${metric.name} excedeu o threshold ${severity}: ${metric.value}${metric.unit} (limite: ${threshold}${metric.unit})`,
      threshold,
      currentValue: metric.value,
      timestamp: new Date(),
      resolved: false,
      metadata: {
        metricId: metric.id,
        tags: metric.tags
      }
    };

    this.alerts.set(alert.id, alert);

    // Log do alerta
    // logSecurityEvent({
    //   action: 'PERFORMANCE_ALERT',
    //   details: alert.message,
    //   severity: severity === SecuritySeverity.CRITICAL ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
    //   metadata: {
    //     alertId: alert.id,
    //     metricType: metric.type,
    //     currentValue: metric.value,
    //     threshold
    //   }
    // });

    // Notificar sistema de alertas (implementar conforme necessário)
    this.notifyAlert(alert);
  }

  // Resolver alerta
  public resolveAlert(alertId: string, reason?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    if (reason) {
      alert.metadata = { ...alert.metadata, resolutionReason: reason };
    }

    // logSecurityEvent({
    //   action: 'PERFORMANCE_ALERT_RESOLVED',
    //   details: `Alerta resolvido: ${alert.message}`,
    //   severity: SecuritySeverity.LOW,
    //   metadata: {
    //     alertId,
    //     reason
    //   }
    // });

    return true;
  }

  // Obter métricas por tipo
  public getMetrics(
    type: MetricType,
    name?: string,
    timeRange?: { start: Date; end: Date },
    limit?: number
  ): Metric[] {
    const key = name ? `${type}_${name}` : type;
    let metrics: Metric[] = [];

    if (name) {
      metrics = this.metrics.get(key) || [];
    } else {
      // Buscar todas as métricas do tipo
      for (const [metricKey, metricList] of this.metrics.entries()) {
        if (metricKey.startsWith(`${type}_`)) {
          metrics.push(...metricList);
        }
      }
    }

    // Filtrar por período
    if (timeRange) {
      metrics = metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    // Ordenar por timestamp (mais recente primeiro)
    metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limitar resultados
    if (limit) {
      metrics = metrics.slice(0, limit);
    }

    return metrics;
  }

  // Obter alertas ativos
  public getActiveAlerts(severity?: AlertSeverity): Alert[] {
    const alerts = Array.from(this.alerts.values())
      .filter(alert => !alert.resolved);

    if (severity) {
      return alerts.filter(alert => alert.severity === severity);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Obter estatísticas agregadas
  public getAggregatedStats(
    metricType: MetricType,
    period: '1m' | '5m' | '15m' | '1h' | '24h' = '1h'
  ): AggregatedStats | null {
    const key = `${metricType}_${period}`;
    return this.aggregatedStats.get(key) || null;
  }

  // Agregar métricas
  private aggregateMetrics(): void {
    const now = new Date();
    const periods = {
      '1m': 1 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };

    for (const [metricKey, metrics] of this.metrics.entries()) {
      const [type] = metricKey.split('_') as [MetricType];
      
      for (const [period, duration] of Object.entries(periods)) {
        const startTime = new Date(now.getTime() - duration);
        const periodMetrics = metrics.filter(m => m.timestamp >= startTime);
        
        if (periodMetrics.length === 0) continue;
        
        const values = periodMetrics.map(m => m.value).sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        
        const stats: AggregatedStats = {
          metricType: type,
          period: period as any,
          count: values.length,
          min: values[0],
          max: values[values.length - 1],
          avg: sum / values.length,
          p50: this.percentile(values, 50),
          p95: this.percentile(values, 95),
          p99: this.percentile(values, 99),
          timestamp: now
        };
        
        this.aggregatedStats.set(`${type}_${period}`, stats);
      }
    }
  }

  // Calcular percentil
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const index = (p / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return values[lower];
    }
    
    const weight = index - lower;
    return values[lower] * (1 - weight) + values[upper] * weight;
  }

  // Obter saúde do sistema
  public getSystemHealth(): SystemHealth {
    const now = new Date();
    const uptime = Date.now() - this.startTime;
    
    // Verificar componentes
    const components: SystemHealth['components'] = {
      database: this.checkDatabaseHealth(),
      cache: this.checkCacheHealth(),
      memory: this.checkMemoryHealth(),
      cpu: this.checkCpuHealth(),
      storage: this.checkStorageHealth()
    };
    
    // Determinar status geral
    const statuses = Object.values(components).map(c => c.status);
    let overall: HealthStatus = 'healthy';
    
    if (statuses.includes('down')) {
      overall = 'down';
    } else if (statuses.includes('critical')) {
      overall = 'critical';
    } else if (statuses.includes('warning')) {
      overall = 'warning';
    }
    
    return {
      overall,
      components,
      uptime,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // Verificar saúde do banco de dados
  private checkDatabaseHealth(): SystemHealth['components'][string] {
    const dbMetrics = this.getMetrics('database_query', undefined, {
      start: new Date(Date.now() - 5 * 60 * 1000),
      end: new Date()
    });
    
    if (dbMetrics.length === 0) {
      return {
        status: 'warning',
        lastCheck: new Date(),
        message: 'Nenhuma métrica de banco de dados recente'
      };
    }
    
    const avgResponseTime = dbMetrics.reduce((sum, m) => sum + m.value, 0) / dbMetrics.length;
    const errorRate = dbMetrics.filter(m => m.tags.status === 'error').length / dbMetrics.length * 100;
    
    let status: HealthStatus = 'healthy';
    let message = 'Banco de dados funcionando normalmente';
    
    if (errorRate > 10 || avgResponseTime > 5000) {
      status = 'critical';
      message = `Alto tempo de resposta (${avgResponseTime.toFixed(0)}ms) ou taxa de erro (${errorRate.toFixed(1)}%)`;
    } else if (errorRate > 5 || avgResponseTime > 2000) {
      status = 'warning';
      message = `Tempo de resposta elevado (${avgResponseTime.toFixed(0)}ms) ou taxa de erro (${errorRate.toFixed(1)}%)`;
    }
    
    return {
      status,
      lastCheck: new Date(),
      message,
      metrics: {
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      }
    };
  }

  // Verificar saúde do cache
  private checkCacheHealth(): SystemHealth['components'][string] {
    const cacheMetrics = this.getMetrics('cache_hit_rate', undefined, {
      start: new Date(Date.now() - 5 * 60 * 1000),
      end: new Date()
    });
    
    if (cacheMetrics.length === 0) {
      return {
        status: 'warning',
        lastCheck: new Date(),
        message: 'Nenhuma métrica de cache recente'
      };
    }
    
    const avgHitRate = cacheMetrics.reduce((sum, m) => sum + m.value, 0) / cacheMetrics.length;
    
    let status: HealthStatus = 'healthy';
    let message = 'Cache funcionando normalmente';
    
    if (avgHitRate < 50) {
      status = 'critical';
      message = `Taxa de acerto muito baixa (${avgHitRate.toFixed(1)}%)`;
    } else if (avgHitRate < 70) {
      status = 'warning';
      message = `Taxa de acerto baixa (${avgHitRate.toFixed(1)}%)`;
    }
    
    return {
      status,
      lastCheck: new Date(),
      message,
      metrics: {
        hitRate: Math.round(avgHitRate * 100) / 100
      }
    };
  }

  // Verificar saúde da memória
  private checkMemoryHealth(): SystemHealth['components'][string] {
    const memoryMetrics = this.getMetrics('memory_usage', undefined, {
      start: new Date(Date.now() - 5 * 60 * 1000),
      end: new Date()
    });
    
    let memoryUsage = 0;
    if (memoryMetrics.length > 0) {
      memoryUsage = memoryMetrics[0].value; // Mais recente
    } else {
      // Calcular uso atual se não houver métricas
      const used = process.memoryUsage();
      const total = used.heapTotal;
      memoryUsage = (used.heapUsed / total) * 100;
    }
    
    let status: HealthStatus = 'healthy';
    let message = 'Uso de memória normal';
    
    if (memoryUsage > 95) {
      status = 'critical';
      message = `Uso crítico de memória (${memoryUsage.toFixed(1)}%)`;
    } else if (memoryUsage > 80) {
      status = 'warning';
      message = `Uso elevado de memória (${memoryUsage.toFixed(1)}%)`;
    }
    
    return {
      status,
      lastCheck: new Date(),
      message,
      metrics: {
        usage: Math.round(memoryUsage * 100) / 100
      }
    };
  }

  // Verificar saúde da CPU
  private checkCpuHealth(): SystemHealth['components'][string] {
    const cpuMetrics = this.getMetrics('cpu_usage', undefined, {
      start: new Date(Date.now() - 5 * 60 * 1000),
      end: new Date()
    });
    
    let cpuUsage = 0;
    if (cpuMetrics.length > 0) {
      cpuUsage = cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length;
    }
    
    let status: HealthStatus = 'healthy';
    let message = 'Uso de CPU normal';
    
    if (cpuUsage > 90) {
      status = 'critical';
      message = `Uso crítico de CPU (${cpuUsage.toFixed(1)}%)`;
    } else if (cpuUsage > 70) {
      status = 'warning';
      message = `Uso elevado de CPU (${cpuUsage.toFixed(1)}%)`;
    }
    
    return {
      status,
      lastCheck: new Date(),
      message,
      metrics: {
        usage: Math.round(cpuUsage * 100) / 100
      }
    };
  }

  // Verificar saúde do armazenamento
  private checkStorageHealth(): SystemHealth['components'][string] {
    // Implementar verificação de espaço em disco se necessário
    return {
      status: 'healthy',
      lastCheck: new Date(),
      message: 'Armazenamento funcionando normalmente'
    };
  }

  // Iniciar monitoramento de recursos do sistema
  private startSystemMonitoring(): void {
    // Monitorar memória a cada 30 segundos
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      this.recordMetric(
        'memory_usage',
        'heap',
        memoryPercent,
        '%',
        { type: 'heap' },
        {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss
        }
      );
    }, 30000);

    // Monitorar CPU (simulado - implementar com biblioteca específica se necessário)
    setInterval(() => {
      const cpuUsage = Math.random() * 100; // Placeholder
      this.recordMetric('cpu_usage', 'system', cpuUsage, '%');
    }, 30000);
  }

  // Limpeza de dados antigos
  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.retentionPeriod);
    
    // Limpar métricas antigas
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(key, filtered);
    }
    
    // Limpar alertas resolvidos antigos
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.alerts.delete(id);
      }
    }
    
    // Limpar estatísticas antigas
    for (const [key, stats] of this.aggregatedStats.entries()) {
      if (stats.timestamp < cutoff) {
        this.aggregatedStats.delete(key);
      }
    }
  }

  // Notificar alerta (implementar conforme necessário)
  private notifyAlert(alert: Alert): void {
    // Implementar notificações (email, Slack, webhook, etc.)
    logger.warn(`🚨 ALERTA [${alert.severity.toUpperCase()}]: ${alert.message}`, undefined, "WARN");
  }

  // Log de métrica
  private logMetric(metric: Metric): void {
    logger.debug(`📊 MÉTRICA [${metric.type}]: ${metric.name} = ${metric.value}${metric.unit}`, undefined, "DEBUG");
  }

  // Obter threshold crítico
  private getCriticalThreshold(type: MetricType): number {
    const threshold = this.thresholds.get(type);
    return threshold?.critical || Infinity;
  }

  // Gerar ID único
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Configurar threshold
  public setThreshold(config: ThresholdConfig): void {
    this.thresholds.set(config.metricType, config);
  }

  // Obter configurações
  public getConfiguration(): {
    isEnabled: boolean;
    retentionPeriod: number;
    thresholds: ThresholdConfig[];
    metricsCount: number;
    alertsCount: number;
  } {
    return {
      isEnabled: this.isEnabled,
      retentionPeriod: this.retentionPeriod,
      thresholds: Array.from(this.thresholds.values()),
      metricsCount: Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0),
      alertsCount: this.alerts.size
    };
  }

  // Habilitar/desabilitar monitoramento
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    // logSecurityEvent({
    //   action: 'PERFORMANCE_MONITORING_TOGGLED',
    //   details: `Monitoramento de performance ${enabled ? 'habilitado' : 'desabilitado'}`,
    //   severity: SecuritySeverity.MEDIUM
    // });
  }

  // Exportar dados para análise
  public exportData(timeRange?: { start: Date; end: Date }) {
    const data = {
      metrics: {} as Record<string, Metric[]>,
      alerts: Array.from(this.alerts.values()),
      aggregatedStats: Array.from(this.aggregatedStats.values()),
      systemHealth: this.getSystemHealth(),
      exportedAt: new Date().toISOString()
    };
    
    // Filtrar métricas por período se especificado
    for (const [key, metrics] of this.metrics.entries()) {
      let filteredMetrics = metrics;
      
      if (timeRange) {
        filteredMetrics = metrics.filter(m => 
          m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );
      }
      
      data.metrics[key] = filteredMetrics;
    }
    
    return data;
  }

  // Reset do sistema
  public reset(): void {
    this.metrics.clear();
    this.alerts.clear();
    this.aggregatedStats.clear();
    this.lastAlertTime.clear();
    
    // logSecurityEvent({
    //   action: 'PERFORMANCE_MONITOR_RESET',
    //   details: 'Sistema de monitoramento resetado',
    //   severity: SecuritySeverity.MEDIUM
    // });
  }
}

// Instância singleton
export const performanceMonitor = PerformanceMonitor.getInstance();

// Funções de conveniência
export const PerfUtils = {
  // Medir tempo de resposta de API
  measureApiResponse: (endpoint: string, method: string, statusCode: number, responseTime: number) => {
    performanceMonitor.recordMetric(
      'response_time',
      'api_request',
      responseTime,
      'ms',
      { endpoint, method, status: statusCode.toString() }
    );
  },
  
  // Registrar query de banco de dados
  recordDatabaseQuery: (query: string, duration: number, success: boolean) => {
    performanceMonitor.recordMetric(
      'database_query',
      'query_execution',
      duration,
      'ms',
      { 
        type: query.split(' ')[0].toLowerCase(),
        status: success ? 'success' : 'error'
      }
    );
  },
  
  // Registrar hit/miss de cache
  recordCacheHit: (key: string, hit: boolean) => {
    performanceMonitor.recordMetric(
      'cache_hit_rate',
      'cache_access',
      hit ? 100 : 0,
      '%',
      { key, result: hit ? 'hit' : 'miss' }
    );
  },
  
  // Registrar erro
  recordError: (type: string, message: string, severity: SecuritySeverity = SecuritySeverity.MEDIUM) => {
    performanceMonitor.recordMetric(
      'error_rate',
      'application_error',
      1,
      'count',
      { type, severity },
      { message }
    );
  },
  
  // Registrar atividade de usuário
  recordUserActivity: (userId: string, action: string, duration?: number) => {
    performanceMonitor.recordMetric(
      'user_activity',
      action,
      duration || 1,
      duration ? 'ms' : 'count',
      { userId, action }
    );
  },
  
  // Registrar upload de arquivo
  recordFileUpload: (fileName: string, fileSize: number, duration: number, success: boolean) => {
    performanceMonitor.recordMetric(
      'file_upload',
      'upload_performance',
      duration,
      'ms',
      { 
        fileName,
        status: success ? 'success' : 'error'
      },
      { fileSize }
    );
  }
};

// Middleware para Express.js
export const performanceMiddleware = () => {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    
    // Interceptar o final da resposta
    const originalSend = res.send;
    res.send = function(data: any) {
      const responseTime = performance.now() - startTime;
      
      PerfUtils.measureApiResponse(
        req.path,
        req.method,
        res.statusCode,
        responseTime
      );
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};
