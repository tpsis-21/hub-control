import { useEffect, useState } from 'react';
import { SecuritySeverity } from './security-monitoring';
import { logger } from '@/utils/production-logger'
/**
 * Sistema de Análise Preditiva para Performance
 * 
 * Utiliza algoritmos de machine learning para analisar padrões de uso,
 * prever problemas de performance e sugerir otimizações proativas
 * baseadas em dados históricos e tendências.
 */

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface PredictiveMetrics {
  timestamp: number;
  performance: PerformanceData;
  user: UserBehaviorData;
  system: SystemResourceData;
  network: NetworkConditionData;
  application: ApplicationStateData;
}

export interface PerformanceData {
  loadTime: number;
  renderTime: number;
  interactionDelay: number;
  memoryUsage: number;
  cpuUsage: number;
  fps: number;
  errorRate: number;
  throughput: number;
}

export interface UserBehaviorData {
  sessionDuration: number;
  pageViews: number;
  interactions: number;
  bounceRate: number;
  conversionRate: number;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string;
}

export interface SystemResourceData {
  memoryPressure: number;
  cpuLoad: number;
  diskIO: number;
  networkBandwidth: number;
  activeConnections: number;
  cacheHitRatio: number;
  gcFrequency: number;
}

export interface NetworkConditionData {
  latency: number;
  bandwidth: number;
  packetLoss: number;
  jitter: number;
  connectionStability: number;
  cdnPerformance: number;
}

export interface ApplicationStateData {
  activeUsers: number;
  requestsPerSecond: number;
  databaseConnections: number;
  cacheSize: number;
  queueLength: number;
  errorCount: number;
  featureUsage: Record<string, number>;
}

export interface PredictionModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  accuracy: number;
  lastTrained: number;
  features: string[];
  parameters: Record<string, any>;
  metadata: ModelMetadata;
}

export interface ModelMetadata {
  trainingDataSize: number;
  validationAccuracy: number;
  testAccuracy: number;
  crossValidationScore: number;
  featureImportance: Record<string, number>;
  hyperparameters: Record<string, any>;
}

export interface Prediction {
  id: string;
  timestamp: number;
  type: PredictionType;
  confidence: number;
  timeHorizon: number; // em minutos
  predictedValue: number;
  currentValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  severity: SecuritySeverity;
  description: string;
  recommendations: Recommendation[];
  modelUsed: string;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: number;
  impact: number;
  effort: number;
  description: string;
  action: string;
  parameters: Record<string, any>;
  expectedOutcome: string;
  timeToImplement: number;
  riskLevel: SecuritySeverity;
}

// Adicionar types faltantes que estão sendo importados
export interface PredictiveRecommendation extends Recommendation {
  model: string;
  confidence: number;
  dataPoints: number;
  historicalAccuracy: number;
}

export interface DataPattern {
  id: string;
  type: 'seasonal' | 'trend' | 'anomaly' | 'cycle';
  confidence: number;
  strength: number;
  period?: number;
  description: string;
  metrics: string[];
  detectedAt: number;
}

export interface AnomalyDetection {
  timestamp: number;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: SecuritySeverity;
  confidence: number;
  pattern: string;
  context: Record<string, any>;
}

export interface TrendAnalysis {
  metric: string;
  timeframe: string;
  direction: 'up' | 'down' | 'stable';
  slope: number;
  correlation: number;
  seasonality: boolean;
  cyclicPattern: boolean;
  forecastAccuracy: number;
}

export type ModelType = 
  | 'linear_regression'
  | 'polynomial_regression'
  | 'decision_tree'
  | 'random_forest'
  | 'neural_network'
  | 'time_series'
  | 'anomaly_detection'
  | 'clustering';

export type PredictionType = 
  | 'performance_degradation'
  | 'memory_leak'
  | 'cpu_spike'
  | 'network_congestion'
  | 'user_churn'
  | 'error_increase'
  | 'capacity_limit'
  | 'resource_exhaustion';

export type RecommendationType = 
  | 'scale_resources'
  | 'optimize_code'
  | 'cache_strategy'
  | 'database_tuning'
  | 'cdn_optimization'
  | 'user_experience'
  | 'monitoring_alert'
  | 'preventive_maintenance';

// ============================================
// COLETORES DE DADOS
// ============================================

class MetricsCollector {
  private metrics: PredictiveMetrics[] = [];
  private observers: Map<string, any> = new Map();
  private isCollecting = false;
  private collectionInterval = 30000; // 30 segundos

  constructor() {
    this.setupObservers();
  }

  private setupObservers(): void {
    // Performance Observer
    if ('PerformanceObserver' in window) {
      const perfObserver = new PerformanceObserver((list) => {
        this.processPerformanceEntries(list.getEntries());
      });

      try {
        perfObserver.observe({
          entryTypes: ['navigation', 'measure', 'paint', 'layout-shift', 'largest-contentful-paint']
        });
        this.observers.set('performance', perfObserver);
      } catch (error) {
        logger.warn('Erro ao configurar PerformanceObserver:', error);
      }
    }

    // Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.collectNetworkMetrics();
      });
    }

    // Visibility API para detectar mudanças de foco
    document.addEventListener('visibilitychange', () => {
      this.collectUserBehaviorMetrics();
    });

    // Event listeners para interações do usuário
    window.addEventListener('click', () => {
      this.collectUserBehaviorMetrics();
    });

    window.addEventListener('keydown', () => {
      this.collectUserBehaviorMetrics();
    });
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    // TODO: Implementar processamento real das métricas de performance
    // Por enquanto, apenas evita erros de tipo/compilação
  }

  private collectNetworkMetrics(): void {
    // TODO: Implementar coleta real de métricas de rede
  }

  private collectUserBehaviorMetrics(): void {
    // TODO: Implementar coleta real de métricas de comportamento do usuário
  }
}

