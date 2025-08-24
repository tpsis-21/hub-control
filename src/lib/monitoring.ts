/**
 * Sistema de Monitoramento para Hub Control
 * 
 * Este módulo fornece funcionalidades para monitorar o uso de dados reais vs simulados,
 * performance da aplicação e alertas do sistema.
 */

import { LoggerService } from '../services/logger.service';

// Tipos para métricas de monitoramento
interface DataSourceMetrics {
  real_data_requests: number;
  mock_data_requests: number;
  cache_hits: number;
  cache_misses: number;
  total_requests: number;
  last_real_data_access: Date | null;
  last_mock_data_access: Date | null;
}

interface PerformanceMetrics {
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  total_response_times: number[];
  error_count: number;
  success_count: number;
}

interface SystemAlert {
  id: string;
  type: 'WARNING' | 'ERROR' | 'INFO';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

/**
 * Classe principal para monitoramento do sistema
 */
class SystemMonitor {
  private dataMetrics: DataSourceMetrics;
  private performanceMetrics: PerformanceMetrics;
  private alerts: SystemAlert[];
  private readonly MAX_ALERTS = 100;
  private readonly MAX_RESPONSE_TIMES = 1000;

  constructor() {
    this.dataMetrics = {
      real_data_requests: 0,
      mock_data_requests: 0,
      cache_hits: 0,
      cache_misses: 0,
      total_requests: 0,
      last_real_data_access: null,
      last_mock_data_access: null
    };

    this.performanceMetrics = {
      avg_response_time: 0,
      max_response_time: 0,
      min_response_time: Infinity,
      total_response_times: [],
      error_count: 0,
      success_count: 0
    };

    this.alerts = [];
  }

