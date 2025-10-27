import * as React from 'react';

/**
 * Sistema Completo de Otimização e Analytics
 * 
 * Este arquivo serve como ponto de entrada principal para todo o sistema
 * de otimização de performance e análise de comportamento.
 * 
 * @version 1.0.0
 * @author Hub Control Team
 */

// ============================================
// EXPORTAÇÕES PRINCIPAIS
// ============================================

// Dashboards e Componentes UI
export {
  AutoOptimizationDashboard,
  ResourceOptimizationDashboard,
  RealTimePerformanceDashboard,
  GlobalConfigDashboard,
  OptimizationNavigationBar,
  OptimizationBreadcrumb,
  OptimizationNavigationMenu,
  OptimizationSequentialNavigation,
  OptimizationSidebar,
  OptimizationQuickNavigation
} from '@/components/optimization';

export {
  UserBehaviorDashboard,
  PredictiveAnalyticsDashboard
} from '@/components/analytics';

// Bibliotecas Core
export {
  getAutoOptimizer,
  useAutoOptimization,
  useOptimizationMetrics
} from '@/lib/auto-optimization';

export {
  getResourceOptimizer,
  useResourceOptimization
} from '@/lib/resource-optimization';

export {
  behaviorAnalyzer as userBehaviorAnalyzer,
  useUserBehaviorAnalytics as useBehaviorAnalytics,
  sessionTracker
} from '@/lib/user-behavior-analytics';

export {
  predictiveAnalytics as predictiveAnalyzer,
  usePredictiveAnalytics
} from '@/lib/predictive-analytics';

export {
  realTimeOptimizer,
  useRealTimeOptimization,
  usePerformanceMetrics,
  useOptimizationRules,
  PerformanceUtils
} from '@/lib/real-time-performance-optimizer';

export {
  optimizationConfig,
  useOptimizationConfig
} from '@/lib/optimization-config';

export {
  NavigationUtils,
  useOptimizationNavigation,
  OPTIMIZATION_ROUTES,
  NAVIGATION_CONFIG
} from '@/lib/optimization-routes';

// ============================================
// TIPOS E INTERFACES
// ============================================

// Removido reexport desnecessário de tipos para evitar erros de build.
// Os tipos devem ser importados diretamente dos módulos específicos.

// ============================================
// SISTEMA DE INICIALIZAÇÃO
// ============================================

/**
 * Configuração padrão do sistema
 */
export const DEFAULT_SYSTEM_CONFIG = {
  autoStart: true,
  enableAnalytics: true,
  enablePredictive: true,
  enableRealTimeOptimization: true,
  respectDoNotTrack: true,
  debugMode: false
};

/**
 * Classe principal do sistema de otimização
 */
export class OptimizationSystem {
  private static instance: OptimizationSystem;
  private initialized = false;
  private config: typeof DEFAULT_SYSTEM_CONFIG;
  
  private constructor(config?: Partial<typeof DEFAULT_SYSTEM_CONFIG>) {
    this.config = { ...DEFAULT_SYSTEM_CONFIG, ...(config || {}) };
  }
  
  /**
   * Obtém a instância singleton do sistema
   */
  static getInstance(config?: Partial<typeof DEFAULT_SYSTEM_CONFIG>): OptimizationSystem {
    if (!OptimizationSystem.instance) {
      OptimizationSystem.instance = new OptimizationSystem(config);
    }
    return OptimizationSystem.instance;
  }
  
  /**
   * Inicializa todo o sistema de otimização
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[OptimizationSystem] Sistema já foi inicializado');
      return;
    }
    
    try {
      console.log('[OptimizationSystem] Inicializando sistema...');
      
      // Verifica se está no navegador
      if (typeof window === 'undefined') {
        console.log('[OptimizationSystem] Ambiente servidor detectado, pulando inicialização');
        return;
      }
      
      // Verifica Do Not Track
      if (this.config.respectDoNotTrack && navigator.doNotTrack === '1') {
        console.log('[OptimizationSystem] Do Not Track detectado, desabilitando analytics');
        this.config.enableAnalytics = false;
        this.config.enablePredictive = false;
      }
      
      // Inicializa módulos conforme configuração
      const initPromises: Promise<void>[] = [];
      
      if (this.config.enableRealTimeOptimization) {
        initPromises.push(this.initializeRealTimeOptimization());
      }
      
      if (this.config.enableAnalytics) {
        initPromises.push(this.initializeBehaviorAnalytics());
      }
      
      if (this.config.enablePredictive) {
        initPromises.push(this.initializePredictiveAnalytics());
      }
      
      // Aguarda inicialização de todos os módulos
      await Promise.all(initPromises);
      
      this.initialized = true;
      console.log('[OptimizationSystem] Sistema inicializado com sucesso');
      
      // Emite evento de inicialização
      window.dispatchEvent(new CustomEvent('optimization-system-ready', {
        detail: { config: this.config }
      }));
      
    } catch (error) {
      console.error('[OptimizationSystem] Erro na inicialização:', error);
      throw error;
    }
  }
  
  /**
   * Inicializa otimização em tempo real
   */
  private async initializeRealTimeOptimization(): Promise<void> {
    const { realTimeOptimizer } = await import('@/lib/real-time-performance-optimizer');
    realTimeOptimizer.start();
    console.log('[OptimizationSystem] Otimização em tempo real iniciada');
  }
  
