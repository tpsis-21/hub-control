// 📊 Sistema de Monitoramento de Performance - Módulo Principal
// Integra todos os componentes do sistema de performance

import { MetricsCollector, MetricsUtils } from './metrics-collector';
import { AlertSystem } from './alert-system';
import { DEFAULT_MONITORING_CONFIG, getEnvironmentConfig, PERFORMANCE_CONSTANTS } from './config';
import {
  PerformanceMetric,
  AlertEvent,
  MonitoringConfig,
  MetricType,
  AlertSeverity,
  PerformanceReport,
  OptimizationRecommendation
} from './types';
import { SecuritySeverity } from '../security-monitoring';
import { logger } from '@/utils/production-logger'

// Removido re-export do hook client-side para evitar dependência em módulos server
// export { usePerformanceTracking } from '../performance-monitoring';

export class PerformanceMonitoringSystem {
  private config: MonitoringConfig;
  private metricsCollector: MetricsCollector;
  private alertSystem: AlertSystem;
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<MonitoringConfig> = {}) {
    // Usar configuração do ambiente se não especificada
    const envConfig = getEnvironmentConfig();
    this.config = { ...envConfig, ...config };
    
    // Inicializar componentes
    this.metricsCollector = new MetricsCollector(
      PERFORMANCE_CONSTANTS.MAX_METRICS_BUFFER_SIZE
    );
    
    this.alertSystem = new AlertSystem(
      this.config.thresholds,
      PERFORMANCE_CONSTANTS.MAX_ALERTS_HISTORY
    );
  }

  // Iniciar sistema de monitoramento
  start(): void {
    if (!this.config.enabled || this.isRunning) return;
    
    this.isRunning = true;
    
    // Iniciar coleta de métricas
    this.metricsCollector.startCollection();
    
    // Iniciar verificação de alertas
    this.startAlertChecking();
    
    logger.debug('🚀 Sistema de Monitoramento de Performance iniciado', undefined, "DEBUG");
  }

  // Parar sistema de monitoramento
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Parar coleta de métricas
    this.metricsCollector.stopCollection();
    
    // Parar verificação de alertas
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    logger.debug('⏹️ Sistema de Monitoramento de Performance parado', undefined, "DEBUG");
  }

  // Iniciar verificação periódica de alertas
  private startAlertChecking(): void {
    this.checkInterval = setInterval(() => {
      this.checkForAlerts();
    }, PERFORMANCE_CONSTANTS.ALERT_CHECK_INTERVAL);
  }

  // Verificar alertas baseados nas métricas coletadas
  private checkForAlerts(): void {
    const metrics = this.metricsCollector.getBufferedMetrics();
    const newAlerts = this.alertSystem.checkMetrics(metrics);
    
    // Notificar novos alertas se necessário
    newAlerts.forEach(alert => {
      this.notifyAlert(alert);
    });
  }

  // Notificar alerta (placeholder - implementar conforme necessário)
  private notifyAlert(alert: AlertEvent): void {
    logger.warn(`🚨 ALERTA [${alert.severity.toUpperCase()}]: ${alert.message}`, undefined, "WARN");
    
    // Aqui você pode implementar notificações por:
    // - Email
    // - Slack
    // - Webhook
    // - SMS
    // etc.
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
    this.metricsCollector.recordMetric(type, value, unit, source, metadata, tags);
  }

  // Obter métricas recentes
  getRecentMetrics(limit?: number): PerformanceMetric[] {
    const metrics = this.metricsCollector.getBufferedMetrics();
    return limit ? metrics.slice(-limit) : metrics;
  }

  // Obter alertas ativos
  getActiveAlerts(): AlertEvent[] {
    return this.alertSystem.getActiveAlerts();
  }

  // Obter histórico de alertas
  getAlertsHistory(limit?: number): AlertEvent[] {
    return this.alertSystem.getAlertsHistory(limit);
  }

  // Resolver alerta
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    return this.alertSystem.resolveAlert(alertId, resolvedBy);
  }

  // Obter estatísticas do sistema
  getSystemStats(): {
    isRunning: boolean;
    config: MonitoringConfig;
    collector: ReturnType<MetricsCollector['getCollectorStats']>;
    alerts: ReturnType<AlertSystem['getAlertStats']>;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      collector: this.metricsCollector.getCollectorStats(),
      alerts: this.alertSystem.getAlertStats()
    };
  }

  // Gerar relatório de performance
  generateReport(startDate: Date, endDate: Date): PerformanceReport {
    const metrics = this.metricsCollector.getBufferedMetrics()
      .filter(m => m.timestamp >= startDate && m.timestamp <= endDate);
    
    const alerts = this.alertSystem.getAlertsHistory()
      .filter(a => a.timestamp >= startDate && a.timestamp <= endDate);

    // Calcular estatísticas resumidas
    const responseTimeMetrics = metrics.filter(m => m.type === MetricType.RESPONSE_TIME);
    const errorMetrics = metrics.filter(m => m.type === MetricType.ERROR_RATE);
    const throughputMetrics = metrics.filter(m => m.type === MetricType.THROUGHPUT);
    const userMetrics = metrics.filter(m => m.type === MetricType.CONCURRENT_USERS);

    const summary = {
      totalRequests: responseTimeMetrics.length,
      averageResponseTime: this.calculateAverage(responseTimeMetrics),
      errorRate: this.calculateAverage(errorMetrics),
      throughput: this.calculateAverage(throughputMetrics),
      peakConcurrentUsers: Math.max(...userMetrics.map(m => m.value), 0)
    };

    // Analisar tendências
    const trends = this.analyzeTrends(metrics);

    // Identificar gargalos
    const bottlenecks = this.identifyBottlenecks(metrics);

    // Gerar recomendações
    const recommendations = this.generateRecommendations(metrics, alerts);

    return {
      id: `report_${Date.now()}`,
      period: { start: startDate, end: endDate },
      summary,
      trends,
      bottlenecks,
      optimizations: {
        applied: [], // Implementar quando sistema de otimização estiver pronto
        recommended: recommendations
      },
      alerts
    };
  }

  // Calcular média de métricas
  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  // Analisar tendências das métricas
  private analyzeTrends(metrics: PerformanceMetric[]): PerformanceReport['trends'] {
    const trends: PerformanceReport['trends'] = [];
    
    Object.values(MetricType).forEach(metricType => {
      const metricData = metrics.filter(m => m.type === metricType);
      if (metricData.length < 2) return;

      // Dividir em duas metades para comparar
      const midPoint = Math.floor(metricData.length / 2);
      const firstHalf = metricData.slice(0, midPoint);
      const secondHalf = metricData.slice(midPoint);

      const firstAvg = this.calculateAverage(firstHalf);
      const secondAvg = this.calculateAverage(secondHalf);

      if (firstAvg === 0) return;

      const changePercentage = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      let trend: 'improving' | 'stable' | 'degrading' = 'stable';
      if (Math.abs(changePercentage) > 5) {
        // Para métricas onde menor é melhor (response time, error rate)
        const lowerIsBetter = [
          MetricType.RESPONSE_TIME,
          MetricType.ERROR_RATE,
          MetricType.DATABASE_QUERY_TIME,
          MetricType.API_LATENCY
        ].includes(metricType);
        
        if (lowerIsBetter) {
          trend = changePercentage < 0 ? 'improving' : 'degrading';
        } else {
          trend = changePercentage > 0 ? 'improving' : 'degrading';
        }
      }

      trends.push({
        metricType,
        trend,
        changePercentage: Math.round(changePercentage * 100) / 100
      });
    });

    return trends;
  }

  // Identificar gargalos do sistema
  private identifyBottlenecks(metrics: PerformanceMetric[]): PerformanceReport['bottlenecks'] {
    const bottlenecks: PerformanceReport['bottlenecks'] = [];

    // Analisar tempo de resposta por fonte
    const responseTimeBySource = new Map<string, number[]>();
    metrics
      .filter(m => m.type === MetricType.RESPONSE_TIME)
      .forEach(m => {
        if (!responseTimeBySource.has(m.source)) {
          responseTimeBySource.set(m.source, []);
        }
        responseTimeBySource.get(m.source)!.push(m.value);
      });

    responseTimeBySource.forEach((times, source) => {
      const avgTime = this.calculateAverage(times.map(t => ({ value: t } as PerformanceMetric)));
      if (avgTime > 2000) { // > 2s
        bottlenecks.push({
          source,
          issue: `Tempo de resposta alto: ${Math.round(avgTime)}ms`,
          impact: avgTime > 5000 ? 'high' : 'medium',
          recommendation: 'Otimizar queries, implementar cache ou revisar lógica de negócio'
        });
      }
    });

    return bottlenecks;
  }

  // Gerar recomendações de otimização
  private generateRecommendations(
    metrics: PerformanceMetric[],
    alerts: AlertEvent[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Recomendações baseadas em alertas críticos
    const criticalAlerts = alerts.filter(a => a.severity === AlertSeverity.CRITICAL);
    if (criticalAlerts.length > 0) {
      recommendations.push({
        id: `rec_critical_${Date.now()}`,
        priority: SecuritySeverity.HIGH,
        category: 'Alertas Críticos',
        title: 'Resolver Alertas Críticos',
        description: `${criticalAlerts.length} alertas críticos detectados`,
        estimatedImpact: 'Melhoria significativa na estabilidade',
        implementationEffort: 'high',
        steps: [
          'Priorizar investigação dos alertas críticos e seus impactos',
          'Abrir incidentes para os serviços afetados e definir responsáveis',
          'Aplicar mitigação imediata (rollback/feature flag/scale) e monitorar',
        ],
      });
    }

    return recommendations;
  }
}

