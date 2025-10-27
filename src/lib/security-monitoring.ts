/**
 * Sistema de Monitoramento de Segurança - Fase 2
 * 
 * Este sistema monitora atividades suspeitas, registra eventos de segurança
 * e fornece alertas básicos para administradores.
 */

import { z } from 'zod'
import { logger } from '@/utils/production-logger'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface SecurityEvent {
  id: string
  timestamp: Date
  type: SecurityEventType
  severity: SecuritySeverity
  source: string
  ip: string
  userAgent?: string
  userId?: string
  details: Record<string, any>
  resolved: boolean
}

export enum SecurityEventType {
  FAILED_LOGIN = 'failed_login',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_REQUEST = 'suspicious_request',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  INVALID_TOKEN = 'invalid_token',
  UNUSUAL_ACTIVITY = 'unusual_activity',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  MALICIOUS_FILE_UPLOAD = 'malicious_file_upload',
  // Valores adicionais encontrados no código
  SYSTEM_OVERLOAD = 'system_overload',
  SYSTEM_ERROR = 'system_error',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  PRIVILEGE_ESCALATION = 'privilege_escalation'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ============================================
// ARMAZENAMENTO DE EVENTOS (EM MEMÓRIA)
// ============================================

class SecurityEventStore {
  private events: SecurityEvent[] = []
  private maxEvents = 1000 // Manter apenas os últimos 1000 eventos
  
  add(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): SecurityEvent {
    const securityEvent: SecurityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      resolved: false,
      ...event
    }
    
    this.events.unshift(securityEvent)
    
    // Manter apenas os eventos mais recentes
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents)
    }
    
    // Log do evento
    this.logEvent(securityEvent)
    
    // Verificar se precisa de alerta
    this.checkForAlerts(securityEvent)
    
    return securityEvent
  }
  
  getEvents(filters?: {
    type?: SecurityEventType
    severity?: SecuritySeverity
    ip?: string
    userId?: string
    resolved?: boolean
    since?: Date
  }): SecurityEvent[] {
    let filteredEvents = this.events
    
    if (filters) {
      if (filters.type) {
        filteredEvents = filteredEvents.filter(e => e.type === filters.type)
      }
      if (filters.severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === filters.severity)
      }
      if (filters.ip) {
        filteredEvents = filteredEvents.filter(e => e.ip === filters.ip)
      }
      if (filters.userId) {
        filteredEvents = filteredEvents.filter(e => e.userId === filters.userId)
      }
      if (filters.resolved !== undefined) {
        filteredEvents = filteredEvents.filter(e => e.resolved === filters.resolved)
      }
      if (filters.since) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.since!)
      }
    }
    
    return filteredEvents
  }
  
  markResolved(eventId: string): boolean {
    const event = this.events.find(e => e.id === eventId)
    if (event) {
      event.resolved = true
      return true
    }
    return false
  }
  
  getStats(timeframe: 'hour' | 'day' | 'week' = 'day') {
    const now = new Date()
    const since = new Date()
    
    switch (timeframe) {
      case 'hour':
        since.setHours(now.getHours() - 1)
        break
      case 'day':
        since.setDate(now.getDate() - 1)
        break
      case 'week':
        since.setDate(now.getDate() - 7)
        break
    }
    
    const recentEvents = this.getEvents({ since })
    
    const stats = {
      total: recentEvents.length,
      byType: {} as Record<SecurityEventType, number>,
      bySeverity: {} as Record<SecuritySeverity, number>,
      resolved: recentEvents.filter(e => e.resolved).length,
      unresolved: recentEvents.filter(e => !e.resolved).length
    }
    
    // Contar por tipo
    Object.values(SecurityEventType).forEach(type => {
      stats.byType[type] = recentEvents.filter(e => e.type === type).length
    })
    
    // Contar por severidade
    Object.values(SecuritySeverity).forEach(severity => {
      stats.bySeverity[severity] = recentEvents.filter(e => e.severity === severity).length
    })
    
    return stats
  }
  
  private generateId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private logEvent(event: SecurityEvent): void {
    const logLevel = this.getLogLevel(event.severity)
    const message = `[SECURITY] ${event.type} - ${event.source} (${event.ip})`
    
    switch (logLevel) {
      case 'error':
        console.error(message, event.details)
        break
      case 'warn':
        logger.warn(message, event.details)
        break
      default:
        console.log(message, event.details)
    }
  }
  
  private getLogLevel(severity: SecuritySeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case SecuritySeverity.CRITICAL:
      case SecuritySeverity.HIGH:
        return 'error'
      case SecuritySeverity.MEDIUM:
        return 'warn'
      default:
        return 'log'
    }
  }
  
  private checkForAlerts(event: SecurityEvent): void {
    // Alertas para eventos críticos
    if (event.severity === SecuritySeverity.CRITICAL) {
      this.sendAlert(event)
    }
    
    // Verificar padrões suspeitos
    this.checkSuspiciousPatterns(event)
  }
  
  private sendAlert(event: SecurityEvent): void {
    // Em um ambiente real, isso enviaria notificações
    console.error(`🚨 ALERTA CRÍTICO DE SEGURANÇA: ${event.type}`, {
      ip: event.ip,
      source: event.source,
      details: event.details
    })
  }
  
  private checkSuspiciousPatterns(event: SecurityEvent): void {
    const recentEvents = this.getEvents({
      ip: event.ip,
      since: new Date(Date.now() - 300000) // Últimos 5 minutos
    })
    
    // Múltiplas tentativas de login falhadas
    if (event.type === SecurityEventType.FAILED_LOGIN && recentEvents.length >= 5) {
      this.add({
        type: SecurityEventType.UNUSUAL_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        source: 'pattern_detection',
        ip: event.ip,
        userAgent: event.userAgent,
        details: {
          pattern: 'multiple_failed_logins',
          count: recentEvents.length,
          timeframe: '5_minutes'
        }
      })
    }
    
    // Múltiplos tipos de ataques do mesmo IP
    const attackTypes = new Set(recentEvents.map(e => e.type))
    if (attackTypes.size >= 3) {
      this.add({
        type: SecurityEventType.UNUSUAL_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        source: 'pattern_detection',
        ip: event.ip,
        userAgent: event.userAgent,
        details: {
          pattern: 'multiple_attack_types',
          types: Array.from(attackTypes),
          timeframe: '5_minutes'
        }
      })
    }
  }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================

