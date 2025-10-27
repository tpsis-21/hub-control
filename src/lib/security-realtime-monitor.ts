// 🔒 Monitor de Segurança em Tempo Real
// Sistema avançado para detecção e resposta automática a ameaças

import { EventEmitter } from 'events';
import { securityMonitor } from './security-monitor';
import { createServerSupabaseClient } from "./supabase/clients/server";
import { getSecurityStats as monitoringGetSecurityStats, SecurityEventType, SecuritySeverity } from './security-monitoring';
import { logger } from '@/utils/production-logger'

// Interface para eventos de segurança
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  ip: string;
  userAgent: string;
  userId?: string;
  endpoint: string;
  details: Record<string, any>;
  blocked: boolean;
  responseAction: string[];
}

// Interface para regras de resposta automática
export interface SecurityRule {
  id: string;
  name: string;
  eventType: SecurityEventType;
  conditions: SecurityCondition[];
  actions: SecurityAction[];
  enabled: boolean;
  priority: number;
}

export interface SecurityCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value: any;
}

export interface SecurityAction {
  type: 'block_ip' | 'block_user' | 'notify_admin' | 'log_event' | 'rate_limit' | 'quarantine';
  parameters: Record<string, any>;
}

// Configurações do monitor
export interface RealtimeMonitorConfig {
  enableAutoResponse: boolean;
  enableNotifications: boolean;
  enableLogging: boolean;
  maxEventsPerMinute: number;
  alertThresholds: {
    [key in SecuritySeverity]: number;
  };
}

const DEFAULT_CONFIG: RealtimeMonitorConfig = {
  enableAutoResponse: true,
  enableNotifications: true,
  enableLogging: true,
  maxEventsPerMinute: 100,
  alertThresholds: {
    [SecuritySeverity.LOW]: 10,
    [SecuritySeverity.MEDIUM]: 5,
    [SecuritySeverity.HIGH]: 2,
    [SecuritySeverity.CRITICAL]: 1
  }
};

// Classe principal do monitor em tempo real
export class SecurityRealtimeMonitor extends EventEmitter {
  private config: RealtimeMonitorConfig;
  private events: SecurityEvent[] = [];
  private rules: SecurityRule[] = [];
  private blockedIPs = new Set<string>();
  private blockedUsers = new Set<string>();
  private eventCounts = new Map<string, number>();
  private lastCleanup = Date.now();
  
  constructor(config: Partial<RealtimeMonitorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDefaultRules();
    this.startCleanupInterval();
  }
  
