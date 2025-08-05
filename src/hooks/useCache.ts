// src/hooks/useCache.ts
import { useCallback, useEffect, useState } from "react";
import { CacheService } from "@/services/cache.service";

/**
 * Hook para gerenciamento de cache em componentes React
 * Fornece uma interface reativa para o CacheService
 */
export function useCache<T>(key: string, ttl?: number) {
  const [data, setData] = useState<T | null>(() => CacheService.get<T>(key));
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Atualiza o cache e o estado local
   */
  const setCachedData = useCallback((newData: T, customTtl?: number) => {
    CacheService.set(key, newData, customTtl || ttl);
    setData(newData);
  }, [key, ttl]);

  /**
   * Remove do cache e limpa o estado local
   */
  const clearCachedData = useCallback(() => {
    CacheService.delete(key);
    setData(null);
  }, [key]);

  /**
   * Recarrega dados do cache
   */
  const reloadFromCache = useCallback(() => {
    const cachedData = CacheService.get<T>(key);
    setData(cachedData);
    return cachedData;
  }, [key]);

  /**
   * Verifica se os dados existem no cache
   */
  const hasData = useCallback(() => {
    return CacheService.has(key);
  }, [key]);

  /**
   * Wrapper para funções que devem ser cacheadas
   */
  const withCache = useCallback(
    async <R>(fn: () => Promise<R>, customTtl?: number): Promise<R> => {
      setIsLoading(true);
      try {
        // Verifica se já existe no cache
        const cached = CacheService.get<R>(key);
        if (cached !== null) {
          setData(cached as unknown as T);
          return cached;
        }

        // Executa a função e armazena no cache
        const result = await fn();
        CacheService.set(key, result, customTtl || ttl);
        setData(result as unknown as T);
        
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [key, ttl]
  );

  return {
    data,
    isLoading,
    setCachedData,
    clearCachedData,
    reloadFromCache,
    hasData,
    withCache,
  };
}

/**
 * Hook para cache de queries de banco de dados
 */
export function useQueryCache<T>(table: string, filters?: Record<string, any>, ttl?: number) {
  const key = CacheService.generateQueryKey(table, filters);
  const cache = useCache<T>(key, ttl);

  /**
   * Invalida todas as queries de uma tabela
   */
  const invalidateTable = useCallback(() => {
    const deletedCount = CacheService.invalidateQueries(table);
    cache.reloadFromCache();
    return deletedCount;
  }, [table, cache]);

  return {
    ...cache,
    invalidateTable,
  };
}

/**
 * Hook para cache de dados do usuário
 */
export function useUserCache<T>(userId: string, suffix?: string, ttl?: number) {
  const key = CacheService.generateUserKey(userId, suffix);
  const cache = useCache<T>(key, ttl);

  /**
   * Limpa todos os dados do usuário do cache
   */
  const clearUserData = useCallback(() => {
    const deletedCount = CacheService.deleteUserData(userId);
    cache.reloadFromCache();
    return deletedCount;
  }, [userId, cache]);

  return {
    ...cache,
    clearUserData,
  };
}

/**
 * Hook para cache de chamadas de API
 */
export function useApiCache<T>(endpoint: string, params?: Record<string, any>, ttl?: number) {
  const key = CacheService.generateApiKey(endpoint, params);
  const cache = useCache<T>(key, ttl);

  /**
   * Invalida cache de um endpoint específico
   */
  const invalidateEndpoint = useCallback(() => {
    const deletedCount = CacheService.deletePattern(`^api:${endpoint}`);
    cache.reloadFromCache();
    return deletedCount;
  }, [endpoint, cache]);

  return {
    ...cache,
    invalidateEndpoint,
  };
}

/**
 * Hook para estatísticas do cache
 */
export function useCacheStats() {
  const [stats, setStats] = useState(() => CacheService.getStats());

  const refreshStats = useCallback(() => {
    setStats(CacheService.getStats());
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshStats, 5000); // Atualiza a cada 5 segundos
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    refreshStats,
  };
}

/**
 * Hook para cache com invalidação automática
 */
export function useCacheWithInvalidation<T>(
  key: string,
  dependencies: any[],
  ttl?: number
) {
  const cache = useCache<T>(key, ttl);

  // Invalida o cache quando as dependências mudam
  useEffect(() => {
    cache.clearCachedData();
  }, [cache, ...dependencies]);

  return cache;
}

/**
 * Hook para cache persistente (sobrevive a recarregamentos da página)
 */
export function usePersistentCache<T>(key: string, ttl?: number) {
  const cache = useCache<T>(key, ttl);

  // Carrega do localStorage na inicialização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.timestamp && Date.now() - parsed.timestamp < (ttl || 300000)) {
            cache.setCachedData(parsed.data, ttl);
          } else {
            localStorage.removeItem(`cache_${key}`);
          }
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
    }
  }, [key, ttl, cache]);

  // Salva no localStorage quando os dados mudam
  useEffect(() => {
    if (typeof window !== 'undefined' && cache.data !== null) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify({
          data: cache.data,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }
  }, [key, cache.data]);

  return cache;
}