// 🚀 Sistema de Cache Inteligente
// Sistema avançado de cache com múltiplas camadas, invalidação automática e otimização adaptativa

import { createServerSupabaseClient } from "./supabase/clients/server";
import { performanceMonitoringSystem } from './performance';
import { MetricType } from './performance/types';
import { auditComplianceSystem, AuditEventType } from './audit-compliance-system';
import { realtimeSecurityMonitor } from './security';
import { SecurityEventType, SecuritySeverity } from './security-monitoring';
import { createHash } from 'crypto';
import { LRUCache } from 'lru-cache';

// Tipos de cache
export enum CacheType {
  MEMORY = 'memory',
  REDIS = 'redis',
  DATABASE = 'database',
  CDN = 'cdn',
  BROWSER = 'browser'
}

// Estratégias de cache
export enum CacheStrategy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  FIFO = 'fifo', // First In First Out
  TTL = 'ttl', // Time To Live
  ADAPTIVE = 'adaptive' // Adaptativo baseado em padrões
}

// Políticas de invalidação
export enum InvalidationPolicy {
  TTL = 'ttl', // Baseado em tempo
  DEPENDENCY = 'dependency', // Baseado em dependências
  EVENT = 'event', // Baseado em eventos
  MANUAL = 'manual', // Manual
  SMART = 'smart' // Inteligente baseado em padrões
}

// Status do cache
export enum CacheStatus {
  HIT = 'hit',
  MISS = 'miss',
  STALE = 'stale',
  EXPIRED = 'expired',
  INVALID = 'invalid'
}

// Interface para entrada de cache
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  metadata: {
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    ttl: number; // Time to live em ms
    tags: string[];
    dependencies: string[];
    size: number; // Tamanho em bytes
    compressed: boolean;
    encrypted: boolean;
    priority: number; // 1-10 (10 = alta prioridade)
    source: string;
    version: string;
  };
  statistics: {
    hitCount: number;
    missCount: number;
    lastHitTime?: Date;
    averageAccessTime: number;
    compressionRatio?: number;
  };
}

// Interface para configuração de cache
export interface CacheConfig {
  enabled: boolean;
  layers: CacheLayerConfig[];
  defaultTTL: number; // ms
  maxSize: number; // bytes
  maxEntries: number;
  strategy: CacheStrategy;
  invalidationPolicy: InvalidationPolicy;
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'lz4';
    threshold: number; // Tamanho mínimo para comprimir
  };
  encryption: {
    enabled: boolean;
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
    sensitiveKeys: string[]; // Padrões de chaves que devem ser criptografadas
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number; // ms
    alertThresholds: {
      hitRateBelow: number; // %
      memoryUsageAbove: number; // %
      responseTimeAbove: number; // ms
    };
  };
  optimization: {
    enabled: boolean;
    adaptiveTTL: boolean;
    preloading: boolean;
    backgroundRefresh: boolean;
    hotDataPromotion: boolean;
  };
  persistence: {
    enabled: boolean;
    interval: number; // ms
    location: string;
  };
}

// Interface para configuração de camada de cache
export interface CacheLayerConfig {
  name: string;
  type: CacheType;
  priority: number; // 1-10 (1 = primeira camada)
  maxSize: number;
  maxEntries: number;
  ttl: number;
  strategy: CacheStrategy;
  enabled: boolean;
  config: Record<string, any>; // Configurações específicas do tipo
}

// Interface para estatísticas de cache
export interface CacheStatistics {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  compressionRatio: number;
  layerStats: Record<string, {
    entries: number;
    size: number;
    hitRate: number;
    averageAccessTime: number;
  }>;
  topKeys: {
    key: string;
    hitCount: number;
    lastAccessed: Date;
  }[];
  performance: {
    reads: number;
    writes: number;
    deletes: number;
    evictions: number;
  };
}

// Interface para resultado de cache
export interface CacheResult<T = any> {
  status: CacheStatus;
  value?: T;
  metadata?: {
    layer: string;
    accessTime: number;
    age: number;
    remainingTTL: number;
  };
  error?: string;
}

// Interface para padrão de acesso
export interface AccessPattern {
  key: string;
  frequency: number;
  lastAccess: Date;
  averageInterval: number;
  peakHours: number[];
  predictedNextAccess: Date;
  importance: number;
}

