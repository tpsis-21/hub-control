// 🔒 Sistema de Monitoramento de Segurança em Tempo Real
// Detecta e responde a atividades suspeitas automaticamente

// import { logSecurityEvent } from './security-config';
import { SecurityEventType, SecuritySeverity } from './security-monitoring';

// Tipos específicos de eventos de segurança do monitor
export type MonitorSecurityEventType = 
  | 'SUSPICIOUS_LOGIN'
  | 'MULTIPLE_FAILED_LOGINS'
  | 'UNUSUAL_LOCATION'
  | 'RAPID_API_CALLS'
  | 'SUSPICIOUS_FILE_UPLOAD'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'DATA_BREACH_ATTEMPT'
  | 'MALICIOUS_PAYLOAD_DETECTED'
  | 'ACCOUNT_TAKEOVER_ATTEMPT'
  | 'PRIVILEGE_ESCALATION_ATTEMPT';

// Interface para eventos de segurança
interface SecurityEvent {
  type: MonitorSecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  userEmail?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: string;
  metadata?: Record<string, any>;
  autoBlocked?: boolean;
}

// Interface para regras de detecção
interface DetectionRule {
  id: string;
  name: string;
  type: MonitorSecurityEventType;
  severity: SecuritySeverity;
  threshold: number;
  timeWindow: number; // em milissegundos
  autoBlock: boolean;
  enabled: boolean;
}

// Armazenamento em memória para eventos recentes
const recentEvents = new Map<string, SecurityEvent[]>();
const blockedIPs = new Set<string>();
const blockedUsers = new Set<string>();

// Regras de detecção padrão
const DEFAULT_DETECTION_RULES: DetectionRule[] = [
  {
    id: 'multiple_failed_logins',
    name: 'Múltiplas tentativas de login falhadas',
    type: 'MULTIPLE_FAILED_LOGINS',
    severity: SecuritySeverity.HIGH,
    threshold: 5,
    timeWindow: 15 * 60 * 1000, // 15 minutos
    autoBlock: true,
    enabled: true
  },
  {
    id: 'rapid_api_calls',
    name: 'Chamadas de API muito rápidas',
    type: 'RAPID_API_CALLS',
    severity: SecuritySeverity.MEDIUM,
    threshold: 100,
    timeWindow: 60 * 1000, // 1 minuto
    autoBlock: false,
    enabled: true
  },
  {
    id: 'suspicious_file_upload',
    name: 'Upload de arquivo suspeito',
    type: 'SUSPICIOUS_FILE_UPLOAD',
    severity: SecuritySeverity.HIGH,
    threshold: 3,
    timeWindow: 5 * 60 * 1000, // 5 minutos
    autoBlock: true,
    enabled: true
  },
  {
    id: 'unauthorized_access',
    name: 'Tentativa de acesso não autorizado',
    type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
    severity: SecuritySeverity.CRITICAL,
    threshold: 1,
    timeWindow: 60 * 1000, // 1 minuto
    autoBlock: true,
    enabled: true
  },
  {
    id: 'malicious_payload',
    name: 'Payload malicioso detectado',
    type: 'MALICIOUS_PAYLOAD_DETECTED',
    severity: SecuritySeverity.CRITICAL,
    threshold: 1,
    timeWindow: 60 * 1000, // 1 minuto
    autoBlock: true,
    enabled: true
  }
];

let detectionRules = [...DEFAULT_DETECTION_RULES];

