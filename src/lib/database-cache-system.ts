/**
 * Sistema de Cache Inteligente para Banco de Dados
 * 
 * Implementa cache de queries frequentes, invalidação inteligente,
 * métricas de hit rate e otimização automática de cache.
 */

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface CacheEntry {
  id: string;
  key: string;
  data: any;
  query: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  ttl: number; // Time to live em ms
  tags: string[]; // Para invalidação por tags
  size: number; // Tamanho em bytes
}

export interface CacheMetrics {
  totalEntries: number;
  totalSize: number; // em bytes
  hitRate: number; // percentual
  missRate: number; // percentual
  totalHits: number;
  totalMisses: number;
  averageAccessTime: number;
  mostAccessedQueries: CacheEntry[];
  oldestEntries: CacheEntry[];
  largestEntries: CacheEntry[];
}

export interface CacheConfig {
  maxSize: number; // Tamanho máximo em bytes
  maxEntries: number; // Número máximo de entradas
  defaultTTL: number; // TTL padrão em ms
  cleanupInterval: number; // Intervalo de limpeza em ms
  enableCompression: boolean;
  enablePersistence: boolean;
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'size';
}

export interface CacheInvalidationRule {
  id: string;
  name: string;
  description: string;
  tables: string[];
  operations: ('INSERT' | 'UPDATE' | 'DELETE')[];
  tags: string[];
  enabled: boolean;
}

export interface QueryCacheStrategy {
  queryPattern: RegExp;
  ttl: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  shouldCache: (query: string, result: any) => boolean;
}

// ============================================
// ESTRATÉGIAS DE CACHE PADRÃO
// ============================================

const DEFAULT_CACHE_STRATEGIES: QueryCacheStrategy[] = [
  {
    queryPattern: /SELECT.*FROM\s+profiles/i,
    ttl: 5 * 60 * 1000, // 5 minutos
    tags: ['profiles', 'users'],
    priority: 'high',
    shouldCache: (query, result) => Array.isArray(result) && result.length > 0
  },
  {
    queryPattern: /SELECT.*FROM\s+settings/i,
    ttl: 15 * 60 * 1000, // 15 minutos
    tags: ['settings', 'config'],
    priority: 'high',
    shouldCache: (query, result) => result !== null
  },
  {
    queryPattern: /SELECT.*FROM\s+plans/i,
    ttl: 30 * 60 * 1000, // 30 minutos
    tags: ['plans', 'pricing'],
    priority: 'medium',
    shouldCache: (query, result) => Array.isArray(result)
  },
  {
    queryPattern: /SELECT.*COUNT\(.*\)/i,
    ttl: 10 * 60 * 1000, // 10 minutos
    tags: ['aggregations', 'stats'],
    priority: 'medium',
    shouldCache: (query, result) => typeof result === 'number' || (result && typeof result.count === 'number')
  },
  {
    queryPattern: /SELECT.*FROM\s+audit_logs/i,
    ttl: 2 * 60 * 1000, // 2 minutos
    tags: ['audit', 'logs'],
    priority: 'low',
    shouldCache: (query, result) => Array.isArray(result) && result.length < 1000
  }
];

