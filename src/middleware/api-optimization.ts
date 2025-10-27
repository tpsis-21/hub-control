/**
 * Middleware de Otimização de API
 * 
 * Sistema para otimização automática de APIs, cache inteligente,
 * compressão de respostas e monitoramento de performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/production-logger'

// ============================================
// INTERFACES E TIPOS
// ============================================

interface CacheConfig {
  ttl: number; // Time to live em segundos
  staleWhileRevalidate?: number; // Tempo para servir cache stale
  tags?: string[]; // Tags para invalidação
  vary?: string[]; // Headers que afetam o cache
  private?: boolean; // Cache privado (não compartilhado)
}

interface CompressionConfig {
  enabled: boolean;
  threshold: number; // Tamanho mínimo para compressão
  algorithms: ('gzip' | 'br' | 'deflate')[];
  level?: number; // Nível de compressão (1-9)
}

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requests por janela
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
}

interface OptimizationConfig {
  cache?: CacheConfig;
  compression?: CompressionConfig;
  rateLimit?: RateLimitConfig;
  monitoring?: boolean;
  responseTransform?: (data: any) => any;
}

interface ApiMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  responseSize: number;
  cacheHit: boolean;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

interface CacheEntry {
  data: any;
  headers: Record<string, string>;
  timestamp: number;
  ttl: number;
  tags: string[];
  etag: string;
}

// ============================================
// CACHE INTELIGENTE
// ============================================

class IntelligentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessCount: Map<string, number> = new Map();
  private lastAccess: Map<string, number> = new Map();
  private maxSize: number = 1000; // Máximo de entradas

  // Gerar chave de cache
  private generateKey(req: NextRequest, config: CacheConfig): string {
    const url = req.url;
    const method = req.method;
    const vary = config.vary || [];
    
    let key = `${method}:${url}`;
    
    // Adicionar headers que afetam o cache
    vary.forEach(header => {
      const value = req.headers.get(header);
      if (value) {
        key += `:${header}=${value}`;
      }
    });
    
    return btoa(key).substring(0, 32);
  }

  // Verificar se entrada está válida
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < (entry.ttl * 1000);
  }

  // Verificar se pode servir stale
  private canServeStale(entry: CacheEntry, config: CacheConfig): boolean {
    if (!config.staleWhileRevalidate) return false;
    
    const now = Date.now();
    const staleTime = entry.ttl + config.staleWhileRevalidate;
    return (now - entry.timestamp) < (staleTime * 1000);
  }

  // Obter do cache
  get(req: NextRequest, config: CacheConfig): CacheEntry | null {
    const key = this.generateKey(req, config);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Atualizar estatísticas de acesso
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    this.lastAccess.set(key, Date.now());
    
    if (this.isValid(entry)) {
      return entry;
    }
    
    if (this.canServeStale(entry, config)) {
      // Marcar para revalidação em background
      this.scheduleRevalidation(key, req, config);
      return { ...entry, stale: true } as any;
    }
    
    // Remover entrada expirada
    this.cache.delete(key);
    return null;
  }

  // Armazenar no cache
  set(
    req: NextRequest, 
    config: CacheConfig, 
    data: any, 
    headers: Record<string, string>
  ): void {
    const key = this.generateKey(req, config);
    
    // Verificar limite de tamanho
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }
    
    const entry: CacheEntry = {
      data,
      headers,
      timestamp: Date.now(),
      ttl: config.ttl,
      tags: config.tags || [],
      etag: this.generateETag(data)
    };
    
    this.cache.set(key, entry);
    this.accessCount.set(key, 1);
    this.lastAccess.set(key, Date.now());
  }

  // Invalidar por tags
  invalidateByTags(tags: string[]): void {
    for (const [key, entry] of this.cache) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        this.accessCount.delete(key);
        this.lastAccess.delete(key);
      }
    }
  }

  // Remover entrada menos usada
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastUsedCount = Infinity;
    let oldestAccess = Date.now();
    
    for (const [key] of this.cache) {
      const count = this.accessCount.get(key) || 0;
      const lastAccess = this.lastAccess.get(key) || 0;
      
      if (count < leastUsedCount || (count === leastUsedCount && lastAccess < oldestAccess)) {
        leastUsedCount = count;
        oldestAccess = lastAccess;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.accessCount.delete(leastUsedKey);
      this.lastAccess.delete(leastUsedKey);
    }
  }

  // Gerar ETag
  private generateETag(data: any): string {
    const content = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }

  // Agendar revalidação em background
  private scheduleRevalidation(
    key: string, 
    req: NextRequest, 
    config: CacheConfig
  ): void {
    // Em um ambiente real, isso seria feito em background
    setTimeout(() => {
      // Revalidar entrada
      logger.debug(`Revalidando cache para ${key}`, undefined, "DEBUG");
    }, 100);
  }

  // Estatísticas do cache
  getStats() {
    const totalEntries = this.cache.size;
    const totalAccesses = Array.from(this.accessCount.values()).reduce((sum, count) => sum + count, 0);
    const avgAccesses = totalEntries > 0 ? totalAccesses / totalEntries : 0;
    
    return {
      entries: totalEntries,
      totalAccesses,
      avgAccesses,
      hitRate: 0 // Seria calculado com base em métricas reais
    };
  }
}

// ============================================
// RATE LIMITING
// ============================================

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  // Verificar se request está dentro do limite
  isAllowed(req: NextRequest, config: RateLimitConfig): boolean {
    const key = config.keyGenerator ? config.keyGenerator(req) : this.getDefaultKey(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Obter requests existentes
    let requests = this.requests.get(key) || [];
    
    // Filtrar requests dentro da janela
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Verificar limite
    if (requests.length >= config.maxRequests) {
      return false;
    }
    
    // Adicionar request atual
    requests.push(now);
    this.requests.set(key, requests);
    
    return true;
  }
  
  // Gerar chave padrão
  private getDefaultKey(req: NextRequest): string {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    return `${ip}:${req.url}`;
  }
  
  // Limpar requests antigos
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    for (const [key, requests] of this.requests) {
      const validRequests = requests.filter(timestamp => (now - timestamp) < maxAge);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// ============================================
// COMPRESSOR DE RESPOSTAS
// ============================================

class ResponseCompressor {
  // Verificar se deve comprimir
  shouldCompress(req: NextRequest, config: CompressionConfig, contentLength: number): boolean {
    if (!config.enabled) return false;
    if (contentLength < config.threshold) return false;
    
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    return config.algorithms.some(algo => acceptEncoding.includes(algo));
  }
  
  // Obter melhor algoritmo
  getBestAlgorithm(req: NextRequest, config: CompressionConfig): string | null {
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    
    for (const algo of config.algorithms) {
      if (acceptEncoding.includes(algo)) {
        return algo;
      }
    }
    
    return null;
  }
  
  // Comprimir dados (simulado - em produção usaria bibliotecas reais)
  compress(data: string, algorithm: string): { data: string; ratio: number } {
    // Simulação de compressão
    const originalSize = data.length;
    let compressedSize = originalSize;
    
    switch (algorithm) {
      case 'gzip':
        compressedSize = Math.round(originalSize * 0.7);
        break;
      case 'br':
        compressedSize = Math.round(originalSize * 0.6);
        break;
      case 'deflate':
        compressedSize = Math.round(originalSize * 0.75);
        break;
    }
    
    const ratio = ((originalSize - compressedSize) / originalSize) * 100;
    
    return {
      data: `[COMPRESSED:${algorithm}]${data}`, // Simulação
      ratio
    };
  }
}

// ============================================
// MONITOR DE MÉTRICAS
// ============================================

class ApiMetricsCollector {
  private metrics: ApiMetrics[] = [];
  private maxMetrics: number = 10000;
  
  // Coletar métrica
  collect(metric: ApiMetrics): void {
    this.metrics.push(metric);
    
    // Limitar tamanho
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  // Obter métricas por endpoint
  getMetricsByEndpoint(endpoint: string, limit: number = 100): ApiMetrics[] {
    return this.metrics
      .filter(m => m.endpoint === endpoint)
      .slice(-limit);
  }
  
  // Calcular estatísticas
  getStats(timeWindow: number = 3600000): { // 1 hora por padrão
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    slowestEndpoints: { endpoint: string; avgTime: number }[];
  } {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => (now - m.timestamp) < timeWindow);
    
    const totalRequests = recentMetrics.length;
    const avgResponseTime = totalRequests > 0 ? 
      recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests : 0;
    
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
    
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    
    // Endpoints mais lentos
    const endpointStats = new Map<string, { total: number; count: number }>();
    recentMetrics.forEach(m => {
      const current = endpointStats.get(m.endpoint) || { total: 0, count: 0 };
      current.total += m.responseTime;
      current.count += 1;
      endpointStats.set(m.endpoint, current);
    });
    
    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgTime: stats.total / stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
    
    return {
      totalRequests,
      avgResponseTime,
      errorRate,
      cacheHitRate,
      slowestEndpoints
    };
  }
}

// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================

class ApiOptimizationMiddleware {
  private cache = new IntelligentCache();
  private rateLimiter = new RateLimiter();
  private compressor = new ResponseCompressor();
  private metricsCollector = new ApiMetricsCollector();
  
  // Processar request
  async process(
    req: NextRequest,
    config: OptimizationConfig,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    let cacheHit = false;
    
    try {
      // Rate limiting
      if (config.rateLimit && !this.rateLimiter.isAllowed(req, config.rateLimit)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
          { status: 429 }
        );
      }
      
      // Verificar cache
      if (config.cache && req.method === 'GET') {
        const cached = this.cache.get(req, config.cache);
        if (cached) {
          cacheHit = true;
          const response = new NextResponse(JSON.stringify(cached.data), {
            status: 200,
            headers: {
              ...cached.headers,
              'X-Cache': 'HIT',
              'ETag': cached.etag
            }
          });
          
          // Coletar métrica
          if (config.monitoring) {
            this.collectMetric(req, response, startTime, cacheHit);
          }
          
          return response;
        }
      }
      
      // Executar handler
      const response = await handler(req);
      
      // Processar resposta
      const processedResponse = await this.processResponse(
        req, 
        response, 
        config, 
        startTime, 
        cacheHit
      );
      
      return processedResponse;
      
    } catch (error) {
      // Coletar métrica de erro
      if (config.monitoring) {
        this.collectMetric(
          req, 
          NextResponse.json(
            { error: 'Internal Server Error', code: 'INTERNAL_SERVER_ERROR' },
            { status: 500 }
          ), 
          startTime, 
          cacheHit
        );
      }
      
      throw error;
    }
  }
  
  // Processar resposta
  private async processResponse(
    req: NextRequest,
    response: NextResponse,
    config: OptimizationConfig,
    startTime: number,
    cacheHit: boolean
  ): Promise<NextResponse> {
    const responseData = await response.text();
    let processedData = responseData;
    const headers: Record<string, string> = {};
    
    // Aplicar transformação
    if (config.responseTransform) {
      try {
        const jsonData = JSON.parse(responseData);
        const transformedData = config.responseTransform(jsonData);
        processedData = JSON.stringify(transformedData);
      } catch {
        // Manter dados originais se não for JSON válido
      }
    }
    
    // Compressão
    if (config.compression) {
      const contentLength = new TextEncoder().encode(processedData).length;
      
      if (this.compressor.shouldCompress(req, config.compression, contentLength)) {
        const algorithm = this.compressor.getBestAlgorithm(req, config.compression);
        if (algorithm) {
          const compressed = this.compressor.compress(processedData, algorithm);
          processedData = compressed.data;
          headers['Content-Encoding'] = algorithm;
          headers['X-Compression-Ratio'] = `${compressed.ratio.toFixed(1)}%`;
        }
      }
    }
    
    // Armazenar no cache
    if (config.cache && req.method === 'GET' && response.status === 200) {
      try {
        const jsonData = JSON.parse(responseData);
        this.cache.set(req, config.cache, jsonData, headers);
      } catch {
        // Não cachear se não for JSON válido
      }
    }
    
    // Headers de performance
    headers['X-Response-Time'] = `${Date.now() - startTime}ms`;
    headers['X-Cache'] = cacheHit ? 'HIT' : 'MISS';
    
    // Coletar métrica
    if (config.monitoring) {
      this.collectMetric(req, response, startTime, cacheHit);
    }
    
    // Criar nova resposta
    const newResponse = new NextResponse(processedData, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        ...headers
      }
    });
    
    return newResponse;
  }
  
  // Coletar métrica
  private collectMetric(
    req: NextRequest,
    response: NextResponse,
    startTime: number,
    cacheHit: boolean
  ): void {
    const metric: ApiMetrics = {
      endpoint: new URL(req.url).pathname,
      method: req.method,
      responseTime: Date.now() - startTime,
      statusCode: response.status,
      responseSize: 0, // Seria calculado do response real
      cacheHit,
      timestamp: Date.now(),
      userAgent: req.headers.get('user-agent') || undefined,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
    };
    
    this.metricsCollector.collect(metric);
  }
  
  // Obter estatísticas
  getStats() {
    return {
      cache: this.cache.getStats(),
      metrics: this.metricsCollector.getStats()
    };
  }
  
  // Invalidar cache
  invalidateCache(tags: string[]): void {
    this.cache.invalidateByTags(tags);
  }
  
  // Limpeza periódica
  cleanup(): void {
    this.rateLimiter.cleanup();
  }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================

const apiOptimizer = new ApiOptimizationMiddleware();

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Criar middleware otimizado
export function createOptimizedApiHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: OptimizationConfig = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    return apiOptimizer.process(req, config, handler);
  };
}

// Configurações pré-definidas
export const presetConfigs = {
  // Cache agressivo para dados estáticos
  staticData: {
    cache: {
      ttl: 3600, // 1 hora
      staleWhileRevalidate: 86400, // 24 horas
      tags: ['static']
    },
    compression: {
      enabled: true,
      threshold: 1024,
      algorithms: ['br', 'gzip'] as const
    },
    monitoring: true
  } as OptimizationConfig,
  
  // Cache moderado para dados dinâmicos
  dynamicData: {
    cache: {
      ttl: 300, // 5 minutos
      staleWhileRevalidate: 600, // 10 minutos
      tags: ['dynamic'],
      vary: ['authorization']
    },
    compression: {
      enabled: true,
      threshold: 512,
      algorithms: ['gzip'] as const
    },
    rateLimit: {
      windowMs: 60000, // 1 minuto
      maxRequests: 100
    },
    monitoring: true
  } as OptimizationConfig,
  
  // Sem cache para dados sensíveis
  sensitiveData: {
    compression: {
      enabled: true,
      threshold: 256,
      algorithms: ['gzip'] as const
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 30
    },
    monitoring: true,
    responseTransform: (data: any) => {
      // Remover campos sensíveis se necessário
      if (data && typeof data === 'object') {
        const { password, secret, token, ...safe } = data;
        return safe;
      }
      return data;
    }
  } as OptimizationConfig
};

// ============================================
// EXPORTAÇÕES
// ============================================

export {
  ApiOptimizationMiddleware,
  IntelligentCache,
  RateLimiter,
  ResponseCompressor,
  ApiMetricsCollector
};

export type {
  OptimizationConfig,
  CacheConfig,
  CompressionConfig,
  RateLimitConfig,
  ApiMetrics
};

export { apiOptimizer };
export default createOptimizedApiHandler;
