/**
 * Sistema de Monitoramento de Performance
 * 
 * Monitora métricas de performance da aplicação incluindo:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Tempos de carregamento
 * - Uso de memória
 * - Erros de JavaScript
 * - Performance de APIs
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { useEffect } from 'react';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
}

interface APIPerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  success: boolean;
}

interface ErrorMetric {
  message: string;
  stack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
  userId?: string;
}

interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const PERFORMANCE_CONFIG = {
  // Enviar métricas apenas em produção
  enabled: process.env.NODE_ENV === 'production',
  
  // Endpoint para envio de métricas (configurar conforme necessário)
  endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '/api/analytics/performance',
  
  // Intervalo para coleta de métricas de memória (ms)
  memoryInterval: 30000, // 30 segundos
  
  // Limite de métricas em buffer antes de enviar
  bufferLimit: 10,
  
  // Timeout para requisições de analytics
  timeout: 5000,
};

// ============================================
// CLASSE PRINCIPAL DE MONITORAMENTO
// ============================================

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIPerformanceMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private memoryInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined' && PERFORMANCE_CONFIG.enabled) {
      this.init();
    }
  }

  private init() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    
    // Inicializar coleta de Core Web Vitals
    this.initWebVitals();
    
    // Inicializar monitoramento de erros
    this.initErrorTracking();
    
    // Inicializar monitoramento de memória
    this.initMemoryTracking();
    
    // Inicializar interceptação de APIs
    this.initAPITracking();
    
    // Enviar métricas periodicamente
    this.startPeriodicSending();
    
    console.log('🔍 Performance Monitor inicializado');
  }

  // ============================================
  // CORE WEB VITALS
  // ============================================

  private initWebVitals() {
    // Largest Contentful Paint
    getLCP((metric) => {
      this.addMetric({
        name: 'LCP',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });

    // First Input Delay
    getFID((metric) => {
      this.addMetric({
        name: 'FID',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });

    // Cumulative Layout Shift
    getCLS((metric) => {
      this.addMetric({
        name: 'CLS',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });

    // First Contentful Paint
    getFCP((metric) => {
      this.addMetric({
        name: 'FCP',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });

    // Time to First Byte
    getTTFB((metric) => {
      this.addMetric({
        name: 'TTFB',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });
  }

  // ============================================
  // MONITORAMENTO DE ERROS
  // ============================================

  private initErrorTracking() {
    // Erros JavaScript
    window.addEventListener('error', (event) => {
      this.addError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      });
    });

    // Promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.addError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      });
    });
  }

  // ============================================
  // MONITORAMENTO DE MEMÓRIA
  // ============================================

  private initMemoryTracking() {
    if ('memory' in performance) {
      this.memoryInterval = setInterval(() => {
        const memory = (performance as any).memory;
        this.trackMemoryUsage({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        });
      }, PERFORMANCE_CONFIG.memoryInterval);
    }
  }

  // ============================================
  // MONITORAMENTO DE APIs
  // ============================================

  private initAPITracking() {
    // Interceptar fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0] as string;
      const options = args[1] || {};
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.addAPIMetric({
          endpoint: url,
          method: options.method || 'GET',
          duration,
          status: response.status,
          timestamp: Date.now(),
          success: response.ok,
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.addAPIMetric({
          endpoint: url,
          method: options.method || 'GET',
          duration,
          status: 0,
          timestamp: Date.now(),
          success: false,
        });
        
        throw error;
      }
    };
  }

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================

  public addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    if (this.metrics.length >= PERFORMANCE_CONFIG.bufferLimit) {
      this.sendMetrics();
    }
  }

  public addAPIMetric(metric: APIPerformanceMetric) {
    this.apiMetrics.push(metric);
    
    // Log APIs lentas
    if (metric.duration > 2000) {
      console.warn(`🐌 API lenta detectada: ${metric.endpoint} (${metric.duration.toFixed(2)}ms)`);
    }
  }

  public addError(error: ErrorMetric) {
    this.errorMetrics.push(error);
    console.error('🚨 Erro capturado:', error);
  }

  public trackMemoryUsage(memory: MemoryMetric) {
    // Log uso excessivo de memória
    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    
    if (usagePercent > 80) {
      console.warn(`🧠 Alto uso de memória: ${usagePercent.toFixed(1)}%`);
    }
  }

  public trackCustomMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor' = 'good') {
    this.addMetric({
      name,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  public getMetrics() {
    return {
      performance: this.metrics,
      api: this.apiMetrics,
      errors: this.errorMetrics,
    };
  }

  public clearMetrics() {
    this.metrics = [];
    this.apiMetrics = [];
    this.errorMetrics = [];
  }

  // ============================================
  // ENVIO DE MÉTRICAS
  // ============================================

  private async sendMetrics() {
    if (!PERFORMANCE_CONFIG.enabled || this.metrics.length === 0) {
      return;
    }

    try {
      const payload = {
        performance: this.metrics,
        api: this.apiMetrics,
        errors: this.errorMetrics,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PERFORMANCE_CONFIG.timeout);

      await fetch(PERFORMANCE_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.clearMetrics();
      
    } catch (error) {
      console.warn('Falha ao enviar métricas de performance:', error);
    }
  }

  private startPeriodicSending() {
    // Enviar métricas a cada 60 segundos
    setInterval(() => {
      this.sendMetrics();
    }, 60000);

    // Enviar métricas antes de sair da página
    window.addEventListener('beforeunload', () => {
      this.sendMetrics();
    });
  }

  public destroy() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    this.clearMetrics();
    this.isInitialized = false;
  }
}

// ============================================
// INSTÂNCIA GLOBAL COM LAZY INITIALIZATION
// ============================================

let _performanceMonitor: PerformanceMonitor | null = null;

function getPerformanceMonitor(): PerformanceMonitor {
  if (typeof window === 'undefined') {
    // No servidor, retornar uma instância mock
    return {
      trackPageLoad: () => {},
      trackAPICall: () => {},
      trackError: () => {},
      trackCustomMetric: () => {},
      getMetrics: () => ({ performance: [], api: [], errors: [] }),
      clearMetrics: () => {},
      destroy: () => {}
    } as any;
  }
  
  if (!_performanceMonitor) {
    _performanceMonitor = new PerformanceMonitor();
  }
  
  return _performanceMonitor;
}

// Manter compatibilidade com código existente
const performanceMonitor = getPerformanceMonitor();

// ============================================
// HOOKS E UTILITÁRIOS
// ============================================

// Hook para monitoramento de componentes
export function usePerformanceTracking(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.trackCustomMetric(
        `component-${componentName}`,
        duration,
        duration < 100 ? 'good' : duration < 300 ? 'needs-improvement' : 'poor'
      );
    };
  }, [componentName]);
}

// ============================================
// NOTA: Componente React foi movido para:
// src/components/performance/performance-tracker.tsx
// ============================================

// Função para medir performance de funções
export function measureFunction<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = fn(...args);
    const duration = performance.now() - startTime;
    
    performanceMonitor.trackCustomMetric(
      `function-${name}`,
      duration,
      duration < 10 ? 'good' : duration < 50 ? 'needs-improvement' : 'poor'
    );
    
    return result;
  }) as T;
}

// Função para medir performance de promises
export async function measureAsync<T>(
  promise: Promise<T>,
  name: string
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await promise;
    const duration = performance.now() - startTime;
    
    performanceMonitor.trackCustomMetric(
      `async-${name}`,
      duration,
      duration < 100 ? 'good' : duration < 500 ? 'needs-improvement' : 'poor'
    );
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    performanceMonitor.trackCustomMetric(
      `async-${name}-error`,
      duration,
      'poor'
    );
    
    throw error;
  }
}

// ============================================
// RELATÓRIOS DE PERFORMANCE
// ============================================

export function generatePerformanceReport() {
  const metrics = performanceMonitor.getMetrics();
  
  const report = {
    summary: {
      totalMetrics: metrics.performance.length,
      totalAPIRequests: metrics.api.length,
      totalErrors: metrics.errors.length,
      averageAPITime: metrics.api.length > 0 
        ? metrics.api.reduce((sum, m) => sum + m.duration, 0) / metrics.api.length 
        : 0,
    },
    webVitals: {
      lcp: metrics.performance.find(m => m.name === 'LCP'),
      fid: metrics.performance.find(m => m.name === 'FID'),
      cls: metrics.performance.find(m => m.name === 'CLS'),
      fcp: metrics.performance.find(m => m.name === 'FCP'),
      ttfb: metrics.performance.find(m => m.name === 'TTFB'),
    },
    slowAPIs: metrics.api
      .filter(m => m.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10),
    recentErrors: metrics.errors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10),
  };
  
  return report;
}

// ============================================
// EXPORTAÇÕES
// ============================================

export default performanceMonitor;

export { performanceMonitor, getPerformanceMonitor };
export type {
  PerformanceMetric,
  APIPerformanceMetric,
  ErrorMetric,
  MemoryMetric,
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  (window as any).__performanceMonitor = performanceMonitor;
}