// 🔒 Sistema de Detecção de Ameaças em Tempo Real
// Monitora e responde automaticamente a ameaças de segurança

import { securityMonitor, SecurityDetectors } from './security-monitor';
import { SecuritySeverity } from './security';
import { logSecurityEvent, SecurityEventType } from './security-monitoring';
import { createServerSupabaseClient } from "@/lib/supabase/clients/server";

// Tipos de ameaças
export type ThreatType = 
  | 'BRUTE_FORCE_ATTACK'
  | 'SQL_INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'CSRF_ATTACK'
  | 'DDoS_ATTACK'
  | 'MALWARE_UPLOAD'
  | 'DATA_EXFILTRATION'
  | 'PRIVILEGE_ESCALATION'
  | 'ACCOUNT_TAKEOVER'
  | 'SUSPICIOUS_GEOLOCATION'
  | 'ANOMALOUS_BEHAVIOR'
  | 'INSIDER_THREAT';

// Interface para ameaças detectadas
interface DetectedThreat {
  id: string;
  type: ThreatType;
  level: SecuritySeverity;
  source: string; // IP, user ID, etc.
  target: string; // recurso alvo
  timestamp: Date;
  description: string;
  evidence: any[];
  confidence: number; // 0-100
  mitigated: boolean;
  mitigationActions: string[];
  falsePositive?: boolean;
}

// Interface para regras de detecção
interface ThreatDetectionRule {
  id: string;
  name: string;
  type: ThreatType;
  enabled: boolean;
  confidence: number;
  autoMitigate: boolean;
  conditions: {
    patterns: string[];
    thresholds: Record<string, number>;
    timeWindow: number;
  };
  actions: {
    block: boolean;
    alert: boolean;
    log: boolean;
    notify: boolean;
  };
}

// Armazenamento de ameaças detectadas
const detectedThreats = new Map<string, DetectedThreat>();
const threatHistory = new Map<string, DetectedThreat[]>();

// Regras de detecção padrão
const DEFAULT_THREAT_RULES: ThreatDetectionRule[] = [
  {
    id: 'brute_force_login',
    name: 'Ataque de Força Bruta - Login',
    type: 'BRUTE_FORCE_ATTACK',
    enabled: true,
    confidence: 90,
    autoMitigate: true,
    conditions: {
      patterns: ['failed_login'],
      thresholds: { attempts: 5, timeWindow: 300000 }, // 5 tentativas em 5 minutos
      timeWindow: 300000
    },
    actions: {
      block: true,
      alert: true,
      log: true,
      notify: true
    }
  },
  {
    id: 'sql_injection',
    name: 'Tentativa de SQL Injection',
    type: 'SQL_INJECTION_ATTEMPT',
    enabled: true,
    confidence: 95,
    autoMitigate: true,
    conditions: {
      patterns: [
        "(?i)(union|select|insert|delete|update|drop|create|alter|exec|execute)",
        "(?i)('|(\\-\\-)|(;)|(\\||\\|)|(\\*|\\*))",
        "(?i)(or\\s+1=1|and\\s+1=1|'\\s+or\\s+'1'='1)"
      ],
      thresholds: { confidence: 80 },
      timeWindow: 60000
    },
    actions: {
      block: true,
      alert: true,
      log: true,
      notify: true
    }
  },
  {
    id: 'xss_attempt',
    name: 'Tentativa de Cross-Site Scripting',
    type: 'XSS_ATTEMPT',
    enabled: true,
    confidence: 85,
    autoMitigate: true,
    conditions: {
      patterns: [
        "(?i)<script[^>]*>.*?</script>",
        "(?i)javascript:",
        "(?i)on\\w+\\s*=",
        "(?i)(alert|confirm|prompt)\\s*\\("
      ],
      thresholds: { confidence: 75 },
      timeWindow: 60000
    },
    actions: {
      block: true,
      alert: true,
      log: true,
      notify: false
    }
  },
  {
    id: 'ddos_attack',
    name: 'Ataque DDoS',
    type: 'DDoS_ATTACK',
    enabled: true,
    confidence: 80,
    autoMitigate: true,
    conditions: {
      patterns: ['rapid_requests'],
      thresholds: { requests: 100, timeWindow: 60000 }, // 100 requests em 1 minuto
      timeWindow: 60000
    },
    actions: {
      block: true,
      alert: true,
      log: true,
      notify: true
    }
  },
  {
    id: 'malware_upload',
    name: 'Upload de Malware',
    type: 'MALWARE_UPLOAD',
    enabled: true,
    confidence: 95,
    autoMitigate: true,
    conditions: {
      patterns: [
        'suspicious_file_signature',
        'known_malware_hash',
        'executable_in_upload'
      ],
      thresholds: { confidence: 90 },
      timeWindow: 60000
    },
    actions: {
      block: true,
      alert: true,
      log: true,
      notify: true
    }
  },
  {
    id: 'privilege_escalation',
    name: 'Escalação de Privilégios',
    type: 'PRIVILEGE_ESCALATION',
    enabled: true,
    confidence: 90,
    autoMitigate: true,
    conditions: {
      patterns: [
        'unauthorized_admin_access',
        'role_modification_attempt',
        'permission_bypass'
      ],
      thresholds: { confidence: 85 },
      timeWindow: 300000
    },
    actions: {
      block: true,
      alert: true,
      log: true,
      notify: true
    }
  }
];

