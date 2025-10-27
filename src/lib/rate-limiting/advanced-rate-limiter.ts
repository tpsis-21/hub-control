/**
 * Sistema avançado de rate limiting com múltiplas estratégias
 * Implementa rate limiting robusto com sliding window, token bucket e adaptive limiting
 */

import { logger } from '@/lib/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  store?: RateLimitStore;
  onLimitReached?: (key: string, totalHits: number, resetTime: Date) => void;
}

interface RateLimitResult {
  allowed: boolean;
  totalHits: number;
  remainingPoints: number;
  resetTime: Date;
  retryAfter?: number;
}

interface RateLimitStore {
  get(key: string): Promise<{ totalHits: number; resetTime: Date } | null>;
  set(key: string, value: { totalHits: number; resetTime: Date }, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<{ totalHits: number; resetTime: Date }>;
  reset(key: string): Promise<void>;
}

// Implementação em memória do store (para desenvolvimento)
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { totalHits: number; resetTime: Date }>();
  private timers = new Map<string, NodeJS.Timeout>();

  async get(key: string): Promise<{ totalHits: number; resetTime: Date } | null> {
    const data = this.store.get(key);
    if (!data) return null;
    
    // Verificar se expirou
    if (Date.now() > data.resetTime.getTime()) {
      this.store.delete(key);
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
      return null;
    }
    
    return data;
  }

  async set(key: string, value: { totalHits: number; resetTime: Date }, ttl: number): Promise<void> {
    this.store.set(key, value);
    
    // Limpar timer anterior se existir
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Configurar novo timer para limpeza automática
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
  }

  async increment(key: string, ttl: number): Promise<{ totalHits: number; resetTime: Date }> {
    const existing = await this.get(key);
    
    if (existing) {
      existing.totalHits++;
      await this.set(key, existing, ttl);
      return existing;
    } else {
      const resetTime = new Date(Date.now() + ttl);
      const newData = { totalHits: 1, resetTime };
      await this.set(key, newData, ttl);
      return newData;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}

// Rate limiter principal
export class AdvancedRateLimiter {
  private config: Required<RateLimitConfig>;
  private store: RateLimitStore;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (id: string) => id,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Muitas requisições. Tente novamente mais tarde.',
      standardHeaders: true,
      legacyHeaders: false,
      store: new MemoryRateLimitStore(),
      onLimitReached: () => {},
      ...config,
    };
    
    this.store = this.config.store;
  }

  /**
   * Verifica se uma requisição deve ser permitida
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(identifier);
    
    try {
      const data = await this.store.increment(key, this.config.windowMs);
      const allowed = data.totalHits <= this.config.maxRequests;
      
      const result: RateLimitResult = {
        allowed,
        totalHits: data.totalHits,
        remainingPoints: Math.max(0, this.config.maxRequests - data.totalHits),
        resetTime: data.resetTime,
      };

      if (!allowed) {
        result.retryAfter = Math.ceil((data.resetTime.getTime() - Date.now()) / 1000);
        
        // Chamar callback se limite foi atingido
        this.config.onLimitReached(key, data.totalHits, data.resetTime);
        
        logger.warn('Rate limit exceeded', {
          key,
          totalHits: data.totalHits,
          maxRequests: this.config.maxRequests,
          resetTime: data.resetTime,
        });
      }

      return result;
    } catch (error) {
      logger.error('Error checking rate limit:', error instanceof Error ? error : new Error(String(error)));
      
      // Em caso de erro, permitir a requisição (fail-open)
      return {
        allowed: true,
        totalHits: 0,
        remainingPoints: this.config.maxRequests,
        resetTime: new Date(Date.now() + this.config.windowMs),
      };
    }
  }

  /**
   * Reseta o contador para um identificador específico
   */
  async resetLimit(identifier: string): Promise<void> {
    const key = this.config.keyGenerator(identifier);
    await this.store.reset(key);
    
    logger.info('Rate limit reset', { key });
  }