  /**
   * Inicializa análise de comportamento
   */
  private async initializeBehaviorAnalytics(): Promise<void> {
    await import('@/lib/user-behavior-analytics');
    console.log('[OptimizationSystem] Análise de comportamento pronta');
  }
  
  /**
   * Inicializa análise preditiva
   */
  private async initializePredictiveAnalytics(): Promise<void> {
    const { predictiveAnalytics } = await import('@/lib/predictive-analytics');
    predictiveAnalytics.start();
    console.log('[OptimizationSystem] Análise preditiva iniciada');
  }
  
  /**
   * Para todo o sistema
   */
  async stop(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    try {
      // Para todos os módulos
      const stopActions: Array<() => void | Promise<void>> = [];
      
      if (this.config.enableRealTimeOptimization) {
        const { realTimeOptimizer } = await import('@/lib/real-time-performance-optimizer');
        stopActions.push(() => realTimeOptimizer.stop());
      }
      
      if (this.config.enableAnalytics) {
        // Sem ação explícita: behaviorAnalyzer não possui stop(); o SessionTracker é gerenciado internamente
      }
      
      if (this.config.enablePredictive) {
        const { predictiveAnalytics } = await import('@/lib/predictive-analytics');
        stopActions.push(() => predictiveAnalytics.stop());
      }
      
      // Executa todas as paradas, respeitando possíveis assinaturas síncronas/assíncronas
      await Promise.all(stopActions.map(action => Promise.resolve(action())));
      
      this.initialized = false;
      console.log('[OptimizationSystem] Sistema parado com sucesso');
      
    } catch (error) {
      console.error('[OptimizationSystem] Erro ao parar sistema:', error);
      throw error;
    }
  }
  
  /**
   * Obtém status do sistema
   */
  getStatus() {
    return {
      initialized: this.initialized,
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Atualiza configuração do sistema
   */
  updateConfig(newConfig: Partial<typeof DEFAULT_SYSTEM_CONFIG>) {
    this.config = { ...this.config, ...newConfig };
    console.log('[OptimizationSystem] Configuração atualizada:', this.config);
  }
}

// ============================================
// INSTÂNCIA GLOBAL E FUNÇÕES DE CONVENIÊNCIA
// ============================================

/**
 * Instância global do sistema
 */
export const optimizationSystem = OptimizationSystem.getInstance();

/**
 * Inicializa o sistema com configuração opcional
 */
export async function initializeOptimizationSystem(
  config?: Partial<typeof DEFAULT_SYSTEM_CONFIG>
): Promise<void> {
  const system = OptimizationSystem.getInstance(config);
  await system.initialize();
}

/**
 * Para o sistema de otimização
 */
export async function stopOptimizationSystem(): Promise<void> {
  await optimizationSystem.stop();
}

/**
 * Obtém status do sistema
 */
export function getOptimizationSystemStatus() {
  return optimizationSystem.getStatus();
}

/**
 * Hook React para usar o sistema de otimização
 */
export function useOptimizationSystem() {
  const [status, setStatus] = React.useState(optimizationSystem.getStatus());
  
  React.useEffect(() => {
    const updateStatus = () => setStatus(optimizationSystem.getStatus());
    
    // Atualiza status quando sistema estiver pronto
    window.addEventListener('optimization-system-ready', updateStatus);
    
    // Cleanup
    return () => {
      window.removeEventListener('optimization-system-ready', updateStatus);
    };
  }, []);
  
  return {
    ...status,
    initialize: (config?: Partial<typeof DEFAULT_SYSTEM_CONFIG>) => 
      initializeOptimizationSystem(config),
    stop: stopOptimizationSystem,
    updateConfig: (config: Partial<typeof DEFAULT_SYSTEM_CONFIG>) => 
      optimizationSystem.updateConfig(config)
  };
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA EM PRODUÇÃO
// ============================================

// Inicializa automaticamente em produção
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Aguarda o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeOptimizationSystem().catch(console.error);
    });
  } else {
    initializeOptimizationSystem().catch(console.error);
  }
}

export default OptimizationSystem;
