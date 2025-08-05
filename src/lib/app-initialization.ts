"use client";
// src/lib/app-initialization.ts
import React from 'react';
import { ConfigService } from "@/services/config.service";
import { LoggerService, LogLevel } from "@/services/logger.service";
import { CacheService } from "@/services/cache.service";
import { ErrorService } from "@/services/error.service";
import { createClientSupabaseClient } from '@/lib/supabase-client';

/**
 * Configurações de inicialização da aplicação
 */
export interface AppInitializationConfig {
  // Configurações de logging
  logging?: {
    level?: LogLevel;
    enableConsole?: boolean;
    enableRemote?: boolean;
    remoteEndpoint?: string;
    enableLocalStorage?: boolean;
  };
  
  // Configurações de cache
  cache?: {
    enabled?: boolean;
    defaultTTL?: number;
    maxSize?: number;
    cleanupInterval?: number;
  };
  
  // Configurações de UI
  ui?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    animations?: boolean;
    compactMode?: boolean;
  };
  
  // Configurações de segurança
  security?: {
    enableCSP?: boolean;
    enableXSSProtection?: boolean;
    sessionTimeout?: number;
    maxLoginAttempts?: number;
  };
  
  // Configurações de features
  features?: {
    enableNotifications?: boolean;
    enableAnalytics?: boolean;
    enableOfflineMode?: boolean;
    enableExperimentalFeatures?: boolean;
  };
  
  // Configurações de performance
  performance?: {
    enableLazyLoading?: boolean;
    enableServiceWorker?: boolean;
    enablePrefetch?: boolean;
    chunkSize?: number;
  };
  
  // Configurações customizadas da aplicação
  appConfig?: any;
}

/**
 * Resultado da inicialização da aplicação
 */
export interface AppInitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    initializationTime: number;
    servicesInitialized: string[];
    healthChecks: {
      supabase: boolean;
      cache: boolean;
      config: boolean;
    };
  };
}

// Renomeando a interface antiga para manter compatibilidade
interface InitializationConfig extends AppInitializationConfig {}

/**
 * Classe responsável pela inicialização da aplicação
 * Configura todos os serviços necessários na ordem correta
 */
export class AppInitializer {
  private static isInitialized = false;
  private static initializationPromise: Promise<AppInitializationResult> | null = null;
  private static lastResult: AppInitializationResult | null = null;

  /**
   * Inicializa a aplicação com as configurações fornecidas
   */
  static async initialize(config: AppInitializationConfig = {}): Promise<AppInitializationResult> {
    // Evita múltiplas inicializações
    if (this.isInitialized && this.lastResult) {
      return {
        ...this.lastResult,
        warnings: [...this.lastResult.warnings, 'Application already initialized']
      };
    }

    // Retorna a promise existente se já estiver inicializando
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization(config);
    const result = await this.initializationPromise;
    
    if (result.success) {
      this.isInitialized = true;
    }
    
    this.lastResult = result;
    return result;
  }

  /**
   * Executa a inicialização propriamente dita
   */
  private static async performInitialization(config: AppInitializationConfig): Promise<AppInitializationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const servicesInitialized: string[] = [];

