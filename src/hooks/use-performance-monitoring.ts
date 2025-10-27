/**
 * Hook de Monitoramento de Performance
 * 
 * Coleta e monitora métricas de performance da aplicação:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Métricas de tempo de resposta
 * - Monitoramento de erros
 * - Análise de uso de recursos
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/production-logger'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Métricas de Navegação
  navigationTiming?: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
  };
  
  // Métricas de Recursos
  resourceTiming?: {
    totalResources: number;
    totalSize: number;
    slowestResource: {
      name: string;
      duration: number;
      size: number;
    };
  };
  
  // Métricas de Memória
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  
  // Métricas de Rede
  networkInfo?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export interface ErrorMetrics {
  id: string;
  timestamp: Date;
  type: 'javascript' | 'network' | 'resource' | 'unhandledrejection';
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
  route: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'memory';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metrics: Partial<PerformanceMetrics>;
  threshold: number;
  actualValue: number;
}

export interface MonitoringConfig {
  enableCoreWebVitals: boolean;
  enableErrorTracking: boolean;
  enableResourceMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  sampleRate: number; // 0-1, porcentagem de sessões a monitorar
  alertThresholds: {
    lcp: number; // ms
    fid: number; // ms
    cls: number; // score
    memoryUsage: number; // percentage
    errorRate: number; // errors per minute
  };
  reportingEndpoint?: string;
  enableRealTimeAlerts: boolean;
}

export interface UsePerformanceMonitoringOptions {
  config?: Partial<MonitoringConfig>;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  onError?: (error: ErrorMetrics) => void;
  onAlert?: (alert: PerformanceAlert) => void;
  userId?: string;
  sessionId?: string;
}

// ============================================
// CONFIGURAÇÃO PADRÃO
// ============================================

const DEFAULT_CONFIG: MonitoringConfig = {
  enableCoreWebVitals: true,
  enableErrorTracking: true,
  enableResourceMonitoring: true,
  enableMemoryMonitoring: true,
  enableNetworkMonitoring: true,
  sampleRate: 1.0, // 100% em desenvolvimento
  alertThresholds: {
    lcp: 2500, // 2.5s
    fid: 100, // 100ms
    cls: 0.1, // 0.1 score
    memoryUsage: 80, // 80%
    errorRate: 5 // 5 erros por minuto
  },
  enableRealTimeAlerts: true
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function usePerformanceMonitoring({
  config = {},
  onMetricsUpdate,
  onError,
  onAlert,
  userId,
  sessionId = generateSessionId()
}: UsePerformanceMonitoringOptions = {}) {
  const router = useRouter();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // ============================================
  // ESTADO
  // ============================================
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [errors, setErrors] = useState<ErrorMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Refs para evitar re-renders desnecessários
  const metricsRef = useRef<PerformanceMetrics>({});
  const errorsRef = useRef<ErrorMetrics[]>([]);
  const observersRef = useRef<{
    performanceObserver?: PerformanceObserver;
    mutationObserver?: MutationObserver;
    resizeObserver?: ResizeObserver;
  }>({});
  
  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================
  
  const shouldSample = useCallback(() => {
    return Math.random() < finalConfig.sampleRate;
  }, [finalConfig.sampleRate]);
  
  const generateAlertId = () => `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const createAlert = useCallback(({
    type,
    severity,
    message,
    metrics: alertMetrics,
    threshold,
    actualValue
  }: Omit<PerformanceAlert, 'id' | 'timestamp'>) => {
    const alert: PerformanceAlert = {
      id: generateAlertId(),
      type,
      severity,
      message,
      timestamp: new Date(),
      metrics: alertMetrics,
      threshold,
      actualValue
    };
    
    setAlerts(prev => [...prev, alert]);
    onAlert?.(alert);
    
    return alert;
  }, [onAlert]);
  
  const checkThresholds = useCallback((newMetrics: PerformanceMetrics) => {
    const { alertThresholds } = finalConfig;
    
    // Verificar LCP
    if (newMetrics.lcp && newMetrics.lcp > alertThresholds.lcp) {
      createAlert({
        type: 'performance',
        severity: newMetrics.lcp > alertThresholds.lcp * 1.5 ? 'critical' : 'warning',
        message: `LCP muito alto: ${newMetrics.lcp}ms (limite: ${alertThresholds.lcp}ms)`,
        metrics: { lcp: newMetrics.lcp },
        threshold: alertThresholds.lcp,
        actualValue: newMetrics.lcp
      });
    }
    
    // Verificar FID
    if (newMetrics.fid && newMetrics.fid > alertThresholds.fid) {
      createAlert({
        type: 'performance',
        severity: newMetrics.fid > alertThresholds.fid * 2 ? 'critical' : 'warning',
        message: `FID muito alto: ${newMetrics.fid}ms (limite: ${alertThresholds.fid}ms)`,
        metrics: { fid: newMetrics.fid },
        threshold: alertThresholds.fid,
        actualValue: newMetrics.fid
      });
    }
    
    // Verificar CLS
    if (newMetrics.cls && newMetrics.cls > alertThresholds.cls) {
      createAlert({
        type: 'performance',
        severity: newMetrics.cls > alertThresholds.cls * 2 ? 'critical' : 'warning',
        message: `CLS muito alto: ${newMetrics.cls} (limite: ${alertThresholds.cls})`,
        metrics: { cls: newMetrics.cls },
        threshold: alertThresholds.cls,
        actualValue: newMetrics.cls
      });
    }
    
    // Verificar uso de memória
    if (newMetrics.memoryUsage) {
      const memoryPercentage = (newMetrics.memoryUsage.usedJSHeapSize / newMetrics.memoryUsage.jsHeapSizeLimit) * 100;
      if (memoryPercentage > alertThresholds.memoryUsage) {
        createAlert({
          type: 'memory',
          severity: memoryPercentage > alertThresholds.memoryUsage * 1.2 ? 'critical' : 'warning',
          message: `Uso de memória alto: ${memoryPercentage.toFixed(1)}% (limite: ${alertThresholds.memoryUsage}%)`,
          metrics: { memoryUsage: newMetrics.memoryUsage },
          threshold: alertThresholds.memoryUsage,
          actualValue: memoryPercentage
        });
      }
    }
  }, [finalConfig, createAlert]);
  
  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    const updatedMetrics = { ...metricsRef.current, ...newMetrics };
    metricsRef.current = updatedMetrics;
    setMetrics(updatedMetrics);
    
    onMetricsUpdate?.(updatedMetrics);
    
    if (finalConfig.enableRealTimeAlerts) {
      checkThresholds(updatedMetrics);
    }
  }, [onMetricsUpdate, finalConfig.enableRealTimeAlerts, checkThresholds]);
  
  // ============================================
  // COLETA DE CORE WEB VITALS
  // ============================================
  
  const collectCoreWebVitals = useCallback(() => {
    if (!finalConfig.enableCoreWebVitals || !shouldSample()) return;
    
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            updateMetrics({ lcp: lastEntry.startTime });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observersRef.current.performanceObserver = lcpObserver;
      } catch (error) {
        logger.warn('LCP observer não suportado:', error instanceof Error ? error : new Error(String(error)));
      }
      
      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              updateMetrics({ fid: entry.processingStart - entry.startTime });
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        logger.warn('FID observer não suportado:', error instanceof Error ? error : new Error(String(error)));
      }
      
      // CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              updateMetrics({ cls: clsValue });
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
         logger.warn('CLS observer não suportado:', error instanceof Error ? error : new Error(String(error)));
       }
    }
    
    // Métricas de navegação
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        updateMetrics({
          ttfb: nav.responseStart - nav.requestStart,
          navigationTiming: {
            domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
            loadComplete: nav.loadEventEnd - nav.startTime,
            firstPaint: 0, // Será coletado via paint timing
            firstContentfulPaint: 0
          }
        });
      }
    }
    
    // Paint Timing
    if ('performance' in window) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        updateMetrics({ fcp: fcp.startTime });
      }
    }
  }, [finalConfig.enableCoreWebVitals, shouldSample, updateMetrics]);
  
  // ============================================
  // MONITORAMENTO DE RECURSOS
  // ============================================
  
  const collectResourceMetrics = useCallback(() => {
    if (!finalConfig.enableResourceMonitoring || !shouldSample()) return;
    
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let totalSize = 0;
      let slowestResource = { name: '', duration: 0, size: 0 };
      
      resourceEntries.forEach(resource => {
        const duration = resource.responseEnd - resource.startTime;
        const size = resource.transferSize || 0;
        
        totalSize += size;
        
        if (duration > slowestResource.duration) {
          slowestResource = {
            name: resource.name,
            duration,
            size
          };
        }
      });
      
      updateMetrics({
        resourceTiming: {
          totalResources: resourceEntries.length,
          totalSize,
          slowestResource
        }
      });
    }
  }, [finalConfig.enableResourceMonitoring, shouldSample, updateMetrics]);
  
  // ============================================
  // MONITORAMENTO DE MEMÓRIA
  // ============================================
  
  const collectMemoryMetrics = useCallback(() => {
    if (!finalConfig.enableMemoryMonitoring || !shouldSample()) return;
    
    if ('performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      updateMetrics({
        memoryUsage: {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        }
      });
    }
  }, [finalConfig.enableMemoryMonitoring, shouldSample, updateMetrics]);
  
  // ============================================
  // MONITORAMENTO DE REDE
  // ============================================
  
  const collectNetworkMetrics = useCallback(() => {
    if (!finalConfig.enableNetworkMonitoring || !shouldSample()) return;
    
    if ('navigator' in window && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      updateMetrics({
        networkInfo: {
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0
        }
      });
    }
  }, [finalConfig.enableNetworkMonitoring, shouldSample, updateMetrics]);
  
  // ============================================
  // MONITORAMENTO DE ERROS
  // ============================================
  
  const handleError = useCallback((error: ErrorEvent | PromiseRejectionEvent, type: ErrorMetrics['type']) => {
    if (!finalConfig.enableErrorTracking || !shouldSample()) return;
    
    const errorMetric: ErrorMetrics = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message: 'message' in error ? error.message : error.reason?.toString() || 'Unknown error',
      stack: 'error' in error ? error.error?.stack : undefined,
      url: 'filename' in error ? error.filename : window.location.href,
      line: 'lineno' in error ? error.lineno : undefined,
      column: 'colno' in error ? error.colno : undefined,
      userAgent: navigator.userAgent,
      userId,
      sessionId,
      route: window.location.pathname,
      severity: determineSeverity(error)
    };
    
    errorsRef.current = [...errorsRef.current, errorMetric];
    setErrors(errorsRef.current);
    onError?.(errorMetric);
    
    // Verificar taxa de erro
    const recentErrors = errorsRef.current.filter(
      e => Date.now() - e.timestamp.getTime() < 60000 // últimos 60 segundos
    );
    
    if (recentErrors.length > finalConfig.alertThresholds.errorRate) {
      createAlert({
        type: 'error',
        severity: 'critical',
        message: `Taxa de erro alta: ${recentErrors.length} erros no último minuto`,
        metrics: {},
        threshold: finalConfig.alertThresholds.errorRate,
        actualValue: recentErrors.length
      });
    }
  }, [finalConfig, shouldSample, userId, sessionId, onError, createAlert]);
  
  // ============================================
  // FUNÇÕES PÚBLICAS
  // ============================================
  
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Coletar métricas iniciais
    collectCoreWebVitals();
    collectResourceMetrics();
    collectMemoryMetrics();
    collectNetworkMetrics();
    
    // Configurar listeners de erro
    if (finalConfig.enableErrorTracking) {
      const errorHandler = (event: ErrorEvent) => handleError(event, 'javascript');
      const rejectionHandler = (event: PromiseRejectionEvent) => handleError(event, 'unhandledrejection');
      
      window.addEventListener('error', errorHandler);
      window.addEventListener('unhandledrejection', rejectionHandler);
      
      // Cleanup function será retornada
      return () => {
        window.removeEventListener('error', errorHandler);
        window.removeEventListener('unhandledrejection', rejectionHandler);
      };
    }
  }, [isMonitoring, collectCoreWebVitals, collectResourceMetrics, collectMemoryMetrics, collectNetworkMetrics, finalConfig.enableErrorTracking, handleError]);
  
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    // Limpar observers
    Object.values(observersRef.current).forEach(observer => {
      if (observer && 'disconnect' in observer) {
        observer.disconnect();
      }
    });
    observersRef.current = {};
  }, []);
  
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);
  
  const clearErrors = useCallback(() => {
    errorsRef.current = [];
    setErrors([]);
  }, []);
  
  const exportMetrics = useCallback(() => {
    return {
      metrics: metricsRef.current,
      errors: errorsRef.current,
      alerts,
      sessionId,
      timestamp: new Date(),
      config: finalConfig
    };
  }, [alerts, sessionId, finalConfig]);
  
  // ============================================
  // EFEITOS
  // ============================================
  
  // Iniciar monitoramento automaticamente
  useEffect(() => {
    const cleanup = startMonitoring();
    
    // Coletar métricas periodicamente
    const interval = setInterval(() => {
      collectMemoryMetrics();
      collectNetworkMetrics();
    }, 30000); // A cada 30 segundos
    
    return () => {
      cleanup?.();
      clearInterval(interval);
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring, collectMemoryMetrics, collectNetworkMetrics]);
  
  // ============================================
  // RETORNO
  // ============================================
  
  return {
    // Estado
    metrics,
    errors,
    alerts,
    isMonitoring,
    
    // Funções
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    clearErrors,
    exportMetrics,
    
    // Configuração
    config: finalConfig,
    sessionId
  };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function determineSeverity(error: ErrorEvent | PromiseRejectionEvent): ErrorMetrics['severity'] {
  const message = 'message' in error ? error.message : error.reason?.toString() || '';
  
  // Erros críticos
  if (message.includes('ChunkLoadError') ||
      message.includes('Loading chunk') ||
      message.includes('Network Error') ||
      message.includes('Failed to fetch')) {
    return 'critical';
  }
  
  // Erros de alta severidade
  if (message.includes('TypeError') ||
      message.includes('ReferenceError') ||
      message.includes('SyntaxError')) {
    return 'high';
  }
  
  // Erros de média severidade
  if (message.includes('Warning') ||
      message.includes('Deprecated')) {
    return 'medium';
  }
  
  // Padrão: baixa severidade
  return 'low';
}

export default usePerformanceMonitoring;
