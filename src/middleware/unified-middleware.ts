/**
 * Middleware Unificado - Fase 2 da Consolidação
 * 
 * Este middleware combina funcionalidades de segurança e validação em uma única
 * interface, eliminando duplicidade e fornecendo configuração flexível por rota.
 * 
 * Funcionalidades Integradas:
 * - Rate limiting centralizado
 * - Validação de entrada (headers, body, query)
 * - Detecção de segurança (padrões suspeitos, IPs bloqueados)
 * - Autenticação e autorização
 * - Logs estruturados
 * - Respostas padronizadas
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { securityMonitor, SecurityDetectors } from '@/lib/security-monitor'
import { createServerSupabaseClient } from "@/lib/supabase/clients/server"
import { inputValidator } from '@/lib/input-validation'
import { ValidationUtils, ValidationSchemas } from '@/lib/input-validation-enhanced'
import {
  createStandardErrorResponse,
  createStandardSuccessResponse,
  runCommonValidationPipeline,
  attachRateLimitHeaders,
  attachSecurityHeaders,
  logMiddlewareEvent,
  logMiddlewareError,
  type MiddlewareConfig,
  type ValidationError,
  type MiddlewareResult
} from './shared/helpers'
import { getClientIP } from '@/lib/security/rate-limit'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface UnifiedMiddlewareConfig extends MiddlewareConfig {
  // Configurações de Validação
  bodySchema?: z.ZodSchema
  querySchema?: z.ZodSchema
  paramsSchema?: z.ZodSchema
  
  // Configurações de Autenticação
  requireAuth?: boolean
  requiredRole?: 'user' | 'admin' | 'moderator'
  
  // Configurações de Segurança
  enablePayloadScan?: boolean
  enableIPBlocking?: boolean
  enableUserBlocking?: boolean
  enableSuspiciousPatternDetection?: boolean
  enableCSRFProtection?: boolean
  maxPayloadSize?: number
  trustedIPs?: string[]
  
  // Configurações de Headers
  requiredHeaders?: string[]
  corsOrigins?: string[]
  
  // Configurações de Rate Limiting (herdadas de MiddlewareConfig)
  // rateLimit?: { requests: number; windowMs: number; namespace?: string }
}

export interface UnifiedValidatedData {
  headers: Record<string, string>
  query: Record<string, any>
  body: any
  params?: Record<string, any>
  user?: any
  ip: string
  method: string
  userAgent: string
  rateLimitResult: any
}

// ============================================
// CONFIGURAÇÕES PADRÃO
// ============================================

const DEFAULT_CONFIG: Partial<UnifiedMiddlewareConfig> = {
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true,
  enableSuspiciousPatternDetection: true,
  enableCSRFProtection: false,
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
  validateHeaders: true,
  validateOrigin: false
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Valida e sanitiza o corpo da requisição
 */
async function validateRequestBody(
  request: NextRequest,
  schema?: z.ZodSchema
): Promise<{ success: boolean; data?: any; errors?: ValidationError[] }> {
  try {
    if (!schema) {
      return { success: true, data: null }
    }

    const contentType = request.headers.get('content-type') || ''
    
    if (!contentType.includes('application/json')) {
      return { success: true, data: null }
    }

    const body = await request.json()
    const validatedData = schema.parse(body)
    
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      return { success: false, errors }
    }
    
    return {
      success: false,
      errors: [{ field: 'body', message: 'Formato de dados inválido', code: 'invalid_format' }]
    }
  }
}

/**
 * Valida parâmetros de query
 */
function validateQueryParams(
  request: NextRequest,
  schema?: z.ZodSchema
): { success: boolean; data?: any; errors?: ValidationError[] } {
  try {
    if (!schema) {
      return { success: true, data: {} }
    }

    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const validatedData = schema.parse(queryParams)
    
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      return { success: false, errors }
    }
    
    return {
      success: false,
      errors: [{ field: 'query', message: 'Parâmetros de query inválidos', code: 'invalid_query' }]
    }
  }
}

/**
 * Verifica autenticação e autorização
 */
async function checkAuthentication(
  request: NextRequest,
  config: UnifiedMiddlewareConfig
): Promise<{ success: boolean; user?: any; response?: NextResponse }> {
  if (!config.requireAuth) {
    return { success: true }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session?.user) {
      return {
        success: false,
        response: createStandardErrorResponse(
          'Não autorizado',
          'Acesso negado. Faça login para continuar.',
          401
        )
      }
    }

    // Verificar role se necessário
    if (config.requiredRole) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== config.requiredRole) {
        return {
          success: false,
          response: createStandardErrorResponse(
            'Acesso negado',
            'Você não tem permissão para acessar este recurso.',
            403
          )
        }
      }
    }

    return { success: true, user: session.user }
  } catch (error) {
    console.error('Erro na verificação de autenticação:', error)
    return {
      success: false,
      response: createStandardErrorResponse(
        'Erro de autenticação',
        'Erro interno na verificação de autenticação.',
        500
      )
    }
  }
}