  /**
   * Registra o uso de dados reais
   */
  recordRealDataUsage(endpoint: string, responseTime?: number): void {
    this.dataMetrics.real_data_requests++;
    this.dataMetrics.total_requests++;
    this.dataMetrics.last_real_data_access = new Date();

    if (responseTime) {
      this.recordPerformance(responseTime, true);
    }

    LoggerService.info(
      'Dados reais utilizados',
      'monitoring',
      { endpoint, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Registra o uso de dados simulados
   */
  recordMockDataUsage(endpoint: string, responseTime?: number): void {
    this.dataMetrics.mock_data_requests++;
    this.dataMetrics.total_requests++;
    this.dataMetrics.last_mock_data_access = new Date();

    if (responseTime) {
      this.recordPerformance(responseTime, true);
    }

    // Criar alerta se muitos dados simulados estão sendo usados
    if (this.shouldAlertMockUsage()) {
      this.createAlert(
        'WARNING',
        `Alto uso de dados simulados detectado. Endpoint: ${endpoint}`,
        { endpoint, mock_percentage: this.getMockDataPercentage() }
      );
    }

    LoggerService.info(
      'Dados simulados utilizados',
      'monitoring',
      { endpoint, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Registra hit ou miss do cache
   */
  recordCacheUsage(hit: boolean, endpoint: string): void {
    if (hit) {
      this.dataMetrics.cache_hits++;
    } else {
      this.dataMetrics.cache_misses++;
    }

    LoggerService.info(
      `Cache ${hit ? 'hit' : 'miss'}`,
      'monitoring',
      { endpoint, hit }
    );
  }

  /**
   * Registra métricas de performance
   */
  recordPerformance(responseTime: number, success: boolean): void {
    if (success) {
      this.performanceMetrics.success_count++;
    } else {
      this.performanceMetrics.error_count++;
    }

    // Atualizar métricas de tempo de resposta
    this.performanceMetrics.total_response_times.push(responseTime);
    
    // Manter apenas os últimos N tempos de resposta
    if (this.performanceMetrics.total_response_times.length > this.MAX_RESPONSE_TIMES) {
      this.performanceMetrics.total_response_times.shift();
    }

    // Recalcular métricas
    this.updatePerformanceMetrics();

    // Criar alerta para performance ruim
    if (responseTime > 5000) { // 5 segundos
      this.createAlert(
        'WARNING',
        `Tempo de resposta alto detectado: ${responseTime}ms`,
        { response_time: responseTime }
      );
    }
  }

  /**
   * Cria um novo alerta do sistema
   */
  createAlert(type: SystemAlert['type'], message: string, metadata?: Record<string, any>): SystemAlert {
    const alert: SystemAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.unshift(alert);

    // Manter apenas os últimos N alertas
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    LoggerService.info(
      `Alerta criado: ${type}`,
      'monitoring',
      { alert_id: alert.id, message, metadata }
    );
    
    return alert;
  }

  /**
   * Resolve um alerta
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      LoggerService.info(
        'Alerta resolvido',
        'monitoring',
        { alert_id: alertId }
      );
      return true;
    }
    return false;
  }

  /**
   * Obtém todas as métricas do sistema
   */
  getMetrics() {
    return {
      data_source: {
        ...this.dataMetrics,
        mock_percentage: this.getMockDataPercentage(),
        cache_hit_rate: this.getCacheHitRate()
      },
      performance: this.performanceMetrics,
      alerts: {
        total: this.alerts.length,
        unresolved: this.alerts.filter(a => !a.resolved).length,
        by_type: {
          ERROR: this.alerts.filter(a => a.type === 'ERROR' && !a.resolved).length,
          WARNING: this.alerts.filter(a => a.type === 'WARNING' && !a.resolved).length,
          INFO: this.alerts.filter(a => a.type === 'INFO' && !a.resolved).length
        }
      },
      system_health: this.getSystemHealthScore()
    };
  }

  /**
   * Obtém métricas de fonte de dados
   */
  getDataSourceMetrics() {
    return {
      realDataUsage: this.dataMetrics.real_data_requests,
      mockDataUsage: this.dataMetrics.mock_data_requests,
      totalRequests: this.dataMetrics.total_requests,
      lastRealDataAccess: this.dataMetrics.last_real_data_access,
      lastMockDataAccess: this.dataMetrics.last_mock_data_access,
      mockPercentage: this.getMockDataPercentage(),
      endpointUsage: {} // TODO: Implementar rastreamento por endpoint
    };
  }

  /**
   * Obtém métricas de performance
   */
  getPerformanceMetrics() {
    return {
      averageResponseTime: this.performanceMetrics.avg_response_time,
      maxResponseTime: this.performanceMetrics.max_response_time,
      minResponseTime: this.performanceMetrics.min_response_time === Infinity ? 0 : this.performanceMetrics.min_response_time,
      cacheHits: this.dataMetrics.cache_hits,
      cacheMisses: this.dataMetrics.cache_misses,
      errorCount: this.performanceMetrics.error_count,
      successCount: this.performanceMetrics.success_count,
      totalRequests: this.performanceMetrics.error_count + this.performanceMetrics.success_count
    };
  }

  /**
   * Obtém alertas do sistema
   */
  getAlerts() {
    return this.alerts.map(alert => ({
      ...alert,
      level: alert.type // Mapear 'type' para 'level' para compatibilidade
    }));
  }

  /**
   * Limpa métricas de fonte de dados
   */
  clearDataSourceMetrics(): void {
    this.dataMetrics = {
      real_data_requests: 0,
      mock_data_requests: 0,
      cache_hits: 0,
      cache_misses: 0,
      total_requests: 0,
      last_real_data_access: null,
      last_mock_data_access: null
    };
    LoggerService.info('Métricas de fonte de dados limpas', 'monitoring');
  }

  /**
   * Limpa métricas de performance
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = {
      avg_response_time: 0,
      max_response_time: 0,
      min_response_time: Infinity,
      total_response_times: [],
      error_count: 0,
      success_count: 0
    };
    LoggerService.info('Métricas de performance limpas', 'monitoring');
  }

  /**
   * Limpa alertas
   */
  clearAlerts(): void {
    this.alerts = [];
    LoggerService.info('Alertas limpos', 'monitoring');
  }

  /**
   * Obtém alertas ativos (não resolvidos)
   */
  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Obtém todos os alertas
   */
  getAllAlerts(): SystemAlert[] {
    return [...this.alerts];
  }

  /**
   * Reseta todas as métricas
   */
  resetMetrics(): void {
    this.dataMetrics = {
      real_data_requests: 0,
      mock_data_requests: 0,
      cache_hits: 0,
      cache_misses: 0,
      total_requests: 0,
      last_real_data_access: null,
      last_mock_data_access: null
    };

    this.performanceMetrics = {
      avg_response_time: 0,
      max_response_time: 0,
      min_response_time: Infinity,
      total_response_times: [],
      error_count: 0,
      success_count: 0
    };

    LoggerService.info('Métricas resetadas', 'monitoring');
  }

  // Métodos privados
  private getMockDataPercentage(): number {
    if (this.dataMetrics.total_requests === 0) return 0;
    return Math.round((this.dataMetrics.mock_data_requests / this.dataMetrics.total_requests) * 100);
  }

  private getCacheHitRate(): number {
    const totalCacheRequests = this.dataMetrics.cache_hits + this.dataMetrics.cache_misses;
    if (totalCacheRequests === 0) return 0;
    return Math.round((this.dataMetrics.cache_hits / totalCacheRequests) * 100);
  }

  private shouldAlertMockUsage(): boolean {
    const mockPercentage = this.getMockDataPercentage();
    return mockPercentage > 80 && this.dataMetrics.total_requests > 10;
  }

  private updatePerformanceMetrics(): void {
    const times = this.performanceMetrics.total_response_times;
    if (times.length === 0) return;

    this.performanceMetrics.avg_response_time = Math.round(
      times.reduce((sum, time) => sum + time, 0) / times.length
    );
    this.performanceMetrics.max_response_time = Math.max(...times);
    this.performanceMetrics.min_response_time = Math.min(...times);
  }

  private getSystemHealthScore(): number {
    let score = 100;

    // Penalizar por uso excessivo de dados simulados
    const mockPercentage = this.getMockDataPercentage();
    if (mockPercentage > 50) score -= (mockPercentage - 50);

    // Penalizar por baixa taxa de cache hit
    const cacheHitRate = this.getCacheHitRate();
    if (cacheHitRate < 70) score -= (70 - cacheHitRate) / 2;

    // Penalizar por muitos erros
    const totalRequests = this.performanceMetrics.success_count + this.performanceMetrics.error_count;
    if (totalRequests > 0) {
      const errorRate = (this.performanceMetrics.error_count / totalRequests) * 100;
      if (errorRate > 5) score -= errorRate * 2;
    }

    // Penalizar por alertas não resolvidos
    const unresolvedAlerts = this.alerts.filter(a => !a.resolved).length;
    score -= unresolvedAlerts * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

// Instância singleton do monitor
const globalForMonitor = globalThis as unknown as {
  systemMonitor: SystemMonitor | undefined;
};

export const systemMonitor = globalForMonitor.systemMonitor ?? new SystemMonitor();

if (process.env.NODE_ENV !== 'production') {
  globalForMonitor.systemMonitor = systemMonitor;
}

/**
 * Decorator para monitorar automaticamente funções
 */
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    let success = false;
    let isRealData = false;

    try {
      const result = await fn(...args);
      success = true;
      
      // Detectar se são dados reais ou simulados
      if (result && typeof result === 'object') {
        if (result.source === 'database') {
          isRealData = true;
        } else if (result.source === 'mock') {
          isRealData = false;
        }
      }

      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      
      // Registrar métricas
      systemMonitor.recordPerformance(responseTime, success);
      
      if (success) {
        if (isRealData) {
          systemMonitor.recordRealDataUsage(endpoint, responseTime);
        } else {
          systemMonitor.recordMockDataUsage(endpoint, responseTime);
        }
      }
    }
  }) as T;
}

/**
 * Utilitários para monitoramento
 */
export const MonitoringUtils = {
  /**
   * Registra uso de cache
   */
  recordCache: (hit: boolean, endpoint: string) => {
    systemMonitor.recordCacheUsage(hit, endpoint);
  },

  /**
   * Cria alerta personalizado
   */
  createAlert: (type: SystemAlert['type'], message: string, metadata?: Record<string, any>) => {
    return systemMonitor.createAlert(type, message, metadata);
  },

  /**
   * Obtém resumo rápido do sistema
   */
  getHealthSummary: () => {
    const metrics = systemMonitor.getMetrics();
    return {
      health_score: metrics.system_health,
      mock_data_percentage: metrics.data_source.mock_percentage,
      cache_hit_rate: metrics.data_source.cache_hit_rate,
      active_alerts: metrics.alerts.unresolved,
      avg_response_time: metrics.performance.avg_response_time
    };
  }
};