// Classe principal do monitor de segurança
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private alertCallbacks: ((event: SecurityEvent) => void)[] = [];
  private isEnabled = true;

  private constructor() {
    // Limpeza periódica de eventos antigos
    setInterval(() => this.cleanupOldEvents(), 5 * 60 * 1000); // A cada 5 minutos
  }

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  // Registrar evento de segurança
  public async recordEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    if (!this.isEnabled) return;

    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    // Armazenar evento
    const key = event.ip + (event.userId || '');
    if (!recentEvents.has(key)) {
      recentEvents.set(key, []);
    }
    recentEvents.get(key)!.push(fullEvent);

    // Verificar regras de detecção
    await this.checkDetectionRules(fullEvent);

    // Log do evento
    // await logSecurityEvent({
    //   action: event.type,
    //   details: event.details,
    //   userId: event.userId,
    //   userEmail: event.userEmail,
    //   ip: event.ip,
    //   userAgent: event.userAgent,
    //   severity: event.severity,
    //   metadata: {
    //     ...event.metadata,
    //     autoBlocked: event.autoBlocked
    //   }
    // });
  }

  // Verificar regras de detecção
  private async checkDetectionRules(event: SecurityEvent): Promise<void> {
    const applicableRules = detectionRules.filter(
      rule => rule.enabled && rule.type === event.type
    );

    for (const rule of applicableRules) {
      const violations = await this.countViolations(event, rule);
      
      if (violations >= rule.threshold) {
        await this.handleRuleViolation(event, rule, violations);
      }
    }
  }

  // Contar violações dentro da janela de tempo
  private async countViolations(event: SecurityEvent, rule: DetectionRule): Promise<number> {
    const key = event.ip + (event.userId || '');
    const events = recentEvents.get(key) || [];
    const cutoffTime = new Date(Date.now() - rule.timeWindow);
    
    return events.filter(
      e => e.type === rule.type && e.timestamp > cutoffTime
    ).length;
  }

  // Lidar com violação de regra
  private async handleRuleViolation(
    event: SecurityEvent, 
    rule: DetectionRule, 
    violationCount: number
  ): Promise<void> {
    const alertEvent: SecurityEvent = {
      ...event,
      severity: rule.severity,
      details: `Regra violada: ${rule.name} (${violationCount}/${rule.threshold})`,
      autoBlocked: rule.autoBlock
    };

    // Auto-bloqueio se configurado
    if (rule.autoBlock) {
      if (event.userId) {
        blockedUsers.add(event.userId);
      }
      blockedIPs.add(event.ip);
      
      // await logSecurityEvent({
      //   action: 'AUTO_BLOCK_TRIGGERED',
      //   details: `Auto-bloqueio ativado para regra: ${rule.name}`,
      //   userId: event.userId,
      //   userEmail: event.userEmail,
      //   ip: event.ip,
      //   severity: SecuritySeverity.CRITICAL,
      //   metadata: {
      //     ruleId: rule.id,
      //     violationCount,
      //     threshold: rule.threshold
      //   }
      // });
    }

    // Notificar callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alertEvent);
      } catch (error) {
        console.error('Erro ao executar callback de alerta:', error);
      }
    });
  }

  // Verificar se IP está bloqueado
  public isIPBlocked(ip: string): boolean {
    return blockedIPs.has(ip);
  }

  // Verificar se usuário está bloqueado
  public isUserBlocked(userId: string): boolean {
    return blockedUsers.has(userId);
  }

  // Desbloquear IP
  public unblockIP(ip: string): void {
    blockedIPs.delete(ip);
    // logSecurityEvent({
    //   action: 'IP_UNBLOCKED',
    //   details: `IP desbloqueado manualmente: ${ip}`,
    //   ip,
    //   severity: SecuritySeverity.LOW
    // });
  }

  // Desbloquear usuário
  public unblockUser(userId: string): void {
    blockedUsers.delete(userId);
    // logSecurityEvent({
    //   action: 'USER_UNBLOCKED',
    //   details: `Usuário desbloqueado manualmente: ${userId}`,
    //   userId,
    //   severity: SecuritySeverity.LOW
    // });
  }

  // Registrar callback para alertas
  public onAlert(callback: (event: SecurityEvent) => void): void {
    this.alertCallbacks.push(callback);
  }

  // Remover callback
  public offAlert(callback: (event: SecurityEvent) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  // Obter estatísticas de segurança
  public getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<MonitorSecurityEventType, number>;
    blockedIPs: number;
    blockedUsers: number;
    recentAlerts: SecurityEvent[];
  } {
    // Delegar ao módulo consolidado para contagens totais no período de 24h
    const consolidated = require('./security-monitoring') as any;
    const stats = consolidated.getSecurityStats('day');

    const allEvents = Array.from(recentEvents.values()).flat();

    // Calcular distribuição por tipo localmente (mantém compatibilidade com nossos tipos)
    const eventsByType = {} as Record<MonitorSecurityEventType, number>;
    allEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    });

    const recentAlerts = allEvents
      .filter(event => event.severity === SecuritySeverity.CRITICAL)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalEvents: stats.total ?? allEvents.length,
      eventsByType,
      blockedIPs: blockedIPs.size,
      blockedUsers: blockedUsers.size,
      recentAlerts
    };
  }

  // Limpeza de eventos antigos
  private cleanupOldEvents(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
    
    for (const [key, events] of Array.from(recentEvents.entries())) {
      const filteredEvents = events.filter(event => event.timestamp > cutoffTime);
      
      if (filteredEvents.length === 0) {
        recentEvents.delete(key);
      } else {
        recentEvents.set(key, filteredEvents);
      }
    }
  }

  // Habilitar/desabilitar monitor
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    // logSecurityEvent({
    //   action: 'SECURITY_MONITOR_TOGGLED',
    //   details: `Monitor de segurança ${enabled ? 'habilitado' : 'desabilitado'}`,
    //   severity: SecuritySeverity.LOW
    // });
  }

  // Obter regras de detecção
  public getDetectionRules(): DetectionRule[] {
    return [...detectionRules];
  }

  // Atualizar regra de detecção
  public updateDetectionRule(ruleId: string, updates: Partial<DetectionRule>): boolean {
    const ruleIndex = detectionRules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) return false;
    
    detectionRules[ruleIndex] = { ...detectionRules[ruleIndex], ...updates };
    
    // logSecurityEvent({
    //   action: 'DETECTION_RULE_UPDATED',
    //   details: `Regra de detecção atualizada: ${ruleId}`,
    //   severity: SecuritySeverity.LOW,
    //   metadata: { ruleId, updates }
    // });
    
    return true;
  }
}

