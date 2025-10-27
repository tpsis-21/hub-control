/**
 * Sistema de Cache Inteligente
 * 
 * Implementa um sistema de cache em múltiplas camadas com estratégias
 * inteligentes de invalidação, compressão e otimização automática.
 */

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // Time to live em ms
  accessCount: number;
  lastAccessed: number;
  size: number; // Tamanho em bytes
  compressed: boolean;
  tags: string[];
  priority: CachePriority;
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  maxSize: number; // Tamanho máximo em bytes
  maxEntries: number; // Número máximo de entradas
  defaultTtl: number; // TTL padrão em ms
  compressionThreshold: number; // Tamanho mínimo para compressão
  strategy: CacheStrategy;
  persistToDisk: boolean;
  enableMetrics: boolean;
  cleanupInterval: number; // Intervalo de limpeza em ms
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  compressionRatio: number;
  averageAccessTime: number;
  memoryUsage: number;
  diskUsage: number;
  evictions: number;
  lastCleanup: number;
}

export interface CacheStats {
  key: string;
  hits: number;
  misses: number;
  size: number;
  lastAccessed: number;
  accessFrequency: number;
}

export type CacheStrategy = 'LRU' | 'LFU' | 'FIFO' | 'TTL' | 'ADAPTIVE';
export type CachePriority = 'low' | 'normal' | 'high' | 'critical';
export type CacheLayer = 'memory' | 'localStorage' | 'indexedDB' | 'sessionStorage';

// ============================================
// UTILITÁRIOS DE COMPRESSÃO
// ============================================

class CompressionUtils {
  static compress(data: string): string {
    try {
      // Implementação simples de compressão usando LZ-string
      // Em produção, usar uma biblioteca como lz-string
      return btoa(data);
    } catch (error) {
      logger.warn('Erro na compressão:', error);
      return data;
    }
  }

  static decompress(data: string): string {
    try {
      return atob(data);
    } catch (error) {
      logger.warn('Erro na descompressão:', error);
      return data;
    }
  }

  static getSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // Estimativa
    }
  }
}

