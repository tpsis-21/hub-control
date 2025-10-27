/**
 * Utilitário para implementar retry em requisições HTTP
 * Centraliza a lógica de retry para evitar duplicação de código
 */

export interface RetryOptions {
  /** Número máximo de tentativas (padrão: 3) */
  maxRetries?: number;
  /** Delay inicial entre tentativas em ms (padrão: 1000) */
  initialDelay?: number;
  /** Multiplicador para backoff exponencial (padrão: 2) */
  backoffMultiplier?: number;
  /** Delay máximo entre tentativas em ms (padrão: 10000) */
  maxDelay?: number;
  /** Códigos de status HTTP que devem ser retentados (padrão: [408, 429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[];
  /** Timeout para cada tentativa em ms (padrão: 30000) */
  timeout?: number;
  /** Função para determinar se um erro deve ser retentado */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** Callback executado antes de cada retry */
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalTime: number;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  timeout: 30000
};

/**
 * Implementa retry com backoff exponencial para requisições HTTP
 */
export class HttpRetry {
  /**
   * Executa uma requisição fetch com retry automático
   */
  static async fetchWithRetry<T = any>(
    url: string,
    init: RequestInit = {},
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: any;
    let attempts = 0;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      attempts = attempt + 1;
      
      try {
        // Configurar timeout para esta tentativa
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        const requestInit: RequestInit = {
          ...init,
          signal: controller.signal
        };

        const response = await fetch(url, requestInit);
        clearTimeout(timeoutId);

        // Verificar se o status é retentável
        if (!response.ok && config.retryableStatusCodes.includes(response.status)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Sucesso - tentar parsear JSON se possível
        let data: T;
        try {
          data = await response.json();
        } catch {
          data = await response.text() as any;
        }

        return {
          success: true,
          data,
          attempts,
          totalTime: Date.now() - startTime
        };

      } catch (error) {
        lastError = error;

        // Verificar se deve tentar novamente
        const shouldRetry = attempt < config.maxRetries && 
          (config.shouldRetry ? config.shouldRetry(error, attempt + 1) : this.isRetryableError(error, config));

        if (!shouldRetry) {
          break;
        }

        // Calcular delay para próxima tentativa
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        // Callback de retry se fornecido
        if (config.onRetry) {
          config.onRetry(error, attempt + 1, delay);
        }

        // Aguardar antes da próxima tentativa
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Erro desconhecido',
      attempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Executa uma função com retry automático
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: any;
    let attempts = 0;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      attempts = attempt + 1;
      
      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;

        // Verificar se deve tentar novamente
        const shouldRetry = attempt < config.maxRetries && 
          (config.shouldRetry ? config.shouldRetry(error, attempt + 1) : this.isRetryableError(error, config));

        if (!shouldRetry) {
          break;
        }

        // Calcular delay para próxima tentativa
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        // Callback de retry se fornecido
        if (config.onRetry) {
          config.onRetry(error, attempt + 1, delay);
        }

        // Aguardar antes da próxima tentativa
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Erro desconhecido',
      attempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Determina se um erro é retentável
   */
  private static isRetryableError(error: any, config: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>>): boolean {
    // Timeout/AbortError sempre é retentável
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      return true;
    }

    // Erros de rede geralmente são retentáveis
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Verificar códigos de status HTTP
    if (error.message && error.message.includes('HTTP')) {
      const statusMatch = error.message.match(/HTTP (\d+)/);
      if (statusMatch) {
        const status = parseInt(statusMatch[1]);
        return config.retryableStatusCodes.includes(status);
      }
    }

    return false;
  }

  /**
   * Utilitário para aguardar um tempo específico
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Função de conveniência para fetch com retry
 */
export const fetchWithRetry = HttpRetry.fetchWithRetry.bind(HttpRetry);

/**
 * Função de conveniência para executar qualquer função com retry
 */
export const withRetry = HttpRetry.withRetry.bind(HttpRetry);

/**
 * Configurações pré-definidas para diferentes cenários
 */
export const RetryPresets = {
  /** Configuração rápida para APIs internas */
  fast: {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    timeout: 10000
  } as RetryOptions,

  /** Configuração padrão para APIs externas */
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    timeout: 30000
  } as RetryOptions,

  /** Configuração robusta para operações críticas */
  robust: {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    timeout: 60000
  } as RetryOptions,

  /** Configuração para rate limiting (429) */
  rateLimited: {
    maxRetries: 3,
    initialDelay: 5000,
    backoffMultiplier: 1.5,
    maxDelay: 30000,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    timeout: 30000
  } as RetryOptions
};
