/**
 * Middleware de Validação para APIs - Fase 2
 * 
 * Este middleware implementa validação robusta para todas as rotas de API,
 * prevenindo ataques de injeção e garantindo integridade dos dados.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ValidationUtils, ValidationSchemas } from '@/lib/input-validation-enhanced'
import { 
  createStandardErrorResponse,
  createStandardSuccessResponse,
  runCommonValidationPipeline,
  attachRateLimitHeaders,
  logMiddlewareEvent,
  logMiddlewareError,
  type MiddlewareConfig,
  type ValidationError,
  type MiddlewareResult
} from './shared/helpers'

// ============================================
// TIPOS E INTERFACES
// ============================================

interface ValidationResult {
  success: boolean
  data?: any
  errors?: ValidationError[]
}

// ============================================
// REMOVIDO: RATE LIMITING SIMPLES (duplicado)
// ============================================

// ============================================
// VALIDAÇÃO DE HEADERS
// ============================================

function validateHeaders(request: NextRequest): ValidationResult {
  try {
    const headers = {
      'content-type': request.headers.get('content-type'),
      'authorization': request.headers.get('authorization'),
      'user-agent': request.headers.get('user-agent'),
      'x-forwarded-for': request.headers.get('x-forwarded-for')
    }
    
    const validatedHeaders = ValidationSchemas.requestHeaders.parse(headers)
    
    return { success: true, data: validatedHeaders }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: 'INVALID_HEADER'
      }))
      return { success: false, errors }
    }
    
    return {
      success: false,
      errors: [{ field: 'headers', message: 'Erro na validação de headers', code: 'HEADER_ERROR' }]
    }
  }
}

// ============================================
// VALIDAÇÃO DE BODY
// ============================================

function validateRequestBody(body: any, schema?: z.ZodSchema): ValidationResult {
  if (!schema) {
    return { success: true, data: body }
  }
  
  try {
    const validatedData = schema.parse(body)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: 'INVALID_BODY'
      }))
      return { success: false, errors }
    }
    
    return {
      success: false,
      errors: [{ field: 'body', message: 'Erro na validação do corpo da requisição', code: 'BODY_ERROR' }]
    }
  }
}

// ============================================
// VALIDAÇÃO DE QUERY PARAMETERS
// ============================================

function validateQueryParams(url: URL, schema?: z.ZodSchema): ValidationResult {
  if (!schema) {
    return { success: true, data: Object.fromEntries(url.searchParams) }
  }
  
  try {
    const params = Object.fromEntries(url.searchParams)
    const validatedParams = schema.parse(params)
    return { success: true, data: validatedParams }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: 'INVALID_QUERY'
      }))
      return { success: false, errors }
    }
    
    return {
      success: false,
      errors: [{ field: 'query', message: 'Erro na validação de parâmetros', code: 'QUERY_ERROR' }]
    }
  }
}

// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================

export interface ValidationConfig {
  bodySchema?: z.ZodSchema
  querySchema?: z.ZodSchema
  requireAuth?: boolean
  rateLimit?: {
    requests: number
    windowMs: number
  }
  allowedMethods?: string[]
}

/**
 * Middleware de validação principal
 */
export function createValidationMiddleware(config: ValidationConfig = {}) {
  return async function validationMiddleware(
    request: NextRequest,
    handler: (req: NextRequest, validatedData: any) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // 1. Verificar método HTTP
      if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
        return createStandardErrorResponse(
          'Método não permitido',
          `Método ${request.method} não é permitido para esta rota.`,
          405
        )
      }
      
      // 2. Rate limiting centralizado
      const common = await runCommonValidationPipeline(request, {
        rateLimit: config.rateLimit ? { ...config.rateLimit, namespace: 'validation:middleware' } : undefined,
        allowedMethods: config.allowedMethods,
        validateHeaders: true
      })

      const ip = common.ip

      if (!common.success && common.response) {
        return common.response
      }

      const rate = common.rateLimitResult!
      
      // 3. Validar headers
      const headerValidation = validateHeaders(request)
      if (!headerValidation.success) {
        return createStandardErrorResponse(
          'Headers inválidos',
          '🔧 Sua requisição não contém os headers válidos necessários.',
          400
        )
      }
      
      // 4. Validar query parameters
      const url = new URL(request.url)
      const queryValidation = validateQueryParams(url, config.querySchema)
      if (!queryValidation.success) {
        return createStandardErrorResponse(
          'Parâmetros inválidos',
          'Os parâmetros da URL não são válidos para esta operação.',
          400
        )
      }
      
      // 5. Validar body (se presente)
      let bodyValidation: ValidationResult = { success: true }
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        try {
          const body = await request.json()
          bodyValidation = validateRequestBody(body, config.bodySchema)
          if (!bodyValidation.success) {
            return createStandardErrorResponse(
              'Dados inválidos',
              'Os dados enviados não são válidos para esta operação.',
              400
            )
          }
        } catch (error) {
          return createStandardErrorResponse(
            'JSON inválido',
            'O corpo da requisição não é um JSON válido.',
            400
          )
        }
      }
      
      // 6. Verificar autenticação (se necessário)
      if (config.requireAuth) {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return createStandardErrorResponse(
            'Autenticação necessária',
            'Token de autenticação (Bearer) é obrigatório para acessar este recurso.',
            401
          )
        }
      }
      
      // 7. Preparar dados validados
      const validatedData = {
        headers: headerValidation.data,
        query: queryValidation.data,
        body: bodyValidation.data,
        ip,
        method: request.method,
        rateLimit: rate
      }
      
      // 8. Chamar handler
      const response = await handler(request, validatedData)
      
      // 9. Anexar cabeçalhos de rate limit na resposta de sucesso
      attachRateLimitHeaders(response, rate)
      
      return response
      
    } catch (error) {
      console.error('Erro no middleware de validação:', error)
      return createStandardErrorResponse(
        'Erro interno do servidor',
        '🔧 Ocorreu um erro interno. Nossa equipe foi notificada.',
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
export const authValidationMiddleware = createValidationMiddleware({
  bodySchema: z.object({
    email: ValidationSchemas.email,
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
  }),
  allowedMethods: ['POST'],
  rateLimit: { requests: 5, windowMs: 60000 } // 5 tentativas por minuto
})

/**
 * Middleware para rotas de API protegidas
 */
export const protectedApiMiddleware = createValidationMiddleware({
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  rateLimit: { requests: 100, windowMs: 60000 }
})

/**
 * Middleware para upload de arquivos
 */
export const fileUploadMiddleware = createValidationMiddleware({
  requireAuth: true,
  allowedMethods: ['POST'],
  rateLimit: { requests: 10, windowMs: 60000 } // 10 uploads por minuto
})

// ============================================
// UTILITÁRIOS DE RESPOSTA
// ============================================

/**
 * Cria resposta de erro padronizada (compatibilidade)
 * @deprecated Use createStandardErrorResponse dos helpers compartilhados
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number = 400,
  details?: any
) {
  return createStandardErrorResponse(message, message, status)
}

/**
 * Cria resposta de sucesso padronizada (compatibilidade)
 * @deprecated Use createStandardSuccessResponse dos helpers compartilhados
 */
export function createSuccessResponse(data: any, message?: string) {
  return createStandardSuccessResponse(data, message)
}

export { ValidationSchemas, ValidationUtils }