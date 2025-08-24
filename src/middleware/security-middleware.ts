// 🔒 Middleware de Segurança para APIs
// Integra o monitor de segurança com as rotas da aplicação

import { NextRequest, NextResponse } from 'next/server';
import { securityMonitor, SecurityDetectors } from '@/lib/security-monitor';
import { createServerSupabaseClient } from "@/lib/supabase/clients/server";
// rateLimitCustom, getClientIP, buildRateLimitHeaders agora estão nos helpers compartilhados
import { inputValidator } from '@/lib/input-validation';
import crypto from 'crypto';
import { 
  createStandardErrorResponse,
  runCommonValidationPipeline,
  attachSecurityHeaders,
  logMiddlewareEvent,
  logMiddlewareError,
  type MiddlewareConfig
} from './shared/helpers';

// Configurações do middleware
interface SecurityMiddlewareConfig extends MiddlewareConfig {
  enablePayloadScan?: boolean;
  enableIPBlocking?: boolean;
  enableUserBlocking?: boolean;
  enableSuspiciousPatternDetection?: boolean;
  enableCSRFProtection?: boolean;
  enableInputValidation?: boolean;
  maxPayloadSize?: number;
  trustedIPs?: string[];
  requiredHeaders?: string[];
  rateLimitConfig?: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
  };
}

const DEFAULT_CONFIG: SecurityMiddlewareConfig = {
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true,
  enableSuspiciousPatternDetection: true,
  enableCSRFProtection: true,
  enableInputValidation: true,
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
  trustedIPs: ['127.0.0.1', '::1'], // localhost
  allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
  validateHeaders: true,
  validateOrigin: true,
  requiredHeaders: ['user-agent', 'accept'],
  rateLimit: {
    requests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutos
    namespace: 'security'
  },
  rateLimitConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100,
    skipSuccessfulRequests: false
  }
};