const DEFAULT_INVALIDATION_RULES: CacheInvalidationRule[] = [
  {
    id: 'profiles-changes',
    name: 'Mudanças em Perfis',
    description: 'Invalida cache quando perfis são modificados',
    tables: ['profiles', 'users'],
    operations: ['INSERT', 'UPDATE', 'DELETE'],
    tags: ['profiles', 'users'],
    enabled: true
  },
  {
    id: 'settings-changes',
    name: 'Mudanças em Configurações',
    description: 'Invalida cache quando configurações são modificadas',
    tables: ['settings', 'user_settings'],
    operations: ['INSERT', 'UPDATE', 'DELETE'],
    tags: ['settings', 'config'],
    enabled: true
  },
  {
    id: 'plans-changes',
    name: 'Mudanças em Planos',
    description: 'Invalida cache quando planos são modificados',
    tables: ['plans'],
    operations: ['INSERT', 'UPDATE', 'DELETE'],
    tags: ['plans', 'pricing'],
    enabled: true
  }
];

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useDatabaseCacheSystem() {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [metrics, setMetrics] = useState<CacheMetrics>({
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    totalHits: 0,
    totalMisses: 0,
    averageAccessTime: 0,
    mostAccessedQueries: [],
    oldestEntries: [],
    largestEntries: []
  });
  const [config, setConfig] = useState<CacheConfig>({
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
    defaultTTL: 10 * 60 * 1000, // 10 minutos
    cleanupInterval: 5 * 60 * 1000, // 5 minutos
    enableCompression: true,
    enablePersistence: false,
    evictionPolicy: 'lru'
  });
  const [strategies, setStrategies] = useState<QueryCacheStrategy[]>(DEFAULT_CACHE_STRATEGIES);
  const [invalidationRules, setInvalidationRules] = useState<CacheInvalidationRule[]>(DEFAULT_INVALIDATION_RULES);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  
  const accessTimes = useRef<number[]>([]);
  const cleanupInterval = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // UTILITÁRIOS DE CACHE
  // ============================================

  const generateCacheKey = useCallback((query: string, params?: any): string => {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ').toLowerCase();
    const paramsStr = params ? JSON.stringify(params) : '';
    return btoa(normalizedQuery + paramsStr).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }, []);

  const calculateSize = useCallback((data: any): number => {
    return new Blob([JSON.stringify(data)]).size;
  }, []);

  const compressData = useCallback((data: any): any => {
    if (!config.enableCompression) return data;
    // Em produção, usar uma biblioteca de compressão real
    return data;
  }, [config.enableCompression]);

  const decompressData = useCallback((data: any): any => {
    if (!config.enableCompression) return data;
    // Em produção, usar uma biblioteca de descompressão real
    return data;
  }, [config.enableCompression]);

  // ============================================
  // OPERAÇÕES DE CACHE
  // ============================================

  const getCacheStrategy = useCallback((query: string): QueryCacheStrategy | null => {
    return strategies.find(strategy => strategy.queryPattern.test(query)) || null;
  }, [strategies]);

  const set = useCallback((key: string, data: any, query: string, customTTL?: number): void => {
    const strategy = getCacheStrategy(query);
    const ttl = customTTL || strategy?.ttl || config.defaultTTL;
    const tags = strategy?.tags || [];
    const size = calculateSize(data);
    const compressedData = compressData(data);

    // Verificar se deve fazer cache baseado na estratégia
    if (strategy && !strategy.shouldCache(query, data)) {
      return;
    }

    const entry: CacheEntry = {
      id: crypto.randomUUID(),
      key,
      data: compressedData,
      query,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      ttl,
      tags,
      size
    };

    setCache(prev => {
      const newCache = new Map(prev);
      
      // Remover entrada existente se houver
      if (newCache.has(key)) {
        newCache.delete(key);
      }
      
      // Verificar limites antes de adicionar
      const currentSize = Array.from(newCache.values()).reduce((sum, e) => sum + e.size, 0);
      const currentEntries = newCache.size;
      
      // Fazer limpeza se necessário
      if (currentSize + size > config.maxSize || currentEntries >= config.maxEntries) {
        evictEntries(newCache, size);
      }
      
      newCache.set(key, entry);
      return newCache;
    });
  }, [config, strategies, getCacheStrategy, calculateSize, compressData]);

  const get = useCallback((key: string): any | null => {
    const startTime = performance.now();
    
    setCache(prev => {
      const newCache = new Map(prev);
      const entry = newCache.get(key);
      
      if (!entry) {
        // Cache miss
        setMetrics(m => ({
          ...m,
          totalMisses: m.totalMisses + 1,
          missRate: ((m.totalMisses + 1) / (m.totalHits + m.totalMisses + 1)) * 100
        }));
        return newCache;
      }
      
      // Verificar TTL
      const now = new Date();
      const age = now.getTime() - entry.createdAt.getTime();
      
      if (age > entry.ttl) {
        // Entrada expirada
        newCache.delete(key);
        setMetrics(m => ({
          ...m,
          totalMisses: m.totalMisses + 1,
          missRate: ((m.totalMisses + 1) / (m.totalHits + m.totalMisses + 1)) * 100
        }));
        return newCache;
      }
      
      // Cache hit - atualizar estatísticas da entrada
      const updatedEntry = {
        ...entry,
        lastAccessed: now,
        accessCount: entry.accessCount + 1
      };
      
      newCache.set(key, updatedEntry);
      
      // Atualizar métricas globais
      const accessTime = performance.now() - startTime;
      accessTimes.current.push(accessTime);
      if (accessTimes.current.length > 1000) {
        accessTimes.current = accessTimes.current.slice(-1000);
      }
      
      setMetrics(m => ({
        ...m,
        totalHits: m.totalHits + 1,
        hitRate: ((m.totalHits + 1) / (m.totalHits + m.totalMisses + 1)) * 100,
        averageAccessTime: accessTimes.current.reduce((sum, t) => sum + t, 0) / accessTimes.current.length
      }));
      
      return newCache;
    });
    
    const entry = cache.get(key);
    return entry ? decompressData(entry.data) : null;
  }, [cache, decompressData]);

  const invalidate = useCallback((key: string): void => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
  }, []);

  const invalidateByTags = useCallback((tags: string[]): void => {
    setCache(prev => {
      const newCache = new Map(prev);
      
      for (const [key, entry] of newCache.entries()) {
        if (entry.tags.some(tag => tags.includes(tag))) {
          newCache.delete(key);
        }
      }
      
      return newCache;
    });
  }, []);

  const invalidateByPattern = useCallback((pattern: RegExp): void => {
    setCache(prev => {
      const newCache = new Map(prev);
      
      for (const [key, entry] of newCache.entries()) {
        if (pattern.test(entry.query)) {
          newCache.delete(key);
        }
      }
      
      return newCache;
    });
  }, []);

  // ============================================
  // POLÍTICAS DE EVICÇÃO
  // ============================================

  const evictEntries = useCallback((cacheMap: Map<string, CacheEntry>, neededSpace: number): void => {
    const entries = Array.from(cacheMap.entries());
    
    switch (config.evictionPolicy) {
      case 'lru': // Least Recently Used
        entries.sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
        break;
      case 'lfu': // Least Frequently Used
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case 'ttl': // Oldest entries first
        entries.sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'size': // Largest entries first
        entries.sort(([, a], [, b]) => b.size - a.size);
        break;
    }
    
    let freedSpace = 0;
    let removedCount = 0;
    
    for (const [key, entry] of entries) {
      cacheMap.delete(key);
      freedSpace += entry.size;
      removedCount++;
      
      // Parar quando liberamos espaço suficiente ou removemos muitas entradas
      if (freedSpace >= neededSpace || removedCount >= Math.ceil(entries.length * 0.1)) {
        break;
      }
    }
  }, [config.evictionPolicy]);

  // ============================================
  // LIMPEZA AUTOMÁTICA
  // ============================================

  const cleanup = useCallback(async (): Promise<void> => {
    setIsCleaningUp(true);
    
    try {
      setCache(prev => {
        const newCache = new Map(prev);
        const now = new Date();
        
        // Remover entradas expiradas
        for (const [key, entry] of newCache.entries()) {
          const age = now.getTime() - entry.createdAt.getTime();
          if (age > entry.ttl) {
            newCache.delete(key);
          }
        }
        
        return newCache;
      });
    } finally {
      setIsCleaningUp(false);
    }
  }, []);

  // ============================================
  // INTERFACE DE ALTO NÍVEL
  // ============================================

  const cacheQuery = useCallback(async (
    query: string, 
    queryFn: () => Promise<any>, 
    params?: any,
    customTTL?: number
  ): Promise<any> => {
    const key = generateCacheKey(query, params);
    
    // Tentar buscar do cache primeiro
    const cached = get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Executar query e fazer cache do resultado
    try {
      const result = await queryFn();
      set(key, result, query, customTTL);
      return result;
    } catch (error) {
      // Não fazer cache de erros
      throw error;
    }
  }, [generateCacheKey, get, set]);

  const handleDatabaseChange = useCallback((tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE'): void => {
    // Aplicar regras de invalidação
    invalidationRules.forEach(rule => {
      if (rule.enabled && rule.tables.includes(tableName) && rule.operations.includes(operation)) {
        invalidateByTags(rule.tags);
      }
    });
  }, [invalidationRules, invalidateByTags]);

  // ============================================
  // MÉTRICAS E ESTATÍSTICAS
  // ============================================

  const updateMetrics = useCallback((): void => {
    const entries = Array.from(cache.values());
    
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const mostAccessed = [...entries]
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
    const oldest = [...entries]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 10);
    const largest = [...entries]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
    
    setMetrics(prev => ({
      ...prev,
      totalEntries: entries.length,
      totalSize,
      mostAccessedQueries: mostAccessed,
      oldestEntries: oldest,
      largestEntries: largest
    }));
  }, [cache]);

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    updateMetrics();
  }, [cache, updateMetrics]);

  useEffect(() => {
    // Configurar limpeza automática
    if (cleanupInterval.current) {
      clearInterval(cleanupInterval.current);
    }
    
    cleanupInterval.current = setInterval(cleanup, config.cleanupInterval);
    
    return () => {
      if (cleanupInterval.current) {
        clearInterval(cleanupInterval.current);
      }
    };
  }, [config.cleanupInterval, cleanup]);

  // ============================================
  // RETORNO DO HOOK
  // ============================================

  return {
    // Estado
    cache: Array.from(cache.values()),
    metrics,
    config,
    strategies,
    invalidationRules,
    isCleaningUp,
    
    // Operações básicas
    get,
    set,
    invalidate,
    invalidateByTags,
    invalidateByPattern,
    
    // Interface de alto nível
    cacheQuery,
    handleDatabaseChange,
    
    // Manutenção
    cleanup,
    clear: () => setCache(new Map()),
    
    // Configuração
    updateConfig: setConfig,
    updateStrategies: setStrategies,
    updateInvalidationRules: setInvalidationRules,
    
    // Utilitários
    generateCacheKey,
    getCacheStrategy,
    updateMetrics
  };
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

export function formatCacheSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatCacheHitRate(hitRate: number): string {
  return `${hitRate.toFixed(1)}%`;
}

export function getCacheEfficiencyLevel(hitRate: number): 'poor' | 'fair' | 'good' | 'excellent' {
  if (hitRate >= 90) return 'excellent';
  if (hitRate >= 75) return 'good';
  if (hitRate >= 50) return 'fair';
  return 'poor';
}

export function estimateCacheSavings(metrics: CacheMetrics, averageQueryTime: number): {
  timeSaved: number;
  queriesAvoided: number;
  estimatedCostSaving: number;
} {
  const timeSaved = metrics.totalHits * averageQueryTime;
  const queriesAvoided = metrics.totalHits;
  const estimatedCostSaving = queriesAvoided * 0.001; // Estimativa de $0.001 por query
  
  return {
    timeSaved,
    queriesAvoided,
    estimatedCostSaving
  };
}