// Configuração padrão
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  layers: [
    {
      name: 'memory-l1',
      type: CacheType.MEMORY,
      priority: 1,
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 10000,
      ttl: 5 * 60 * 1000, // 5 minutos
      strategy: CacheStrategy.LRU,
      enabled: true,
      config: {}
    },
    {
      name: 'memory-l2',
      type: CacheType.MEMORY,
      priority: 2,
      maxSize: 500 * 1024 * 1024, // 500MB
      maxEntries: 50000,
      ttl: 30 * 60 * 1000, // 30 minutos
      strategy: CacheStrategy.LFU,
      enabled: true,
      config: {}
    },
    {
      name: 'redis',
      type: CacheType.REDIS,
      priority: 3,
      maxSize: 2 * 1024 * 1024 * 1024, // 2GB
      maxEntries: 1000000,
      ttl: 2 * 60 * 60 * 1000, // 2 horas
      strategy: CacheStrategy.TTL,
      enabled: false, // Desabilitado por padrão
      config: {
        host: 'localhost',
        port: 6379,
        password: '',
        db: 0
      }
    }
  ],
  defaultTTL: 15 * 60 * 1000, // 15 minutos
  maxSize: 1024 * 1024 * 1024, // 1GB
  maxEntries: 100000,
  strategy: CacheStrategy.ADAPTIVE,
  invalidationPolicy: InvalidationPolicy.SMART,
  compression: {
    enabled: true,
    algorithm: 'gzip',
    threshold: 1024 // 1KB
  },
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    sensitiveKeys: ['user_*', 'auth_*', 'session_*', '*_token', '*_secret']
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minuto
    alertThresholds: {
      hitRateBelow: 70, // 70%
      memoryUsageAbove: 85, // 85%
      responseTimeAbove: 100 // 100ms
    }
  },
  optimization: {
    enabled: true,
    adaptiveTTL: true,
    preloading: true,
    backgroundRefresh: true,
    hotDataPromotion: true
  },
  persistence: {
    enabled: false,
    interval: 5 * 60 * 1000, // 5 minutos
    location: './cache-persistence'
  }
};