/**
 * Escaneia payload para padrões maliciosos
 */
async function scanPayloadSecurity(
  request: NextRequest,
  ip: string,
  userAgent: string,
  userId?: string
): Promise<{ success: boolean; response?: NextResponse }> {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    if (!contentType.includes('application/json')) {
      return { success: true }
    }

    const clonedRequest = request.clone()
    const body = await clonedRequest.text()
    
    // Verificar padrões suspeitos
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /document\.(write|cookie)/gi,
      /window\.(location|open)/gi,
      /(union|select|insert|update|delete|drop|create|alter)\s+/gi,
      /\b(exec|execute|sp_|xp_)\w*/gi
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(body)) {
        SecurityDetectors.maliciousPayload(ip, userAgent, 'Suspicious pattern detected', userId)
        
        return {
          success: false,
          response: createStandardErrorResponse(
            'Payload suspeito detectado',
            'Sua requisição contém padrões que podem ser maliciosos.',
            400
          )
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro no escaneamento de payload:', error)
    return { success: true } // Não bloquear por erro de escaneamento
  }
}

// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================

/**
 * Cria um middleware unificado com configuração personalizada
 */
export function createUnifiedMiddleware(config: UnifiedMiddlewareConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  return async function unifiedMiddleware(
    request: NextRequest,
    handler: (req: NextRequest, validatedData: UnifiedValidatedData) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const method = request.method
    const url = request.url
    const pathname = new URL(url).pathname
    
    try {
      // 1. Executar pipeline de validação comum (rate limiting, headers, métodos)
      const commonValidation = await runCommonValidationPipeline(request, finalConfig)
      
      if (!commonValidation.success) {
        logMiddlewareEvent('security', 'Common validation failed', commonValidation.ip)
        return commonValidation.response!
      }
      
      const { ip, rateLimitResult } = commonValidation
      
      // 2. Verificar IPs confiáveis (bypass completo)
      if (finalConfig.trustedIPs?.includes(ip)) {
        logMiddlewareEvent('security', 'Trusted IP bypass', ip)
        const trustedData: UnifiedValidatedData = {
          headers: Object.fromEntries(request.headers.entries()),
          query: {},
          body: null,
          ip,
          method,
          userAgent,
          rateLimitResult: rateLimitResult!
        }
        return await handler(request, trustedData)
      }
      
      // 3. Verificar bloqueios de IP
      if (finalConfig.enableIPBlocking && securityMonitor.isIPBlocked(ip)) {
        SecurityDetectors.unauthorizedAccess(ip, userAgent, pathname)
        logMiddlewareEvent('security', 'IP blocked', ip)
        
        return createStandardErrorResponse(
          'Acesso bloqueado',
          'Seu IP foi temporariamente bloqueado devido a atividade suspeita.',
          403
        )
      }
      
      // 4. Verificar autenticação
      const authCheck = await checkAuthentication(request, finalConfig)
      if (!authCheck.success) {
        logMiddlewareEvent('security', 'Authentication failed', ip)
        return authCheck.response!
      }
      
      // 5. Verificar bloqueio de usuário
      if (finalConfig.enableUserBlocking && authCheck.user) {
        if (securityMonitor.isUserBlocked(authCheck.user.id)) {
          SecurityDetectors.unauthorizedAccess(ip, userAgent, pathname, authCheck.user.id)
          logMiddlewareEvent('security', 'User blocked', ip, authCheck.user.id)
          
          return createStandardErrorResponse(
            'Conta bloqueada',
            'Sua conta foi temporariamente suspensa devido a atividade suspeita.',
            403
          )
        }
      }
      
      // 6. Escanear payload para padrões maliciosos
      if (finalConfig.enablePayloadScan && ['POST', 'PUT', 'PATCH'].includes(method)) {
        // Verificar tamanho do payload
        const contentLength = parseInt(request.headers.get('content-length') || '0')
        if (contentLength > (finalConfig.maxPayloadSize || 0)) {
          SecurityDetectors.maliciousPayload(ip, userAgent, 'Payload too large', authCheck.user?.id)
          
          return createStandardErrorResponse(
            'Payload muito grande',
            'O corpo da requisição excede o tamanho máximo permitido.',
            413
          )
        }
        
        const payloadScan = await scanPayloadSecurity(request, ip, userAgent, authCheck.user?.id)
        if (!payloadScan.success) {
          return payloadScan.response!
        }
      }
      
      // 7. Validar dados de entrada
      const bodyValidation = await validateRequestBody(request, finalConfig.bodySchema)
      if (!bodyValidation.success) {
        logMiddlewareEvent('validation', 'Body validation failed', ip)
        return createStandardErrorResponse(
          'Dados inválidos',
          `Erro na validação: ${bodyValidation.errors?.map(e => e.message).join(', ')}`,
          400
        )
      }
      
      const queryValidation = validateQueryParams(request, finalConfig.querySchema)
      if (!queryValidation.success) {
        logMiddlewareEvent('validation', 'Query validation failed', ip)
        return createStandardErrorResponse(
          'Parâmetros inválidos',
          `Erro na validação: ${queryValidation.errors?.map(e => e.message).join(', ')}`,
          400
        )
      }
      
      // 8. Preparar dados validados
      const validatedData: UnifiedValidatedData = {
        headers: Object.fromEntries(request.headers.entries()),
        query: queryValidation.data || {},
        body: bodyValidation.data,
        user: authCheck.user,
        ip,
        method,
        userAgent,
        rateLimitResult: rateLimitResult!
      }
      
      // 9. Executar handler
      logMiddlewareEvent('security', 'Request processed successfully', ip, authCheck.user?.id)
      const response = await handler(request, validatedData)
      
      // 10. Anexar headers de segurança e rate limit
      attachSecurityHeaders(response)
      attachRateLimitHeaders(response, rateLimitResult!)
      
      return response
      
    } catch (error) {
      logMiddlewareError('security', (error as Error).message, getClientIP(request))
      return createStandardErrorResponse(
        'Erro interno do servidor',
        'Ocorreu um erro interno. Nossa equipe foi notificada.',
        500
      )
    }
  }
}