// Funções de conveniência com lazy initialization
let _securityMonitor: SecurityMonitor | null = null;

export function getSecurityMonitor(): SecurityMonitor {
  if (typeof window === 'undefined') {
    // No servidor, retornar uma instância mock
    return {
      recordEvent: () => {},
      isIPBlocked: () => false,
      isUserBlocked: () => false,
      unblockIP: () => {},
      unblockUser: () => {},
      onAlert: () => {},
      offAlert: () => {},
      getSecurityStats: () => ({
        totalEvents: 0,
        eventsByType: {} as any,
        blockedIPs: 0,
        blockedUsers: 0,
        recentAlerts: []
      }),
      setEnabled: () => {},
      getDetectionRules: () => [],
      updateDetectionRule: () => false
    } as any;
  }
  
  if (!_securityMonitor) {
    _securityMonitor = SecurityMonitor.getInstance();
  }
  
  return _securityMonitor;
}

// Manter compatibilidade com código existente
export const securityMonitor = getSecurityMonitor();

// Detectores específicos
export const SecurityDetectors = {
  // Detectar login suspeito
  suspiciousLogin: (userId: string, userEmail: string, ip: string, userAgent: string, reason: string) => {
    securityMonitor.recordEvent({
      type: 'SUSPICIOUS_LOGIN',
      severity: SecuritySeverity.MEDIUM,
      userId,
      userEmail,
      ip,
      userAgent,
      details: `Login suspeito detectado: ${reason}`
    });
  },

  // Detectar tentativa de acesso não autorizado
  unauthorizedAccess: (ip: string, userAgent: string, resource: string, userId?: string) => {
    securityMonitor.recordEvent({
      type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      severity: SecuritySeverity.CRITICAL,
      userId,
      ip,
      userAgent,
      details: `Tentativa de acesso não autorizado ao recurso: ${resource}`,
      metadata: { resource }
    });
  },

  // Detectar payload malicioso
  maliciousPayload: (ip: string, userAgent: string, payload: string, userId?: string) => {
    securityMonitor.recordEvent({
      type: 'MALICIOUS_PAYLOAD_DETECTED',
      severity: SecuritySeverity.CRITICAL,
      userId,
      ip,
      userAgent,
      details: 'Payload malicioso detectado na requisição',
      metadata: { 
        payloadSample: payload.substring(0, 100) // Apenas uma amostra
      }
    });
  },

  // Detectar chamadas de API muito rápidas
  rapidAPICalls: (ip: string, userAgent: string, endpoint: string, callCount: number, userId?: string) => {
    securityMonitor.recordEvent({
      type: 'RAPID_API_CALLS',
      severity: SecuritySeverity.MEDIUM,
      userId,
      ip,
      userAgent,
      details: `Chamadas de API muito rápidas detectadas: ${callCount} chamadas`,
      metadata: { endpoint, callCount }
    });
  },

  // Detectar upload de arquivo suspeito
  suspiciousFileUpload: (userId: string, userEmail: string, ip: string, userAgent: string, fileName: string, reason: string) => {
    securityMonitor.recordEvent({
      type: 'SUSPICIOUS_FILE_UPLOAD',
      severity: SecuritySeverity.HIGH,
      userId,
      userEmail,
      ip,
      userAgent,
      details: `Upload de arquivo suspeito: ${fileName} - ${reason}`,
      metadata: { fileName, reason }
    });
  }
};