// Classe principal do sistema de cache
export class IntelligentCacheSystem {
  private config: CacheConfig;
  private layers: Map<string, CacheLayer> = new Map();
  private statistics: CacheStatistics;
  private accessPatterns: Map<string, AccessPattern> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();
  private tags: Map<string, Set<string>> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private persistenceInterval: NodeJS.Timeout | null = null;
  private encryptionKey: Buffer;
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.encryptionKey = this.generateEncryptionKey();
    this.statistics = this.initializeStatistics();
    this.initializeLayers();
    this.startMonitoring();
    this.startOptimization();
    this.startPersistence();
  }
  
  // Inicializar estatísticas
  private initializeStatistics(): CacheStatistics {
    return {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      compressionRatio: 0,
      layerStats: {},
      topKeys: [],
      performance: {
        reads: 0,
        writes: 0,
        deletes: 0,
        evictions: 0
      }
    };
  }
  
  // Inicializar camadas de cache
  private initializeLayers(): void {
    for (const layerConfig of this.config.layers) {
      if (!layerConfig.enabled) continue;
      
      const layer = this.createCacheLayer(layerConfig);
      this.layers.set(layerConfig.name, layer);
      this.statistics.layerStats[layerConfig.name] = {
        entries: 0,
        size: 0,
        hitRate: 0,
        averageAccessTime: 0
      };
    }
  }
  
  // Criar camada de cache
  private createCacheLayer(config: CacheLayerConfig): CacheLayer {
    switch (config.type) {
      case CacheType.MEMORY:
        return new MemoryCacheLayer(config);
      case CacheType.REDIS:
        return new RedisCacheLayer(config);
      case CacheType.DATABASE:
        return new DatabaseCacheLayer(config);
      default:
        throw new Error(`Tipo de cache não suportado: ${config.type}`);
    }
  }
  
  // Obter valor do cache
  async get<T = any>(key: string, options: {
    tags?: string[];
    skipLayers?: string[];
    refreshIfStale?: boolean;
  } = {}): Promise<CacheResult<T>> {
    const startTime = Date.now();
    
    try {
      // Registrar acesso
      this.recordAccess(key);
      this.statistics.performance.reads++;
      
      // Buscar nas camadas em ordem de prioridade
      const sortedLayers = Array.from(this.layers.values())
        .filter(layer => !options.skipLayers?.includes(layer.name))
        .sort((a, b) => a.priority - b.priority);
      
      for (const layer of sortedLayers) {
        const result = await layer.get<T>(key);
        
        if (result.status === CacheStatus.HIT) {
          const accessTime = Date.now() - startTime;
          
          // Registrar hit
          this.recordHit(key, layer.name, accessTime);
          
          // Promover para camadas superiores se necessário
          if (this.config.optimization.hotDataPromotion) {
            await this.promoteToUpperLayers(key, result.value!, layer);
          }
          
          // Verificar se precisa de refresh em background
          if (this.config.optimization.backgroundRefresh && result.metadata) {
            const age = result.metadata.age;
            const ttl = result.metadata.remainingTTL;
            
            // Se está próximo do vencimento (últimos 20% do TTL)
            if (ttl > 0 && age / (age + ttl) > 0.8) {
              this.scheduleBackgroundRefresh(key);
            }
          }
          
          return result;
        } else if (result.status === CacheStatus.STALE && options.refreshIfStale) {
          // Agendar refresh e retornar valor stale
          this.scheduleBackgroundRefresh(key);
          return result;
        }
      }
      
      // Cache miss
      const accessTime = Date.now() - startTime;
      this.recordMiss(key, accessTime);
      
      return {
        status: CacheStatus.MISS,
        metadata: {
          layer: 'none',
          accessTime,
          age: 0,
          remainingTTL: 0
        }
      };
      
    } catch (error) {
      console.error(`Erro ao buscar cache para chave ${key}:`, error);
      return {
        status: CacheStatus.INVALID,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  // Definir valor no cache
  async set<T = any>(key: string, value: T, options: {
    ttl?: number;
    tags?: string[];
    dependencies?: string[];
    priority?: number;
    layers?: string[];
    compress?: boolean;
    encrypt?: boolean;
  } = {}): Promise<boolean> {
    try {
      this.statistics.performance.writes++;
      
      // Preparar entrada
      const entry = await this.prepareEntry(key, value, options);
      
      // Determinar camadas alvo
      const targetLayers = options.layers
        ? Array.from(this.layers.values()).filter(l => options.layers!.includes(l.name))
        : Array.from(this.layers.values());
      
      let success = false;
      
      // Escrever em todas as camadas alvo
      for (const layer of targetLayers) {
        try {
          const layerSuccess = await layer.set(key, entry);
          if (layerSuccess) {
            success = true;
            this.updateLayerStats(layer.name, 'write', entry);
          }
        } catch (error) {
          console.error(`Erro ao escrever na camada ${layer.name}:`, error);
        }
      }
      
      if (success) {
        // Registrar dependências
        if (options.dependencies) {
          this.registerDependencies(key, options.dependencies);
        }
        
        // Registrar tags
        if (options.tags) {
          this.registerTags(key, options.tags);
        }
        
        // Atualizar estatísticas
        this.statistics.totalEntries++;
        this.statistics.totalSize += entry.metadata.size;
        
        // Registrar evento de auditoria
        await auditComplianceSystem.recordAuditEvent(
          AuditEventType.DATA_ACCESS,
          undefined,
          undefined,
          'localhost',
          'cache-system',
          'cache',
          'set',
          {
            key,
            size: entry.metadata.size,
            ttl: entry.metadata.ttl,
            tags: options.tags,
            dependencies: options.dependencies
          },
          'success',
          SecuritySeverity.LOW
        );
      }
      
      return success;
      
    } catch (error) {
      console.error(`Erro ao definir cache para chave ${key}:`, error);
      return false;
    }
  }
  
  // Preparar entrada de cache
  private async prepareEntry<T>(
    key: string,
    value: T,
    options: any
  ): Promise<CacheEntry<T>> {
    const now = new Date();
    let processedValue = value;
    let size = this.calculateSize(value);
    let compressed = false;
    let encrypted = false;
    
    // Comprimir se necessário
    if (this.shouldCompress(key, size, options.compress)) {
      processedValue = await this.compress(processedValue) as T;
      const newSize = this.calculateSize(processedValue);
      compressed = true;
      size = newSize;
    }
    
    // Criptografar se necessário
    if (this.shouldEncrypt(key, options.encrypt)) {
      processedValue = await this.encrypt(processedValue) as T;
      encrypted = true;
    }
    
    return {
      key,
      value: processedValue,
      metadata: {
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
        ttl: options.ttl || this.calculateAdaptiveTTL(key),
        tags: options.tags || [],
        dependencies: options.dependencies || [],
        size,
        compressed,
        encrypted,
        priority: options.priority || 5,
        source: 'application',
        version: '1.0'
      },
      statistics: {
        hitCount: 0,
        missCount: 0,
        averageAccessTime: 0,
        compressionRatio: compressed ? size / this.calculateSize(value) : 1
      }
    };
  }
  
  // Verificar se deve comprimir
  private shouldCompress(key: string, size: number, forceCompress?: boolean): boolean {
    if (forceCompress !== undefined) return forceCompress;
    return this.config.compression.enabled && size >= this.config.compression.threshold;
  }
  
  // Verificar se deve criptografar
  private shouldEncrypt(key: string, forceEncrypt?: boolean): boolean {
    if (forceEncrypt !== undefined) return forceEncrypt;
    
    if (!this.config.encryption.enabled) return false;
    
    // Verificar padrões de chaves sensíveis
    return this.config.encryption.sensitiveKeys.some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(key);
    });
  }
  
  // Calcular TTL adaptativo
  private calculateAdaptiveTTL(key: string): number {
    if (!this.config.optimization.adaptiveTTL) {
      return this.config.defaultTTL;
    }
    
    const pattern = this.accessPatterns.get(key);
    if (!pattern) {
      return this.config.defaultTTL;
    }
    
    // TTL baseado na frequência de acesso
    const baseMultiplier = Math.min(pattern.frequency / 10, 5); // Max 5x
    const importanceMultiplier = pattern.importance / 5; // Normalizar importância
    
    return Math.floor(this.config.defaultTTL * baseMultiplier * importanceMultiplier);
  }
  
  // Comprimir dados
  private async compress<T>(data: T): Promise<T> {
    // Implementação placeholder - integrar com biblioteca de compressão
    return data;
  }
  
  // Criptografar dados
  private async encrypt<T>(data: T): Promise<T> {
    // Implementação placeholder - integrar com crypto
    return data;
  }
  
  // Calcular tamanho dos dados
  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Aproximação em bytes
  }
  
  // Gerar chave de criptografia
  private generateEncryptionKey(): Buffer {
    return Buffer.from('your-secret-key-here-32-characters!', 'utf8');
  }
  
  // Registrar acesso
  private recordAccess(key: string): void {
    const now = new Date();
    const pattern = this.accessPatterns.get(key) || {
      key,
      frequency: 0,
      lastAccess: now,
      averageInterval: 0,
      peakHours: [],
      predictedNextAccess: now,
      importance: 1
    };
    
    pattern.frequency++;
    pattern.lastAccess = now;
    
    // Calcular intervalo médio
    if (pattern.frequency > 1) {
      const interval = now.getTime() - pattern.lastAccess.getTime();
      pattern.averageInterval = (pattern.averageInterval + interval) / 2;
    }
    
    // Registrar hora de pico
    const hour = now.getHours();
    if (!pattern.peakHours.includes(hour)) {
      pattern.peakHours.push(hour);
    }
    
    // Prever próximo acesso
    pattern.predictedNextAccess = new Date(now.getTime() + pattern.averageInterval);
    
    // Calcular importância
    pattern.importance = Math.min(pattern.frequency / 100, 10);
    
    this.accessPatterns.set(key, pattern);
  }
  
  // Registrar hit
  private recordHit(key: string, layer: string, accessTime: number): void {
    performanceMonitoringSystem.recordMetric(
      MetricType.CACHE_HIT_RATE,
      1,
      'boolean',
      'cache',
      { key, layer, result: 'hit', accessTime },
      ['cache', 'hit', `layer:${layer}`]
    );
    
    // Atualizar estatísticas da camada
    const layerStats = this.statistics.layerStats[layer];
    if (layerStats) {
      layerStats.hitRate = (layerStats.hitRate + 1) / 2; // Média móvel simples
      layerStats.averageAccessTime = (layerStats.averageAccessTime + accessTime) / 2;
    }
  }
  
  // Registrar miss
  private recordMiss(key: string, accessTime: number): void {
    performanceMonitoringSystem.recordMetric(
      MetricType.CACHE_HIT_RATE,
      0,
      'boolean',
      'cache',
      { key, result: 'miss', accessTime },
      ['cache', 'miss']
    );
    
    // Atualizar estatísticas globais
    this.statistics.missRate = (this.statistics.missRate + 1) / 2;
    this.statistics.averageResponseTime = (this.statistics.averageResponseTime + accessTime) / 2;
  }
  
  // Promover para camadas superiores
  private async promoteToUpperLayers<T>(
    key: string,
    value: T,
    currentLayer: CacheLayer
  ): Promise<void> {
    const upperLayers = Array.from(this.layers.values())
      .filter(layer => layer.priority < currentLayer.priority)
      .sort((a, b) => a.priority - b.priority);
    
    for (const layer of upperLayers) {
      try {
        const entry = await this.prepareEntry(key, value, {});
        await layer.set(key, entry);
      } catch (error) {
        console.error(`Erro ao promover para camada ${layer.name}:`, error);
      }
    }
  }
  
  // Agendar refresh em background
  private scheduleBackgroundRefresh(key: string): void {
    // Implementação placeholder - agendar refresh assíncrono
    setTimeout(async () => {
      console.log(`Background refresh para chave: ${key}`);
      // Aqui seria chamada a função que recarrega os dados
    }, 1000);
  }
  
  // Registrar dependências
  private registerDependencies(key: string, dependencies: string[]): void {
    for (const dep of dependencies) {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(key);
    }
  }
  
  // Registrar tags
  private registerTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }
  }
  
  // Atualizar estatísticas da camada
  private updateLayerStats(layerName: string, operation: string, entry?: CacheEntry): void {
    const stats = this.statistics.layerStats[layerName];
    if (!stats) return;
    
    if (operation === 'write' && entry) {
      stats.entries++;
      stats.size += entry.metadata.size;
    }
  }
  
  // Invalidar por dependência
  async invalidateByDependency(dependency: string): Promise<number> {
    const dependentKeys = this.dependencies.get(dependency);
    if (!dependentKeys) return 0;
    
    let invalidated = 0;
    for (const key of dependentKeys) {
      const success = await this.delete(key);
      if (success) invalidated++;
    }
    
    this.dependencies.delete(dependency);
    return invalidated;
  }
  
  // Invalidar por tag
  async invalidateByTag(tag: string): Promise<number> {
    const taggedKeys = this.tags.get(tag);
    if (!taggedKeys) return 0;
    
    let invalidated = 0;
    for (const key of taggedKeys) {
      const success = await this.delete(key);
      if (success) invalidated++;
    }
    
    this.tags.delete(tag);
    return invalidated;
  }
  
  // Deletar entrada
  async delete(key: string): Promise<boolean> {
    try {
      this.statistics.performance.deletes++;
      
      let deleted = false;
      for (const layer of this.layers.values()) {
        const success = await layer.delete(key);
        if (success) deleted = true;
      }
      
      if (deleted) {
        // Limpar dependências e tags
        this.cleanupKeyReferences(key);
        
        // Remover padrão de acesso
        this.accessPatterns.delete(key);
        
        this.statistics.totalEntries--;
      }
      
      return deleted;
      
    } catch (error) {
      console.error(`Erro ao deletar chave ${key}:`, error);
      return false;
    }
  }
  
  // Limpar referências da chave
  private cleanupKeyReferences(key: string): void {
    // Remover das dependências
    for (const [dep, keys] of this.dependencies) {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencies.delete(dep);
      }
    }
    
    // Remover das tags
    for (const [tag, keys] of this.tags) {
      keys.delete(key);
      if (keys.size === 0) {
        this.tags.delete(tag);
      }
    }
  }
  
  // Limpar cache
  async clear(layers?: string[]): Promise<boolean> {
    try {
      const targetLayers = layers
        ? Array.from(this.layers.values()).filter(l => layers.includes(l.name))
        : Array.from(this.layers.values());
      
      for (const layer of targetLayers) {
        await layer.clear();
      }
      
      // Limpar estruturas internas
      this.accessPatterns.clear();
      this.dependencies.clear();
      this.tags.clear();
      
      // Reset estatísticas
      this.statistics = this.initializeStatistics();
      
      return true;
      
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return false;
    }
  }
  
  // Iniciar monitoramento
  private startMonitoring(): void {
    if (!this.config.monitoring.enabled) return;
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
    }, this.config.monitoring.metricsInterval);
  }
  
  // Coletar métricas
  private async collectMetrics(): Promise<void> {
    try {
      // Calcular hit rate global
      const totalHits = Object.values(this.statistics.layerStats)
        .reduce((sum, stats) => sum + (stats.hitRate * stats.entries), 0);
      const totalRequests = this.statistics.performance.reads;
      
      this.statistics.hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
      this.statistics.missRate = 100 - this.statistics.hitRate;
      
      // Calcular uso de memória
      this.statistics.memoryUsage = (this.statistics.totalSize / this.config.maxSize) * 100;
      
      // Registrar métricas no sistema de performance
      performanceMonitoringSystem.recordMetric(
        MetricType.CACHE_HIT_RATE,
        this.statistics.hitRate,
        '%',
        'cache-system',
        {
          totalEntries: this.statistics.totalEntries,
          totalSize: this.statistics.totalSize,
          memoryUsage: this.statistics.memoryUsage
        },
        ['cache', 'performance']
      );
      
    } catch (error) {
      console.error('Erro ao coletar métricas do cache:', error);
    }
  }
  
  // Verificar alertas
  private async checkAlerts(): Promise<void> {
    const thresholds = this.config.monitoring.alertThresholds;
    
    // Verificar hit rate baixo
    if (this.statistics.hitRate < thresholds.hitRateBelow) {
      await realtimeSecurityMonitor.recordEvent(
        SecurityEventType.SYSTEM_OVERLOAD,
        SecuritySeverity.MEDIUM,
        'localhost',
        'cache-system',
        'performance',
        {
          metric: 'hit_rate',
          value: this.statistics.hitRate,
          threshold: thresholds.hitRateBelow
        }
      );
    }
    
    // Verificar uso de memória alto
    if (this.statistics.memoryUsage > thresholds.memoryUsageAbove) {
      await realtimeSecurityMonitor.recordEvent(
        SecurityEventType.SYSTEM_OVERLOAD,
        SecuritySeverity.HIGH,
        'localhost',
        'cache-system',
        'memory',
        {
          metric: 'memory_usage',
          value: this.statistics.memoryUsage,
          threshold: thresholds.memoryUsageAbove
        }
      );
    }
    
    // Verificar tempo de resposta alto
    if (this.statistics.averageResponseTime > thresholds.responseTimeAbove) {
      await realtimeSecurityMonitor.recordEvent(
        SecurityEventType.SYSTEM_OVERLOAD,
        SecuritySeverity.MEDIUM,
        'localhost',
        'cache-system',
        'latency',
        {
          metric: 'response_time',
          value: this.statistics.averageResponseTime,
          threshold: thresholds.responseTimeAbove
        }
      );
    }
  }
  
  // Iniciar otimização
  private startOptimization(): void {
    if (!this.config.optimization.enabled) return;
    
    this.optimizationInterval = setInterval(() => {
      this.optimizeCache();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }
  
  // Otimizar cache
  private async optimizeCache(): Promise<void> {
    try {
      // Pré-carregar dados populares
      if (this.config.optimization.preloading) {
        await this.preloadPopularData();
      }
      
      // Limpar dados expirados
      await this.cleanupExpiredData();
      
      // Otimizar distribuição entre camadas
      await this.optimizeLayerDistribution();
      
    } catch (error) {
      console.error('Erro na otimização do cache:', error);
    }
  }
  
  // Pré-carregar dados populares
  private async preloadPopularData(): Promise<void> {
    // Identificar chaves populares que não estão em cache
    const popularPatterns = Array.from(this.accessPatterns.values())
      .filter(p => p.importance > 5)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);
    
    for (const pattern of popularPatterns) {
      const result = await this.get(pattern.key);
      if (result.status === CacheStatus.MISS) {
        console.log(`Pré-carregando dados para chave popular: ${pattern.key}`);
        // Aqui seria implementada a lógica para recarregar os dados
      }
    }
  }
  
  // Limpar dados expirados
  private async cleanupExpiredData(): Promise<void> {
    for (const layer of this.layers.values()) {
      await layer.cleanup();
    }
  }
  
  // Otimizar distribuição entre camadas
  private async optimizeLayerDistribution(): Promise<void> {
    // Implementação placeholder para otimização de distribuição
    console.log('Otimizando distribuição entre camadas...');
  }
  
  // Iniciar persistência
  private startPersistence(): void {
    if (!this.config.persistence.enabled) return;
    
    this.persistenceInterval = setInterval(() => {
      this.persistCache();
    }, this.config.persistence.interval);
  }
  
  // Persistir cache
  private async persistCache(): Promise<void> {
    try {
      console.log('Persistindo cache...');
      // Implementação placeholder para persistência
    } catch (error) {
      console.error('Erro ao persistir cache:', error);
    }
  }
  
  // Obter estatísticas
  getStatistics(): CacheStatistics {
    return { ...this.statistics };
  }
  
  // Obter padrões de acesso
  getAccessPatterns(): AccessPattern[] {
    return Array.from(this.accessPatterns.values());
  }
  
  // Obter configuração
  getConfig(): CacheConfig {
    return { ...this.config };
  }
  
  // Atualizar configuração
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinicializar se necessário
    if (newConfig.monitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
    
    if (newConfig.optimization) {
      this.stopOptimization();
      this.startOptimization();
    }
  }
  
  // Parar monitoramento
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  // Parar otimização
  private stopOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
  }
  
  // Parar persistência
  private stopPersistence(): void {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
      this.persistenceInterval = null;
    }
  }
  
  // Finalizar sistema
  async shutdown(): Promise<void> {
    this.stopMonitoring();
    this.stopOptimization();
    this.stopPersistence();
    
    // Persistir dados finais
    if (this.config.persistence.enabled) {
      await this.persistCache();
    }
    
    // Fechar conexões das camadas
    for (const layer of this.layers.values()) {
      await layer.shutdown();
    }
    
    console.log('Sistema de cache inteligente finalizado');
  }
}

