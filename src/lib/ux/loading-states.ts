/**
 * Sistema avançado de estados de carregamento e UX
 * Melhora a experiência do usuário durante operações assíncronas
 */

import { logger } from '@/lib/logger';

interface LoadingState {
  id: string;
  message: string;
  progress?: number;
  startTime: number;
  estimatedDuration?: number;
  type: 'spinner' | 'progress' | 'skeleton' | 'pulse';
}

interface LoadingOptions {
  message?: string;
  type?: LoadingState['type'];
  estimatedDuration?: number;
  showProgress?: boolean;
  minimumDuration?: number;
}

class LoadingStateManager {
  private states: Map<string, LoadingState> = new Map();
  private callbacks: Map<string, (state: LoadingState | null) => void> = new Map();
  private globalCallback?: (states: LoadingState[]) => void;

  /**
   * Inicia um novo estado de carregamento
   */
  start(id: string, options: LoadingOptions = {}): void {
    const state: LoadingState = {
      id,
      message: options.message || 'Carregando...',
      progress: options.showProgress ? 0 : undefined,
      startTime: Date.now(),
      estimatedDuration: options.estimatedDuration,
      type: options.type || 'spinner',
    };

    this.states.set(id, state);
    this.notifyCallbacks(id, state);

    logger.debug('Loading state started:', { id, options });

    // Auto-complete após duração estimada (fallback)
    if (options.estimatedDuration) {
      setTimeout(() => {
        if (this.states.has(id)) {
          logger.warn('Loading state auto-completed (timeout):', { id });
          this.complete(id);
        }
      }, options.estimatedDuration + 5000); // 5s buffer
    }
  }

  /**
   * Atualiza progresso de um estado de carregamento
   */
  updateProgress(id: string, progress: number, message?: string): void {
    const state = this.states.get(id);
    if (!state) return;

    state.progress = Math.max(0, Math.min(100, progress));
    if (message) state.message = message;

    this.states.set(id, state);
    this.notifyCallbacks(id, state);

    logger.debug('Loading progress updated:', { id, progress, message });
  }

  /**
   * Atualiza mensagem de um estado de carregamento
   */
  updateMessage(id: string, message: string): void {
    const state = this.states.get(id);
    if (!state) return;

    state.message = message;
    this.states.set(id, state);
    this.notifyCallbacks(id, state);

    logger.debug('Loading message updated:', { id, message });
  }

  /**
   * Completa um estado de carregamento
   */
  complete(id: string, options: { minimumDuration?: number } = {}): void {
    const state = this.states.get(id);
    if (!state) return;

    const duration = Date.now() - state.startTime;
    const minimumDuration = options.minimumDuration || 300; // Mínimo 300ms para evitar flicker

    const cleanup = () => {
      this.states.delete(id);
      this.notifyCallbacks(id, null);
      logger.debug('Loading state completed:', { id, duration });
    };

    if (duration < minimumDuration) {
      setTimeout(cleanup, minimumDuration - duration);
    } else {
      cleanup();
    }
  }

  /**
   * Falha em um estado de carregamento
   */
  error(id: string, error: string): void {
    const state = this.states.get(id);
    if (!state) return;

    logger.error(`Loading state failed for ${id}`, new Error(error));
    this.complete(id);
  }

  /**
   * Verifica se um estado está ativo
   */
  isLoading(id: string): boolean {
    return this.states.has(id);
  }

  /**
   * Obtém estado específico
   */
  getState(id: string): LoadingState | null {
    return this.states.get(id) || null;
  }

  /**
   * Obtém todos os estados ativos
   */
  getAllStates(): LoadingState[] {
    return Array.from(this.states.values());
  }

  /**
   * Registra callback para estado específico
   */
  onStateChange(id: string, callback: (state: LoadingState | null) => void): void {
    this.callbacks.set(id, callback);
  }

  /**
   * Registra callback global para todos os estados
   */
  onGlobalStateChange(callback: (states: LoadingState[]) => void): void {
    this.globalCallback = callback;
  }

  /**
   * Remove callback
   */
  removeCallback(id: string): void {
    this.callbacks.delete(id);
  }

  /**
   * Limpa todos os estados (útil para cleanup)
   */
  clearAll(): void {
    const ids = Array.from(this.states.keys());
    ids.forEach(id => this.complete(id));
  }

  /**
   * Notifica callbacks registrados
   */
  private notifyCallbacks(id: string, state: LoadingState | null): void {
    // Callback específico
    const callback = this.callbacks.get(id);
    if (callback) {
      try {
        callback(state);
      } catch (error) {
        logger.error('Error in loading state callback:', error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Callback global
    if (this.globalCallback) {
      try {
        this.globalCallback(this.getAllStates());
      } catch (error) {
        logger.error('Error in global loading state callback:', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

// Instância singleton
export const loadingManager = new LoadingStateManager();

/**
 * Hook para facilitar uso em componentes React
 */
export function useLoadingState(id: string) {
  return {
    start: (options?: LoadingOptions) => loadingManager.start(id, options),
    updateProgress: (progress: number, message?: string) => 
      loadingManager.updateProgress(id, progress, message),
    updateMessage: (message: string) => loadingManager.updateMessage(id, message),
    complete: (options?: { minimumDuration?: number }) => 
      loadingManager.complete(id, options),
    error: (error: string) => loadingManager.error(id, error),
    isLoading: () => loadingManager.isLoading(id),
    getState: () => loadingManager.getState(id),
  };
}

/**
 * Decorator para funções assíncronas com loading automático
 */
export function withLoading<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: LoadingOptions & { id?: string } = {}
): T {
  return (async (...args: any[]) => {
    const id = options.id || `fn_${Date.now()}_${Math.random()}`;
    
    loadingManager.start(id, options);
    
    try {
      const result = await fn(...args);
      loadingManager.complete(id);
      return result;
    } catch (error) {
      loadingManager.error(id, error instanceof Error ? error.message : 'Erro desconhecido');
      throw error;
    }
  }) as T;
}

/**
 * Utilitário para operações com progresso simulado
 */
export async function withSimulatedProgress<T>(
  operation: () => Promise<T>,
  options: {
    id: string;
    message?: string;
    steps?: string[];
    duration?: number;
  }
): Promise<T> {
  const { id, message = 'Processando...', steps = [], duration = 3000 } = options;
  
  loadingManager.start(id, {
    message,
    type: 'progress',
    showProgress: true,
    estimatedDuration: duration,
  });

  const stepDuration = duration / (steps.length || 10);
  let currentStep = 0;

  // Simular progresso
  const progressInterval = setInterval(() => {
    const progress = (currentStep / (steps.length || 10)) * 100;
    const stepMessage = steps[currentStep] || message;
    
    loadingManager.updateProgress(id, progress, stepMessage);
    currentStep++;
    
    if (currentStep >= (steps.length || 10)) {
      clearInterval(progressInterval);
    }
  }, stepDuration);

  try {
    const result = await operation();
    clearInterval(progressInterval);
    loadingManager.updateProgress(id, 100, 'Concluído!');
    
    setTimeout(() => loadingManager.complete(id), 500);
    
    return result;
  } catch (error) {
    clearInterval(progressInterval);
    loadingManager.error(id, error instanceof Error ? error.message : 'Erro na operação');
    throw error;
  }
}

// Exportar também a classe
export { LoadingStateManager };

// Tipos para uso externo
export type { LoadingState, LoadingOptions };