// Padrões suspeitos comuns
const SUSPICIOUS_PATTERNS = [
  // SQL Injection
  /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
  /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
  
  // XSS
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  
  // Path Traversal
  /\.\.[\/\\]/g,
  /(etc\/passwd|boot\.ini|windows\/system32)/i,
  
  // Command Injection
  /(;|\||&|`|\$\(|\${)/g,
  /(wget|curl|nc|netcat|bash|sh|cmd|powershell)/i,
  
  // LDAP Injection
  /(\(|\)|\*|\\|\||&)/g,
  
  // NoSQL Injection
  /(\$where|\$ne|\$gt|\$lt|\$regex)/i
];

// Lista de User-Agents suspeitos
const SUSPICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /burp/i,
  /nmap/i,
  /masscan/i,
  /zap/i,
  /w3af/i,
  /acunetix/i,
  /appscan/i
];

// Headers obrigatórios para segurança
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Função para gerar token CSRF
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Função para validar token CSRF
function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(sessionToken, 'hex')
  );
}

// Função para validar origem da requisição
function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    return origin === allowed || origin.endsWith('.' + allowed.replace(/^https?:\/\//, ''));
  });
}

// Função para validar headers obrigatórios
function validateRequiredHeaders(request: NextRequest, requiredHeaders: string[]): string[] {
  const missingHeaders: string[] = [];
  
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      missingHeaders.push(header);
    }
  }
  
  return missingHeaders;
}

// Função para detectar ataques de timing
function detectTimingAttack(startTime: number): boolean {
  const duration = Date.now() - startTime;
  // Se a requisição for muito rápida, pode ser um ataque automatizado
  return duration < 10; // menos de 10ms
}

// getClientIP centralizado em '@/lib/security/rate-limit' (função local removida)

// Função para detectar padrões suspeitos
function detectSuspiciousPatterns(text: string): string[] {
  const detectedPatterns: string[] = [];
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(pattern.toString());
    }
  }
  
  return detectedPatterns;
}

// Função para verificar User-Agent suspeito
function isSuspiciousUserAgent(userAgent: string): boolean {
  return SUSPICIOUS_USER_AGENTS.some(pattern => pattern.test(userAgent));
}

// Função para escanear payload
async function scanPayload(payload: string, ip: string, userAgent: string, userId?: string): Promise<boolean> {
  const suspiciousPatterns = detectSuspiciousPatterns(payload);
  
  if (suspiciousPatterns.length > 0) {
    SecurityDetectors.maliciousPayload(ip, userAgent, payload, userId);
    return true;
  }
  
  return false;
}

// Middleware principal de segurança
export function createSecurityMiddleware(config: SecurityMiddlewareConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async function securityMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const method = request.method;
    const url = request.url;
    const pathname = new URL(url).pathname;
    let userId: string | undefined;
    let userEmail: string | undefined;
    
    try {
      // 1. Executar pipeline de validação comum
      const commonValidation = await runCommonValidationPipeline(request, finalConfig);
      
      if (!commonValidation.success) {
        logMiddlewareEvent('security', 'Common validation failed', commonValidation.ip);
        return commonValidation.response!;
      }
      
      const { ip, rateLimitResult } = commonValidation;
      
      // 2. Verificar IPs confiáveis
      if (finalConfig.trustedIPs?.includes(ip)) {
        logMiddlewareEvent('security', 'Trusted IP bypass', ip);
        return await handler(request);
      }
      
      // 3. Verificar bloqueios de IP
      if (finalConfig.enableIPBlocking && securityMonitor.isIPBlocked(ip)) {
        SecurityDetectors.unauthorizedAccess(ip, userAgent, pathname);
        logMiddlewareEvent('security', 'IP blocked', ip);
        
        return createStandardErrorResponse(
          'Acesso negado',
          'Seu IP foi bloqueado devido a atividade suspeita',
          403
        );
      }
      
      // 3. Verificar User-Agent suspeito
      if (isSuspiciousUserAgent(userAgent)) {
        SecurityDetectors.unauthorizedAccess(ip, userAgent, pathname);
        logMiddlewareEvent('security', 'Suspicious user-agent detected', ip, { userAgent })
        
        return createStandardErrorResponse(
          'Acesso negado',
          'User-Agent suspeito detectado',
          403
        );
      }
      
      // 4. Validação de headers obrigatórios (já coberta pelo pipeline quando validateHeaders=true)
      if (finalConfig.requiredHeaders && finalConfig.requiredHeaders.length > 0) {
        // O pipeline já valida user-agent e accept por padrão.
        // Se existirem headers extras obrigatórios, validar aqui.
        const missing = finalConfig.requiredHeaders.filter(h => !request.headers.get(h))
        if (missing.length > 0) {
          SecurityDetectors.unauthorizedAccess(ip, userAgent, pathname);
          logMiddlewareEvent('security', 'Missing required headers', ip, { missing })
          return createStandardErrorResponse(
            'Requisição inválida',
            '🔧 Sua requisição não contém as informações necessárias. Tente atualizar a página.',
            400
          )
        }
      }
      
      // 5. Validar origem da requisição (CORS) - já validado no pipeline quando validateOrigin=true
      // Mantemos como fallback caso allowedOrigins seja alterado dinamicamente por rota
      if (finalConfig.allowedOrigins && method !== 'GET') {
        const origin = request.headers.get('origin');
        const isValid = finalConfig.allowedOrigins.some(allowed => {
          if (allowed === '*') return true;
          return origin === allowed || (origin ? origin.endsWith('.' + allowed.replace(/^https?:\/\//, '')) : false);
        })
        if (!isValid) {
          SecurityDetectors.unauthorizedAccess(ip, userAgent, pathname);
          return createStandardErrorResponse(
            'Acesso negado',
            '🚫 Acesso não autorizado desta origem.',
            403
          );
        }
      }
      
      // 6. Obter usuário autenticado (se houver)
      try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          userId = user.id;
          userEmail = user.email;
          
          // Verificar bloqueio de usuário
          if (finalConfig.enableUserBlocking && userId && securityMonitor.isUserBlocked(userId)) {
            SecurityDetectors.unauthorizedAccess(ip, userAgent, pathname, userId);
            logMiddlewareEvent('security', 'User blocked', ip, { userId });
            
            return createStandardErrorResponse(
              'Conta bloqueada',
              '🔒 Sua conta foi temporariamente bloqueada por motivos de segurança.',
              403
            );
          }
        }
      } catch (error) {
        // Erro ao obter usuário - continuar sem autenticação
      }
      
      // 6. Rate limiting já aplicado no pipeline comum (finalConfig.rateLimit)
      // Mantemos o rateLimitConfig antigo para compatibilidade de configuração, mas priorizamos rateLimit
      // rateLimitResult está disponível via pipeline caso seja necessário anexar headers adicionais depois.

      
      // 6. Escanear payload para métodos que enviam dados
      if (finalConfig.enablePayloadScan && ['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          const contentType = request.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            const clonedRequest = request.clone();
            const body = await clonedRequest.text();
            
            // Verificar tamanho do payload
            if (body.length > (finalConfig.maxPayloadSize || 0)) {
              SecurityDetectors.maliciousPayload(ip, userAgent, 'Payload too large', userId);
              
              return createStandardErrorResponse(
                'Payload muito grande',
                'O corpo da requisição excede o tamanho máximo permitido.',
                413
              );
            }
            
            // Escanear padrões suspeitos
            const isMalicious = await scanPayload(body, ip, userAgent, userId);
            
            if (isMalicious) {
              return createStandardErrorResponse(
                'Payload malicioso detectado',
                'A requisição contém padrões suspeitos.',
                400
              );
            }
            
            // 8. Validação de input estruturada
            if (finalConfig.enableInputValidation) {
              try {
                const parsedBody = JSON.parse(body);
                const validationResult = inputValidator.validate(JSON.stringify(parsedBody), {
                  type: 'json',
                  required: true,
                  maxLength: 10000,
                  sanitize: true
                });
                
                if (!validationResult.isValid) {
                  SecurityDetectors.maliciousPayload(ip, userAgent, `Input validation failed: ${validationResult.errors.join(', ')}`, userId);
                  
                  return createStandardErrorResponse(
                  'Entrada inválida',
                  'A validação da entrada falhou',
                  400
                );
                }
              } catch (parseError) {
                // Se não conseguir fazer parse do JSON, continuar
              }
            }
            
            // 9. Validação de token CSRF para operações de modificação
            if (finalConfig.enableCSRFProtection && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
              const csrfToken = request.headers.get('x-csrf-token');
              const sessionToken = request.headers.get('x-session-token');
              
              if (!csrfToken || !sessionToken || !validateCSRFToken(csrfToken, sessionToken)) {
                SecurityDetectors.unauthorizedAccess(ip, userAgent, pathname, userId);
                
                return createStandardErrorResponse(
                  'Falha na validação do token CSRF',
                  'Token CSRF inválido ou ausente',
                  403
                );
              }
            }
          }
        } catch (error) {
          console.error('Erro ao escanear payload:', error);
          // Continuar mesmo com erro no escaneamento
        }
      }
      
      // 7. Detectar padrões suspeitos na URL
      if (finalConfig.enableSuspiciousPatternDetection) {
        const suspiciousPatterns = detectSuspiciousPatterns(url);
        
        if (suspiciousPatterns.length > 0) {
          SecurityDetectors.maliciousPayload(ip, userAgent, `Suspicious URL: ${url}`, userId);
          
          return createStandardErrorResponse(
            'Requisição suspeita',
            '🛡️ Sua requisição foi bloqueada por motivos de segurança.',
            400
          );
        }
      }
      
      // 10. Detectar ataques de timing
      const startTime = Date.now();
      
      // 11. Executar handler original
      const response = await handler(request);
      
      // 12. Verificar timing attack após execução
      if (detectTimingAttack(startTime)) {
        SecurityDetectors.rapidAPICalls(ip, userAgent, pathname, 1, userId);
        // Log mas não bloquear - pode ser legítimo
      }
      
      // 13. Adicionar headers de segurança usando helpers
      const secureResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      // Aplicar headers de segurança padronizados
      attachSecurityHeaders(secureResponse);
      
      // Header adicional para CSRF token
      if (finalConfig.enableCSRFProtection) {
        secureResponse.headers.set('X-CSRF-Token', generateCSRFToken());
      }
      
      // CSP para APIs
      if (pathname.startsWith('/api/')) {
        secureResponse.headers.set(
          'Content-Security-Policy',
          "default-src 'none'; frame-ancestors 'none';"
        );
      }
      
      return secureResponse;
      
    } catch (error) {
      console.error('Erro no middleware de segurança:', error);
      
      // Obter IP para logging de erro
      const errorIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      
      // Log do erro como evento de segurança
      SecurityDetectors.unauthorizedAccess(
        errorIp, 
        userAgent, 
        pathname, 
        userId
      );
      
      return createStandardErrorResponse(
        'Erro interno de segurança',
        '🔧 Ocorreu um erro interno. Nossa equipe foi notificada.',
        500
      );
    }
  };
}

// Middleware específico para rotas de autenticação
export function createAuthSecurityMiddleware() {
  return createSecurityMiddleware({
    enablePayloadScan: true,
    enableIPBlocking: true,
    enableUserBlocking: false, // Não bloquear usuários em rotas de auth
    enableSuspiciousPatternDetection: true,
    maxPayloadSize: 1024 * 1024, // 1MB para auth
    rateLimit: {
      requests: 50,
      windowMs: 15 * 60 * 1000, // 15 minutos
      namespace: 'auth'
    }
  });
}

// Middleware específico para upload de arquivos
export function createUploadSecurityMiddleware() {
  return createSecurityMiddleware({
    enablePayloadScan: false, // Não escanear arquivos binários
    enableIPBlocking: true,
    enableUserBlocking: true,
    enableSuspiciousPatternDetection: false,
    maxPayloadSize: 50 * 1024 * 1024, // 50MB para uploads
    rateLimit: {
      requests: 10,
      windowMs: 15 * 60 * 1000, // 15 minutos
      namespace: 'upload'
    }
  });
}

// Middleware específico para APIs administrativas
export function createAdminSecurityMiddleware() {
  return createSecurityMiddleware({
    enablePayloadScan: true,
    enableIPBlocking: true,
    enableUserBlocking: true,
    enableSuspiciousPatternDetection: true,
    maxPayloadSize: 5 * 1024 * 1024, // 5MB para admin
    rateLimit: {
      requests: 30,
      windowMs: 15 * 60 * 1000, // 15 minutos
      namespace: 'admin'
    }
  });
}

// Função helper para aplicar middleware em rotas específicas
export function withSecurity<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  config?: SecurityMiddlewareConfig
) {
  const middleware = createSecurityMiddleware(config);
  
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    return middleware(request, () => handler(...args));
  };
}

// Função para aplicar middleware de segurança com configurações personalizadas
export async function applySecurityMiddleware(
  request: NextRequest,
  config: SecurityMiddlewareConfig = {}
): Promise<{ success: boolean; response?: NextResponse; error?: string }> {
  try {
    const middleware = createSecurityMiddleware(config);
    
    // Criar uma promise para capturar o resultado do middleware
    let middlewareResult: NextResponse | null = null;
    
    const result = await middleware(request, async () => {
      // Se chegou aqui, o middleware passou
      return NextResponse.next();
    });
    
    // Se o resultado não é um NextResponse.next(), significa que houve um problema
    if (result.status !== 200 || result.headers.get('x-middleware-next') !== 'true') {
      return {
        success: false,
        response: result,
        error: 'Security middleware validation failed'
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro no middleware de segurança:', error);
    return {
      success: false,
      response: createStandardErrorResponse(
        'Erro interno de segurança',
        '🔧 Ocorreu um erro interno. Nossa equipe foi notificada.',
        500
      ),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Exportar instância padrão
// Temporariamente comentado para resolver erro de build
// export const securityMiddleware = createSecurityMiddleware();