let threatRules = [...DEFAULT_THREAT_RULES];

// Classe principal de detecção de ameaças
export class ThreatDetectionSystem {
  private static instance: ThreatDetectionSystem;
  private isEnabled = true;
  private alertCallbacks: ((threat: DetectedThreat) => void)[] = [];
  private mitigationCallbacks: ((threat: DetectedThreat) => Promise<void>)[] = [];

  private constructor() {
    // Configurar callbacks do monitor de segurança
    securityMonitor.onAlert(this.handleSecurityEvent.bind(this));
    
    // Limpeza periódica de ameaças antigas
    setInterval(() => this.cleanupOldThreats(), 60 * 60 * 1000); // A cada hora
  }

  public static getInstance(): ThreatDetectionSystem {
    if (!ThreatDetectionSystem.instance) {
      ThreatDetectionSystem.instance = new ThreatDetectionSystem();
    }
    return ThreatDetectionSystem.instance;
  }

  // Processar evento de segurança
  private async handleSecurityEvent(event: any): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Analisar evento contra regras de detecção
      for (const rule of threatRules) {
        if (!rule.enabled) continue;

        const threat = await this.analyzeEventAgainstRule(event, rule);
        if (threat) {
          await this.processThreat(threat);
        }
      }
    } catch (error) {
      console.error('Erro ao processar evento de segurança:', error);
    }
  }

  // Analisar evento contra regra específica
  private async analyzeEventAgainstRule(
    event: any, 
    rule: ThreatDetectionRule
  ): Promise<DetectedThreat | null> {
    try {
      let confidence = 0;
      const evidence: any[] = [];

      // Verificar padrões
      for (const pattern of rule.conditions.patterns) {
        if (this.matchesPattern(event, pattern)) {
          confidence += 25;
          evidence.push({ type: 'pattern_match', pattern, event });
        }
      }

      // Verificar thresholds
      const thresholdViolations = await this.checkThresholds(event, rule);
      if (thresholdViolations.length > 0) {
        confidence += 30;
        evidence.push(...thresholdViolations);
      }

      // Verificar histórico
      const historicalEvidence = await this.analyzeHistoricalPattern(event, rule);
      if (historicalEvidence.length > 0) {
        confidence += 20;
        evidence.push(...historicalEvidence);
      }

      // Verificar se confiança é suficiente
      if (confidence >= rule.confidence) {
        const threatId = this.generateThreatId();
        
        return {
          id: threatId,
          type: rule.type,
          level: this.calculateThreatLevel(confidence),
          source: event.ip || event.userId || 'unknown',
          target: event.details || 'unknown',
          timestamp: new Date(),
          description: this.generateThreatDescription(rule.type, evidence),
          evidence,
          confidence,
          mitigated: false,
          mitigationActions: []
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao analisar evento:', error);
      return null;
    }
  }

  // Verificar se evento corresponde ao padrão
  private matchesPattern(event: any, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern, 'i');
      const eventString = JSON.stringify(event).toLowerCase();
      return regex.test(eventString);
    } catch (error) {
      return false;
    }
  }

  // Verificar thresholds
  private async checkThresholds(
    event: any, 
    rule: ThreatDetectionRule
  ): Promise<any[]> {
    const violations: any[] = [];
    
    // Implementar verificações específicas baseadas no tipo de regra
    if (rule.type === 'BRUTE_FORCE_ATTACK') {
      const recentFailures = await this.countRecentFailedLogins(
        event.ip || event.userId,
        rule.conditions.timeWindow
      );
      
      if (recentFailures >= rule.conditions.thresholds.attempts) {
        violations.push({
          type: 'threshold_violation',
          metric: 'failed_logins',
          value: recentFailures,
          threshold: rule.conditions.thresholds.attempts
        });
      }
    }
    
    if (rule.type === 'DDoS_ATTACK') {
      const recentRequests = await this.countRecentRequests(
        event.ip,
        rule.conditions.timeWindow
      );
      
      if (recentRequests >= rule.conditions.thresholds.requests) {
        violations.push({
          type: 'threshold_violation',
          metric: 'request_rate',
          value: recentRequests,
          threshold: rule.conditions.thresholds.requests
        });
      }
    }
    
    return violations;
  }

  // Analisar padrão histórico
  private async analyzeHistoricalPattern(
    event: any, 
    rule: ThreatDetectionRule
  ): Promise<any[]> {
    const evidence: any[] = [];
    const source = event.ip || event.userId;
    
    if (!source) return evidence;
    
    const history = threatHistory.get(source) || [];
    const recentThreats = history.filter(
      threat => 
        threat.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) && // Últimas 24 horas
        threat.type === rule.type
    );
    
    if (recentThreats.length > 0) {
      evidence.push({
        type: 'historical_pattern',
        recentThreats: recentThreats.length,
        pattern: rule.type
      });
    }
    
    return evidence;
  }

  // Processar ameaça detectada
  private async processThreat(threat: DetectedThreat): Promise<void> {
    try {
      // Armazenar ameaça
      detectedThreats.set(threat.id, threat);
      
      // Adicionar ao histórico
      if (!threatHistory.has(threat.source)) {
        threatHistory.set(threat.source, []);
      }
      threatHistory.get(threat.source)!.push(threat);
      
      // Log da ameaça
      // await logSecurityEvent({
      //   action: 'THREAT_DETECTED',
      //   details: `Ameaça detectada: ${threat.type} - ${threat.description}`,
      //   severity: threat.level === SecuritySeverity.CRITICAL ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
      //   metadata: {
      //     threatId: threat.id,
      //     threatType: threat.type,
      //     confidence: threat.confidence,
      //     source: threat.source,
      //     evidence: threat.evidence
      //   }
      // });
      
      // Encontrar regra correspondente
      const rule = threatRules.find(r => r.type === threat.type);
      
      if (rule && rule.autoMitigate) {
        await this.mitigateThreat(threat, rule);
      }
      
      // Notificar callbacks
      this.alertCallbacks.forEach(callback => {
        try {
          callback(threat);
        } catch (error) {
          console.error('Erro ao executar callback de alerta:', error);
        }
      });
      
    } catch (error) {
      console.error('Erro ao processar ameaça:', error);
    }
  }

  // Mitigar ameaça
  private async mitigateThreat(
    threat: DetectedThreat, 
    rule: ThreatDetectionRule
  ): Promise<void> {
    const actions: string[] = [];
    
    try {
      // Bloquear fonte se configurado
      if (rule.actions.block) {
        if (threat.source.includes('.')) { // É um IP
          securityMonitor.recordEvent({
            type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
            severity: SecuritySeverity.CRITICAL,
            ip: threat.source,
            userAgent: 'threat-detection-system',
            details: `Auto-bloqueio por ameaça: ${threat.type}`,
            autoBlocked: true
          });
          actions.push(`IP ${threat.source} bloqueado`);
        } else { // É um user ID
          securityMonitor.recordEvent({
            type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
            severity: SecuritySeverity.CRITICAL,
            userId: threat.source,
            ip: 'unknown',
            userAgent: 'threat-detection-system',
            details: `Auto-bloqueio por ameaça: ${threat.type}`,
            autoBlocked: true
          });
          actions.push(`Usuário ${threat.source} bloqueado`);
        }
      }
      
      // Executar callbacks de mitigação personalizados
      for (const callback of this.mitigationCallbacks) {
        try {
          await callback(threat);
        } catch (error) {
          console.error('Erro ao executar callback de mitigação:', error);
        }
      }
      
      // Atualizar ameaça
      threat.mitigated = true;
      threat.mitigationActions = actions;
      
      // Registrar evento de mitigação
      logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        'threat_detection',
        threat.source,
        {
          action: 'THREAT_MITIGATED',
          details: `Ameaça mitigada: ${threat.type} - Ações: ${actions.join(', ')}`,
          threatId: threat.id,
          actions
        }
      );
      
    } catch (error) {
      console.error('Erro ao mitigar ameaça:', error);
      
      // await logSecurityEvent({
      //   action: 'THREAT_MITIGATION_FAILED',
      //   details: `Falha ao mitigar ameaça: ${threat.type} - ${error}`,
      //   severity: SecuritySeverity.HIGH,
      //   metadata: {
      //     threatId: threat.id,
      //     error: error instanceof Error ? error.message : 'Erro desconhecido'
      //   }
      // });
    }
  }

  // Funções auxiliares
  private generateThreatId(): string {
    return `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateThreatLevel(confidence: number): SecuritySeverity {
    if (confidence >= 90) return SecuritySeverity.CRITICAL;
    if (confidence >= 70) return SecuritySeverity.HIGH;
    if (confidence >= 50) return SecuritySeverity.MEDIUM;
    return SecuritySeverity.LOW;
  }

  private generateThreatDescription(type: ThreatType, evidence: any[]): string {
    const descriptions: Record<ThreatType, string> = {
      'BRUTE_FORCE_ATTACK': 'Múltiplas tentativas de login falhadas detectadas',
      'SQL_INJECTION_ATTEMPT': 'Tentativa de injeção SQL identificada',
      'XSS_ATTEMPT': 'Tentativa de Cross-Site Scripting detectada',
      'CSRF_ATTACK': 'Possível ataque CSRF identificado',
      'DDoS_ATTACK': 'Padrão de ataque DDoS detectado',
      'MALWARE_UPLOAD': 'Upload de arquivo malicioso identificado',
      'DATA_EXFILTRATION': 'Possível exfiltração de dados detectada',
      'PRIVILEGE_ESCALATION': 'Tentativa de escalação de privilégios',
      'ACCOUNT_TAKEOVER': 'Possível comprometimento de conta',
      'SUSPICIOUS_GEOLOCATION': 'Acesso de localização suspeita',
      'ANOMALOUS_BEHAVIOR': 'Comportamento anômalo detectado',
      'INSIDER_THREAT': 'Possível ameaça interna identificada'
    };
    
    return descriptions[type] || 'Ameaça de segurança detectada';
  }

  private async countRecentFailedLogins(source: string, timeWindow: number): Promise<number> {
    // Implementar contagem de logins falhados recentes
    // Esta é uma implementação simplificada
    return 0;
  }

  private async countRecentRequests(ip: string, timeWindow: number): Promise<number> {
    // Implementar contagem de requests recentes
    // Esta é uma implementação simplificada
    return 0;
  }

  private cleanupOldThreats(): void {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias
    
    for (const [id, threat] of detectedThreats.entries()) {
      if (threat.timestamp < cutoffTime) {
        detectedThreats.delete(id);
      }
    }
    
    for (const [source, threats] of threatHistory.entries()) {
      const filteredThreats = threats.filter(threat => threat.timestamp > cutoffTime);
      
      if (filteredThreats.length === 0) {
        threatHistory.delete(source);
      } else {
        threatHistory.set(source, filteredThreats);
      }
    }
  }

  // Métodos públicos
  public onThreatDetected(callback: (threat: DetectedThreat) => void): void {
    this.alertCallbacks.push(callback);
  }

  public onThreatMitigation(callback: (threat: DetectedThreat) => Promise<void>): void {
    this.mitigationCallbacks.push(callback);
  }

  public getActiveThreats(): DetectedThreat[] {
    return Array.from(detectedThreats.values())
      .filter(threat => !threat.mitigated)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getThreatHistory(source?: string): DetectedThreat[] {
    if (source) {
      return threatHistory.get(source) || [];
    }
    
    return Array.from(threatHistory.values())
      .flat()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public markFalsePositive(threatId: string): void {
    const threat = detectedThreats.get(threatId);
    if (threat) {
      threat.falsePositive = true;
      // Registrar evento de falso positivo
      logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.LOW,
        'threat_detection',
        threat.source,
        {
          action: 'THREAT_MARKED_FALSE_POSITIVE',
          details: `Ameaça marcada como falso positivo: ${threatId}`,
          threatId
        }
      );
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    // Evento de alternância do sistema de detecção
    logSecurityEvent(
      SecurityEventType.UNUSUAL_ACTIVITY,
      enabled ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM,
      'threat_detection',
      'system',
      {
        action: 'THREAT_DETECTION_TOGGLED',
        enabled
      }
    );
  }

  public getStatistics(): {
    totalThreats: number;
    activeThreats: number;
    mitigatedThreats: number;
    falsePositives: number;
    threatsByType: Record<ThreatType, number>;
    threatsByLevel: Record<SecuritySeverity, number>;
  } {
    const allThreats = Array.from(detectedThreats.values());
    
    const stats = {
      totalThreats: allThreats.length,
      activeThreats: allThreats.filter(t => !t.mitigated).length,
      mitigatedThreats: allThreats.filter(t => t.mitigated).length,
      falsePositives: allThreats.filter(t => t.falsePositive).length,
      threatsByType: {} as Record<ThreatType, number>,
      threatsByLevel: {} as Record<SecuritySeverity, number>
    };
    
    allThreats.forEach(threat => {
      stats.threatsByType[threat.type] = (stats.threatsByType[threat.type] || 0) + 1;
      stats.threatsByLevel[threat.level] = (stats.threatsByLevel[threat.level] || 0) + 1;
    });
    
    return stats;
  }
}

// Instância singleton
export const threatDetection = ThreatDetectionSystem.getInstance();

// Detectores específicos para uso direto
export const ThreatDetectors = {
  // Detectar tentativa de SQL injection
  sqlInjection: (payload: string, source: string) => {
    const patterns = [
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
      /(or\s+1=1|and\s+1=1|'\s+or\s+'1'='1)/i
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(payload)) {
        SecurityDetectors.maliciousPayload(
          source.includes('.') ? source : 'unknown',
          'threat-detector',
          payload,
          source.includes('.') ? undefined : source
        );
        break;
      }
    }
  },
  
  // Detectar tentativa de XSS
  xssAttempt: (payload: string, source: string) => {
    const patterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /(alert|confirm|prompt)\s*\(/gi
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(payload)) {
        SecurityDetectors.maliciousPayload(
          source.includes('.') ? source : 'unknown',
          'threat-detector',
          payload,
          source.includes('.') ? undefined : source
        );
        break;
      }
    }
  },
  
  // Detectar comportamento anômalo
  anomalousBehavior: (userId: string, behavior: string, confidence: number) => {
    if (confidence > 70) {
      SecurityDetectors.unauthorizedAccess(
        'unknown',
        'threat-detector',
        `Comportamento anômalo: ${behavior}`,
        userId
      );
    }
  }
};