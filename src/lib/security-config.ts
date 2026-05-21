/**
 * Configurações centralizadas de segurança da aplicação
 */

// Imports
// import { 
//   logSecurityEvent as originalLogSecurityEvent, 
//   SecurityEventType, 
//   SecuritySeverity 
// } from './security-monitoring';

// Configurações de Rate Limiting
export const RATE_LIMIT_CONFIG = {
  // Limite geral para APIs
  general: {
    requests: 100,
    window: '15m' // 15 minutos
  },
  // Limite para APIs administrativas
  admin: {
    requests: 50,
    window: '15m'
  },
  // Limite para proxies de APIs externas
  proxy: {
    requests: 200,
    window: '15m'
  },
  // Limite para autenticação
  auth: {
    requests: 10,
    window: '15m'
  }
} as const;

// Configurações de CORS
export const CORS_CONFIG = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL || 'https://hub-control.vercel.app']
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:9002',
        'http://127.0.0.1:9002',
      ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400 // 24 horas
} as const;

// ============================================
// CONFIGURAÇÃO CSP APRIMORADA - FASE 2
// ============================================

// CSP para desenvolvimento (mais permissivo)
const developmentCSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Necessário para Next.js em desenvolvimento
    "'unsafe-inline'", // Necessário para alguns componentes
    'https://vercel.live'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Necessário para Tailwind CSS
    'https://fonts.googleapis.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:'
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.themoviedb.org',
    'https://vercel.live',
    'ws:', // WebSocket para dev
    'wss:' // WebSocket seguro para dev
  ],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"]
} as const;

// CSP para produção (mais restritivo)
const productionCSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'"
    // Removido unsafe-inline e unsafe-eval para produção
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Apenas para CSS
    'https://fonts.googleapis.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:'
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co', // Apenas Supabase
    'wss://*.supabase.co',
    'https://api.themoviedb.org'
  ],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [], // Força HTTPS
  'block-all-mixed-content': [] // Bloqueia conteúdo misto
} as const;

// Configuração dinâmica baseada no ambiente
export const CSP_CONFIG = process.env.NODE_ENV === 'production' 
  ? productionCSP 
  : developmentCSP;

// Headers de segurança
export const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
} as const;

// Configurações de validação de entrada
export const INPUT_VALIDATION = {
  // Tamanhos máximos
  maxStringLength: 1000,
  maxTextLength: 10000,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  
  // Padrões regex para validação
  patterns: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?[1-9]\d{1,14}$/,
    cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    apiKey: /^[a-zA-Z0-9_-]{20,}$/,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },
  
  // Lista de caracteres perigosos
  dangerousChars: ['<', '>', '"', "'", '&', 'javascript:', 'data:', 'vbscript:'],
  
  // Palavras-chave SQL perigosas
  sqlKeywords: [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'EXEC', 'EXECUTE', 'UNION', 'SCRIPT', 'DECLARE', 'CAST'
  ]
} as const;

// Configurações de sessão
export const SESSION_CONFIG = {
  maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
  updateAge: 24 * 60 * 60, // Atualizar a cada 24 horas
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax' as const
} as const;

// Configurações de logging de segurança
export const SECURITY_LOGGING = {
  // Eventos que devem ser logados
  events: {
    authFailure: true,
    adminAccess: true,
    dataExport: true,
    configChange: true,
    apiKeyUsage: true,
    suspiciousActivity: true
  },
  
  // Níveis de log
  levels: {
    info: 'info',
    warn: 'warn',
    error: 'error',
    critical: 'critical'
  } as const,
  
  // Retenção de logs
  retention: {
    days: 90
  }
} as const;

// Configurações de APIs externas permitidas
// Função para evitar problemas com 'use server' (arquivos 'use server' só podem exportar funções)
export function getExternalApiConfig() {
  return {
    tmdb: {
      baseUrl: 'https://api.themoviedb.org/3',
      allowedEndpoints: [
        '/search/movie',
        '/search/tv',
        '/movie/',
        '/tv/',
        '/genre/movie/list',
        '/genre/tv/list',
        '/trending/'
      ],
      rateLimit: {
        requests: 40,
        window: '10s'
      }
    },
    
    bot: {
      allowedActions: [
        'send_message',
        'get_status',
        'get_history',
        'update_settings'
      ],
      rateLimit: {
        requests: 30,
        window: '1m'
      }
    },
    
    natv: {
      allowedActions: [
        'get_content',
        'search',
        'get_categories',
        'get_details'
      ],
      rateLimit: {
        requests: 50,
        window: '1m'
      }
    }
  } as const;
}

// Constante para uso em contextos que não usam 'use server'
export const EXTERNAL_API_CONFIG = getExternalApiConfig();

// Configurações de mascaramento de dados
export const DATA_MASKING_CONFIG = {
  // Configurações por tipo de dado
  types: {
    email: {
      showStart: 2,
      showEnd: 0,
      showDomain: true,
      maskChar: '*'
    },
    phone: {
      showStart: 2,
      showEnd: 2,
      maskChar: '*'
    },
    cpf: {
      showStart: 3,
      showEnd: 2,
      maskChar: '*'
    },
    cnpj: {
      showStart: 2,
      showEnd: 2,
      maskChar: '*'
    },
    api_key: {
      showStart: 4,
      showEnd: 4,
      maskChar: '*'
    },
    token: {
      showStart: 6,
      showEnd: 4,
      maskChar: '*'
    },
    credit_card: {
      showStart: 4,
      showEnd: 4,
      maskChar: '*'
    },
    pix_key: {
      showStart: 3,
      showEnd: 3,
      maskChar: '*'
    }
  },
  
  // Campos que devem ser sempre mascarados em logs
  alwaysMask: [
    'password',
    'api_key',
    'token',
    'secret',
    'private_key',
    'credit_card',
    'cvv',
    'ssn'
  ]
} as const;

