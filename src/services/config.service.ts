import { logger } from '../utils/production-logger'
// src/services/config.service.ts

/**
 * Interface para configurações da aplicação
 */
export interface AppConfig {
  // Configurações de ambiente
  environment: 'development' | 'staging' | 'production';
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  
  // Configurações de cache
  cache: {
    defaultTTL: number;
    maxSize: number;
    enablePersistent: boolean;
  };
  
  // Configurações de logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableRemote: boolean;
    remoteEndpoint?: string;
  };
  
  // Configurações de UI
  ui: {
    theme: 'light' | 'dark' | 'system';
    language: 'pt-BR' | 'en-US';
    itemsPerPage: number;
    enableAnimations: boolean;
  };
  
  // Configurações de segurança
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    enableTwoFactor: boolean;
  };
  
  // Configurações de features
  features: {
    enableNotifications: boolean;
    enableAnalytics: boolean;
    enableBetaFeatures: boolean;
    enableOfflineMode: boolean;
  };
  
  // Configurações de performance
  performance: {
    enableLazyLoading: boolean;
    enableVirtualization: boolean;
    debounceDelay: number;
    throttleDelay: number;
  };
}

/**
 * Configurações padrão da aplicação
 */
const defaultConfig: AppConfig = {
  environment: (process.env.NODE_ENV as any) || 'development',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    maxSize: 1000,
    enablePersistent: true,
  },
  
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    enableConsole: true,
    enableRemote: process.env.NODE_ENV === 'production',
    remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT,
  },
  
  ui: {
    theme: 'system',
    language: 'pt-BR',
    itemsPerPage: 10,
    enableAnimations: true,
  },
  
  security: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutos
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    enableTwoFactor: false,
  },
  
  features: {
    enableNotifications: true,
    enableAnalytics: process.env.NODE_ENV === 'production',
    enableBetaFeatures: process.env.NODE_ENV === 'development',
    enableOfflineMode: false,
  },
  
  performance: {
    enableLazyLoading: true,
    enableVirtualization: true,
    debounceDelay: 300,
    throttleDelay: 100,
  },
};

/**
 * Serviço centralizado de configuração
 * Gerencia todas as configurações da aplicação com suporte a override e validação
 */
export class ConfigService {
  private static config: AppConfig = { ...defaultConfig };
  private static overrides: Partial<AppConfig> = {};
  private static listeners: Array<(config: AppConfig) => void> = [];

  /**
   * Inicializa o serviço de configuração
   */
  static initialize(overrides?: Partial<AppConfig>): void {
    if (overrides) {
      this.overrides = overrides;
      this.config = this.mergeConfigs(defaultConfig, overrides);
    }
    
    // Carrega configurações do localStorage se disponível
    this.loadFromStorage();
    
    // Valida configurações
    this.validateConfig();
    
    // Notifica listeners
    this.notifyListeners();
  }

  /**
   * Mescla configurações recursivamente
   */
  private static mergeConfigs(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    const result = { ...base };
    
    for (const key in override) {
      const value = override[key as keyof AppConfig];
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const baseValue = result[key as keyof AppConfig];
          if (typeof baseValue === 'object' && baseValue !== null && !Array.isArray(baseValue)) {
            (result as any)[key] = {
              ...baseValue,
              ...value
            };
          } else {
            (result as any)[key] = value;
          }
        } else {
          (result as any)[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Carrega configurações do localStorage
   */
  private static loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('app_config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        this.config = this.mergeConfigs(this.config, parsedConfig);
      }
    } catch (error) {
      logger.warn('Failed to load config from localStorage:', error);
    }
  }

  /**
   * Salva configurações no localStorage
   */
  private static saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Salva apenas as configurações que podem ser persistidas
      const persistableConfig = {
        ui: this.config.ui,
        features: this.config.features,
        performance: this.config.performance,
      };
      
      localStorage.setItem('app_config', JSON.stringify(persistableConfig));
    } catch (error) {
      logger.warn('Failed to save config to localStorage:', error);
    }
  }

  /**
   * Valida as configurações
   */
  private static validateConfig(): void {
    const errors: string[] = [];
    
    // Valida URLs obrigatórias
    if (!this.config.supabaseUrl) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
    }
    
    if (!this.config.supabaseAnonKey) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    }
    
    // Valida valores numéricos
    if (this.config.cache.defaultTTL <= 0) {
      errors.push('Cache defaultTTL must be positive');
    }
    
    if (this.config.ui.itemsPerPage <= 0) {
      errors.push('UI itemsPerPage must be positive');
    }
    
    if (errors.length > 0) {
      console.error('Configuration validation errors:', errors);
      if (this.config.environment === 'production') {
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
    }
  }

  /**
   * Notifica todos os listeners sobre mudanças na configuração
   */
  private static notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Error in config listener:', error);
      }
    });
  }

  /**
   * Obtém toda a configuração
   */
  static getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Obtém uma configuração específica
   */
  static get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Obtém uma configuração aninhada
   */
  static getNested<K extends keyof AppConfig, NK extends keyof AppConfig[K]>(
    key: K,
    nestedKey: NK
  ): AppConfig[K][NK] {
    return this.config[key][nestedKey];
  }

  /**
   * Atualiza uma configuração
   */
  static set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Atualiza uma configuração aninhada
   */
  static setNested<K extends keyof AppConfig, NK extends keyof AppConfig[K]>(
    key: K,
    nestedKey: NK,
    value: AppConfig[K][NK]
  ): void {
    this.config[key][nestedKey] = value;
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Atualiza múltiplas configurações
   */
  static update(updates: Partial<AppConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Reseta para as configurações padrão
   */
  static reset(): void {
    this.config = this.mergeConfigs(defaultConfig, this.overrides);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Adiciona um listener para mudanças na configuração
   */
  static addListener(listener: (config: AppConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Retorna função para remover o listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Verifica se uma feature está habilitada
   */
  static isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Verifica se está em modo de desenvolvimento
   */
  static isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Verifica se está em modo de produção
   */
  static isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Obtém configurações específicas para o ambiente atual
   */
  static getEnvironmentConfig(): Partial<AppConfig> {
    const env = this.config.environment;
    
    switch (env) {
      case 'development':
        return {
          logging: { ...this.config.logging, level: 'debug' },
          features: { ...this.config.features, enableBetaFeatures: true },
        };
      
      case 'staging':
        return {
          logging: { ...this.config.logging, level: 'info' },
          features: { ...this.config.features, enableBetaFeatures: true },
        };
      
      case 'production':
        return {
          logging: { ...this.config.logging, level: 'warn', enableRemote: true },
          features: { ...this.config.features, enableBetaFeatures: false },
        };
      
      default:
        return {};
    }
  }

  /**
   * Exporta configurações para backup
   */
  static exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importa configurações de backup
   */
  static importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      this.update(importedConfig);
    } catch (error) {
      throw new Error('Invalid configuration JSON');
    }
  }
}

// Exportar instância padrão para compatibilidade
export const configService = ConfigService;