// Classes base para camadas de cache
abstract class CacheLayer {
  public name: string;
  public type: CacheType;
  public priority: number;
  protected config: CacheLayerConfig;
  
  constructor(config: CacheLayerConfig) {
    this.name = config.name;
    this.type = config.type;
    this.priority = config.priority;
    this.config = config;
  }
  
  abstract get<T>(key: string): Promise<CacheResult<T>>;
  abstract set<T>(key: string, entry: CacheEntry<T>): Promise<boolean>;
  abstract delete(key: string): Promise<boolean>;
  abstract clear(): Promise<boolean>;
  abstract cleanup(): Promise<void>;
  abstract shutdown(): Promise<void>;
}

// Implementação de camada de memória
class MemoryCacheLayer extends CacheLayer {
  private cache: LRUCache<string, CacheEntry>;
  
  constructor(config: CacheLayerConfig) {
    super(config);
    this.cache = new LRUCache({
      max: config.maxEntries,
      maxSize: config.maxSize,
      sizeCalculation: (entry) => entry.metadata.size,
      ttl: config.ttl
    });
  }
  
  async get<T>(key: string): Promise<CacheResult<T>> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return { status: CacheStatus.MISS };
    }
    
    const now = new Date();
    const age = now.getTime() - entry.metadata.createdAt.getTime();
    const remainingTTL = entry.metadata.ttl - age;
    
    if (remainingTTL <= 0) {
      this.cache.delete(key);
      return { status: CacheStatus.EXPIRED };
    }
    
    // Atualizar estatísticas de acesso
    entry.metadata.lastAccessed = now;
    entry.metadata.accessCount++;
    entry.statistics.hitCount++;
    
    return {
      status: CacheStatus.HIT,
      value: entry.value,
      metadata: {
        layer: this.name,
        accessTime: 0, // Memória é instantânea
        age,
        remainingTTL
      }
    };
  }
  
  async set<T>(key: string, entry: CacheEntry<T>): Promise<boolean> {
    try {
      this.cache.set(key, entry);
      return true;
    } catch (error) {
      console.error(`Erro ao definir entrada na camada ${this.name}:`, error);
      return false;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }
  
  async clear(): Promise<boolean> {
    this.cache.clear();
    return true;
  }
  
  async cleanup(): Promise<void> {
    // LRU cache já gerencia expiração automaticamente
  }
  
  async shutdown(): Promise<void> {
    this.cache.clear();
  }
}

