/**
 * Configuração Global do Sistema de Otimização
 * 
 * Centraliza todas as configurações dos módulos de otimização,
 * analytics e performance para facilitar o gerenciamento.
 */

// ============================================
// TIPOS DE CONFIGURAÇÃO
// ============================================

export interface GlobalOptimizationConfig {
  // Configurações gerais
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  debugMode: boolean;
  
  // Configurações de coleta
  collection: {
    metricsInterval: number;
    batchSize: number;
    maxStorageSize: number;
    retentionDays: number;
  };
  
  // Configurações de performance
  performance: {
    enabled: boolean;
    targetFPS: number;
    maxMemoryUsage: number;
    maxLoadTime: number;
    adaptiveThreshold: number;
    learningRate: number;
  };
  
  // Configurações de recursos
  resources: {
    enabled: boolean;
    monitoringInterval: number;
    optimizationInterval: number;
    maxActionsPerMinute: number;
    aggressivenessLevel: 'low' | 'medium' | 'high';
  };
  
  // Configurações de analytics
  analytics: {
    enabled: boolean;
    trackUserBehavior: boolean;
    trackErrors: boolean;
    trackConversions: boolean;
    sessionTimeout: number;
  };
  
  // Configurações de análise preditiva
  predictive: {
    enabled: boolean;
    modelUpdateInterval: number;
    predictionInterval: number;
    confidenceThreshold: number;
    anomalyThreshold: number;
  };
  
  // Configurações de otimização automática
  autoOptimization: {
    enabled: boolean;
    autoApply: boolean;
    maxRecommendations: number;
    minConfidence: number;
    updateInterval: number;
  };
  
  // Configurações de privacidade
  privacy: {
    anonymizeData: boolean;
    respectDoNotTrack: boolean;
    allowDataExport: boolean;
    dataRetentionDays: number;
  };
}

// ============================================
// CONFIGURAÇÕES PADRÃO
// ============================================

export const DEFAULT_CONFIG: GlobalOptimizationConfig = {
  enabled: true,
  environment: 'development',
  debugMode: false,
  
  collection: {
    metricsInterval: 1000,
    batchSize: 100,
    maxStorageSize: 50 * 1024 * 1024, // 50MB
    retentionDays: 7
  },
  
  performance: {
    enabled: true,
    targetFPS: 60,
    maxMemoryUsage: 80,
    maxLoadTime: 3000,
    adaptiveThreshold: 0.8,
    learningRate: 0.1
  },
  
  resources: {
    enabled: true,
    monitoringInterval: 2000,
    optimizationInterval: 5000,
    maxActionsPerMinute: 10,
    aggressivenessLevel: 'medium'
  },
  
  analytics: {
    enabled: true,
    trackUserBehavior: true,
    trackErrors: true,
    trackConversions: true,
    sessionTimeout: 30 * 60 * 1000 // 30 minutos
  },
  
  predictive: {
    enabled: true,
    modelUpdateInterval: 60000,
    predictionInterval: 30000,
    confidenceThreshold: 0.7,
    anomalyThreshold: 2.0
  },
  
  autoOptimization: {
    enabled: true,
    autoApply: false,
    maxRecommendations: 5,
    minConfidence: 0.8,
    updateInterval: 10000
  },
  
  privacy: {
    anonymizeData: true,
    respectDoNotTrack: true,
    allowDataExport: true,
    dataRetentionDays: 30
  }
};

// ============================================
// PRESETS DE CONFIGURAÇÃO
// ============================================

