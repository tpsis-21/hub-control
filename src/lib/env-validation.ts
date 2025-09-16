/**
 * Validação de Variáveis de Ambiente - Fase 2
 * 
 * Este arquivo valida todas as variáveis de ambiente necessárias
 * na inicialização da aplicação, garantindo configuração segura.
 */

import { z } from 'zod'

// ============================================
// SCHEMAS DE VALIDAÇÃO POR AMBIENTE
// ============================================

// Schema base para todas as configurações
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  
  // URLs públicas (sempre necessárias)
  NEXT_PUBLIC_SUPABASE_URL: z.string()
    .url('URL do Supabase inválida')
    .refine(url => url.includes('supabase.co'), {
      message: 'URL deve ser do domínio supabase.co'
    }),
    
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string()
    .min(20, 'Chave anônima do Supabase muito curta')
    .regex(/^eyJ/, 'Chave anônima deve ser um JWT válido'),
    
  NEXT_PUBLIC_APP_URL: z.string()
    .url('URL da aplicação inválida')
    .optional()
    .default('http://localhost:3000'),
    
  NEXT_PUBLIC_API_URL: z.string()
    .url('URL da API inválida')
    .optional()
    .default('http://localhost:3000/api'),
    
  // Chave VAPID pública (para notificações)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string()
    .min(20, 'Chave VAPID pública muito curta')
    .optional()
})

// Schema para desenvolvimento
const developmentEnvSchema = baseEnvSchema.extend({
  // Em desenvolvimento, chaves sensíveis são opcionais
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  TMDB_API_KEY: z.string().optional(),
  BOT_API_KEY: z.string().optional(),
  NATV_API_KEY: z.string().optional()
})

// Schema para staging/produção
const productionEnvSchema = baseEnvSchema.extend({
  // Em produção, chaves sensíveis são obrigatórias
  SUPABASE_SERVICE_ROLE_KEY: z.string()
    .min(20, 'Service role key muito curta')
    .regex(/^eyJ/, 'Service role key deve ser um JWT válido'),
    
  VAPID_PRIVATE_KEY: z.string()
    .min(20, 'Chave VAPID privada muito curta'),
    
  TMDB_API_KEY: z.string()
    .min(10, 'API Key do TMDB muito curta')
    .optional(),
    
  BOT_API_KEY: z.string()
    .min(10, 'API Key do Bot muito curta')
    .optional(),
    
  NATV_API_KEY: z.string()
    .min(10, 'API Key do NATV muito curta')
    .optional()
})

// ============================================
// FUNÇÃO DE VALIDAÇÃO PRINCIPAL
// ============================================

export interface ValidatedEnv {
  NODE_ENV: 'development' | 'staging' | 'production' | 'test'
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_API_URL: string
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  VAPID_PRIVATE_KEY?: string
  TMDB_API_KEY?: string
  BOT_API_KEY?: string
  NATV_API_KEY?: string
}

/**
 * Valida as variáveis de ambiente baseado no ambiente atual
 */
export function validateEnvironment(): ValidatedEnv {
  const env = (process.env.NODE_ENV as 'development' | 'test' | 'staging' | 'production') || 'development'
  
  console.log(`🔍 Validando configurações de ambiente: ${env}`)
  
  try {
    let validatedEnv: ValidatedEnv
    
    const isProdLike = env === 'production' || env === 'staging'
    if (isProdLike) {
       validatedEnv = productionEnvSchema.parse(process.env)
       console.log('✅ Configurações de produção validadas com sucesso')
     } else {
       validatedEnv = developmentEnvSchema.parse(process.env)
       console.log('✅ Configurações de desenvolvimento validadas com sucesso')
     }
    
    // Verificações adicionais de segurança
    performSecurityChecks(validatedEnv)
    
    return validatedEnv
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Erro na validação de ambiente:')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      
      // Sugestões de correção
      console.error('\n💡 Sugestões:')
      if (env === 'production') {
        console.error('  - Configure todas as variáveis sensíveis no seu provedor de hospedagem')
        console.error('  - Verifique se as chaves estão no formato correto')
      } else {
        console.error('  - Copie .env.local.secure para .env.local')
        console.error('  - Configure as variáveis públicas necessárias')
      }
    }
    
    throw new Error(`Configuração de ambiente inválida para ${env}`)
  }
}

// ============================================
// VERIFICAÇÕES DE SEGURANÇA
// ============================================