// Implementação de camada Redis (placeholder)
class RedisCacheLayer extends CacheLayer {
  private client: any; // Redis client
  
  constructor(config: CacheLayerConfig) {
    super(config);
    // Inicializar cliente Redis
    console.log(`Inicializando camada Redis: ${config.name}`);
  }
  
  async get<T>(key: string): Promise<CacheResult<T>> {
    // Implementação placeholder
    return { status: CacheStatus.MISS };
  }
  
  async set<T>(key: string, entry: CacheEntry<T>): Promise<boolean> {
    // Implementação placeholder
    return true;
  }
  
  async delete(key: string): Promise<boolean> {
    // Implementação placeholder
    return true;
  }
  
  async clear(): Promise<boolean> {
    // Implementação placeholder
    return true;
  }
  
  async cleanup(): Promise<void> {
    // Implementação placeholder
  }
  
  async shutdown(): Promise<void> {
    // Fechar conexão Redis
    console.log(`Fechando conexão Redis: ${this.name}`);
  }
}

// Implementação de camada de banco de dados (placeholder)
class DatabaseCacheLayer extends CacheLayer {
  constructor(config: CacheLayerConfig) {
    super(config);
    console.log(`Inicializando camada de banco: ${config.name}`);
  }
  
  async get<T>(key: string): Promise<CacheResult<T>> {
    // Implementação placeholder
    return { status: CacheStatus.MISS };
  }
  
