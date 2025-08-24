/**
 * Helpers Compartilhados para Middlewares - Núcleo Comum
 * 
 * Este módulo centraliza as funcionalidades comuns entre security-middleware 
 * e validation-middleware para eliminar duplicidade e facilitar manutenção.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitCustom, buildRateLimitHeaders, getClientIP, type RateLimitResult } from '@/lib/security/rate-limit'

// ============================================
// TIPOS E INTERFACES COMPARTILHADAS
// ============================================

export interface MiddlewareConfig {
  rateLimit?: {
    requests: number
    windowMs: number
    namespace?: string
  }
  allowedMethods?: string[]
  validateHeaders?: boolean
  validateOrigin?: boolean
  allowedOrigins?: string[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface MiddlewareResult {
  success: boolean
  response?: NextResponse
  error?: string
  validatedData?: any
}

// ============================================
// RESPOSTAS PADRONIZADAS
// ============================================

/**
 * Cria resposta de erro padronizada no formato { error, message }
 */
export function createStandardErrorResponse(
  error: string,
  message: string,
  status: number = 400
): NextResponse {
  const responseBody: any = {
    error,
    message
  }

  return NextResponse.json(responseBody, { 
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Cria resposta de sucesso padronizada
 */
export function createStandardSuccessResponse(
  data: any,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message
  }, { status })
}

// ============================================
// RATE LIMITING CENTRALIZADO
// ============================================

/**
 * Aplica rate limiting centralizado com cabeçalhos padronizados
 */
export async function applyRateLimit(
  request: NextRequest,
  config: {
    requests: number
    windowMs: number
    namespace: string
  }
): Promise<{ success: boolean; response?: NextResponse; result: RateLimitResult }> {
  const ip = getClientIP(request)
  
  const result = await rateLimitCustom(request, {
    windowMs: config.windowMs,
    max: config.requests,
    namespace: config.namespace
  })

  if (!result.success) {
    console.warn(`🚫 Rate limit excedido IP: ${ip} namespace: ${config.namespace}`)
    
    const response = createStandardErrorResponse(
      'Muitas tentativas',
      '⏰ Você fez muitas tentativas. Aguarde um momento antes de tentar novamente.',
      429
    )

    // Anexar cabeçalhos de rate limit
    const headers = buildRateLimitHeaders(result)
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
    
    return { success: false, response, result }
  }

  return { success: true, result }
}

// ============================================
// VALIDAÇÃO DE MÉTODOS HTTP
// ============================================

/**
 * Valida se o método HTTP é permitido
 */
export function validateHttpMethod(
  request: NextRequest,
  allowedMethods?: string[]
): MiddlewareResult {
  if (!allowedMethods || allowedMethods.includes(request.method)) {
    return { success: true }
  }

  return {
    success: false,
    response: createStandardErrorResponse(
      'Método não permitido',
      `Método ${request.method} não é permitido para esta rota.`,
      405
    )
  }
}

// ============================================
// VALIDAÇÃO DE ORIGEM (CORS)
// ============================================

/**
 * Valida origem da requisição para proteção CORS
 */
export function validateRequestOrigin(
  request: NextRequest,
  allowedOrigins?: string[]
): MiddlewareResult {
  if (!allowedOrigins || request.method === 'GET') {
    return { success: true }
  }

  const origin = request.headers.get('origin')
  
  if (!origin) {
    return {
      success: false,
      response: createStandardErrorResponse(
        'Origem obrigatória',
        '🚫 Header Origin é obrigatório para esta operação.',
        400
      )
    }
  }

  const isValidOrigin = allowedOrigins.some(allowed => {
    if (allowed === '*') return true
    return origin === allowed || origin.endsWith('.' + allowed.replace(/^https?:\/\//, ''))
  })

  if (!isValidOrigin) {
    return {
      success: false,
      response: createStandardErrorResponse(
        'Origem não autorizada',
        '🚫 Acesso não autorizado desta origem.',
        403
      )
    }
  }

  return { success: true }
}

// ============================================
// VALIDAÇÃO DE HEADERS BÁSICOS
// ============================================

/**
 * Valida headers básicos obrigatórios
 */
export function validateBasicHeaders(
  request: NextRequest,
  requiredHeaders: string[] = ['user-agent', 'accept']
): MiddlewareResult {
  const missingHeaders: string[] = []
  
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      missingHeaders.push(header)
    }
  }

  if (missingHeaders.length > 0) {
    return {
      success: false,
      response: createStandardErrorResponse(
        'Headers obrigatórios ausentes',
        '🔧 Sua requisição não contém as informações necessárias. Tente atualizar a página.',
        400
      )
    }
  }

  return { success: true }
}

// ============================================
// UTILITÁRIOS DE RESPOSTA COM HEADERS
// ============================================

/**
 * Anexa headers de rate limit a uma resposta existente
 */
export function attachRateLimitHeaders(
  response: NextResponse,
  rateLimitResult: RateLimitResult
): NextResponse {
  const headers = buildRateLimitHeaders(rateLimitResult)
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
  return response
}

/**
 * Aplica headers de segurança básicos
 */
export function attachSecurityHeaders(response: NextResponse): NextResponse {
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

// ============================================
// PIPELINE DE VALIDAÇÃO COMUM
// ============================================

/**
 * Executa pipeline de validação comum para ambos os middlewares
 */
export async function runCommonValidationPipeline(
  request: NextRequest,
  config: MiddlewareConfig
): Promise<{ 
  success: boolean
  response?: NextResponse
  rateLimitResult?: RateLimitResult
  ip: string 
}> {
  const ip = getClientIP(request)

  // 1. Validar método HTTP
  const methodValidation = validateHttpMethod(request, config.allowedMethods)
  if (!methodValidation.success) {
    return { success: false, response: methodValidation.response, ip }
  }

  // 2. Aplicar rate limiting (se configurado)
  let rateLimitResult: RateLimitResult | undefined
  if (config.rateLimit) {
    const rateLimit = await applyRateLimit(request, {
      requests: config.rateLimit.requests,
      windowMs: config.rateLimit.windowMs,
      namespace: config.rateLimit.namespace || 'common'
    })
    
    rateLimitResult = rateLimit.result
    
    if (!rateLimit.success) {
      return { success: false, response: rateLimit.response, ip }
    }
  }

  // 3. Validar headers básicos (se habilitado)
  if (config.validateHeaders) {
    const headerValidation = validateBasicHeaders(request)
    if (!headerValidation.success) {
      return { success: false, response: headerValidation.response, ip }
    }
  }

  // 4. Validar origem (se habilitado)
  if (config.validateOrigin && config.allowedOrigins) {
    const originValidation = validateRequestOrigin(request, config.allowedOrigins)
    if (!originValidation.success) {
      return { success: false, response: originValidation.response, ip }
    }
  }

  return { success: true, rateLimitResult, ip }
}

// ============================================
// HELPERS DE LOGGING
// ============================================

/**
 * Log padronizado para middlewares
 */
export function logMiddlewareEvent(
  type: 'security' | 'validation',
  event: string,
  ip: string,
  details?: any
): void {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${type.toUpperCase()}-MIDDLEWARE] ${event} | IP: ${ip}`, details || '')
}

/**
 * Log de erro padronizado para middlewares
 */
export function logMiddlewareError(
  type: 'security' | 'validation',
  error: string,
  ip: string,
  details?: any
): void {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] [${type.toUpperCase()}-MIDDLEWARE] ERROR: ${error} | IP: ${ip}`, details || '')
}