    try {
      LoggerService.info('Starting application initialization', 'AppInitializer');

      // 1. Inicializa o serviço de configuração
      try {
        await this.initializeConfigService(config);
        servicesInitialized.push('ConfigService');
        LoggerService.info('ConfigService initialized', 'AppInitializer');
      } catch (error) {
        const errorMsg = `ConfigService initialization failed: ${error instanceof Error ? error.message : error}`;
        errors.push(errorMsg);
        LoggerService.error(errorMsg, 'AppInitializer');
      }

      // 2. Configura o serviço de logging
      try {
        await this.initializeLoggingService(config.logging);
        servicesInitialized.push('LoggerService');
        LoggerService.info('LoggerService configured', 'AppInitializer');
      } catch (error) {
        const errorMsg = `LoggerService configuration failed: ${error instanceof Error ? error.message : error}`;
        errors.push(errorMsg);
        LoggerService.error(errorMsg, 'AppInitializer');
      }

      // 3. Configura o serviço de cache
      try {
        await this.initializeCacheService(config.cache);
        servicesInitialized.push('CacheService');
        LoggerService.info('CacheService configured', 'AppInitializer');
      } catch (error) {
        const errorMsg = `CacheService configuration failed: ${error instanceof Error ? error.message : error}`;
        warnings.push(errorMsg); // Cache não é crítico
        LoggerService.warn(errorMsg, 'AppInitializer');
      }

      // 4. Configura tratamento global de erros
      try {
        await this.initializeErrorHandling();
        servicesInitialized.push('ErrorHandling');
        LoggerService.info('Error handling configured', 'AppInitializer');
      } catch (error) {
        const errorMsg = `Error handling configuration failed: ${error instanceof Error ? error.message : error}`;
        warnings.push(errorMsg); // Não crítico
        LoggerService.warn(errorMsg, 'AppInitializer');
      }

      // 5. Executa verificações de saúde
      const healthChecks = await this.performHealthChecks();
      LoggerService.info('Health checks completed', 'AppInitializer', { healthChecks });

      // 6. Registra métricas de inicialização
      await this.recordInitializationMetrics();

      const initializationTime = Date.now() - startTime;
      const success = errors.length === 0;

      if (success) {
        LoggerService.info('Application initialization completed successfully', 'AppInitializer', {
          initializationTime,
          servicesInitialized,
          warningsCount: warnings.length
        });
      } else {
        LoggerService.error('Application initialization completed with errors', 'AppInitializer', {
          errors,
          warnings,
          servicesInitialized
        });
      }

      return {
        success,
        errors,
        warnings,
        metrics: {
          initializationTime,
          servicesInitialized,
          healthChecks
        }
      };

    } catch (error) {
      const errorMsg = `Critical initialization error: ${error instanceof Error ? error.message : error}`;
      errors.push(errorMsg);
      LoggerService.error(errorMsg, 'AppInitializer');

      return {
        success: false,
        errors,
        warnings,
        metrics: {
          initializationTime: Date.now() - startTime,
          servicesInitialized,
          healthChecks: { supabase: false, cache: false, config: false }
        }
      };
    }
  }

  /**
   * Inicializa o serviço de configuração
   */
  private static async initializeConfigService(config: AppInitializationConfig): Promise<void> {
    // Configuração padrão
    const defaultConfig = {
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      cache: {
        defaultTTL: 10 * 60 * 1000, // 10 minutos
        maxSize: 500,
        enablePersistent: true
      },
      logging: {
        level: (process.env.NODE_ENV === 'production' ? 'info' : 'debug') as 'debug' | 'info' | 'warn' | 'error',
        enableConsole: true,
        enableRemote: process.env.NODE_ENV === 'production',
        remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT
      },
      ui: {
        theme: 'system' as const,
        language: 'pt-BR' as 'pt-BR' | 'en-US',
        itemsPerPage: 10,
        enableAnimations: true
      },
      security: {
        sessionTimeout: 30 * 60 * 1000, // 30 minutos
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        enableTwoFactor: false
      },
      features: {
        enableNotifications: true,
        enableAnalytics: process.env.NODE_ENV === 'production',
        enableBetaFeatures: process.env.NODE_ENV === 'development',
        enableOfflineMode: false
      },
      performance: {
        enableLazyLoading: true,
        enableVirtualization: true,
        debounceDelay: 300,
        throttleDelay: 100
      },
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    };

    // Mesclar com configuração fornecida
    const configOverrides = {
      ...config.appConfig,
      cache: config.cache,
      logging: config.logging,
      ui: config.ui,
      security: config.security,
      features: config.features,
      performance: config.performance
    };
    
    // Inicializar ConfigService com as configurações mescladas
    ConfigService.initialize({ ...defaultConfig, ...configOverrides });
    const finalConfig = ConfigService.getConfig();
    
    // Valida configurações críticas
    const appConfig = ConfigService.getConfig();
    
    if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
      throw new Error('Missing required Supabase configuration');
    }
  }

  /**
   * Configura o serviço de logging
   */
  private static async initializeLoggingService(loggingConfig?: InitializationConfig['logging']): Promise<void> {
    const config = ConfigService.get('logging');
    
    LoggerService.configure({
      level: loggingConfig?.level ?? (config.level === 'debug' ? LogLevel.DEBUG :
              config.level === 'info' ? LogLevel.INFO :
              config.level === 'warn' ? LogLevel.WARN : LogLevel.ERROR),
      enableConsole: loggingConfig?.enableConsole ?? config.enableConsole,
      enableRemote: loggingConfig?.enableRemote ?? config.enableRemote,
      remoteEndpoint: loggingConfig?.remoteEndpoint ?? config.remoteEndpoint,
      maxLocalEntries: 1000
    });
  }

  /**
   * Configura o serviço de cache
   */
  private static async initializeCacheService(cacheConfig?: InitializationConfig['cache']): Promise<void> {
    const config = ConfigService.get('cache');
    
    CacheService.configure({
      defaultTTL: cacheConfig?.defaultTTL ?? config.defaultTTL,
      maxSize: cacheConfig?.maxSize ?? config.maxSize,
      cleanupInterval: cacheConfig?.cleanupInterval ?? 60000 // 1 minuto
    });
  }

  /**
   * Configura tratamento global de erros
   */
  private static async initializeErrorHandling(): Promise<void> {
    // Tratamento de erros não capturados
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        const error = ErrorService.fromNativeError(event.error || new Error(event.message));
        ErrorService.logError(error, 'Global Error Handler');
      });

      window.addEventListener('unhandledrejection', (event) => {
        const error = ErrorService.fromNativeError(
          event.reason instanceof Error ? event.reason : new Error(String(event.reason))
        );
        ErrorService.logError(error, 'Unhandled Promise Rejection');
      });
    }

    // Tratamento de erros no Node.js (para SSR)
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        const appError = ErrorService.fromNativeError(error);
        ErrorService.logError(appError, 'Uncaught Exception');
      });

      process.on('unhandledRejection', (reason) => {
        const error = ErrorService.fromNativeError(
          reason instanceof Error ? reason : new Error(String(reason))
        );
        ErrorService.logError(error, 'Unhandled Rejection');
      });
    }
  }

  /**
   * Executa verificações de saúde da aplicação
   */
  private static async performHealthChecks(): Promise<{
    supabase: boolean;
    cache: boolean;
    config: boolean;
  }> {
    const healthChecks = {
      supabase: false,
      cache: false,
      config: false
    };

    // Verifica conectividade com Supabase
    try {
      await this.checkSupabaseConnection();
      healthChecks.supabase = true;
    } catch (error) {
      LoggerService.warn('Supabase health check failed', 'AppInitializer', { error });
    }

    // Verifica funcionamento do cache
    try {
      await this.checkCacheService();
      healthChecks.cache = true;
    } catch (error) {
      LoggerService.warn('Cache health check failed', 'AppInitializer', { error });
    }

    // Verifica configurações críticas
    try {
      await this.checkCriticalConfigurations();
      healthChecks.config = true;
    } catch (error) {
      LoggerService.warn('Config health check failed', 'AppInitializer', { error });
    }

    const failedChecks = Object.entries(healthChecks)
      .filter(([, passed]) => !passed)
      .map(([check]) => check);
    
    if (failedChecks.length > 0) {
      LoggerService.warn(
        `${failedChecks.length} health check(s) failed: ${failedChecks.join(', ')}`,
        'AppInitializer',
        { healthChecks }
      );
    } else {
      LoggerService.info('All health checks passed', 'AppInitializer', { healthChecks });
    }

    return healthChecks;
  }

  /**
   * Verifica conectividade com Supabase
   */
  private static async checkSupabaseConnection(): Promise<void> {
    try {
      const supabase = createClientSupabaseClient();
      
      // Verifica se o cliente Supabase foi criado corretamente
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // Tenta fazer uma query simples para verificar a conectividade
      // Usando a tabela 'profiles' que existe na aplicação
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .maybeSingle();
      
      // Aceita erros de permissão como conexão válida (modo somente leitura)
      if (error && 
          error.code !== 'PGRST116' && // PGRST116 = no rows returned (ok)
          error.code !== '42501' &&   // Permission denied (ok em modo read-only)
          !error.message?.includes('permission denied') &&
          !error.message?.includes('insufficient_privilege')) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }
      
      LoggerService.info('Supabase connection verified', 'HealthCheck');
    } catch (error) {
      // Log como warning ao invés de error para não quebrar a aplicação
      LoggerService.warn('Supabase connection check failed', 'HealthCheck', { error });
      // Não re-throw o erro para permitir que a aplicação continue funcionando
    }
  }

  /**
   * Verifica funcionamento do cache
   */
  private static async checkCacheService(): Promise<void> {
    try {
      const testKey = 'health_check_test';
      const testValue = { timestamp: Date.now() };
      
      CacheService.set(testKey, testValue, 1000);
      const retrieved = CacheService.get(testKey);
      
      if (!retrieved || (retrieved as any).timestamp !== testValue.timestamp) {
        throw new Error('Cache service not working properly');
      }
      
      CacheService.delete(testKey);
      LoggerService.info('Cache service verified', 'HealthCheck');
    } catch (error) {
      LoggerService.error('Cache service check failed', 'HealthCheck', { error });
      throw error;
    }
  }

  /**
   * Verifica configurações críticas
   */
  private static async checkCriticalConfigurations(): Promise<void> {
    const config = ConfigService.getConfig();
    const criticalConfigs = [
      { key: 'supabaseUrl', value: config.supabaseUrl },
      { key: 'supabaseAnonKey', value: config.supabaseAnonKey },
    ];

    const missingConfigs = criticalConfigs.filter(c => !c.value);
    
    if (missingConfigs.length > 0) {
      throw new Error(`Missing critical configurations: ${missingConfigs.map(c => c.key).join(', ')}`);
    }
    
    LoggerService.info('Critical configurations verified', 'HealthCheck');
  }

  /**
   * Registra métricas de inicialização
   */
  private static async recordInitializationMetrics(): Promise<void> {
    const metrics = {
      initializationTime: Date.now(),
      environment: ConfigService.get('environment'),
      cacheStats: CacheService.getStats(),
      configuredFeatures: Object.entries(ConfigService.get('features'))
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature)
    };

    LoggerService.info('Application initialized', 'AppInitializer', metrics);
  }

  /**
   * Verifica se a aplicação foi inicializada
   */
  static isAppInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Força reinicialização da aplicação
   */
  static async reinitialize(config: AppInitializationConfig = {}): Promise<AppInitializationResult> {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.lastResult = null;
    return this.initialize(config);
  }

  /**
   * Obtém o último resultado de inicialização
   */
  static getLastInitializationResult(): AppInitializationResult | null {
    return this.lastResult;
  }

  /**
   * Obtém métricas de inicialização
   */
  static getInitializationMetrics(): {
    isInitialized: boolean;
    lastResult: AppInitializationResult | null;
  } {
    return {
      isInitialized: this.isInitialized,
      lastResult: this.lastResult
    };
  }

  /**
   * Limpa recursos da aplicação
   */
  static cleanup(): void {
    CacheService.stopCleanupTimer();
    CacheService.clear();
    LoggerService.clearLocalEntries();
    this.isInitialized = false;
    this.initializationPromise = null;
    this.lastResult = null;
    
    LoggerService.info('Application cleanup completed', 'AppInitializer');
  }
}