  async set<T>(key: string, entry: CacheEntry<T>): Promise<boolean> {
    // Implementação placeholder
    return true;
  }
  
  async delete(key: string): Promise<boolean> {
    // Implementação placeholder
    return true;
  }
  
  async clear(): Promise<boolean> {
    // Implementação placeholder
    return true;
  }
  
  async cleanup(): Promise<void> {
    // Implementação placeholder
  }
  
  async shutdown(): Promise<void> {
    console.log(`Fechando conexão de banco: ${this.name}`);
  }
}

// Instância global do sistema
export const intelligentCacheSystem = new IntelligentCacheSystem();

// Funções utilitárias para uso direto
export async function cacheGet<T = any>(key: string, options?: any): Promise<T | null> {
  const result = await intelligentCacheSystem.get<T>(key, options);
  return result.status === CacheStatus.HIT ? result.value! : null;
}

export async function cacheSet<T = any>(
  key: string,
  value: T,
  options?: any
): Promise<boolean> {
  return intelligentCacheSystem.set(key, value, options);
}

export async function cacheDelete(key: string): Promise<boolean> {
  return intelligentCacheSystem.delete(key);
}

export async function cacheInvalidateByTag(tag: string): Promise<number> {
  return intelligentCacheSystem.invalidateByTag(tag);
}