  // Inicializar regras padrão
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'brute-force-protection',
        name: 'Proteção contra Força Bruta',
        eventType: SecurityEventType.BRUTE_FORCE_ATTACK,
        conditions: [
          { field: 'attempts', operator: 'greater_than', value: 5 }
        ],
        actions: [
          { type: 'block_ip', parameters: { duration: 3600000 } }, // 1 hora
          { type: 'notify_admin', parameters: { priority: SecuritySeverity.HIGH } }
        ],
        enabled: true,
        priority: 1
      },
      {
        id: 'sql-injection-protection',
        name: 'Proteção contra SQL Injection',
        eventType: SecurityEventType.SQL_INJECTION_ATTEMPT,
        conditions: [],
        actions: [
          { type: 'block_ip', parameters: { duration: 7200000 } }, // 2 horas
          { type: 'notify_admin', parameters: { priority: SecuritySeverity.CRITICAL } },
          { type: 'log_event', parameters: { level: 'error' } }
        ],
        enabled: true,
        priority: 1
      },
      {
        id: 'rate-limit-protection',
        name: 'Proteção contra Rate Limiting',
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        conditions: [
          { field: 'requests_per_minute', operator: 'greater_than', value: 60 }
        ],
        actions: [
          { type: 'rate_limit', parameters: { duration: 900000 } }, // 15 minutos
          { type: 'log_event', parameters: { level: 'warn' } }
        ],
        enabled: true,
        priority: 2
      },
      {
        id: 'privilege-escalation-protection',
        name: 'Proteção contra Escalação de Privilégios',
        eventType: SecurityEventType.PRIVILEGE_ESCALATION,
        conditions: [],
        actions: [
          { type: 'block_user', parameters: { duration: 86400000 } }, // 24 horas
          { type: 'notify_admin', parameters: { priority: SecuritySeverity.CRITICAL } },
          { type: 'quarantine', parameters: { isolate: true } }
        ],
        enabled: true,
        priority: 1
      }
    ];
  }
  
  // Registrar evento de segurança
  async recordEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    ip: string,
    userAgent: string,
    endpoint: string,
    details: Record<string, any> = {},
    userId?: string
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity,
      timestamp: new Date(),
      ip,
      userAgent,
      userId,
      endpoint,
      details,
      blocked: false,
      responseAction: []
    };
    
    // Adicionar à lista de eventos
    this.events.push(event);
    
    // Limitar número de eventos na memória
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
    
    // Processar regras de resposta automática
    if (this.config.enableAutoResponse) {
      await this.processSecurityRules(event);
    }
    
    // Emitir evento
    this.emit('securityEvent', event);
    
    // Log do evento
    if (this.config.enableLogging) {
      await this.logEvent(event);
    }
    
    // Verificar thresholds de alerta
    this.checkAlertThresholds(severity);
    
    return event;
  }
  
  // Processar regras de segurança
  private async processSecurityRules(event: SecurityEvent): Promise<void> {
    const applicableRules = this.rules
      .filter(rule => rule.enabled && rule.eventType === event.type)
      .sort((a, b) => a.priority - b.priority);
    
    for (const rule of applicableRules) {
      if (this.evaluateConditions(rule.conditions, event)) {
        await this.executeActions(rule.actions, event);
        event.responseAction.push(rule.name);
      }
    }
  }
  
  // Avaliar condições da regra
  private evaluateConditions(conditions: SecurityCondition[], event: SecurityEvent): boolean {
    if (conditions.length === 0) return true;
    
    return conditions.every(condition => {
      const value = this.getEventValue(event, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        case 'regex':
          return new RegExp(condition.value).test(String(value));
        default:
          return false;
      }
    });
  }
  
  // Obter valor do evento
  private getEventValue(event: SecurityEvent, field: string): any {
    if (field.startsWith('details.')) {
      const detailField = field.substring(8);
      return event.details[detailField];
    }
    return (event as any)[field];
  }
  
  // Executar ações de resposta
  private async executeActions(actions: SecurityAction[], event: SecurityEvent): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'block_ip':
            await this.blockIP(event.ip, action.parameters.duration || 3600000);
            event.blocked = true;
            break;
          case 'block_user':
            if (event.userId) {
              await this.blockUser(event.userId, action.parameters.duration || 3600000);
              event.blocked = true;
            }
            break;
          case 'notify_admin':
            await this.notifyAdmin(event, action.parameters.priority || SecuritySeverity.MEDIUM);
            break;
          case 'log_event':
            await this.logEvent(event, action.parameters.level || 'info');
            break;
          case 'rate_limit':
            await this.applyRateLimit(event.ip, action.parameters.duration || 900000);
            break;
          case 'quarantine':
            await this.quarantineUser(event.userId, action.parameters);
            break;
        }
      } catch (error) {
        console.error(`Erro ao executar ação ${action.type}:`, error);
      }
    }
  }
  
  // Bloquear IP
  private async blockIP(ip: string, duration: number): Promise<void> {
    this.blockedIPs.add(ip);
    
    // Remover bloqueio após duração especificada
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      securityMonitor.unblockIP(ip);
    }, duration);
    
    logger.debug(`IP ${ip} bloqueado por ${duration}ms`, undefined, "DEBUG");
  }
  
  // Bloquear usuário
  private async blockUser(userId: string, duration: number): Promise<void> {
    this.blockedUsers.add(userId);
    
    // Remover bloqueio após duração especificada
    setTimeout(() => {
      this.blockedUsers.delete(userId);
      securityMonitor.unblockUser(userId);
    }, duration);
    
    logger.debug(`Usuário ${userId} bloqueado por ${duration}ms`, undefined, "DEBUG");
  }
  
  // Notificar administrador
  private async notifyAdmin(event: SecurityEvent, priority: SecuritySeverity): Promise<void> {
    // Implementar notificação para administradores
    logger.debug(`ALERTA DE SEGURANÇA [${priority.toUpperCase()}]:`, {
      type: event.type,
      ip: event.ip,
      endpoint: event.endpoint,
      timestamp: event.timestamp
    });
    
    // Aqui você pode integrar com sistemas de notificação
    // como email, Slack, Discord, etc.
  }
  
  // Log do evento
  private async logEvent(event: SecurityEvent, level: string = 'info'): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      
      await supabase.from('security_events').insert({
        type: event.type,
        severity: event.severity,
        source: event.endpoint || 'unknown',
        ip_address: event.ip,
        user_agent: event.userAgent,
        user_id: event.userId,
        details: {
          endpoint: event.endpoint,
          blocked: event.blocked,
          response_action: event.responseAction,
          ...event.details
        }
      });
    } catch (error) {
      console.error('Erro ao salvar evento de segurança:', error);
    }
  }
  
  // Aplicar rate limiting
  private async applyRateLimit(ip: string, duration: number): Promise<void> {
    // Implementar rate limiting específico
    logger.debug(`Rate limit aplicado para IP ${ip} por ${duration}ms`, undefined, "DEBUG");
  }
  
  // Colocar usuário em quarentena
  private async quarantineUser(userId?: string, parameters: Record<string, any> = {}): Promise<void> {
    if (!userId) return;
    
    // Implementar quarentena do usuário
    console.log(`Usuário ${userId} colocado em quarentena:`, parameters);
  }
  
  // Verificar thresholds de alerta
  private checkAlertThresholds(severity: SecuritySeverity): void {
    const key = `${severity}_${Math.floor(Date.now() / 60000)}`; // Por minuto
    const count = (this.eventCounts.get(key) || 0) + 1;
    this.eventCounts.set(key, count);
    
    const threshold = this.config.alertThresholds[severity];
    if (count >= threshold) {
      this.emit('alertThresholdExceeded', { severity, count, threshold });
    }
  }
  
  // Gerar ID único para evento
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Iniciar limpeza periódica
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }
  
  // Limpeza de dados antigos
  private cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Limpar contadores de eventos antigos
    for (const [key, _] of Array.from(this.eventCounts)) {
      const timestamp = parseInt(key.split('_')[1]) * 60000;
      if (timestamp < oneHourAgo) {
        this.eventCounts.delete(key);
      }
    }
    
    this.lastCleanup = now;
  }
  
  // Métodos públicos para consulta
  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events.slice(-limit);
  }
  
  getEventsByType(type: SecurityEventType, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit);
  }
  
  getEventsBySeverity(severity: SecuritySeverity, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.severity === severity)
      .slice(-limit);
  }
  
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }
  
  isUserBlocked(userId: string): boolean {
    return this.blockedUsers.has(userId);
  }
  
  getSecurityStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Record<string, any> {
    return monitoringGetSecurityStats(timeframe);
  }
  
  private groupEventsByType(events: SecurityEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private groupEventsBySeverity(events: SecurityEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// Instância global do monitor
export const realtimeSecurityMonitor = new SecurityRealtimeMonitor();

// Funções utilitárias para uso direto
export function recordSecurityEvent(
  type: SecurityEventType,
  severity: SecuritySeverity,
  ip: string,
  userAgent: string,
  endpoint: string,
  details: Record<string, any> = {},
  userId?: string
): Promise<SecurityEvent> {
  return realtimeSecurityMonitor.recordEvent(type, severity, ip, userAgent, endpoint, details, userId);
}

export function getSecurityStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Record<string, any> {
  return monitoringGetSecurityStats(timeframe);
}

export function isIPBlocked(ip: string): boolean {
  return realtimeSecurityMonitor.isIPBlocked(ip);
}

export function isUserBlocked(userId: string): boolean {
  return realtimeSecurityMonitor.isUserBlocked(userId);
}

export default realtimeSecurityMonitor;
