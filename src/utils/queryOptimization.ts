/**
 * Sistema de otimização de queries para prevenir problemas N+1
 * e implementar cache inteligente para melhorar performance
 */

import { logger } from '@/lib/logger';

// Interface para configuração de cache
interface CacheConfig {
  ttl: number; // Time to live em milissegundos
  maxSize: number; // Tamanho máximo do cache
  enableLogging: boolean;
}

// Interface para item do cache
interface CacheItem<T> {
  data: T;
  timestamp: number;
  hits: number;
}

// Classe para gerenciar cache com TTL e LRU
class QueryCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutos por padrão
      maxSize: 100,
      enableLogging: false,
      ...config
    };
  }

  // Obter item do cache
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      if (this.config.enableLogging) {
        logger.debug(`Cache miss para chave: ${key}`);
      }
      return null;
    }

    // Verificar se o item expirou
    if (Date.now() - item.timestamp > this.config.ttl) {
      this.cache.delete(key);
      if (this.config.enableLogging) {
        logger.debug(`Cache expirado para chave: ${key}`);
      }
      return null;
    }

    // Incrementar contador de hits
    item.hits++;
    
    if (this.config.enableLogging) {
      logger.debug(`Cache hit para chave: ${key} (${item.hits} hits)`);
    }
    
    return item.data;
  }

  // Armazenar item no cache
  set(key: string, data: T): void {
    // Limpar cache se atingir tamanho máximo
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });

    if (this.config.enableLogging) {
      logger.debug(`Item armazenado no cache: ${key}`);
    }
  }

  // Remover item específico do cache
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.config.enableLogging) {
      logger.debug(`Item removido do cache: ${key}`);
    }
    return deleted;
  }

  // Limpar todo o cache
  clear(): void {
    this.cache.clear();
    if (this.config.enableLogging) {
      logger.debug('Cache limpo completamente');
    }
  }

  // Remover item menos usado (LRU)
  private evictLRU(): void {
    let lruKey = '';
    let lruHits = Infinity;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.hits < lruHits || (item.hits === lruHits && item.timestamp < oldestTime)) {
        lruKey = key;
        lruHits = item.hits;
        oldestTime = item.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      if (this.config.enableLogging) {
        logger.debug(`Item LRU removido: ${lruKey}`);
      }
    }
  }

  // Obter estatísticas do cache
  getStats() {
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;
    let totalHits = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp <= this.config.ttl) {
        validItems++;
        totalHits += item.hits;
      } else {
        expiredItems++;
      }
    }

    return {
      totalItems: this.cache.size,
      validItems,
      expiredItems,
      totalHits,
      hitRate: validItems > 0 ? totalHits / validItems : 0,
      memoryUsage: this.cache.size / this.config.maxSize
    };
  }
}

// Sistema de batch loading para prevenir N+1
class BatchLoader<K, V> {
  private batchFunction: (keys: K[]) => Promise<Map<K, V>>;
  private cache: QueryCache<V>;
  private pendingKeys = new Set<K>();
  private pendingPromise: Promise<void> | null = null;
  private batchTimeout: number;

  constructor(
    batchFunction: (keys: K[]) => Promise<Map<K, V>>,
    options: {
      batchTimeout?: number;
      cacheConfig?: Partial<CacheConfig>;
    } = {}
  ) {
    this.batchFunction = batchFunction;
    this.cache = new QueryCache<V>(options.cacheConfig);
    this.batchTimeout = options.batchTimeout || 10; // 10ms por padrão
  }

  // Carregar um item (será agrupado automaticamente)
  async load(key: K): Promise<V | null> {
    const keyStr = String(key);
    
    // Verificar cache primeiro
    const cached = this.cache.get(keyStr);
    if (cached !== null) {
      return cached;
    }

    // Adicionar à lista de pendentes
    this.pendingKeys.add(key);

    // Se não há batch pendente, criar um
    if (!this.pendingPromise) {
      this.pendingPromise = this.scheduleBatch();
    }

    // Aguardar o batch ser processado
    await this.pendingPromise;

    // Tentar obter do cache novamente
    return this.cache.get(keyStr);
  }

  // Carregar múltiplos itens
  async loadMany(keys: K[]): Promise<Map<K, V | null>> {
    const result = new Map<K, V | null>();
    const keysToLoad: K[] = [];

    // Verificar cache para cada chave
    for (const key of keys) {
      const cached = this.cache.get(String(key));
      if (cached !== null) {
        result.set(key, cached);
      } else {
        keysToLoad.push(key);
        this.pendingKeys.add(key);
      }
    }

    // Se há chaves para carregar, processar batch
    if (keysToLoad.length > 0) {
      if (!this.pendingPromise) {
        this.pendingPromise = this.scheduleBatch();
      }
      await this.pendingPromise;

      // Obter resultados do cache
      for (const key of keysToLoad) {
        result.set(key, this.cache.get(String(key)));
      }
    }

    return result;
  }