export async function cacheInvalidateByDependency(dependency: string): Promise<number> {
  return intelligentCacheSystem.invalidateByDependency(dependency);
}

// Decorator para cache automático
export function cached(options: {
  ttl?: number;
  tags?: string[];
  dependencies?: string[];
  keyGenerator?: (...args: any[]) => string;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}_${propertyKey}_${JSON.stringify(args)}`;
      
      // Tentar obter do cache
      const cached = await cacheGet(key);
      if (cached !== null) {
        return cached;
      }
      
      // Executar método original
      const result = await originalMethod.apply(this, args);
      
      // Armazenar no cache
      await cacheSet(key, result, options);
      
      return result;
    };
    
    return descriptor;
  };
}

// Hook para React/Next.js
export function useCache<T = any>(key: string, fetcher: () => Promise<T>, options?: any) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        // Tentar obter do cache
        let result = await cacheGet<T>(key, options);
        
        if (result === null) {
          // Cache miss - buscar dados
          result = await fetcher();
          await cacheSet(key, result, options);
        }
        
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [key]);
  
  const invalidate = async () => {
    await cacheDelete(key);
    setData(null);
    setLoading(true);
    // Recarregar dados
    const result = await fetcher();
    await cacheSet(key, result, options);
    setData(result);
    setLoading(false);
  };
  
  return { data, loading, error, invalidate };
}

// Removido bloco de reexportação duplicado de tipos para evitar conflitos

// Importações necessárias para React
function useState<T>(initialValue: T): [T, (value: T) => void] {
  // Placeholder - em produção usar React.useState
  return [initialValue, () => {}];
}

function useEffect(effect: () => void, deps: any[]): void {
  // Placeholder - em produção usar React.useEffect
}