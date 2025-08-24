// 📊 Coletor de Métricas do Sistema
// Responsável por coletar métricas de performance do sistema

import { PerformanceMetric, MetricType } from './types';
import { createApiSupabaseClient } from "../supabase/clients/api";

export class MetricsCollector {
  private metricsBuffer: PerformanceMetric[] = [];
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isCollecting = false;

  constructor(private maxBufferSize: number = 1000) {}

  // Iniciar coleta de métricas
  startCollection(): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    
    // Coletar métricas do sistema a cada 30 segundos
    const systemInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
    
    this.collectionIntervals.set('system', systemInterval);
    
    // Flush do buffer a cada 30 segundos
    const flushInterval = setInterval(() => {
      this.flushMetricsBuffer();
    }, 30000);
    
    this.collectionIntervals.set('flush', flushInterval);
  }

  // Parar coleta de métricas
  stopCollection(): void {
    this.isCollecting = false;
    
    this.collectionIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    
    this.collectionIntervals.clear();
    
    // Flush final do buffer
    this.flushMetricsBuffer();
  }

  // Registrar métrica manualmente
  recordMetric(
    type: MetricType,
    value: number,
    unit: string,
    source: string,
    metadata?: Record<string, any>,
    tags?: string[]
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      type,
      value,
      unit,
      timestamp: new Date(),
      source,
      metadata,
      tags
    };

    this.addToBuffer(metric);
  }

  // Coletar métricas do sistema
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Métricas de memória
      const memUsage = process.memoryUsage();
      const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      this.recordMetric(
        MetricType.MEMORY_USAGE,
        memoryPercent,
        '%',
        'system',
        {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss
        },
        ['system', 'memory']
      );

      // Métricas de CPU (simulado - em produção usar biblioteca específica)
      const cpuUsage = this.getCPUUsage();
      this.recordMetric(
        MetricType.CPU_USAGE,
        cpuUsage,
        '%',
        'system',
        undefined,
        ['system', 'cpu']
      );

      // Métricas de uptime
      const uptime = process.uptime();
      this.recordMetric(
        MetricType.RESPONSE_TIME,
        uptime,
        's',
        'system',
        { type: 'uptime' },
        ['system', 'uptime']
      );

    } catch (error) {
      console.error('Erro ao coletar métricas do sistema:', error);
    }
  }

  // Obter uso de CPU (simulado)
  private getCPUUsage(): number {
    // Em produção, usar biblioteca como 'os' ou 'systeminformation'
    // Por enquanto, simular com base na carga do processo
    const loadAvg = process.cpuUsage();
    return Math.min(100, (loadAvg.user + loadAvg.system) / 10000);
  }

  // Adicionar métrica ao buffer
  private addToBuffer(metric: PerformanceMetric): void {
    this.metricsBuffer.push(metric);
    
    // Limitar tamanho do buffer
    if (this.metricsBuffer.length > this.maxBufferSize) {
      this.metricsBuffer = this.metricsBuffer.slice(-this.maxBufferSize);
    }
  }

  // Flush do buffer de métricas para o banco
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const supabase = createApiSupabaseClient();
      
      // Preparar dados para inserção
      const metricsData = this.metricsBuffer.map(metric => ({
        id: metric.id,
        type: metric.type,
        value: metric.value,
        unit: metric.unit,
        timestamp: metric.timestamp.toISOString(),
        source: metric.source,
        metadata: metric.metadata,
        tags: metric.tags
      }));
      
      // Inserir no banco
      const { error } = await supabase
           .from('performance_metrics')
           .insert(metricsData);
      
      if (error) {
        console.error('Erro ao salvar métricas no banco:', error);
        return;
      }
      
      // Limpar buffer após sucesso
      this.metricsBuffer = [];
      
    } catch (error) {
      console.error('Erro ao fazer flush das métricas:', error);
    }
  }

  // Gerar ID único para métrica
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Obter métricas do buffer
  getBufferedMetrics(): PerformanceMetric[] {
    return [...this.metricsBuffer];
  }

  // Obter estatísticas do coletor
  getCollectorStats(): {
    isCollecting: boolean;
    bufferSize: number;
    maxBufferSize: number;
    activeIntervals: number;
  } {
    return {
      isCollecting: this.isCollecting,
      bufferSize: this.metricsBuffer.length,
      maxBufferSize: this.maxBufferSize,
      activeIntervals: this.collectionIntervals.size
    };
  }

  // Limpar buffer
  clearBuffer(): void {
    this.metricsBuffer = [];
  }
}

// Funções utilitárias para coleta de métricas específicas
export const MetricsUtils = {
  // Registrar tempo de resposta de API
  recordApiResponseTime: (
    collector: MetricsCollector,
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string
  ) => {
    collector.recordMetric(
      MetricType.RESPONSE_TIME,
      responseTime,
      'ms',
      endpoint,
      {
        method,
        statusCode,
        userId,
        endpoint
      },
      ['api', 'response-time']
    );
  },

  // Registrar erro de API
  recordApiError: (
    collector: MetricsCollector,
    endpoint: string,
    method: string,
    errorType: string,
    statusCode: number
  ) => {
    collector.recordMetric(
      MetricType.ERROR_RATE,
      1,
      'count',
      endpoint,
      {
        method,
        errorType,
        statusCode,
        endpoint
      },
      ['api', 'error']
    );
  },

  // Registrar tempo de query do banco
  recordDatabaseQuery: (
    collector: MetricsCollector,
    table: string,
    operation: string,
    queryTime: number,
    rowsAffected?: number
  ) => {
    collector.recordMetric(
      MetricType.DATABASE_QUERY_TIME,
      queryTime,
      'ms',
      `database.${table}`,
      {
        table,
        operation,
        rowsAffected
      },
      ['database', 'query']
    );
  },

  // Registrar hit/miss de cache
  recordCacheHit: (
    collector: MetricsCollector,
    cacheKey: string,
    hit: boolean,
    retrievalTime?: number
  ) => {
    collector.recordMetric(
      MetricType.CACHE_HIT_RATE,
      hit ? 1 : 0,
      'boolean',
      'cache',
      {
        cacheKey,
        hit,
        retrievalTime
      },
      ['cache', hit ? 'hit' : 'miss']
    );
  },

  // Registrar usuários concorrentes
  recordConcurrentUsers: (
    collector: MetricsCollector,
    count: number,
    source: string = 'websocket'
  ) => {
    collector.recordMetric(
      MetricType.CONCURRENT_USERS,
      count,
      'count',
      source,
      { source },
      ['users', 'concurrent']
    );
  }
};