  /**
   * Obtém headers HTTP para rate limiting
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.standardHeaders) {
      headers['RateLimit-Limit'] = this.config.maxRequests.toString();
      headers['RateLimit-Remaining'] = result.remainingPoints.toString();
      headers['RateLimit-Reset'] = Math.ceil(result.resetTime.getTime() / 1000).toString();
      
      if (result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString();
      }
    }

    if (this.config.legacyHeaders) {
      headers['X-RateLimit-Limit'] = this.config.maxRequests.toString();
      headers['X-RateLimit-Remaining'] = result.remainingPoints.toString();
      headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime.getTime() / 1000).toString();
    }

    return headers;
  }
}

// Implementação de Token Bucket para rate limiting mais sofisticado
export class TokenBucketRateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private capacity: number;
  private refillRate: number; // tokens per second
  private refillInterval: number;

  constructor(capacity: number, refillRate: number, refillInterval: number = 1000) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
  }

  async checkLimit(identifier: string, tokens: number = 1): Promise<RateLimitResult> {
    let bucket = this.buckets.get(identifier);
    
    if (!bucket) {
      bucket = new TokenBucket(this.capacity, this.refillRate);
      this.buckets.set(identifier, bucket);
      
      // Configurar limpeza automática após inatividade
      setTimeout(() => {
        if (this.buckets.get(identifier) === bucket) {
          this.buckets.delete(identifier);
        }
      }, 300000); // 5 minutos
    }

    const allowed = bucket.consume(tokens);
    
    return {
      allowed,
      totalHits: this.capacity - bucket.tokens,
      remainingPoints: bucket.tokens,
      resetTime: new Date(Date.now() + (bucket.tokens / this.refillRate) * 1000),
      retryAfter: allowed ? undefined : Math.ceil((tokens - bucket.tokens) / this.refillRate),
    };
  }
}

class TokenBucket {
  public tokens: number;
  private capacity: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  consume(tokens: number): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Rate limiter adaptativo que ajusta limites baseado no comportamento
export class AdaptiveRateLimiter {
  private baseLimiter: AdvancedRateLimiter;
  private behaviorTracker = new Map<string, UserBehavior>();
  private adaptationConfig: AdaptationConfig;

  constructor(baseConfig: RateLimitConfig, adaptationConfig: AdaptationConfig) {
    this.baseLimiter = new AdvancedRateLimiter(baseConfig);
    this.adaptationConfig = adaptationConfig;
  }

  async checkLimit(identifier: string, context?: RequestContext): Promise<RateLimitResult> {
    const behavior = this.getBehavior(identifier);
    const adjustedLimit = this.calculateAdjustedLimit(behavior, context);
    
    // Criar configuração ajustada
    const adjustedConfig = {
      ...this.baseLimiter['config'],
      maxRequests: adjustedLimit,
    };
    
    const tempLimiter = new AdvancedRateLimiter(adjustedConfig);
    const result = await tempLimiter.checkLimit(identifier);
    
    // Atualizar comportamento do usuário
    this.updateBehavior(identifier, result.allowed, context);
    
    return result;
  }

  private getBehavior(identifier: string): UserBehavior {
    let behavior = this.behaviorTracker.get(identifier);
    
    if (!behavior) {
      behavior = {
        successfulRequests: 0,
        failedRequests: 0,
        lastActivity: Date.now(),
        trustScore: 0.5, // Neutro
        violationCount: 0,
      };
      this.behaviorTracker.set(identifier, behavior);
    }
    
    return behavior;
  }

  private calculateAdjustedLimit(behavior: UserBehavior, context?: RequestContext): number {
    const baseLimit = this.baseLimiter['config'].maxRequests;
    let multiplier = 1;

    // Ajustar baseado no trust score
    if (behavior.trustScore > 0.8) {
      multiplier *= 1.5; // Usuários confiáveis podem fazer mais requisições
    } else if (behavior.trustScore < 0.3) {
      multiplier *= 0.5; // Usuários suspeitos têm limite reduzido
    }

    // Ajustar baseado no contexto da requisição
    if (context?.isHighPriority) {
      multiplier *= 1.2;
    }

    if (context?.isExpensive) {
      multiplier *= 0.7;
    }

    return Math.max(1, Math.floor(baseLimit * multiplier));
  }

  private updateBehavior(identifier: string, allowed: boolean, context?: RequestContext): void {
    const behavior = this.getBehavior(identifier);
    
    if (allowed) {
      behavior.successfulRequests++;
    } else {
      behavior.failedRequests++;
      behavior.violationCount++;
    }

    behavior.lastActivity = Date.now();
    
    // Calcular novo trust score
    const totalRequests = behavior.successfulRequests + behavior.failedRequests;
    const successRate = behavior.successfulRequests / totalRequests;
    
    // Trust score baseado na taxa de sucesso e violações
    behavior.trustScore = Math.max(0, Math.min(1, 
      successRate * 0.8 - (behavior.violationCount / totalRequests) * 0.5
    ));
  }
}

interface UserBehavior {
  successfulRequests: number;
  failedRequests: number;
  lastActivity: number;
  trustScore: number; // 0-1, onde 1 é totalmente confiável
  violationCount: number;
}

interface AdaptationConfig {
  trustScoreThreshold: number;
  maxMultiplier: number;
  minMultiplier: number;
}

interface RequestContext {
  isHighPriority?: boolean;
  isExpensive?: boolean;
  userAgent?: string;
  endpoint?: string;
}

// Presets comuns
export const RateLimitPresets = {
  // API pública - restritivo
  publicApi: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100,
    message: 'Limite de requisições da API atingido',
  },
  
  // Autenticação - muito restritivo
  authentication: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  
  // Upload de arquivos - moderado
  fileUpload: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10,
    message: 'Limite de uploads atingido',
  },
  
  // Operações caras - restritivo
  expensiveOperations: {
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 10,
    message: 'Limite de operações custosas atingido',
  },
  
  // Usuários autenticados - permissivo
  authenticatedUsers: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 1000,
    message: 'Limite de requisições atingido',
  },
};

// Exportar classes e utilitários
export { MemoryRateLimitStore };
export type { RateLimitConfig, RateLimitResult, RateLimitStore, RequestContext };