// ============================================
// IMPLEMENTAÇÃO DO SISTEMA E HOOK
// ============================================

export class PredictiveAnalytics {
  private _isRunning = false;
  private _predictions: Prediction[] = [];
  private _anomalies: AnomalyDetection[] = [];
  private _models: PredictionModel[] = [];
  private _metrics: PredictiveMetrics[] = [];
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setInterval>;

  // API pública (somente leitura)
  get isRunning() { return this._isRunning; }
  get predictions() { return this._predictions; }
  get anomalies() { return this._anomalies; }
  get models() { return this._models; }
  get metrics() { return this._metrics; }

  // Controle do ciclo de vida
  start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this.notify();

    // Coleta simulada e leve: evita custos e funciona em SSR/CSR
    this.timer = setInterval(() => {
      // Mantemos simples: apenas atualiza timestamp das métricas para re-render
      const now = Date.now();
      this._metrics = [{
        timestamp: now,
        performance: {
          loadTime: 0,
          renderTime: 0,
          interactionDelay: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          fps: 0,
          errorRate: 0,
          throughput: 0
        },
        user: {
          sessionDuration: 0,
          pageViews: 0,
          interactions: 0,
          bounceRate: 0,
          conversionRate: 0,
          userAgent: '',
          deviceType: 'desktop',
          connectionType: ''
        },
        system: {
          memoryPressure: 0,
          cpuLoad: 0,
          diskIO: 0,
          networkBandwidth: 0,
          activeConnections: 0,
          cacheHitRatio: 0,
          gcFrequency: 0
        },
        network: {
          latency: 0,
          bandwidth: 0,
          packetLoss: 0,
          jitter: 0,
          connectionStability: 0,
          cdnPerformance: 0
        },
        application: {
          activeUsers: 0,
          requestsPerSecond: 0,
          databaseConnections: 0,
          cacheSize: 0,
          queueLength: 0,
          errorCount: 0,
          featureUsage: {}
        }
      }];
      this.notify();
    }, 10000);
  }

  stop() {
    if (!this._isRunning) return;
    this._isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.notify();
  }

  // Utilidades
  getPredictionsByType(type: PredictionType): Prediction[] {
    return this._predictions.filter(p => p.type === type);
  }

  getModelAccuracy(modelId: string): number {
    const model = this._models.find(m => m.id === modelId);
    return model?.accuracy ?? 0;
  }

  getTrendAnalysis(metric: string): TrendAnalysis {
    return {
      metric,
      timeframe: '1h',
      direction: 'stable',
      slope: 0,
      correlation: 0,
      seasonality: false,
      cyclicPattern: false,
      forecastAccuracy: 0
    };
  }

  // Assinatura para integração com o hook
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => {
      try { l(); } catch (e) { /* noop */ }
    });
  }
}

// ============================================
// INSTÂNCIA GLOBAL COM LAZY INITIALIZATION
// ============================================

let _predictiveAnalytics: PredictiveAnalytics | null = null;

export function getPredictiveAnalytics(): PredictiveAnalytics {
  if (typeof window === 'undefined') {
    // No servidor, retornar uma instância mock
    return {
      isRunning: false,
      predictions: [],
      anomalies: [],
      models: [],
      metrics: [],
      start: () => {},
      stop: () => {},
      getPredictionsByType: () => [],
      getModelAccuracy: () => 0,
      getTrendAnalysis: () => ({
        metric: '',
        timeframe: '1h',
        direction: 'stable',
        slope: 0,
        correlation: 0,
        seasonality: false,
        cyclicPattern: false,
        forecastAccuracy: 0
      }),
      subscribe: () => () => {}
    } as any;
  }
  
  if (!_predictiveAnalytics) {
    _predictiveAnalytics = new PredictiveAnalytics();
  }
  
  return _predictiveAnalytics;
}

// Manter compatibilidade com código existente
export const predictiveAnalytics = getPredictiveAnalytics();

// Hook de conveniência para componentes React
export function usePredictiveAnalytics() {
  const [snapshot, setSnapshot] = useState(() => ({
    isRunning: predictiveAnalytics.isRunning,
    predictions: predictiveAnalytics.predictions,
    anomalies: predictiveAnalytics.anomalies,
    models: predictiveAnalytics.models,
    metrics: predictiveAnalytics.metrics
  }));

  useEffect(() => {
    const unsubscribe = predictiveAnalytics.subscribe(() => {
      setSnapshot({
        isRunning: predictiveAnalytics.isRunning,
        predictions: predictiveAnalytics.predictions,
        anomalies: predictiveAnalytics.anomalies,
        models: predictiveAnalytics.models,
        metrics: predictiveAnalytics.metrics
      });
    });
    return unsubscribe;
  }, []);

  return {
    ...snapshot,
    startAnalytics: () => predictiveAnalytics.start(),
    stopAnalytics: () => predictiveAnalytics.stop(),
    getPredictionsByType: (type: PredictionType) => predictiveAnalytics.getPredictionsByType(type),
    getModelAccuracy: (modelId: string) => predictiveAnalytics.getModelAccuracy(modelId),
    getTrendAnalysis: (metric: string) => predictiveAnalytics.getTrendAnalysis(metric)
  };
}
// Removido import duplicado ao final do arquivo