export const CONFIG_PRESETS = {
  // Configuração para desenvolvimento
  development: {
    ...DEFAULT_CONFIG,
    environment: 'development' as const,
    debugMode: true,
    collection: {
      ...DEFAULT_CONFIG.collection,
      metricsInterval: 2000,
      retentionDays: 1
    },
    privacy: {
      ...DEFAULT_CONFIG.privacy,
      anonymizeData: false
    }
  },
  
  // Configuração para produção
  production: {
    ...DEFAULT_CONFIG,
    environment: 'production' as const,
    debugMode: false,
    collection: {
      ...DEFAULT_CONFIG.collection,
      metricsInterval: 5000,
      retentionDays: 30
    },
    privacy: {
      ...DEFAULT_CONFIG.privacy,
      anonymizeData: true,
      respectDoNotTrack: true
    }
  },
  
  // Configuração para dispositivos de baixa performance
  lowPerformance: {
    ...DEFAULT_CONFIG,
    performance: {
      ...DEFAULT_CONFIG.performance,
      targetFPS: 30,
      maxMemoryUsage: 60,
      maxLoadTime: 5000
    },
    resources: {
      ...DEFAULT_CONFIG.resources,
      monitoringInterval: 5000,
      optimizationInterval: 10000,
      aggressivenessLevel: 'high' as const
    },
    collection: {
      ...DEFAULT_CONFIG.collection,
      metricsInterval: 3000,
      batchSize: 50
    }
  },
  
  // Configuração para dispositivos de alta performance
  highPerformance: {
    ...DEFAULT_CONFIG,
    performance: {
      ...DEFAULT_CONFIG.performance,
      targetFPS: 120,
      maxMemoryUsage: 90,
      maxLoadTime: 1000
    },
    resources: {
      ...DEFAULT_CONFIG.resources,
      monitoringInterval: 1000,
      optimizationInterval: 2000,
      aggressivenessLevel: 'low' as const
    },
    collection: {
      ...DEFAULT_CONFIG.collection,
      metricsInterval: 500,
      batchSize: 200
    }
  },
  
  // Configuração para economia de energia
  energySaver: {
    ...DEFAULT_CONFIG,
    performance: {
      ...DEFAULT_CONFIG.performance,
      targetFPS: 30,
      maxMemoryUsage: 70
    },
    resources: {
      ...DEFAULT_CONFIG.resources,
      monitoringInterval: 10000,
      optimizationInterval: 30000,
      aggressivenessLevel: 'high' as const
    },
    collection: {
      ...DEFAULT_CONFIG.collection,
      metricsInterval: 5000,
      batchSize: 25
    },
    predictive: {
      ...DEFAULT_CONFIG.predictive,
      modelUpdateInterval: 120000,
      predictionInterval: 60000
    }
  },
  
  // Configuração mínima (apenas essencial)
  minimal: {
    ...DEFAULT_CONFIG,
    analytics: {
      ...DEFAULT_CONFIG.analytics,
      trackUserBehavior: false,
      trackErrors: true,
      trackConversions: false
    },
    predictive: {
      ...DEFAULT_CONFIG.predictive,
      enabled: false
    },
    autoOptimization: {
      ...DEFAULT_CONFIG.autoOptimization,
      enabled: false
    },
    collection: {
      ...DEFAULT_CONFIG.collection,
      metricsInterval: 10000,
      batchSize: 10,
      retentionDays: 1
    }
  }
};

// ============================================
// GERENCIADOR DE CONFIGURAÇÃO
// ============================================

class OptimizationConfigManager {
  private config: GlobalOptimizationConfig;
  private listeners: Set<(config: GlobalOptimizationConfig) => void> = new Set();
  private storageKey = 'optimization-config';
  
  constructor() {
    this.config = this.loadConfig();
    this.detectEnvironment();
  }
  
  /**
   * Carrega configuração do localStorage ou usa padrão
   */
  private loadConfig(): GlobalOptimizationConfig {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_CONFIG };
    }
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração:', error);
    }
    
    return { ...DEFAULT_CONFIG };
  }
  
  /**
   * Salva configuração no localStorage
   */
  private saveConfig(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Erro ao salvar configuração:', error);
    }
  }
  
  /**
   * Detecta ambiente automaticamente
   */
  private detectEnvironment(): void {
    if (typeof window === 'undefined') return;
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      this.config.environment = 'development';
      this.config.debugMode = true;
    } else if (hostname.includes('staging') || hostname.includes('dev')) {
      this.config.environment = 'staging';
    } else {
      this.config.environment = 'production';
      this.config.debugMode = false;
    }
  }
  
  /**
   * Obtém configuração atual
   */
  getConfig(): GlobalOptimizationConfig {
    return { ...this.config };
  }
  
  /**
   * Atualiza configuração
   */
  updateConfig(updates: Partial<GlobalOptimizationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.notifyListeners();
  }
  
  /**
   * Aplica preset de configuração
   */
  applyPreset(presetName: keyof typeof CONFIG_PRESETS): void {
    const preset = CONFIG_PRESETS[presetName];
    if (preset) {
      this.config = { ...preset };
      this.saveConfig();
      this.notifyListeners();
    }
  }
  
  /**
   * Reseta para configuração padrão
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.detectEnvironment();
    this.saveConfig();
    this.notifyListeners();
  }
  
  /**
   * Adiciona listener para mudanças de configuração
   */
  addListener(listener: (config: GlobalOptimizationConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notifica listeners sobre mudanças
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Erro em listener de configuração:', error);
      }
    });
  }
  
  /**
   * Valida configuração
   */
  validateConfig(config: Partial<GlobalOptimizationConfig>): string[] {
    const errors: string[] = [];
    
    if (config.collection?.metricsInterval && config.collection.metricsInterval < 100) {
      errors.push('Intervalo de métricas deve ser pelo menos 100ms');
    }
    
    if (config.performance?.targetFPS && (config.performance.targetFPS < 15 || config.performance.targetFPS > 240)) {
      errors.push('FPS target deve estar entre 15 e 240');
    }
    
    if (config.performance?.maxMemoryUsage && (config.performance.maxMemoryUsage < 30 || config.performance.maxMemoryUsage > 95)) {
      errors.push('Uso máximo de memória deve estar entre 30% e 95%');
    }
    
    if (config.privacy?.dataRetentionDays && config.privacy.dataRetentionDays < 1) {
      errors.push('Retenção de dados deve ser pelo menos 1 dia');
    }
    
    return errors;
  }
  
  /**
   * Exporta configuração
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  /**
   * Importa configuração
   */
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      const errors = this.validateConfig(imported);
      
      if (errors.length > 0) {
        console.error('Configuração inválida:', errors);
        return false;
      }
      
      this.config = { ...DEFAULT_CONFIG, ...imported };
      this.saveConfig();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Erro ao importar configuração:', error);
      return false;
    }
  }
  
  /**
   * Obtém configuração específica de um módulo
   */
  getModuleConfig<K extends keyof GlobalOptimizationConfig>(module: K): GlobalOptimizationConfig[K] {
    return this.config[module];
  }
  
  /**
   * Atualiza configuração de um módulo específico
   */
  updateModuleConfig<
    K extends { [P in keyof GlobalOptimizationConfig]: GlobalOptimizationConfig[P] extends object ? P : never }[keyof GlobalOptimizationConfig]
  >(
    module: K,
    updates: Partial<GlobalOptimizationConfig[K]>
  ): void {
    const current = this.config[module];
    if (current === null || typeof current !== 'object') {
      console.error(`updateModuleConfig: módulo '${String(module)}' não é um objeto configurável.`);
      return;
    }
    this.config[module] = { ...(current as Record<string, any>), ...(updates as Record<string, any>) } as GlobalOptimizationConfig[K];
    this.saveConfig();
    this.notifyListeners();
  }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================