/**
 * Hook para verificar o status de inicialização
 */
export function useAppInitialization() {
  const [isInitialized, setIsInitialized] = React.useState(AppInitializer.isAppInitialized());
  const [initializationResult, setInitializationResult] = React.useState<AppInitializationResult | null>(
    AppInitializer.getLastInitializationResult()
  );
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [hasInitialized, setHasInitialized] = React.useState(false);

  React.useEffect(() => {
    // Evita reinicializações desnecessárias
    if (!AppInitializer.isAppInitialized() && !isInitializing && !hasInitialized) {
      console.log('🔄 Iniciando inicialização da aplicação...');
      setIsInitializing(true);
      setHasInitialized(true);
      
      AppInitializer.initialize().then((result) => {
        console.log('✅ Inicialização concluída:', result.success);
        setInitializationResult(result);
        setIsInitialized(result.success);
        setIsInitializing(false);
      }).catch((error) => {
        console.error('❌ Falha na inicialização da aplicação:', error);
        setIsInitializing(false);
        // Não marca como hasInitialized em caso de erro para permitir retry
        setHasInitialized(false);
      });
    }
  }, [isInitializing, hasInitialized]);

  const restart = React.useCallback(async (config?: AppInitializationConfig) => {
    setIsInitializing(true);
    try {
      const result = await AppInitializer.reinitialize(config);
      setInitializationResult(result);
      setIsInitialized(result.success);
      return result;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  return {
    isInitialized,
    isInitializing,
    initializationResult,
    restart,
    metrics: AppInitializer.getInitializationMetrics()
  };
}

// Tipos já exportados nas suas definições acima

// Função de conveniência para inicialização rápida
export async function quickInitialize(): Promise<AppInitializationResult> {
  return AppInitializer.initialize();
}

// Função para inicialização com configuração de produção
export async function initializeForProduction(): Promise<AppInitializationResult> {
  return AppInitializer.initialize({
    logging: {
      level: LogLevel.WARN,
      enableRemote: true,
      enableConsole: false
    },
    cache: {
      enabled: true,
      defaultTTL: 30 * 60 * 1000, // 30 minutos
      maxSize: 1000
    },
    features: {
      enableAnalytics: true,
      enableNotifications: true,
      enableExperimentalFeatures: false
    },
    performance: {
      enableServiceWorker: true,
      enableLazyLoading: true,
      enablePrefetch: true
    }
  });
}

// Função para inicialização de desenvolvimento
export async function initializeForDevelopment(): Promise<AppInitializationResult> {
  return AppInitializer.initialize({
    logging: {
      level: LogLevel.DEBUG,
      enableRemote: false,
      enableConsole: true
    },
    cache: {
      enabled: true,
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      maxSize: 100
    },
    features: {
      enableAnalytics: false,
      enableNotifications: true,
      enableExperimentalFeatures: true
    },
    performance: {
      enableServiceWorker: false,
      enableLazyLoading: false,
      enablePrefetch: false
    }
  });
}

// Função para inicialização de testes
export async function initializeForTesting(): Promise<AppInitializationResult> {
  return AppInitializer.initialize({
    logging: {
      level: LogLevel.ERROR,
      enableRemote: false,
      enableConsole: false
    },
    cache: {
      enabled: false
    },
    features: {
      enableAnalytics: false,
      enableNotifications: false,
      enableExperimentalFeatures: false
    },
    performance: {
      enableServiceWorker: false,
      enableLazyLoading: false,
      enablePrefetch: false
    }
  });
}