// ============================================
// MIDDLEWARES PRÉ-CONFIGURADOS
// ============================================

/**
 * Middleware para rotas de autenticação
 */
export const authUnifiedMiddleware = createUnifiedMiddleware({
  bodySchema: z.object({
    email: ValidationSchemas.email,
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
  }),
  allowedMethods: ['POST'],
  rateLimit: { requests: 5, windowMs: 60000, namespace: 'auth' },
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: false,
  maxPayloadSize: 1024 * 1024 // 1MB
})

/**
 * Middleware para APIs administrativas
 */
export const adminUnifiedMiddleware = createUnifiedMiddleware({
  requireAuth: true,
  requiredRole: 'admin',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  rateLimit: { requests: 50, windowMs: 60000, namespace: 'admin' },
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true,
  enableSuspiciousPatternDetection: true,
  maxPayloadSize: 5 * 1024 * 1024 // 5MB
})

/**
 * Middleware para upload de arquivos
 */
export const uploadUnifiedMiddleware = createUnifiedMiddleware({
  requireAuth: true,
  allowedMethods: ['POST'],
  rateLimit: { requests: 10, windowMs: 60000, namespace: 'upload' },
  enablePayloadScan: false, // Não escanear arquivos binários
  enableIPBlocking: true,
  enableUserBlocking: true,
  maxPayloadSize: 50 * 1024 * 1024 // 50MB
})

/**
 * Middleware para APIs públicas
 */
export const publicUnifiedMiddleware = createUnifiedMiddleware({
  requireAuth: false,
  allowedMethods: ['GET', 'POST'],
  rateLimit: { requests: 100, windowMs: 60000, namespace: 'public' },
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: false,
  maxPayloadSize: 2 * 1024 * 1024 // 2MB
})

/**
 * Middleware para APIs protegidas
 */
export const protectedUnifiedMiddleware = createUnifiedMiddleware({
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  rateLimit: { requests: 200, windowMs: 60000, namespace: 'protected' },
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true,
  maxPayloadSize: 10 * 1024 * 1024 // 10MB
})

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Helper para aplicar middleware em rotas específicas
 */
export function withUnifiedMiddleware<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  config?: UnifiedMiddlewareConfig
) {
  const middleware = createUnifiedMiddleware(config)
  
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest
    return middleware(request, (req, validatedData) => {
      // Adicionar dados validados ao contexto da requisição
      ;(req as any).validatedData = validatedData
      return handler(...args)
    })
  }
}

/**
 * Extrai dados validados de uma requisição processada pelo middleware
 */
export function getValidatedData(request: NextRequest): UnifiedValidatedData | null {
  return (request as any).validatedData || null
}