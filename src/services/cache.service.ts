// src/services/cache.service.ts

/**
 * Interface para itens do cache
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
  key: string;
}

/**
 * Configuração do cache
 */
interface CacheConfig {
  defaultTTL: number; // TTL padrão em milissegundos
  maxSize: number; // Número máximo de itens no cache
  cleanupInterval: number; // Intervalo de limpeza em milissegundos
}

/**
 * Estratégias de invalidação do cache
 */
export enum CacheStrategy {
  LRU = 'LRU', // Least Recently Used
  TTL = 'TTL', // Time To Live
  MANUAL = 'MANUAL' // Invalidação manual
}

/**
 * Serviço de cache em memória
 * Fornece funcionalidades de cache com TTL, estratégias de invalidação e limpeza automática
 */
export class CacheService {
  private static cache = new Map<string, CacheItem<any>>();
  private static accessOrder = new Map<string, number>(); // Para LRU
  private static cleanupTimer: NodeJS.Timeout | null = null;
  
  private static config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    maxSize: 1000,
    cleanupInterval: 60 * 1000 // 1 minuto
  };

  /**
   * Configura o serviço de cache
   */
  static configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.startCleanupTimer();
  }

  /**
   * Inicia o timer de limpeza automática
   */
  private static startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Verifica se um item do cache ainda é válido
   */
  private static isValid<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  /**
   * Atualiza a ordem de acesso para LRU
   */
  private static updateAccessOrder(key: string): void {
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Remove itens expirados e aplica estratégia de tamanho máximo
   */
  private static cleanup(): void {
    // Remove itens expirados
    for (const [key, item] of this.cache.entries()) {
      if (!this.isValid(item)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
      }
    }

    // Aplica limite de tamanho usando LRU
    if (this.cache.size > this.config.maxSize) {
      const sortedByAccess = Array.from(this.accessOrder.entries())
        .sort(([, a], [, b]) => a - b); // Ordena por tempo de acesso (mais antigo primeiro)
      
      const itemsToRemove = sortedByAccess.slice(0, this.cache.size - this.config.maxSize);
      
      for (const [key] of itemsToRemove) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
      }
    }
  }

  /**
   * Armazena um item no cache
   */
  static set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key
    };

    this.cache.set(key, item);
    this.updateAccessOrder(key);

    // Força limpeza se necessário
    if (this.cache.size > this.config.maxSize * 1.1) {
      this.cleanup();
    }
  }

  /**
   * Recupera um item do cache
   */
  static get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) {
      return null;
    }

    if (!this.isValid(item)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    this.updateAccessOrder(key);
    return item.data;
  }

  /**
   * Verifica se uma chave existe no cache e é válida
   */
  static has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (!this.isValid(item)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove um item específico do cache
   */
  static delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  /**
   * Remove todos os itens do cache
   */
  static clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * Remove itens do cache baseado em um padrão
   */
  static deletePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Wrapper para funções com cache automático
   */
  static async memoize<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    keyGenerator: (...args: T) => string,
    ttl?: number
  ): Promise<(...args: T) => Promise<R>> {
    return async (...args: T): Promise<R> => {
      const key = keyGenerator(...args);
      
      // Verifica se já existe no cache
      const cached = this.get<R>(key);
      if (cached !== null) {
        return cached;
      }

      // Executa a função e armazena o resultado
      const result = await fn(...args);
      this.set(key, result, ttl);
      
      return result;
    };
  }

  /**
   * Wrapper para funções síncronas com cache automático
   */
  static memoizeSync<T extends any[], R>(
    fn: (...args: T) => R,
    keyGenerator: (...args: T) => string,
    ttl?: number
  ): (...args: T) => R {
    return (...args: T): R => {
      const key = keyGenerator(...args);
      
      // Verifica se já existe no cache
      const cached = this.get<R>(key);
      if (cached !== null) {
        return cached;
      }

      // Executa a função e armazena o resultado
      const result = fn(...args);
      this.set(key, result, ttl);
      
      return result;
    };
  }

  /**
   * Métodos utilitários para chaves específicas
   */
  static generateUserKey(userId: string, suffix?: string): string {
    return `user:${userId}${suffix ? `:${suffix}` : ''}`;
  }

  static generateQueryKey(table: string, filters?: Record<string, any>): string {
    const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
    return `query:${table}${filterStr}`;
  }

  static generateApiKey(endpoint: string, params?: Record<string, any>): string {
    const paramStr = params ? `:${JSON.stringify(params)}` : '';
    return `api:${endpoint}${paramStr}`;
  }

  /**
   * Métodos específicos para diferentes tipos de dados
   */
  static setUserData(userId: string, data: any, ttl?: number): void {
    this.set(this.generateUserKey(userId), data, ttl);
  }

  static getUserData<T>(userId: string): T | null {
    return this.get<T>(this.generateUserKey(userId));
  }

  static deleteUserData(userId: string): boolean {
    const deletedCount = this.deletePattern(`^user:${userId}`);
    return deletedCount > 0;
  }

  static setQueryResult(table: string, filters: Record<string, any>, data: any, ttl?: number): void {
    this.set(this.generateQueryKey(table, filters), data, ttl);
  }

  static getQueryResult<T>(table: string, filters?: Record<string, any>): T | null {
    return this.get<T>(this.generateQueryKey(table, filters));
  }

  static invalidateQueries(table: string): number {
    return this.deletePattern(`^query:${table}`);
  }

  /**
   * Estatísticas do cache
   */
  static getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  } {
    const items = Array.from(this.cache.values());
    const timestamps = items.map(item => item.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // TODO: Implementar contador de hits/misses
      oldestItem: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
      newestItem: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null
    };
  }

  /**
   * Para o timer de limpeza (útil para testes)
   */
  static stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