// Configurações de auditoria
export const AUDIT_CONFIG = {
  // Ações que devem ser auditadas
  actions: {
    create: true,
    update: true,
    delete: true,
    login: true,
    logout: true,
    export: true,
    import: true,
    admin_access: true
  },
  
  // Tabelas que devem ser auditadas
  tables: [
    'profiles',
    'clients',
    'plans',
    'plan_groups',
    'transactions',
    'settings',
    'marketing_campaigns'
  ],
  
  // Retenção de logs de auditoria
  retention: {
    days: 365 // 1 ano
  }
} as const;

// Função para validar entrada
export function validateInput(input: string, type: keyof typeof INPUT_VALIDATION.patterns): boolean {
  if (!input || typeof input !== 'string') return false;
  
  // Verificar tamanho
  if (input.length > INPUT_VALIDATION.maxStringLength) return false;
  
  // Verificar caracteres perigosos
  const hasDangerousChars = INPUT_VALIDATION.dangerousChars.some(char => 
    input.toLowerCase().includes(char.toLowerCase())
  );
  if (hasDangerousChars) return false;
  
  // Verificar palavras-chave SQL
  const hasSqlKeywords = INPUT_VALIDATION.sqlKeywords.some(keyword => 
    input.toLowerCase().includes(keyword.toLowerCase())
  );
  if (hasSqlKeywords) return false;
  
  // Validar padrão específico
  const pattern = INPUT_VALIDATION.patterns[type];
  return pattern ? pattern.test(input) : true;
}

// Função para sanitizar entrada
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>"'&]/g, '') // Remove caracteres perigosos
    .substring(0, INPUT_VALIDATION.maxStringLength); // Limita tamanho
}

// Função para gerar CSP header
export function generateCSPHeader(): string {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// Função para verificar se uma URL é permitida
export function isAllowedOrigin(origin: string): boolean {
  return CORS_CONFIG.origin.includes(origin);
}

// Função para verificar rate limit
export function checkRateLimit(type: keyof typeof RATE_LIMIT_CONFIG, requests: number): boolean {
  const config = RATE_LIMIT_CONFIG[type];
  return requests <= config.requests;
}

// Re-export da função de segurança consolidada com adaptador para compatibilidade

// Adaptador para manter compatibilidade com interface antiga
// export function logSecurityEvent(event: any): void {
//   // Mapear formato antigo para novo formato tipado
//   const eventType = mapToSecurityEventType(event.action || event.type || 'UNUSUAL_ACTIVITY');
//   const severity = mapToSecuritySeverity(event.severity || 'medium');
//   
//   originalLogSecurityEvent(
//     eventType,
//     severity,
//     event.source || 'system',
//     event.ip || 'unknown',
//     {
//       ...event.details && typeof event.details === 'object' ? event.details : { details: event.details },
//       ...event.metadata
//     },
//     event.userAgent,
//     event.userId
//   );
// }

// Mapeamento de strings para enums tipados
// function mapToSecurityEventType(action: string): SecurityEventType {
//   const mapping: Record<string, SecurityEventType> = {
//     'BACKUP_STARTED': SecurityEventType.UNUSUAL_ACTIVITY,
//     'BACKUP_COMPLETED': SecurityEventType.UNUSUAL_ACTIVITY,
//     'BACKUP_FAILED': SecurityEventType.UNUSUAL_ACTIVITY,
//     'PERFORMANCE_ALERT': SecurityEventType.UNUSUAL_ACTIVITY,
//     'PERFORMANCE_ALERT_RESOLVED': SecurityEventType.UNUSUAL_ACTIVITY,
//     'FAILED_LOGIN': SecurityEventType.FAILED_LOGIN,
//     'RATE_LIMIT_EXCEEDED': SecurityEventType.RATE_LIMIT_EXCEEDED,
//     'SUSPICIOUS_REQUEST': SecurityEventType.SUSPICIOUS_REQUEST,
//     'XSS_ATTEMPT': SecurityEventType.XSS_ATTEMPT,
//     'SQL_INJECTION_ATTEMPT': SecurityEventType.SQL_INJECTION_ATTEMPT,
//     'UNAUTHORIZED_ACCESS': SecurityEventType.UNAUTHORIZED_ACCESS,
//     'INVALID_TOKEN': SecurityEventType.INVALID_TOKEN,
//     'DATA_BREACH_ATTEMPT': SecurityEventType.DATA_BREACH_ATTEMPT,
//     'MALICIOUS_FILE_UPLOAD': SecurityEventType.MALICIOUS_FILE_UPLOAD
//   };
//   
//   return mapping[action] || SecurityEventType.UNUSUAL_ACTIVITY;
// }
// 
// function mapToSecuritySeverity(severity: string): SecuritySeverity {
//   const mapping: Record<string, SecuritySeverity> = {
//     'low': SecuritySeverity.LOW,
//     'medium': SecuritySeverity.MEDIUM,
//     'high': SecuritySeverity.HIGH,
//     'critical': SecuritySeverity.CRITICAL
//   };
//   
//   return mapping[severity] || SecuritySeverity.MEDIUM;
// }

