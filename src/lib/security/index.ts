// 🔒 Barrel central para o subsistema de segurança
// Centraliza todas as importações relacionadas à segurança

// Imports necessários para uso local neste arquivo (valores e funções)
import { securityMonitor, SecurityDetectors } from '../security-monitor';
import { realtimeSecurityMonitor } from '../security-realtime-monitor';
import { threatDetection, ThreatDetectors } from '../threat-detection';
import { auditLog } from './audit';
import { rateLimit, getClientIP } from './rate-limit';
import { generateCSRFToken, validateCSRFToken } from '../csrf-utils';
import { maskSensitiveData } from '../data-masking';
import {
  RATE_LIMIT_CONFIG,
  CORS_CONFIG,
  SECURITY_HEADERS,
  SESSION_CONFIG,
  INPUT_VALIDATION,
  checkRateLimit,
  getExternalApiConfig
  // logSecurityEvent
} from '../security-config';

// ============================================
// CONFIGURAÇÕES CENTRAIS DE SEGURANÇA
// ============================================
export {
  RATE_LIMIT_CONFIG,
  CORS_CONFIG,
  CSP_CONFIG,
  SECURITY_HEADERS,
  SESSION_CONFIG,
  SECURITY_LOGGING,
  // EXTERNAL_API_CONFIG, // evitar exportar objeto em barrel usado por 'use server'
  DATA_MASKING_CONFIG,
  AUDIT_CONFIG,
  INPUT_VALIDATION,
  validateInput,
  sanitizeInput,
  generateCSPHeader,
  isAllowedOrigin,
  checkRateLimit,
  getExternalApiConfig
  // logSecurityEvent
} from '../security-config';

// ============================================
// MONITORAMENTO DE SEGURANÇA
// ============================================
export {
  SecurityMonitor,
  securityMonitor,
  SecurityDetectors
} from '../security-monitor';

// ============================================
// TIPOS CONSOLIDADOS DE SEGURANÇA
// ============================================
export {
  SecurityEventType,
  SecuritySeverity,
  type SecurityEvent as SecurityEventConsolidated
} from '../security-monitoring';

// ============================================
// MONITOR EM TEMPO REAL
// ============================================
export {
  SecurityRealtimeMonitor,
  realtimeSecurityMonitor,
  recordSecurityEvent,
  getSecurityStats,
  isIPBlocked,
  isUserBlocked,
  type SecurityEvent,
  type SecurityRule,
  type SecurityCondition,
  type SecurityAction,
  type RealtimeMonitorConfig
} from '../security-realtime-monitor';

// ============================================
// DETECÇÃO DE AMEAÇAS
// ============================================
export {
  threatDetection,
  ThreatDetectionSystem,
  ThreatDetectors,
  type ThreatType
} from '../threat-detection';

export { SecuritySeverity as ThreatLevel } from '../security-monitoring';

// ============================================
// MASCARAMENTO DE DADOS
// ============================================
export {
  maskSensitiveData,
  maskEmail,
  maskPhone,
  maskCPF,
  maskCNPJ,
  maskPixKey,
  maskCreditCard,
  maskApiKey,
  maskObjectFields,
  isSensitiveValue,
  autoMaskSensitive,
  sanitizeForLogging,
  MASKING_CONFIG,
  type SensitiveDataType,
  type MaskingOptions,
  type FieldMasking
} from '../data-masking';

// ============================================
// PROTEÇÃO CSRF
// ============================================
export {
  CSRFManager,
  csrfManager,
  generateCSRFToken,
  validateCSRFToken,
  isCSRFTokenValid,
  // useCSRFToken REMOVIDO deste barrel para evitar dependência client-side
  createCSRFMiddleware,
  addCSRFTokenToHeaders,
  extractCSRFTokenFromCookies,
  type CSRFToken,
  type CSRFConfig
} from '../csrf-utils';

// Reexport dedicado do hook client-side a partir de '@/hooks'
export { useCSRFToken } from '@/hooks/useCSRF';

// ============================================
// AUDITORIA
// ============================================
export {
  auditLog,
  AUDIT_ACTIONS,
  type AuditLogEntry
} from './audit';

// ============================================
// RATE LIMITING
// ============================================
export {
  rateLimit,
  rateLimitCustom,
  getClientIP,
  cleanupRateLimitCache,
  loginRateLimit,
  resetRateLimit,
  getRateLimitStats,
  parseWindowToMs,
  buildRateLimitHeaders,
  type RateLimitResult
} from './rate-limit';

// ============================================
// MIDDLEWARES DE SEGURANÇA
// ============================================
export {
  securityMiddleware,
  csrfMiddleware,
  securityHeaders
} from '../middleware/security';

// ============================================
// INSTÂNCIAS PRÉ-CONFIGURADAS
// ============================================

// Temporariamente comentado para resolver erro de build
// export const security = {
//   monitor: securityMonitor,
//   realtimeMonitor: realtimeSecurityMonitor,
//   threatDetection,
//   auditLog,
//   rateLimit,
//   
//   // Funções de conveniência
//   recordEvent: securityMonitor.recordEvent.bind(securityMonitor),
//   logEvent: logSecurityEvent,
//   checkRateLimit: checkRateLimit,
//   
//   // Detectores específicos
//   detectors: SecurityDetectors,
//   threatDetectors: ThreatDetectors
// };

// ============================================
// UTILITÁRIOS DE SEGURANÇA
// ============================================
// Temporariamente comentado para resolver erro de build
// export const SecurityUtils = {
//   // Mascaramento
//   maskData: maskSensitiveData,
//   
//   // CSRF
//   generateCSRF: generateCSRFToken,
//   validateCSRF: validateCSRFToken,
//   
//   // Auditoria
//   audit: auditLog,
//   
//   // Rate limiting
//   checkRate: checkRateLimit,
//   getIP: getClientIP,
//   
//   // Logging
//   logEvent: logSecurityEvent
// };

// ============================================
// CONFIGURAÇÕES CENTRALIZADAS
// ============================================
// Temporariamente comentado para resolver erro de build
// export const SecurityConfig = {
//   rateLimit: RATE_LIMIT_CONFIG,
//   cors: CORS_CONFIG,
//   headers: SECURITY_HEADERS,
//   validation: INPUT_VALIDATION,
//   session: SESSION_CONFIG
// };