// ============================================
// CACHE EM MEMÓRIA
// ============================================

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      defaultTtl: 30 * 60 * 1000, // 30 minutos
      compressionThreshold: 1024, // 1KB
      strategy: 'ADAPTIVE',
      persistToDisk: false,
      enableMetrics: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutos
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      compressionRatio: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      diskUsage: 0,
      evictions: 0,
      lastCleanup: Date.now()
    };

    this.startCleanupTimer();
  }

  set<T>(key: string, value: T, options: {
    ttl?: number;
    tags?: string[];
    priority?: CachePriority;
    compress?: boolean;
  } = {}): void {
    const now = Date.now();
    const ttl = options.ttl || this.config.defaultTtl;
    const size = CompressionUtils.getSize(value);
    const shouldCompress = options.compress !== false && size > this.config.compressionThreshold;
    
    let processedValue = value;
    let compressed = false;
    
    if (shouldCompress && typeof value === 'string') {
      processedValue = CompressionUtils.compress(value as string) as T;
      compressed = true;
    }

    const entry: CacheEntry<T> = {
      key,
      value: processedValue,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      size: CompressionUtils.getSize(processedValue),
      compressed,
      tags: options.tags || [],
      priority: options.priority || 'normal',
      metadata: {
        originalSize: size,
        compressionRatio: compressed ? size / CompressionUtils.getSize(processedValue) : 1
      }
    };

    // Verificar se precisa fazer eviction
    this.ensureCapacity(entry.size);
    
    this.cache.set(key, entry);
    this.updateMetrics();
  }

  get<T>(key: string): T | null {
    const startTime = performance.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Verificar TTL
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.metrics.hits++;
    this.updateHitRate();
    
    // Atualizar tempo médio de acesso
    const accessTime = performance.now() - startTime;
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime + accessTime) / 2;

    // Descomprimir se necessário
    if (entry.compressed && typeof entry.value === 'string') {
      return CompressionUtils.decompress(entry.value) as T;
    }

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMetrics();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.updateMetrics();
  }

  // Invalidar por tags
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    this.updateMetrics();
    return invalidated;
  }

  // Obter estatísticas por chave
  getStats(): CacheStats[] {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.accessCount,
      misses: 0, // Não rastreamos misses por chave
      size: entry.size,
      lastAccessed: entry.lastAccessed,
      accessFrequency: entry.accessCount / ((Date.now() - entry.timestamp) / 1000 / 60) // acessos por minuto
    }));
  }

  // Obter métricas gerais
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // Otimizar cache
  optimize(): void {
    this.cleanup();
    this.recompress();
    this.rebalance();
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  private ensureCapacity(newEntrySize: number): void {
    // Verificar limite de entradas
    if (this.cache.size >= this.config.maxEntries) {
      this.evictEntries(1);
    }

    // Verificar limite de tamanho
    while (this.metrics.totalSize + newEntrySize > this.config.maxSize) {
      this.evictEntries(1);
    }
  }

  private evictEntries(count: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Estratégia de eviction baseada na configuração
    switch (this.config.strategy) {
      case 'LRU':
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case 'LFU':
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case 'FIFO':
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      case 'TTL':
        entries.sort(([, a], [, b]) => 
          (a.timestamp + a.ttl) - (b.timestamp + b.ttl)
        );
        break;
      case 'ADAPTIVE':
        // Combina múltiplos fatores
        entries.sort(([, a], [, b]) => {
          const scoreA = this.calculateAdaptiveScore(a);
          const scoreB = this.calculateAdaptiveScore(b);
          return scoreA - scoreB;
        });
        break;
    }

    // Remover entradas com menor prioridade
    for (let i = 0; i < count && i < entries.length; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.metrics.evictions++;
    }
  }

  private calculateAdaptiveScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    const timeToExpiry = (entry.timestamp + entry.ttl) - now;
    
    // Fatores de pontuação (menor = mais provável de ser removido)
    const priorityWeight = {
      low: 0.5,
      normal: 1,
      high: 2,
      critical: 4
    }[entry.priority];
    
    const accessFrequency = entry.accessCount / (age / 1000 / 60); // acessos por minuto
    const recency = 1 / (timeSinceAccess + 1); // Mais recente = maior pontuação
    const urgency = Math.max(0, timeToExpiry / entry.ttl); // Próximo do vencimento = menor pontuação
    
    return priorityWeight * accessFrequency * recency * urgency;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    this.metrics.lastCleanup = now;
    this.updateMetrics();
    
    if (cleaned > 0) {
      logger.debug(`Cache cleanup: ${cleaned} entradas expiradas removidas`, undefined, "DEBUG");
    }
  }

  private recompress(): void {
    let recompressed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!entry.compressed && entry.size > this.config.compressionThreshold) {
        if (typeof entry.value === 'string') {
          const compressed = CompressionUtils.compress(entry.value);
          const newSize = CompressionUtils.getSize(compressed);
          
          if (newSize < entry.size * 0.8) { // Só comprimir se reduzir pelo menos 20%
            entry.value = compressed as any;
            entry.compressed = true;
            entry.size = newSize;
            recompressed++;
          }
        }
      }
    }
    
    if (recompressed > 0) {
      logger.debug(`Cache recompression: ${recompressed} entradas recomprimidas`, undefined, "DEBUG");
      this.updateMetrics();
    }
  }

  private rebalance(): void {
    // Rebalancear baseado em padrões de acesso
    const stats = this.getStats();
    const hotKeys = stats
      .filter(s => s.accessFrequency > 1) // Mais de 1 acesso por minuto
      .map(s => s.key);
    
    // Aumentar TTL de chaves "quentes"
    for (const key of hotKeys) {
      const entry = this.cache.get(key);
      if (entry && entry.priority !== 'critical') {
        entry.ttl = Math.min(entry.ttl * 1.5, 24 * 60 * 60 * 1000); // Máximo 24h
      }
    }
  }

  private updateMetrics(): void {
    this.metrics.entryCount = this.cache.size;
    this.metrics.totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    // Calcular taxa de compressão
    const entries = Array.from(this.cache.values());
    const totalOriginalSize = entries.reduce((sum, entry) => 
      sum + (entry.metadata?.originalSize || entry.size), 0
    );
    
    this.metrics.compressionRatio = totalOriginalSize > 0 
      ? totalOriginalSize / this.metrics.totalSize 
      : 1;
    
    this.metrics.memoryUsage = this.metrics.totalSize;
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

// ============================================
// CACHE PERSISTENTE
// ============================================

class PersistentCache {
  private memoryCache: MemoryCache;
  private storageKey: string;
  private layer: CacheLayer;

  constructor(
    storageKey: string = 'app_cache',
    layer: CacheLayer = 'localStorage',
    config: Partial<CacheConfig> = {}
  ) {
    this.storageKey = storageKey;
    this.layer = layer;
    this.memoryCache = new MemoryCache({
      ...config,
      persistToDisk: true
    });
    
    this.loadFromStorage();
    
    // Salvar no storage periodicamente
    setInterval(() => {
      this.saveToStorage();
    }, 30000); // A cada 30 segundos
    
    // Salvar antes de fechar a página
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  set<T>(key: string, value: T, options?: any): void {
    this.memoryCache.set(key, value, options);
  }

  get<T>(key: string): T | null {
    return this.memoryCache.get<T>(key);
  }

  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  delete(key: string): boolean {
    return this.memoryCache.delete(key);
  }

  clear(): void {
    this.memoryCache.clear();
    this.clearStorage();
  }

  invalidateByTags(tags: string[]): number {
    return this.memoryCache.invalidateByTags(tags);
  }

  getMetrics(): CacheMetrics {
    const metrics = this.memoryCache.getMetrics();
    
    // Como getStorageSize é async, não podemos usar aqui
    // Usar um valor padrão ou implementar getMetrics como async no futuro
    metrics.diskUsage = 0; // Será atualizado de forma assíncrona
    
    // Atualizar diskUsage de forma assíncrona
    this.getStorageSize().then(size => {
      metrics.diskUsage = size;
    }).catch(error => {
      logger.warn('Erro ao obter tamanho do storage:', error);
    });
    
    return metrics;
  }

  optimize(): void {
    this.memoryCache.optimize();
    this.saveToStorage();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await this.getFromStorage();
      if (data) {
        const entries = JSON.parse(data) as Array<[string, CacheEntry]>;
        const now = Date.now();
        
        for (const [key, entry] of entries) {
          // Verificar se não expirou
          if (now <= entry.timestamp + entry.ttl) {
            this.memoryCache.set(key, entry.value, {
              ttl: entry.ttl - (now - entry.timestamp),
              tags: entry.tags,
              priority: entry.priority
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Erro ao carregar cache do storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const entries = Array.from((this.memoryCache as any).cache.entries());
      const data = JSON.stringify(entries);
      await this.setToStorage(data);
    } catch (error) {
      logger.warn('Erro ao salvar cache no storage:', error);
    }
  }

  private async getFromStorage(): Promise<string | null> {
    switch (this.layer) {
      case 'localStorage':
        return localStorage.getItem(this.storageKey);
      case 'sessionStorage':
        return sessionStorage.getItem(this.storageKey);
      case 'indexedDB':
        return this.getFromIndexedDB();
      default:
        return null;
    }
  }

  private async setToStorage(data: string): Promise<void> {
    switch (this.layer) {
      case 'localStorage':
        localStorage.setItem(this.storageKey, data);
        break;
      case 'sessionStorage':
        sessionStorage.setItem(this.storageKey, data);
        break;
      case 'indexedDB':
        await this.setToIndexedDB(data);
        break;
    }
  }

  private async clearStorage(): Promise<void> {
    switch (this.layer) {
      case 'localStorage':
        localStorage.removeItem(this.storageKey);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(this.storageKey);
        break;
      case 'indexedDB':
        await this.clearIndexedDB();
        break;
    }
  }

  private async getStorageSize(): Promise<number> {
    try {
      const data = await this.getFromStorage();
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }

  private async getFromIndexedDB(): Promise<string | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('CacheDB', 1);
      
      request.onerror = () => resolve(null);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getRequest = store.get(this.storageKey);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result?.data || null);
        };
        
        getRequest.onerror = () => resolve(null);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  private async setToIndexedDB(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CacheDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        store.put({ key: this.storageKey, data });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CacheDB', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        store.delete(this.storageKey);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }
}

// ============================================
// CACHE MANAGER PRINCIPAL
// ============================================

export class IntelligentCacheManager {
  private caches = new Map<string, PersistentCache>();
  private defaultConfig: CacheConfig;

  constructor(defaultConfig: Partial<CacheConfig> = {}) {
    this.defaultConfig = {
      maxSize: 50 * 1024 * 1024,
      maxEntries: 1000,
      defaultTtl: 30 * 60 * 1000,
      compressionThreshold: 1024,
      strategy: 'ADAPTIVE',
      persistToDisk: true,
      enableMetrics: true,
      cleanupInterval: 5 * 60 * 1000,
      ...defaultConfig
    };
  }

  // Obter ou criar cache
  getCache(
    name: string = 'default',
    config: Partial<CacheConfig> = {},
    layer: CacheLayer = 'localStorage'
  ): PersistentCache {
    if (!this.caches.has(name)) {
      const cacheConfig = { ...this.defaultConfig, ...config };
      this.caches.set(name, new PersistentCache(`cache_${name}`, layer, cacheConfig));
    }
    return this.caches.get(name)!;
  }

  // Obter métricas de todos os caches
  getAllMetrics(): Record<string, CacheMetrics> {
    const metrics: Record<string, CacheMetrics> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      metrics[name] = cache.getMetrics();
    }
    
    return metrics;
  }

  // Otimizar todos os caches
  optimizeAll(): void {
    for (const cache of this.caches.values()) {
      cache.optimize();
    }
  }

  // Limpar todos os caches
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  // Invalidar por tags em todos os caches
  invalidateByTagsAll(tags: string[]): number {
    let total = 0;
    for (const cache of this.caches.values()) {
      total += cache.invalidateByTags(tags);
    }
    return total;
  }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================

export const cacheManager = new IntelligentCacheManager();

// ============================================
// HOOKS REACT
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/production-logger'

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T> | T,
  options: {
    cacheName?: string;
    ttl?: number;
    tags?: string[];
    priority?: CachePriority;
    enabled?: boolean;
  } = {}
) {
  const {
    cacheName = 'default',
    ttl,
    tags,
    priority,
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cache = cacheManager.getCache(cacheName);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Tentar obter do cache primeiro
      const cached = cache.get<T>(key);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        return cached;
      }

      // Se não estiver no cache, buscar dados
      const result = await fetcher();
      
      // Salvar no cache
      cache.set(key, result, { ttl, tags, priority });
      
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, enabled, cache, fetcher, ttl, tags, priority]);

  const invalidate = useCallback(() => {
    cache.delete(key);
    setData(null);
  }, [cache, key]);

  const refresh = useCallback(() => {
    invalidate();
    return fetchData();
  }, [invalidate, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    invalidate,
    refresh,
    fetchData
  };
}

export function useCacheMetrics(cacheName: string = 'default') {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);

  useEffect(() => {
    const cache = cacheManager.getCache(cacheName);
    
    const updateMetrics = () => {
      setMetrics(cache.getMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, [cacheName]);

  return metrics;
}

// ============================================
// UTILITÁRIOS
// ============================================

export const cacheUtils = {
  // Criar chave de cache baseada em parâmetros
  createKey: (prefix: string, params: Record<string, any>): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return `${prefix}:${btoa(sortedParams)}`;
  },

  // Gerar tags baseadas em entidade
  generateTags: (entity: string, id?: string | number): string[] => {
    const tags = [entity];
    if (id) tags.push(`${entity}:${id}`);
    return tags;
  },

  // Calcular TTL baseado no tipo de dados
  calculateTtl: (dataType: 'static' | 'dynamic' | 'realtime'): number => {
    switch (dataType) {
      case 'static': return 24 * 60 * 60 * 1000; // 24 horas
      case 'dynamic': return 30 * 60 * 1000; // 30 minutos
      case 'realtime': return 5 * 60 * 1000; // 5 minutos
      default: return 30 * 60 * 1000;
    }
  }
};