// Instância global
export const performanceMonitoringSystem = new PerformanceMonitoringSystem(DEFAULT_MONITORING_CONFIG);

// Utilitários de compatibilidade com API antiga
export const PerformanceUtils = {
  // Iniciar monitoramento (compat: startMonitoring)
  startMonitoring: (): void => {
    try {
      performanceMonitoringSystem.start();
    } catch (e) {
      console.error('PerformanceUtils.startMonitoring: erro ao iniciar monitoramento', e);
    }
  },
  
  // Parar monitoramento (compat: stopMonitoring)
  stopMonitoring: (): void => {
    try {
      performanceMonitoringSystem.stop();
    } catch (e) {
      console.error('PerformanceUtils.stopMonitoring: erro ao parar monitoramento', e);
    }
  },

  // Registrar tempo de resposta (compat: recordResponseTime)
  recordResponseTime: (
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string
  ): void => {
    try {
      performanceMonitoringSystem.recordMetric(
        MetricType.RESPONSE_TIME,
        responseTime,
        'ms',
        endpoint,
        { method, statusCode, userId, endpoint },
        ['api', 'response-time']
      );
    } catch (e) {
      console.error('PerformanceUtils.recordResponseTime: erro ao registrar métrica', e);
    }
  },

  // Obter status do sistema (compat: getSystemStatus)
  getSystemStatus: () => {
    try {
      return performanceMonitoringSystem.getSystemStats();
    } catch (e) {
      console.error('PerformanceUtils.getSystemStatus: erro ao obter status', e);
      return {
        isRunning: false,
        config: DEFAULT_MONITORING_CONFIG,
        collector: { isCollecting: false, bufferSize: 0, maxBufferSize: 0, activeIntervals: 0 },
        alerts: { activeAlerts: 0, totalAlerts: 0, resolvedAlerts: 0 }
      } as any;
    }
  }
};

export type { PerformanceMetric, AlertEvent, MonitoringConfig, MetricType, AlertSeverity, PerformanceReport };
export { MetricsUtils };
