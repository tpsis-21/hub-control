// @/lib/cache.ts
/**
 * Sistema de cache simples em memória com TTL (Time To Live)
 * Usado para melhorar performance de APIs que fazem consultas frequentes
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Limpar cache expirado a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Armazena um item no cache
   * @param key Chave única para o item
   * @param data Dados a serem armazenados
   * @param ttlMinutes Tempo de vida em minutos (padrão: 5 minutos)
   */
  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000; // Converter para milissegundos
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    this.cache.set(key, item);
  }

  /**
   * Recupera um item do cache
   * @param key Chave do item
   * @returns Dados armazenados ou null se não existir/expirado
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Verificar se o item expirou
    const now = Date.now();
    const isExpired = (now - item.timestamp) > item.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * Remove um item específico do cache
   * @param key Chave do item a ser removido
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpa todos os itens do cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove itens expirados do cache
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      const isExpired = (now - item.timestamp) > item.ttl;
      if (isExpired) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removidos ${keysToDelete.length} itens expirados`);
    }
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Destrói o cache e limpa o intervalo de limpeza
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Instância singleton do cache que persiste entre recompilações do Next.js
// Em desenvolvimento, o Next.js recompila frequentemente, então usamos globalThis
const globalForCache = globalThis as unknown as {
  memoryCache: MemoryCache | undefined;
};

export const memoryCache = globalForCache.memoryCache ?? new MemoryCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.memoryCache = memoryCache;
}

/**
 * Utilitário para gerar chaves de cache consistentes
 * @param prefix Prefixo da chave (ex: 'activities')
 * @param params Parâmetros que afetam o resultado
 * @returns Chave de cache única
 */
export function generateCacheKey(prefix: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

/**
 * Decorator para cachear resultados de funções async
 * @param cacheKey Chave do cache
 * @param ttlMinutes Tempo de vida em minutos
 */
export function withCache<T>(
  cacheKey: string,
  ttlMinutes: number = 5
) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args: any[]): Promise<T> {
      // Tentar buscar do cache primeiro
      const cached = memoryCache.get<T>(cacheKey);
      if (cached !== null) {
        console.log(`📦 Cache hit: ${cacheKey}`);
        return cached;
      }
      
      // Se não estiver no cache, executar a função
      console.log(`🔄 Cache miss: ${cacheKey}`);
      const result = await method.apply(this, args);
      
      // Armazenar no cache
      memoryCache.set(cacheKey, result, ttlMinutes);
      
      return result;
    };
  };
}

export default memoryCache;