// src/hooks/useConfig.ts
import { useEffect, useState, useCallback } from "react";
import { ConfigService, type AppConfig } from "../services/config.service";

/**
 * Hook para acessar e gerenciar configurações da aplicação
 */
export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(() => ConfigService.getConfig());

  useEffect(() => {
    // Adiciona listener para mudanças na configuração
    const removeListener = ConfigService.addListener((newConfig) => {
      setConfig(newConfig);
    });

    return removeListener;
  }, []);

  /**
   * Atualiza uma configuração específica
   */
  const updateConfig = useCallback(<K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ) => {
    ConfigService.set(key, value);
  }, []);

  /**
   * Atualiza uma configuração aninhada
   */
  const updateNestedConfig = useCallback(<
    K extends keyof AppConfig,
    NK extends keyof AppConfig[K]
  >(
    key: K,
    nestedKey: NK,
    value: AppConfig[K][NK]
  ) => {
    ConfigService.setNested(key, nestedKey, value);
  }, []);

  /**
   * Atualiza múltiplas configurações
   */
  const updateMultipleConfigs = useCallback((updates: Partial<AppConfig>) => {
    ConfigService.update(updates);
  }, []);

  /**
   * Reseta configurações para o padrão
   */
  const resetConfig = useCallback(() => {
    ConfigService.reset();
  }, []);

  return {
    config,
    updateConfig,
    updateNestedConfig,
    updateMultipleConfigs,
    resetConfig,
  };
}

/**
 * Hook para acessar configurações de UI especificamente
 */
export function useUIConfig() {
  const { config, updateNestedConfig } = useConfig();

  const updateTheme = useCallback((theme: AppConfig['ui']['theme']) => {
    updateNestedConfig('ui', 'theme', theme);
  }, [updateNestedConfig]);

  const updateLanguage = useCallback((language: AppConfig['ui']['language']) => {
    updateNestedConfig('ui', 'language', language);
  }, [updateNestedConfig]);

  const updateItemsPerPage = useCallback((itemsPerPage: number) => {
    updateNestedConfig('ui', 'itemsPerPage', itemsPerPage);
  }, [updateNestedConfig]);

  const toggleAnimations = useCallback(() => {
    updateNestedConfig('ui', 'enableAnimations', !config.ui.enableAnimations);
  }, [updateNestedConfig, config.ui.enableAnimations]);

  return {
    ui: config.ui,
    updateTheme,
    updateLanguage,
    updateItemsPerPage,
    toggleAnimations,
  };
}

/**
 * Hook para gerenciar features da aplicação
 */
export function useFeatures() {
  const { config, updateNestedConfig } = useConfig();

  const toggleFeature = useCallback((feature: keyof AppConfig['features']) => {
    updateNestedConfig('features', feature, !config.features[feature]);
  }, [updateNestedConfig, config.features]);

  const isFeatureEnabled = useCallback((feature: keyof AppConfig['features']) => {
    return ConfigService.isFeatureEnabled(feature);
  }, []);

  return {
    features: config.features,
    toggleFeature,
    isFeatureEnabled,
  };
}

/**
 * Hook para configurações de performance
 */
export function usePerformanceConfig() {
  const { config, updateNestedConfig } = useConfig();

  const updateDebounceDelay = useCallback((delay: number) => {
    updateNestedConfig('performance', 'debounceDelay', delay);
  }, [updateNestedConfig]);

  const updateThrottleDelay = useCallback((delay: number) => {
    updateNestedConfig('performance', 'throttleDelay', delay);
  }, [updateNestedConfig]);

  const toggleLazyLoading = useCallback(() => {
    updateNestedConfig('performance', 'enableLazyLoading', !config.performance.enableLazyLoading);
  }, [updateNestedConfig, config.performance.enableLazyLoading]);

  const toggleVirtualization = useCallback(() => {
    updateNestedConfig('performance', 'enableVirtualization', !config.performance.enableVirtualization);
  }, [updateNestedConfig, config.performance.enableVirtualization]);

  return {
    performance: config.performance,
    updateDebounceDelay,
    updateThrottleDelay,
    toggleLazyLoading,
    toggleVirtualization,
  };
}

/**
 * Hook para configurações de segurança
 */
export function useSecurityConfig() {
  const { config, updateNestedConfig } = useConfig();

  const updateSessionTimeout = useCallback((timeout: number) => {
    updateNestedConfig('security', 'sessionTimeout', timeout);
  }, [updateNestedConfig]);

  const updateMaxLoginAttempts = useCallback((attempts: number) => {
    updateNestedConfig('security', 'maxLoginAttempts', attempts);
  }, [updateNestedConfig]);

  const updatePasswordMinLength = useCallback((length: number) => {
    updateNestedConfig('security', 'passwordMinLength', length);
  }, [updateNestedConfig]);

  const toggleTwoFactor = useCallback(() => {
    updateNestedConfig('security', 'enableTwoFactor', !config.security.enableTwoFactor);
  }, [updateNestedConfig, config.security.enableTwoFactor]);

  return {
    security: config.security,
    updateSessionTimeout,
    updateMaxLoginAttempts,
    updatePasswordMinLength,
    toggleTwoFactor,
  };
}

/**
 * Hook para verificar o ambiente atual
 */
export function useEnvironment() {
  const { config } = useConfig();

  return {
    environment: config.environment,
    isDevelopment: ConfigService.isDevelopment(),
    isProduction: ConfigService.isProduction(),
    isStaging: config.environment === 'staging',
  };
}

/**
 * Hook para configurações específicas do ambiente
 */
export function useEnvironmentConfig() {
  const [envConfig, setEnvConfig] = useState(() => ConfigService.getEnvironmentConfig());
  const { config } = useConfig();

  useEffect(() => {
    setEnvConfig(ConfigService.getEnvironmentConfig());
  }, [config.environment]);

  return envConfig;
}

/**
 * Hook para backup e restore de configurações
 */
export function useConfigBackup() {
  const exportConfig = useCallback(() => {
    return ConfigService.exportConfig();
  }, []);

  const importConfig = useCallback((configJson: string) => {
    try {
      ConfigService.importConfig(configJson);
      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, []);

  const downloadConfig = useCallback(() => {
    const configJson = exportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `app-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [exportConfig]);

  return {
    exportConfig,
    importConfig,
    downloadConfig,
  };
}

/**
 * Hook para configurações reativas baseadas em condições
 */
export function useConditionalConfig<T>(
  selector: (config: AppConfig) => T,
  dependencies: any[] = []
) {
  const { config } = useConfig();
  const [value, setValue] = useState(() => selector(config));

  useEffect(() => {
    setValue(selector(config));
  }, [config, selector, ...dependencies]);

  return value;
}
