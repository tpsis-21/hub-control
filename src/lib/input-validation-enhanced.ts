/**
 * Sistema de Validação Robusta - Fase 2
 * 
 * Este arquivo implementa validação avançada de entrada para prevenir
 * ataques de injeção, XSS e outros vetores de ataque.
 */

import { z } from 'zod'
import DOMPurify from 'dompurify'
import { logger } from '@/utils/production-logger'

// ============================================
// SCHEMAS DE VALIDAÇÃO BÁSICA
// ============================================

// Validação de API Keys
export const apiKeySchema = z.string()
  .min(10, 'API Key muito curta')
  .max(200, 'API Key muito longa')
  .regex(/^[A-Za-z0-9_-]+$/, 'API Key contém caracteres inválidos')
  .refine(key => !key.includes('test') && !key.includes('example'), {
    message: 'API Key parece ser um valor de exemplo'
  })

// Validação de Email
export const emailSchema = z.string()
  .email('Email inválido')
  .max(255, 'Email muito longo')
  .toLowerCase()
  .refine(email => !email.includes('<') && !email.includes('>'), {
    message: 'Email contém caracteres perigosos'
  })

// Validação de URL
export const urlSchema = z.string()
  .url('URL inválida')
  .max(2048, 'URL muito longa')
  .refine(url => {
    const allowedProtocols = ['http:', 'https:']
    try {
      const parsed = new URL(url)
      return allowedProtocols.includes(parsed.protocol)
    } catch {
      return false
    }
  }, {
    message: 'Protocolo de URL não permitido'
  })

// Validação de ID
export const idSchema = z.string()
  .min(1, 'ID não pode estar vazio')
  .max(50, 'ID muito longo')
  .regex(/^[a-zA-Z0-9_-]+$/, 'ID contém caracteres inválidos')

// ============================================
// SCHEMAS ESPECÍFICOS DO DOMÍNIO
// ============================================

// Validação de dados do usuário
export const userDataSchema = z.object({
  name: z.string()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome contém caracteres inválidos'),
  email: emailSchema,
  role: z.enum(['admin', 'manager', 'user'], {
    errorMap: () => ({ message: 'Papel de usuário inválido' })
  })
})

// Validação de configurações do servidor
export const serverConfigSchema = z.object({
  name: z.string()
    .min(3, 'Nome do servidor muito curto')
    .max(50, 'Nome do servidor muito longo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nome contém caracteres inválidos'),
  url: urlSchema,
  apiKey: apiKeySchema.optional(),
  enabled: z.boolean()
})

// Validação de conteúdo HTML
export const htmlContentSchema = z.string()
  .max(10000, 'Conteúdo HTML muito longo')
  .transform(html => {
    // Sanitizar HTML automaticamente
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
      ALLOWED_ATTRS: ['class'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe'],
      FORBID_ATTR: ['onerror', 'onclick', 'onload']
    } as any)
  })

// ============================================
// VALIDAÇÃO DE ARQUIVOS
// ============================================

export const fileUploadSchema = z.object({
  name: z.string()
    .min(1, 'Nome do arquivo obrigatório')
    .max(255, 'Nome do arquivo muito longo')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Nome do arquivo contém caracteres inválidos'),
  size: z.number()
    .min(1, 'Arquivo vazio')
    .max(10 * 1024 * 1024, 'Arquivo muito grande (máximo 10MB)'),
  type: z.enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/csv',
    'application/json',
    'text/plain'
  ], {
    errorMap: () => ({ message: 'Tipo de arquivo não permitido' })
  })
})

// ============================================
// FUNÇÕES DE VALIDAÇÃO UTILITÁRIAS
// ============================================

/**
 * Valida e sanitiza entrada de texto
 */
export function validateAndSanitizeText(input: string, maxLength = 1000): string {
  const schema = z.string()
    .max(maxLength, `Texto muito longo (máximo ${maxLength} caracteres)`)
    .transform(text => {
      // Remove caracteres de controle
      return text.replace(/[\x00-\x1F\x7F]/g, '')
    })

  return schema.parse(input)
}

/**
 * Valida entrada numérica com limites
 */
export function validateNumber(input: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const schema = z.number()
    .min(min, `Valor deve ser maior que ${min}`)
    .max(max, `Valor deve ser menor que ${max}`)
    .finite('Valor deve ser um número finito')

  return schema.parse(input)
}

/**
 * Valida array com limite de tamanho
 */
export function validateArray<T>(input: unknown, itemSchema: z.ZodSchema<T>, maxItems = 100): T[] {
  const schema = z.array(itemSchema)
    .max(maxItems, `Array muito grande (máximo ${maxItems} itens)`)

  return schema.parse(input)
}

// ============================================
// VALIDAÇÃO DE REQUISIÇÕES API
// ============================================

/**
 * Middleware de validação para rotas de API
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        throw new Error(`Dados inválidos: ${messages.join(', ')}`)
      }
      throw error
    }
  }
}

/**
 * Valida headers de requisição
 */
export const requestHeadersSchema = z.object({
  'content-type': z.string().optional(),
  'authorization': z.string().optional(),
  'user-agent': z.string().max(500, 'User-Agent muito longo').optional(),
  'x-forwarded-for': z.string().max(100, 'X-Forwarded-For inválido').optional()
})

// ============================================
// VALIDAÇÃO DE CONFIGURAÇÕES DE AMBIENTE
// ============================================

export const envConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  NEXT_PUBLIC_SUPABASE_URL: urlSchema,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: apiKeySchema,
  SUPABASE_SERVICE_ROLE_KEY: apiKeySchema.optional(),
  NEXT_PUBLIC_APP_URL: urlSchema.optional(),
  VAPID_PRIVATE_KEY: z.string().min(20).optional(),
  TMDB_API_KEY: apiKeySchema.optional(),
  BOT_API_KEY: apiKeySchema.optional(),
  NATV_API_KEY: apiKeySchema.optional()
})

/**
 * Valida configurações de ambiente na inicialização
 */
export function validateEnvironmentConfig() {
  try {
    const config = envConfigSchema.parse(process.env)
    logger.debug('✅ Configurações de ambiente validadas com sucesso')
    return config
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Erro na validação de ambiente:')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    throw new Error('Configuração de ambiente inválida')
  }
}

// ============================================
// EXPORTAÇÕES PARA USO GERAL
// ============================================

export const ValidationSchemas = {
  apiKey: apiKeySchema,
  email: emailSchema,
  url: urlSchema,
  id: idSchema,
  userData: userDataSchema,
  serverConfig: serverConfigSchema,
  htmlContent: htmlContentSchema,
  fileUpload: fileUploadSchema,
  requestHeaders: requestHeadersSchema,
  envConfig: envConfigSchema
} as const

export const ValidationUtils = {
  validateAndSanitizeText,
  validateNumber,
  validateArray,
  createValidationMiddleware,
  validateEnvironmentConfig
} as const