const securityEventStore = new SecurityEventStore()

// ============================================
// DETECTORES DE AMEAÇAS
// ============================================

export class ThreatDetector {
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi
    ]
    
    return xssPatterns.some(pattern => pattern.test(input))
  }
  
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/gi,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi,
      /\b(or|and)\s+\d+\s*=\s*\d+/gi,
      /\b(or|and)\s+['"]\w+['"]\s*=\s*['"]\w+['"]/gi
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }
  
  static detectPathTraversal(input: string): boolean {
    const pathPatterns = [
      /\.\.\/|\.\.\\/gi,
      /%2e%2e%2f|%2e%2e%5c/gi,
      /\.\.%2f|\.\.%5c/gi
    ]
    
    return pathPatterns.some(pattern => pattern.test(input))
  }
  
  static detectMaliciousUserAgent(userAgent: string): boolean {
    const maliciousPatterns = [
      /sqlmap/gi,
      /nikto/gi,
      /nessus/gi,
      /burp/gi,
      /nmap/gi,
      /masscan/gi,
      /zap/gi
    ]
    
    return maliciousPatterns.some(pattern => pattern.test(userAgent))
  }
}

// ============================================
// FUNÇÕES PÚBLICAS
// ============================================

/**
 * Registra um evento de segurança
 */
export function logSecurityEvent(
  type: SecurityEventType,
  severity: SecuritySeverity,
  source: string,
  ip: string,
  details: Record<string, any>,
  userAgent?: string,
  userId?: string
): SecurityEvent {
  return securityEventStore.add({
    type,
    severity,
    source,
    ip,
    userAgent,
    userId,
    details
  })
}

/**
 * Analisa uma requisição em busca de ameaças
 */
export function analyzeRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: any,
  ip?: string
): SecurityEvent[] {
  const events: SecurityEvent[] = []
  const userAgent = headers['user-agent'] || ''
  const requestIp = ip || headers['x-forwarded-for'] || 'unknown'
  
  // Verificar User-Agent malicioso
  if (ThreatDetector.detectMaliciousUserAgent(userAgent)) {
    events.push(logSecurityEvent(
      SecurityEventType.SUSPICIOUS_REQUEST,
      SecuritySeverity.MEDIUM,
      'request_analyzer',
      requestIp,
      { reason: 'malicious_user_agent', userAgent },
      userAgent
    ))
  }
  
  // Verificar URL suspeita
  if (ThreatDetector.detectPathTraversal(url)) {
    events.push(logSecurityEvent(
      SecurityEventType.SUSPICIOUS_REQUEST,
      SecuritySeverity.HIGH,
      'request_analyzer',
      requestIp,
      { reason: 'path_traversal_attempt', url },
      userAgent
    ))
  }
  
  // Verificar body se presente
  if (body) {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body)
    
    if (ThreatDetector.detectXSS(bodyString)) {
      events.push(logSecurityEvent(
        SecurityEventType.XSS_ATTEMPT,
        SecuritySeverity.HIGH,
        'request_analyzer',
        requestIp,
        { reason: 'xss_in_body', body: bodyString.substring(0, 200) },
        userAgent
      ))
    }
    
    if (ThreatDetector.detectSQLInjection(bodyString)) {
      events.push(logSecurityEvent(
        SecurityEventType.SQL_INJECTION_ATTEMPT,
        SecuritySeverity.HIGH,
        'request_analyzer',
        requestIp,
        { reason: 'sql_injection_in_body', body: bodyString.substring(0, 200) },
        userAgent
      ))
    }
  }
  
  return events
}

/**
 * Obtém eventos de segurança com filtros
 */
export function getSecurityEvents(filters?: {
  type?: SecurityEventType
  severity?: SecuritySeverity
  ip?: string
  userId?: string
  resolved?: boolean
  since?: Date
}): SecurityEvent[] {
  return securityEventStore.getEvents(filters)
}

/**
 * Obtém estatísticas de segurança
 */
export function getSecurityStats(timeframe: 'hour' | 'day' | 'week' = 'day') {
  return securityEventStore.getStats(timeframe)
}

/**
 * Marca um evento como resolvido
 */
export function resolveSecurityEvent(eventId: string): boolean {
  return securityEventStore.markResolved(eventId)
}

/**
 * Middleware para análise automática de requisições
 */
export function createSecurityAnalysisMiddleware() {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    
    // Analisar requisição
    analyzeRequest(
      req.method,
      req.url,
      req.headers,
      req.body,
      ip
    )
    
    next()
  }
}

// ============================================
// EXPORTAÇÕES
// ============================================

export default {
  logSecurityEvent,
  analyzeRequest,
  getSecurityEvents,
  getSecurityStats,
  resolveSecurityEvent,
  createSecurityAnalysisMiddleware,
  ThreatDetector
}
