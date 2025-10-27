// @/lib/security/rate-limit.ts

import { NextRequest } from 'next/server';

/**
 * Interface para resultado do rate limiting
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Cache em memória para rate limiting (em produção, usar Redis)
 */
const rateLimitCache = new Map<string, {
  count: number;
  resetTime: number;
}>();

/**
 * Configurações de rate limiting por tipo de endpoint
 */
const RATE_LIMITS = {
  // API geral - 100 requests por minuto
  default: {
    limit: 100,
    window: 60 * 1000 // 1 minuto
  },
  // Login - 20 tentativas por minuto (aumentado para testes)
  auth: {
    limit: 20,
    window: 60 * 1000 // 1 minuto
  },
  // Upload - 10 uploads por minuto
  upload: {
    limit: 10,
    window: 60 * 1000 // 1 minuto
  },
  // Notificações - 50 requests por minuto
  notifications: {
    limit: 50,
    window: 60 * 1000 // 1 minuto
  }
};

/**
 * Determina o tipo de rate limit baseado na URL
 */
function getRateLimitType(pathname: string): keyof typeof RATE_LIMITS {
  if (pathname.includes('/auth/')) return 'auth';
  if (pathname.includes('/upload/')) return 'upload';
  if (pathname.includes('/notifications/')) return 'notifications';
  return 'default';
}

/**
 * Gera uma chave única para o rate limiting
 */
function generateRateLimitKey(request: NextRequest, type: string): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Usar IP + User Agent + tipo para criar uma chave única
  return `${type}:${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
}

/**
 * Implementa rate limiting baseado em sliding window
 */
export async function rateLimit(request: NextRequest): Promise<RateLimitResult> {
  try {
    const type = getRateLimitType(request.nextUrl.pathname);
    const config = RATE_LIMITS[type];
    const key = generateRateLimitKey(request, type);
    const now = Date.now();
    
    // Buscar dados do cache
    const cached = rateLimitCache.get(key);
    
    // Se não existe ou expirou, criar novo
    if (!cached || now > cached.resetTime) {
      const newEntry = {
        count: 1,
        resetTime: now + config.window
      };
      
      rateLimitCache.set(key, newEntry);
      
      return {
        success: true,
        limit: config.limit,
        remaining: config.limit - 1,
        reset: newEntry.resetTime
      };
    }
    
    // Incrementar contador
    cached.count++;
    rateLimitCache.set(key, cached);
    
    // Verificar se excedeu o limite
    if (cached.count > config.limit) {
      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        reset: cached.resetTime
      };
    }
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - cached.count,
      reset: cached.resetTime
    };
  } catch (error) {
    console.error('Erro no rate limiting:', error);
    
    // Em caso de erro, permitir a requisição
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000
    };
  }
}

/**
 * Limpa entradas expiradas do cache (executar periodicamente)
 */
export async function cleanupRateLimitCache(): Promise<void> {
  const now = Date.now();
  
  for (const [key, value] of rateLimitCache.entries()) {
    if (now > value.resetTime) {
      rateLimitCache.delete(key);
    }
  }
}

/**
 * Rate limiting específico para tentativas de login
 */
export async function loginRateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `login:${identifier}`;
  const config = RATE_LIMITS.auth;
  const now = Date.now();
  
  const cached = rateLimitCache.get(key);
  
  if (!cached || now > cached.resetTime) {
    const newEntry = {
      count: 1,
      resetTime: now + config.window
    };
    
    rateLimitCache.set(key, newEntry);
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: newEntry.resetTime
    };
  }
  
  cached.count++;
  rateLimitCache.set(key, cached);
  
  if (cached.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: cached.resetTime
    };
  }
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - cached.count,
    reset: cached.resetTime
  };
}

/**
 * Reseta o rate limit para um identificador específico
 */
export async function resetRateLimit(identifier: string, type: string = 'default'): Promise<void> {
  const key = `${type}:${identifier}`;
  rateLimitCache.delete(key);
}

/**
 * Obtém estatísticas do rate limiting
 */
export async function getRateLimitStats() {
  const now = Date.now();
  const activeEntries = Array.from(rateLimitCache.entries())
    .filter(([_, value]) => now <= value.resetTime)
    .map(([key, value]) => ({
      key,
      count: value.count,
      resetTime: value.resetTime,
      remaining: Math.max(0, value.resetTime - now)
    }));
  
  return {
    totalEntries: rateLimitCache.size,
    activeEntries: activeEntries.length,
    entries: activeEntries
  };
}

// Executar limpeza do cache a cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitCache, 5 * 60 * 1000);
}

// Utilitário para converter janelas de tempo em string para milissegundos (ex.: '10s', '1m', '2h', '1d')
export function parseWindowToMs(window: string | number): number {
  if (typeof window === 'number') return window;
  const match = /^\s*(\d+)\s*([smhd])\s*$/i.exec(window);
  if (!match) {
    // fallback seguro: 1 minuto
    return 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60 * 1000;
  }
}

// Gera uma chave de cliente híbrida a partir do request (IP + User-Agent)
function getClientFingerprint(request: NextRequest): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const uaHash = Buffer.from(userAgent).toString('base64').slice(0, 10);
  return `${ip}:${uaHash}`;
}

// Utilitário central para obter o IP real do cliente (Cloudflare/Proxy aware)
export function getClientIP(request: NextRequest): string {
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  const realIP = request.headers.get('x-real-ip');
  const forwarded = request.headers.get('x-forwarded-for');
  const requestIP = (request as any).ip as string | undefined; // compatibilidade Next

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (requestIP) return requestIP;

  return '127.0.0.1'; // fallback seguro para localhost
}

// API customizável para aplicar rate limit por namespace/rota
export async function rateLimitCustom(
  request: NextRequest,
  opts: { windowMs: number; max: number; namespace?: string; identifier?: string }
): Promise<RateLimitResult> {
  const { windowMs, max, namespace = 'default', identifier } = opts;
  const clientKey = identifier ?? getClientFingerprint(request);
  const key = `${namespace}:${clientKey}`;
  const now = Date.now();
  const cached = rateLimitCache.get(key);

  if (!cached || now > cached.resetTime) {
    const newEntry = { count: 1, resetTime: now + windowMs };
    rateLimitCache.set(key, newEntry);
    return { success: true, limit: max, remaining: Math.max(0, max - 1), reset: newEntry.resetTime };
  }

  cached.count++;
  rateLimitCache.set(key, cached);

  if (cached.count > max) {
    return { success: false, limit: max, remaining: 0, reset: cached.resetTime };
  }

  return { success: true, limit: max, remaining: Math.max(0, max - cached.count), reset: cached.resetTime };
}

// Constrói cabeçalhos padrão de Rate Limit para respostas HTTP
export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000))
  };
}
