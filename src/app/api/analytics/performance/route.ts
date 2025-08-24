/**
 * API Route para Analytics de Performance
 * 
 * Recebe e processa métricas de performance da aplicação,
 * incluindo Core Web Vitals, performance de APIs e erros.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUnifiedMiddleware } from '@/middleware/unified-middleware';

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const PerformanceMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  timestamp: z.number(),
  url: z.string().url(),
  userAgent: z.string(),
});

const APIMetricSchema = z.object({
  endpoint: z.string(),
  method: z.string(),
  duration: z.number(),
  status: z.number(),
  timestamp: z.number(),
  success: z.boolean(),
});

const ErrorMetricSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  url: z.string().url(),
  timestamp: z.number(),
  userAgent: z.string(),
  userId: z.string().optional(),
});

const AnalyticsPayloadSchema = z.object({
  performance: z.array(PerformanceMetricSchema),
  api: z.array(APIMetricSchema),
  errors: z.array(ErrorMetricSchema),
  timestamp: z.number(),
  url: z.string().url(),
  userAgent: z.string(),
});

// ============================================
// RATE LIMITING
// ============================================

// Rate limiting centralizado via '@/lib/security/rate-limit'

// ============================================
// PROCESSAMENTO DE MÉTRICAS
// ============================================

class PerformanceAnalytics {
  private static instance: PerformanceAnalytics;
  private metrics: Map<string, any[]> = new Map();
  private alerts: any[] = [];

  static getInstance(): PerformanceAnalytics {
    if (!PerformanceAnalytics.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalytics();
    }
    return PerformanceAnalytics.instance;
  }

  // Processar métricas de performance
  processPerformanceMetrics(metrics: z.infer<typeof PerformanceMetricSchema>[]) {
    for (const metric of metrics) {
      this.storeMetric('performance', metric);
      this.checkPerformanceThresholds(metric);
    }
  }

  // Processar métricas de API
  processAPIMetrics(metrics: z.infer<typeof APIMetricSchema>[]) {
    for (const metric of metrics) {
      this.storeMetric('api', metric);
      this.checkAPIThresholds(metric);
    }
  }

  // Processar erros
  processErrors(errors: z.infer<typeof ErrorMetricSchema>[]) {
    for (const error of errors) {
      this.storeMetric('errors', error);
      this.checkErrorPatterns(error);
    }
  }

  // Armazenar métrica
  private storeMetric(type: string, metric: any) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    
    const typeMetrics = this.metrics.get(type)!;
    typeMetrics.push(metric);
    
    // Manter apenas as últimas 1000 métricas por tipo
    if (typeMetrics.length > 1000) {
      typeMetrics.splice(0, typeMetrics.length - 1000);
    }
  }

  // Verificar thresholds de performance
  private checkPerformanceThresholds(metric: z.infer<typeof PerformanceMetricSchema>) {
    const thresholds = {
      LCP: { poor: 4000, needsImprovement: 2500 },
      FID: { poor: 300, needsImprovement: 100 },
      CLS: { poor: 0.25, needsImprovement: 0.1 },
      FCP: { poor: 3000, needsImprovement: 1800 },
      TTFB: { poor: 1500, needsImprovement: 800 },
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (!threshold) return;

    if (metric.value > threshold.poor) {
      this.createAlert({
        type: 'performance',
        severity: 'high',
        metric: metric.name,
        value: metric.value,
        threshold: threshold.poor,
        url: metric.url,
        timestamp: metric.timestamp,
        message: `${metric.name} está muito alto: ${metric.value}ms (limite: ${threshold.poor}ms)`,
      });
    } else if (metric.value > threshold.needsImprovement) {
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        metric: metric.name,
        value: metric.value,
        threshold: threshold.needsImprovement,
        url: metric.url,
        timestamp: metric.timestamp,
        message: `${metric.name} precisa de melhoria: ${metric.value}ms (limite: ${threshold.needsImprovement}ms)`,
      });
    }
  }

  // Verificar thresholds de API
  private checkAPIThresholds(metric: z.infer<typeof APIMetricSchema>) {
    // APIs muito lentas
    if (metric.duration > 5000) {
      this.createAlert({
        type: 'api',
        severity: 'high',
        endpoint: metric.endpoint,
        duration: metric.duration,
        timestamp: metric.timestamp,
        message: `API muito lenta: ${metric.endpoint} (${metric.duration}ms)`,
      });
    }

    // Taxa de erro alta
    if (!metric.success && metric.status >= 500) {
      this.createAlert({
        type: 'api',
        severity: 'high',
        endpoint: metric.endpoint,
        status: metric.status,
        timestamp: metric.timestamp,
        message: `Erro de servidor na API: ${metric.endpoint} (${metric.status})`,
      });
    }
  }

  // Verificar padrões de erro
  private checkErrorPatterns(error: z.infer<typeof ErrorMetricSchema>) {
    // Todos os erros são importantes
    this.createAlert({
      type: 'error',
      severity: 'medium',
      message: error.message,
      url: error.url,
      timestamp: error.timestamp,
      stack: error.stack,
    });

    // Verificar se há muitos erros da mesma URL
    const recentErrors = this.metrics.get('errors') || [];
    const sameUrlErrors = recentErrors.filter(
      (e: any) => e.url === error.url && 
      (Date.now() - e.timestamp) < 300000 // últimos 5 minutos
    );

    if (sameUrlErrors.length > 5) {
      this.createAlert({
        type: 'error',
        severity: 'high',
        url: error.url,
        count: sameUrlErrors.length,
        timestamp: error.timestamp,
        message: `Muitos erros na mesma página: ${error.url} (${sameUrlErrors.length} erros em 5 min)`,
      });
    }
  }

  // Criar alerta
  private createAlert(alert: any) {
    this.alerts.push({
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    });

    // Manter apenas os últimos 100 alertas
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }

    // Log do alerta
    console.warn('🚨 Alerta de Performance:', alert);
  }

  // Obter estatísticas
  getStats() {
    const performanceMetrics = this.metrics.get('performance') || [];
    const apiMetrics = this.metrics.get('api') || [];
    const errorMetrics = this.metrics.get('errors') || [];

    return {
      performance: {
        total: performanceMetrics.length,
        byMetric: this.groupBy(performanceMetrics, 'name'),
        averages: this.calculateAverages(performanceMetrics),
      },
      api: {
        total: apiMetrics.length,
        averageDuration: apiMetrics.length > 0 
          ? apiMetrics.reduce((sum: number, m: any) => sum + m.duration, 0) / apiMetrics.length 
          : 0,
        successRate: apiMetrics.length > 0 
          ? (apiMetrics.filter((m: any) => m.success).length / apiMetrics.length) * 100 
          : 0,
        slowestEndpoints: apiMetrics
          .sort((a: any, b: any) => b.duration - a.duration)
          .slice(0, 10),
      },
      errors: {
        total: errorMetrics.length,
        byUrl: this.groupBy(errorMetrics, 'url'),
        recent: errorMetrics
          .sort((a: any, b: any) => b.timestamp - a.timestamp)
          .slice(0, 10),
      },
      alerts: {
        total: this.alerts.length,
        recent: this.alerts
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10),
        bySeverity: this.groupBy(this.alerts, 'severity'),
      },
    };
  }

  // Utilitários
  private groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  private calculateAverages(metrics: any[]) {
    const grouped = this.groupBy(metrics, 'name');
    const averages: Record<string, number> = {};

    for (const [name, items] of Object.entries(grouped)) {
      const values = (items as any[]).map(item => item.value);
      averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    return averages;
  }
}

// ============================================
// MIDDLEWARE UNIFICADO
// ============================================

const analyticsMiddleware = createUnifiedMiddleware({
  bodySchema: AnalyticsPayloadSchema,
  allowedMethods: ['POST'],
  rateLimit: { requests: 10, windowMs: 60000, namespace: 'analytics:metrics' },
  enablePayloadScan: true,
  enableIPBlocking: true,
  maxPayloadSize: 2 * 1024 * 1024 // 2MB
});

const analyticsStatsMiddleware = createUnifiedMiddleware({
  allowedMethods: ['GET'],
  rateLimit: { requests: 20, windowMs: 60000, namespace: 'analytics:stats' },
  enablePayloadScan: false,
  enableIPBlocking: true
});

// ============================================
// HANDLERS DA API
// ============================================

// POST - Receber métricas
export async function POST(request: NextRequest) {
  return analyticsMiddleware(request, async (req, validatedData) => {
    try {
      const { body } = validatedData;
      
      // Processar métricas
      const analytics = PerformanceAnalytics.getInstance();
      
      analytics.processPerformanceMetrics(body.performance);
      analytics.processAPIMetrics(body.api);
      analytics.processErrors(body.errors);

      return NextResponse.json({ 
        success: true,
        data: {
          processed: {
            performance: body.performance.length,
            api: body.api.length,
            errors: body.errors.length,
          }
        }
      });

    } catch (error) {
      console.error('Erro ao processar métricas de performance:', error);
      
      return NextResponse.json(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  });
}

// GET - Obter estatísticas
export async function GET(request: NextRequest) {
  return analyticsStatsMiddleware(request, async (req, validatedData) => {
    try {
      const analytics = PerformanceAnalytics.getInstance();
      const stats = analytics.getStats();

      return NextResponse.json({
        success: true,
        data: {
          stats,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Erro ao obter estatísticas de performance:', error);
      return NextResponse.json(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  });
}

// OPTIONS - CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
    },
  });
}