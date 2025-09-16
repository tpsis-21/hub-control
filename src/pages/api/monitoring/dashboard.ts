/**
 * API para dashboard de monitoramento em produção
 * Centraliza informações de logs, métricas, alertas e status do sistema
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../lib/logger';
import { alertManager } from '../../../lib/alerts';
import { supabase } from '../../../lib/supabase';

export interface MonitoringDashboard {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      usage: number;
    };
    cpu: {
      usage: any;
    };
    disk: {
      used: number;
      total: number;
      usage: number;
    };
  };
  application: {
    version: string;
    environment: string;
    requests: {
      total: number;
      errors: number;
      errorRate: number;
      averageResponseTime: number;
    };
    database: {
      status: 'connected' | 'disconnected' | 'error';
      connections: number;
      averageQueryTime: number;
      slowQueries: number;
    };
    cache: {
      status: 'connected' | 'disconnected' | 'error';
      hitRate: number;
      memoryUsage: number;
    };
  };
  integrations: {
    bpix: {
      status: 'healthy' | 'warning' | 'error';
      payments: {
        total: number;
        successful: number;
        failed: number;
        pending: number;
      };
      webhooks: {
        received: number;
        processed: number;
        failed: number;
      };
      apiCalls: {
        total: number;
        successful: number;
        failed: number;
        averageResponseTime: number;
      };
    };
    supabase: {
      status: 'healthy' | 'warning' | 'error';
      connections: number;
      queries: {
        total: number;
        successful: number;
        failed: number;
      };
    };
  };
  alerts: {
    active: number;
    acknowledged: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    recent: any[];
  };
  logs: {
    recent: any[];
    errors: {
      last24h: number;
      lastHour: number;
    };
    warnings: {
      last24h: number;
      lastHour: number;
    };
  };
  performance: {
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: {
      requestsPerSecond: number;
      requestsPerMinute: number;
    };
    errors: {
      rate: number;
      count: number;
    };
  };
}

class MonitoringService {
  private static instance: MonitoringService;
  private metricsCache: any = {};
  private lastUpdate: number = 0;
  private cacheTimeout: number = 30000; // 30 segundos

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async getDashboardData(): Promise<MonitoringDashboard> {
    const now = Date.now();
    
    // Usar cache se ainda válido
    if (this.metricsCache.data && (now - this.lastUpdate) < this.cacheTimeout) {
      return this.metricsCache.data;
    }

    try {
      const [systemMetrics, appMetrics, integrationMetrics, alertsData, logsData, performanceData] = await Promise.all([
        this.getSystemMetrics(),
        this.getApplicationMetrics(),
        this.getIntegrationMetrics(),
        this.getAlertsData(),
        this.getLogsData(),
        this.getPerformanceData(),
      ]);

      const dashboard: MonitoringDashboard = {
        timestamp: new Date().toISOString(),
        status: this.calculateOverallStatus(systemMetrics, appMetrics, integrationMetrics, alertsData),
        system: systemMetrics,
        application: appMetrics,
        integrations: integrationMetrics,
        alerts: alertsData,
        logs: logsData,
        performance: performanceData,
      };

      // Atualizar cache
      this.metricsCache.data = dashboard;
      this.lastUpdate = now;

      return dashboard;
    } catch (error) {
      logger.error('Erro ao obter dados do dashboard', error as Error);
      throw error;
    }
  }

  private async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      cpu: {
        usage: process.cpuUsage(),
      },
      disk: {
        used: 0, // Implementar se necessário
        total: 0,
        usage: 0,
      },
    };
  }

  private async getApplicationMetrics() {
    // Simular métricas da aplicação - integrar com sistema real
    const totalRequests = await this.getRequestCount();
    const errorRequests = await this.getErrorRequestCount();
    
    return {
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      requests: {
        total: totalRequests,
        errors: errorRequests,
        errorRate: totalRequests > 0 ? Math.round((errorRequests / totalRequests) * 100 * 100) / 100 : 0,
        averageResponseTime: await this.getAverageResponseTime(),
      },
      database: {
        status: await this.getDatabaseStatus(),
        connections: await this.getDatabaseConnections(),
        averageQueryTime: await this.getAverageQueryTime(),
        slowQueries: await this.getSlowQueriesCount(),
      },
      cache: {
        status: await this.getCacheStatus(),
        hitRate: await this.getCacheHitRate(),
        memoryUsage: await this.getCacheMemoryUsage(),
      },
    };
  }

  private async getIntegrationMetrics() {
    return {
      bpix: await this.getBpixMetrics(),
      supabase: await this.getSupabaseMetrics(),
    };
  }

  private async getBpixMetrics() {
    try {
      // TODO: Implementar quando a tabela bpix_payments for criada
      return this.getDefaultBpixMetrics('healthy');
    } catch (error) {
      logger.error('Erro ao obter métricas BPIX', error as Error);
      return this.getDefaultBpixMetrics('error');
    }
  }

  private getDefaultBpixMetrics(status: 'healthy' | 'warning' | 'error') {
    return {
      status,
      payments: { total: 0, successful: 0, failed: 0, pending: 0 },
      webhooks: { received: 0, processed: 0, failed: 0 },
      apiCalls: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
    };
  }

  private async getSupabaseMetrics() {
    try {
      // Testar conexão com Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      return {
        status: (error ? 'error' : 'healthy') as 'healthy' | 'warning' | 'error',
        connections: 1, // Supabase gerencia conexões automaticamente
        queries: {
          total: await this.getSupabaseQueryCount(),
          successful: await this.getSupabaseSuccessfulQueries(),
          failed: await this.getSupabaseFailedQueries(),
        },
      };
    } catch (error) {
      return {
        status: 'error' as const,
        connections: 0,
        queries: { total: 0, successful: 0, failed: 0 },
      };
    }
  }

  private async getAlertsData() {
    const activeAlerts = alertManager.getActiveAlerts();
    const alertHistory = alertManager.getAlertHistory(50);

    const active = activeAlerts.filter(a => a.status === 'active').length;
    const acknowledged = activeAlerts.filter(a => a.status === 'acknowledged').length;
    const resolved = alertHistory.filter(a => a.status === 'resolved').length;

    const critical = activeAlerts.filter(a => a.severity === 'critical').length;
    const high = activeAlerts.filter(a => a.severity === 'high').length;
    const medium = activeAlerts.filter(a => a.severity === 'medium').length;
    const low = activeAlerts.filter(a => a.severity === 'low').length;

    return {
      active,
      acknowledged,
      resolved,
      critical,
      high,
      medium,
      low,
      recent: alertHistory.slice(-10),
    };
  }

  private async getLogsData() {
    // Simular dados de logs - integrar com sistema real
    return {
      recent: [], // Últimos 20 logs
      errors: {
        last24h: Math.floor(Math.random() * 50),
        lastHour: Math.floor(Math.random() * 5),
      },
      warnings: {
        last24h: Math.floor(Math.random() * 100),
        lastHour: Math.floor(Math.random() * 10),
      },
    };
  }

  private async getPerformanceData() {
    return {
      responseTime: {
        p50: Math.floor(Math.random() * 200) + 100,
        p95: Math.floor(Math.random() * 500) + 300,
        p99: Math.floor(Math.random() * 1000) + 800,
      },
      throughput: {
        requestsPerSecond: Math.floor(Math.random() * 100) + 10,
        requestsPerMinute: Math.floor(Math.random() * 6000) + 600,
      },
      errors: {
        rate: Math.random() * 5,
        count: Math.floor(Math.random() * 20),
      },
    };
  }

  private calculateOverallStatus(system: any, app: any, integrations: any, alerts: any): 'healthy' | 'warning' | 'critical' {
    // Verificar alertas críticos
    if (alerts.critical > 0) return 'critical';
    
    // Verificar uso de memória alto
    if (system.memory.usage > 90) return 'critical';
    
    // Verificar taxa de erro alta
    if (app.requests.errorRate > 10) return 'critical';
    
    // Verificar problemas nas integrações
    if (integrations.bpix.status === 'error' || integrations.supabase.status === 'error') {
      return 'critical';
    }
    
    // Verificar alertas de alta prioridade
    if (alerts.high > 0) return 'warning';
    
    // Verificar uso de memória moderado
    if (system.memory.usage > 80) return 'warning';
    
    // Verificar taxa de erro moderada
    if (app.requests.errorRate > 5) return 'warning';
    
    // Verificar problemas menores nas integrações
    if (integrations.bpix.status === 'warning' || integrations.supabase.status === 'warning') {
      return 'warning';
    }
    
    return 'healthy';
  }

  // Métodos auxiliares para obter métricas (implementar integração real)
  private async getRequestCount(): Promise<number> {
    return Math.floor(Math.random() * 10000) + 1000;
  }

  private async getErrorRequestCount(): Promise<number> {
    return Math.floor(Math.random() * 100);
  }

  private async getAverageResponseTime(): Promise<number> {
    return Math.floor(Math.random() * 300) + 100;
  }

  private async getDatabaseStatus(): Promise<'connected' | 'disconnected' | 'error'> {
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      return error ? 'error' : 'connected';
    } catch {
      return 'disconnected';
    }
  }

  private async getDatabaseConnections(): Promise<number> {
    return Math.floor(Math.random() * 20) + 5;
  }

  private async getAverageQueryTime(): Promise<number> {
    return Math.floor(Math.random() * 100) + 10;
  }

  private async getSlowQueriesCount(): Promise<number> {
    return Math.floor(Math.random() * 5);
  }

  private async getCacheStatus(): Promise<'connected' | 'disconnected' | 'error'> {
    return 'connected'; // Implementar verificação real
  }

  private async getCacheHitRate(): Promise<number> {
    return Math.floor(Math.random() * 30) + 70;
  }

  private async getCacheMemoryUsage(): Promise<number> {
    return Math.floor(Math.random() * 50) + 20;
  }

  // Métodos BPIX
  private async getBpixWebhookCount(): Promise<number> {
    return Math.floor(Math.random() * 100);
  }

  private async getBpixWebhookProcessedCount(): Promise<number> {
    return Math.floor(Math.random() * 95);
  }

  private async getBpixWebhookFailedCount(): Promise<number> {
    return Math.floor(Math.random() * 5);
  }

  private async getBpixApiCallCount(): Promise<number> {
    return Math.floor(Math.random() * 200);
  }

  private async getBpixApiSuccessCount(): Promise<number> {
    return Math.floor(Math.random() * 190);
  }

  private async getBpixApiFailedCount(): Promise<number> {
    return Math.floor(Math.random() * 10);
  }

  private async getBpixApiResponseTime(): Promise<number> {
    return Math.floor(Math.random() * 500) + 200;
  }

  // Métodos Supabase
  private async getSupabaseQueryCount(): Promise<number> {
    return Math.floor(Math.random() * 1000);
  }

  private async getSupabaseSuccessfulQueries(): Promise<number> {
    return Math.floor(Math.random() * 950);
  }

  private async getSupabaseFailedQueries(): Promise<number> {
    return Math.floor(Math.random() * 50);
  }
}

const monitoringService = MonitoringService.getInstance();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const requestLogger = logger.withContext({
      requestId: Math.random().toString(36).substring(7),
      ip: (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
    });

    requestLogger.info('Solicitação de dashboard de monitoramento');

    const dashboard = await monitoringService.getDashboardData();

    requestLogger.info('Dashboard de monitoramento gerado com sucesso', {
      status: dashboard.status,
      activeAlerts: dashboard.alerts.active,
      systemMemoryUsage: dashboard.system.memory.usage,
    });

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Erro ao gerar dashboard de monitoramento', error as Error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao obter dados de monitoramento',
    });
  }
}