  // Agendar processamento do batch
  private async scheduleBatch(): Promise<void> {
    // Aguardar um pouco para agrupar mais requisições
    await new Promise(resolve => setTimeout(resolve, this.batchTimeout));

    const keysToProcess = Array.from(this.pendingKeys);
    this.pendingKeys.clear();
    this.pendingPromise = null;

    if (keysToProcess.length === 0) {
      return;
    }

    try {
      logger.debug(`Processando batch de ${keysToProcess.length} itens`);
      
      const results = await this.batchFunction(keysToProcess);
      
      // Armazenar resultados no cache
      for (const [key, value] of results.entries()) {
        this.cache.set(String(key), value);
      }
      
      logger.debug(`Batch processado com sucesso: ${results.size} itens carregados`);
    } catch (error) {
      logger.error('Erro ao processar batch:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Limpar cache
  clearCache(): void {
    this.cache.clear();
  }

  // Obter estatísticas
  getStats() {
    return {
      cache: this.cache.getStats(),
      pendingKeys: this.pendingKeys.size,
      hasPendingBatch: this.pendingPromise !== null
    };
  }
}

// Instâncias globais de cache para diferentes tipos de dados
export const mappingsCache = new QueryCache({
  ttl: 5 * 60 * 1000, // 5 minutos
  maxSize: 200,
  enableLogging: process.env.NODE_ENV === 'development'
});

export const packagesCache = new QueryCache({
  ttl: 10 * 60 * 1000, // 10 minutos (dados menos voláteis)
  maxSize: 500,
  enableLogging: process.env.NODE_ENV === 'development'
});

export const plansCache = new QueryCache({
  ttl: 15 * 60 * 1000, // 15 minutos
  maxSize: 300,
  enableLogging: process.env.NODE_ENV === 'development'
});

// Batch loaders para diferentes entidades
export const createMappingsBatchLoader = (fetchFunction: (ids: string[]) => Promise<any[]>) => {
  return new BatchLoader<string, any>(
    async (ids) => {
      const mappings = await fetchFunction(ids);
      const map = new Map();
      mappings.forEach(mapping => map.set(mapping.id, mapping));
      return map;
    },
    {
      batchTimeout: 10,
      cacheConfig: {
        ttl: 5 * 60 * 1000,
        maxSize: 200,
        enableLogging: process.env.NODE_ENV === 'development'
      }
    }
  );
};

export const createPackagesBatchLoader = (fetchFunction: (ids: string[]) => Promise<any[]>) => {
  return new BatchLoader<string, any>(
    async (ids) => {
      const packages = await fetchFunction(ids);
      const map = new Map();
      packages.forEach(pkg => map.set(pkg.id, pkg));
      return map;
    },
    {
      batchTimeout: 15,
      cacheConfig: {
        ttl: 10 * 60 * 1000,
        maxSize: 500,
        enableLogging: process.env.NODE_ENV === 'development'
      }
    }
  );
};

// Utilitários para invalidação de cache
export const invalidateCache = {
  // Invalidar cache de mapeamentos
  mappings: (id?: string) => {
    if (id) {
      mappingsCache.delete(id);
      mappingsCache.delete(`mapping_${id}`);
    } else {
      mappingsCache.clear();
    }
  },

  // Invalidar cache de pacotes
  packages: (id?: string) => {
    if (id) {
      packagesCache.delete(id);
      packagesCache.delete(`package_${id}`);
    } else {
      packagesCache.clear();
    }
  },

  // Invalidar cache de planos
  plans: (id?: string) => {
    if (id) {
      plansCache.delete(id);
      plansCache.delete(`plan_${id}`);
    } else {
      plansCache.clear();
    }
  },

  // Invalidar todos os caches
  all: () => {
    mappingsCache.clear();
    packagesCache.clear();
    plansCache.clear();
  }
};

// Hook para monitorar performance de cache
export const getCacheStats = () => {
  return {
    mappings: mappingsCache.getStats(),
    packages: packagesCache.getStats(),
    plans: plansCache.getStats()
  };
};

// Função para otimizar queries relacionadas
export const optimizeRelatedQueries = async <T>(
  mainQuery: () => Promise<T[]>,
  relatedQueries: {
    [key: string]: (mainItems: T[]) => Promise<any[]>
  },
  options: {
    cacheKey?: string;
    ttl?: number;
  } = {}
): Promise<{ main: T[]; related: { [key: string]: any[] } }> => {
  const cacheKey = options.cacheKey || 'optimized_query';
  const cache = new QueryCache({ ttl: options.ttl || 5 * 60 * 1000 });
  
  // Verificar cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Executar query principal
    const mainItems = await mainQuery();
    
    // Executar queries relacionadas em paralelo
    const relatedPromises = Object.entries(relatedQueries).map(
      async ([key, queryFn]) => {
        const result = await queryFn(mainItems);
        return [key, result];
      }
    );
    
    const relatedResults = await Promise.all(relatedPromises);
    const related = Object.fromEntries(relatedResults);
    
    const result = { main: mainItems, related };
    
    // Armazenar no cache
    cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    logger.error('Erro ao otimizar queries relacionadas:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

export { QueryCache, BatchLoader };