export const optimizationConfig = new OptimizationConfigManager();

// ============================================
// HOOK REACT
// ============================================

import { useState, useEffect } from 'react';

export function useOptimizationConfig() {
  const [config, setConfig] = useState<GlobalOptimizationConfig>(optimizationConfig.getConfig());
  
  useEffect(() => {
    const unsubscribe = optimizationConfig.addListener(setConfig);
    return unsubscribe;
  }, []);
  
  return {
    config,
    updateConfig: optimizationConfig.updateConfig.bind(optimizationConfig),
    applyPreset: optimizationConfig.applyPreset.bind(optimizationConfig),
    reset: optimizationConfig.reset.bind(optimizationConfig),
    exportConfig: optimizationConfig.exportConfig.bind(optimizationConfig),
    importConfig: optimizationConfig.importConfig.bind(optimizationConfig),
    validateConfig: optimizationConfig.validateConfig.bind(optimizationConfig),
    getModuleConfig: optimizationConfig.getModuleConfig.bind(optimizationConfig),
    updateModuleConfig: optimizationConfig.updateModuleConfig.bind(optimizationConfig)
  };
}

// ============================================
// UTILITÁRIOS
// ============================================

export const ConfigUtils = {
  /**
   * Detecta capacidades do dispositivo
   */
  detectDeviceCapabilities(): 'low' | 'medium' | 'high' {
    if (typeof window === 'undefined') return 'medium';
    
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const connection = (navigator as any).connection;
    
    let score = 0;
    
    // Memória
    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else score += 1;
    
    // CPU cores
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;
    
    // Conexão
    if (connection) {
      if (connection.effectiveType === '4g') score += 2;
      else if (connection.effectiveType === '3g') score += 1;
    } else {
      score += 1;
    }
    
    if (score >= 7) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  },
  
  /**
   * Sugere preset baseado no dispositivo
   */
  suggestPreset(): keyof typeof CONFIG_PRESETS {
    const capabilities = this.detectDeviceCapabilities();
    const isOnBattery = (navigator as any).getBattery ? true : false;
    
    if (isOnBattery) return 'energySaver';
    if (capabilities === 'low') return 'lowPerformance';
    if (capabilities === 'high') return 'highPerformance';
    return 'production';
  },
  
  /**
   * Verifica se Do Not Track está ativo
   */
  isDoNotTrackEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return navigator.doNotTrack === '1' || 
           (window as any).doNotTrack === '1' || 
           (navigator as any).msDoNotTrack === '1';
  },
  
  /**
   * Calcula tamanho estimado de armazenamento
   */
  estimateStorageUsage(config: GlobalOptimizationConfig): number {
    const metricsPerDay = (24 * 60 * 60 * 1000) / config.collection.metricsInterval;
    const bytesPerMetric = 1024; // Estimativa
    const totalDays = config.collection.retentionDays;
    
    return metricsPerDay * bytesPerMetric * totalDays;
  }
};