function performSecurityChecks(env: ValidatedEnv): void {
  const warnings: string[] = []
  const errors: string[] = []
  
  // 1. Verificar se não estamos usando valores de exemplo
  const exampleValues = [
    'your-key-here', 'example', 'test', 'demo', 'sample', 'placeholder',
    'changeme', 'default', 'temp', 'dummy', 'fake', 'mock'
  ]
  
  Object.entries(env).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase()
      if (exampleValues.some(example => lowerValue.includes(example))) {
        if (env.NODE_ENV === 'production') {
          errors.push(`${key} contém valor de exemplo em produção`)
        } else {
          warnings.push(`${key} parece conter um valor de exemplo`)
        }
      }
    }
  })
  
  // 2. Verificações específicas para produção
  if (env.NODE_ENV === 'production') {
    // URLs de produção
    if (env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      errors.push('APP_URL não deve usar localhost em produção')
    }
    
    if (env.NEXT_PUBLIC_API_URL?.includes('localhost')) {
      errors.push('API_URL não deve usar localhost em produção')
    }
    
    if (!env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
      errors.push('APP_URL deve usar HTTPS em produção')
    }
    
    if (!env.NEXT_PUBLIC_API_URL?.startsWith('https://')) {
      errors.push('API_URL deve usar HTTPS em produção')
    }
    
    // Chaves obrigatórias em produção
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY é obrigatória em produção')
    }
    
    if (!env.VAPID_PRIVATE_KEY) {
      errors.push('VAPID_PRIVATE_KEY é obrigatória em produção')
    }
    
    // Verificar força das chaves em produção
    if (env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY.length < 100) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY parece muito curta para produção')
    }
    
    if (env.VAPID_PRIVATE_KEY && env.VAPID_PRIVATE_KEY.length < 40) {
      warnings.push('VAPID_PRIVATE_KEY parece muito curta para produção')
    }
    
    // Verificar domínios seguros
    const allowedDomains = ['supabase.co', 'vercel.app', 'netlify.app']
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    if (!allowedDomains.some(domain => supabaseUrl.includes(domain))) {
      warnings.push('URL do Supabase não está em um domínio conhecido')
    }
  }
  
  // 3. Verificações para desenvolvimento
  if (env.NODE_ENV === 'development') {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY não configurada - algumas funcionalidades podem não funcionar')
    }
    
    if (!env.VAPID_PRIVATE_KEY) {
      warnings.push('VAPID_PRIVATE_KEY não configurada - notificações push não funcionarão')
    }
    
    // Avisar sobre uso de HTTPS em desenvolvimento
    if (env.NEXT_PUBLIC_APP_URL?.startsWith('https://') && env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
      warnings.push('Usando HTTPS com localhost pode causar problemas de certificado')
    }
  }
  
  // 4. Verificações gerais de segurança
  // Verificar se as chaves JWT são válidas
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ')) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY não parece ser um JWT válido')
  }
  
  if (env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY não parece ser um JWT válido')
  }
  
  // Verificar se as URLs são válidas
  try {
    new URL(env.NEXT_PUBLIC_SUPABASE_URL)
  } catch {
    errors.push('NEXT_PUBLIC_SUPABASE_URL não é uma URL válida')
  }
  
  try {
    new URL(env.NEXT_PUBLIC_APP_URL)
  } catch {
    errors.push('NEXT_PUBLIC_APP_URL não é uma URL válida')
  }
  
  try {
    new URL(env.NEXT_PUBLIC_API_URL)
  } catch {
    errors.push('NEXT_PUBLIC_API_URL não é uma URL válida')
  }
  
  // 5. Verificações de consistência
  if (env.NEXT_PUBLIC_API_URL && env.NEXT_PUBLIC_APP_URL) {
    const appUrl = new URL(env.NEXT_PUBLIC_APP_URL)
    const apiUrl = new URL(env.NEXT_PUBLIC_API_URL)
    
    if (appUrl.hostname !== apiUrl.hostname && !apiUrl.pathname.startsWith('/api')) {
      warnings.push('API_URL e APP_URL estão em domínios diferentes - verifique se isso é intencional')
    }
  }
  
  // 6. Exibir avisos e erros
  if (warnings.length > 0) {
    console.warn('⚠️  Avisos de configuração:')
    warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
  
  if (errors.length > 0) {
    console.error('❌ Erros críticos de configuração:')
    errors.forEach(error => console.error(`  - ${error}`))
    throw new Error('Configuração de ambiente contém erros críticos')
  }
  
  if (warnings.length === 0 && errors.length === 0) {
    console.log('🔒 Verificações de segurança aprovadas')
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Verifica se uma variável de ambiente está configurada
 */
export function isEnvConfigured(key: keyof ValidatedEnv): boolean {
  return Boolean(process.env[key])
}

/**
 * Obtém uma variável de ambiente com valor padrão
 */
export function getEnvVar(key: keyof ValidatedEnv, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

/**
 * Verifica se estamos em ambiente de produção
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Verifica se estamos em ambiente de desenvolvimento
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Obtém configurações públicas seguras para o frontend
 */
export function getPublicConfig() {
  const env = validateEnvironment()
  
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    apiUrl: env.NEXT_PUBLIC_API_URL,
    vapidPublicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    environment: env.NODE_ENV
  }
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

// Validar ambiente na importação (apenas no servidor)
if (typeof window === 'undefined') {
  try {
    validateEnvironment()
  } catch (error) {
    console.error('Falha na validação de ambiente:', error)
    // Não falhar durante o build - apenas em runtime de produção real
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      process.exit(1)
    }
  }
}

export default validateEnvironment