// 📋 Sistema de Auditoria e Compliance
// Sistema completo para rastreamento, auditoria e compliance de segurança

import { createApiSupabaseClient } from "./supabase/clients/api";
import { realtimeSecurityMonitor, SecurityEvent, SecurityEventType, SecuritySeverity } from './security';

// Tipos de eventos de auditoria
export enum AuditEventType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTRATION = 'user_registration',
  PASSWORD_CHANGE = 'password_change',
  PERMISSION_CHANGE = 'permission_change',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  SYSTEM_CONFIGURATION = 'system_configuration',
  SECURITY_POLICY_CHANGE = 'security_policy_change',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  API_ACCESS = 'api_access',
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  ADMIN_ACTION = 'admin_action',
  COMPLIANCE_CHECK = 'compliance_check',
  SECURITY_SCAN = 'security_scan',
  NOTIFICATION_SENT = 'notification_sent',
  SYSTEM_EVENT = 'system_event',
  // Tipos adicionados para cobrir usos existentes no código
  REPORT_GENERATED = 'report_generated',
  PERFORMANCE_ALERT = 'performance_alert'
}

// Categorias de compliance
export enum ComplianceCategory {
  GDPR = 'gdpr',
  LGPD = 'lgpd',
  SOX = 'sox',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci_dss',
  ISO_27001 = 'iso_27001',
  NIST = 'nist',
  OWASP = 'owasp'
}

// Status de compliance
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  UNDER_REVIEW = 'under_review',
  REMEDIATION_REQUIRED = 'remediation_required'
}

// Interface para eventos de auditoria
export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  ip: string;
  userAgent: string;
  resource: string;
  action: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'partial';
  riskLevel: SecuritySeverity;
  complianceCategories: ComplianceCategory[];
  metadata: Record<string, any>;
}

// Interface para regras de compliance
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: ComplianceCategory;
  severity: SecuritySeverity;
  conditions: ComplianceCondition[];
  actions: ComplianceAction[];
  enabled: boolean;
  lastChecked?: Date;
  status: ComplianceStatus;
}

export interface ComplianceCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: any;
  timeframe?: number; // em milissegundos
}

export interface ComplianceAction {
  type: 'alert' | 'block' | 'log' | 'notify' | 'remediate' | 'escalate';
  parameters: Record<string, any>;
}

// Interface para relatórios de compliance
export interface ComplianceReport {
  id: string;
  category: ComplianceCategory;
  period: {
    start: Date;
    end: Date;
  };
  status: ComplianceStatus;
  score: number; // 0-100
  findings: ComplianceFinding[];
  recommendations: string[];
  generatedAt: Date;
  generatedBy: string;
}

export interface ComplianceFinding {
  ruleId: string;
  ruleName: string;
  severity: SecuritySeverity;
  status: ComplianceStatus;
  description: string;
  evidence: any[];
  remediation: string;
  dueDate?: Date;
}

// Configurações do sistema de auditoria
export interface AuditConfig {
  enableRealTimeMonitoring: boolean;
  enableComplianceChecks: boolean;
  retentionPeriodDays: number;
  enableEncryption: boolean;
  enableIntegrityChecks: boolean;
  alertThresholds: {
    criticalEvents: number;
    highRiskEvents: number;
    failedLogins: number;
    dataAccess: number;
  };
}

const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  enableRealTimeMonitoring: true,
  enableComplianceChecks: true,
  retentionPeriodDays: 2555, // 7 anos para compliance
  enableEncryption: true,
  enableIntegrityChecks: true,
  alertThresholds: {
    criticalEvents: 1,
    highRiskEvents: 5,
    failedLogins: 10,
    dataAccess: 100
  }
};

// Classe principal do sistema de auditoria
export class AuditComplianceSystem {
  private config: AuditConfig;
  private auditEvents: AuditEvent[] = [];
  private complianceRules: ComplianceRule[] = [];
  private complianceReports: ComplianceReport[] = [];
  private eventCounts = new Map<string, number>();
  
  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
    this.initializeComplianceRules();
    this.startPeriodicChecks();
  }
  
  // Inicializar regras de compliance padrão
  private initializeComplianceRules(): void {
    this.complianceRules = [
      {
        id: 'gdpr-data-access-logging',
        name: 'GDPR - Log de Acesso a Dados',
        description: 'Todos os acessos a dados pessoais devem ser registrados',
        category: ComplianceCategory.GDPR,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals', value: AuditEventType.DATA_ACCESS }
        ],
        actions: [
          { type: 'log', parameters: { level: 'info', retention: '7_years' } }
        ],
        enabled: true,
        status: ComplianceStatus.COMPLIANT
      },
      {
        id: 'lgpd-consent-tracking',
        name: 'LGPD - Rastreamento de Consentimento',
        description: 'Rastrear todas as alterações de consentimento do usuário',
        category: ComplianceCategory.LGPD,
        severity: SecuritySeverity.CRITICAL,
        conditions: [
          { field: 'action', operator: 'contains', value: 'consent' }
        ],
        actions: [
          { type: 'log', parameters: { level: 'info', retention: 'permanent' } },
          { type: 'notify', parameters: { recipients: ['dpo@company.com'] } }
        ],
        enabled: true,
        status: ComplianceStatus.COMPLIANT
      },
      {
        id: 'sox-financial-data-access',
        name: 'SOX - Acesso a Dados Financeiros',
        description: 'Controlar e auditar acesso a dados financeiros',
        category: ComplianceCategory.SOX,
        severity: SecuritySeverity.CRITICAL,
        conditions: [
          { field: 'resource', operator: 'contains', value: 'financial' },
          { field: 'type', operator: 'equals', value: AuditEventType.DATA_ACCESS }
        ],
        actions: [
          { type: 'log', parameters: { level: 'critical', retention: '7_years' } },
          { type: 'alert', parameters: { priority: SecuritySeverity.HIGH } }
        ],
        enabled: true,
        status: ComplianceStatus.COMPLIANT
      },
      {
        id: 'pci-dss-card-data-protection',
        name: 'PCI DSS - Proteção de Dados de Cartão',
        description: 'Monitorar acesso a dados de cartão de crédito',
        category: ComplianceCategory.PCI_DSS,
        severity: SecuritySeverity.CRITICAL,
        conditions: [
          { field: 'resource', operator: 'contains', value: 'payment' },
          { field: 'details.cardData', operator: 'exists', value: true }
        ],
        actions: [
          { type: 'log', parameters: { level: 'critical', encryption: true } },
          { type: 'alert', parameters: { priority: SecuritySeverity.CRITICAL, immediate: true } },
          { type: 'escalate', parameters: { to: 'security_team' } }
        ],
        enabled: true,
        status: ComplianceStatus.COMPLIANT
      },
      {
        id: 'iso27001-access-control',
        name: 'ISO 27001 - Controle de Acesso',
        description: 'Monitorar mudanças de permissões e acessos privilegiados',
        category: ComplianceCategory.ISO_27001,
        severity: SecuritySeverity.HIGH,
        conditions: [
          { field: 'type', operator: 'equals', value: AuditEventType.PERMISSION_CHANGE }
        ],
        actions: [
          { type: 'log', parameters: { level: 'warn', retention: '3_years' } },
          { type: 'notify', parameters: { recipients: ['security@company.com'] } }
        ],
        enabled: true,
        status: ComplianceStatus.COMPLIANT
      }
    ];
  }
  
  // Registrar evento de auditoria
  async recordAuditEvent(
    type: AuditEventType,
    userId: string | undefined,
    userEmail: string | undefined,
    ip: string,
    userAgent: string,
    resource: string,
    action: string,
    details: Record<string, any> = {},
    result: 'success' | 'failure' | 'partial' = 'success',
    riskLevel: SecuritySeverity = SecuritySeverity.LOW
  ): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: this.generateAuditId(),
      type,
      timestamp: new Date(),
      userId,
      userEmail,
      ip,
      userAgent,
      resource,
      action,
      details,
      result,
      riskLevel,
      complianceCategories: this.determineComplianceCategories(type, resource, action),
      metadata: {
        sessionId: details.sessionId,
        requestId: details.requestId,
        correlationId: details.correlationId
      }
    };
    
    // Adicionar à lista de eventos
    this.auditEvents.push(event);
    
    // Limitar eventos na memória
    if (this.auditEvents.length > 10000) {
      this.auditEvents = this.auditEvents.slice(-5000);
    }
    
    // Salvar no banco de dados
    await this.persistAuditEvent(event);
    
    // Verificar regras de compliance
    if (this.config.enableComplianceChecks) {
      await this.checkComplianceRules(event);
    }
    
    // Verificar thresholds de alerta
    this.checkAlertThresholds(event);
    
    return event;
  }
  
  // Determinar categorias de compliance aplicáveis
  private determineComplianceCategories(
    type: AuditEventType,
    resource: string,
    action: string
  ): ComplianceCategory[] {
    const categories: ComplianceCategory[] = [];
    
    // GDPR/LGPD - dados pessoais
    if (resource.includes('user') || resource.includes('personal') || action.includes('consent')) {
      categories.push(ComplianceCategory.GDPR, ComplianceCategory.LGPD);
    }
    
    // SOX - dados financeiros
    if (resource.includes('financial') || resource.includes('accounting')) {
      categories.push(ComplianceCategory.SOX);
    }
    
    // PCI DSS - dados de pagamento
    if (resource.includes('payment') || resource.includes('card')) {
      categories.push(ComplianceCategory.PCI_DSS);
    }
    
    // ISO 27001 - controles de segurança
    if (type === AuditEventType.PERMISSION_CHANGE || type === AuditEventType.SECURITY_POLICY_CHANGE) {
      categories.push(ComplianceCategory.ISO_27001);
    }
    
    // OWASP - eventos de segurança
    if (type === AuditEventType.SECURITY_SCAN || action.includes('security')) {
      categories.push(ComplianceCategory.OWASP);
    }
    
    return categories;
  }
  
  // Persistir evento de auditoria
  private async persistAuditEvent(event: AuditEvent): Promise<void> {
    try {
      const supabase = createApiSupabaseClient();
      
      const eventData = {
        id: event.id,
        type: event.type,
        user_id: event.userId,
        ip: event.ip,
        user_agent: event.userAgent,
        resource: event.resource,
        action: event.action,
        details: this.config.enableEncryption ? this.encryptData(event.details) : event.details,
        timestamp: event.timestamp.toISOString(),
        severity: event.riskLevel,
        compliance: {
          categories: event.complianceCategories,
          result: event.result,
          metadata: event.metadata
        },
        data_classification: 'internal' as const,
        retention_period: 365
      };
      
      await supabase.from('audit_events').insert(eventData);
    } catch (error) {
      console.error('Erro ao persistir evento de auditoria:', error);
      // Em caso de erro, manter o evento na memória para retry
    }
  }
  
  // Verificar regras de compliance
  private async checkComplianceRules(event: AuditEvent): Promise<void> {
    const applicableRules = this.complianceRules.filter(rule => 
      rule.enabled && this.evaluateComplianceConditions(rule.conditions, event)
    );
    
    for (const rule of applicableRules) {
      await this.executeComplianceActions(rule.actions, event, rule);
      rule.lastChecked = new Date();
    }
  }
  
  // Avaliar condições de compliance
  private evaluateComplianceConditions(conditions: ComplianceCondition[], event: AuditEvent): boolean {
    return conditions.every(condition => {
      const value = this.getAuditEventValue(event, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'not_contains':
          return !String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        case 'exists':
          return value !== undefined && value !== null;
        case 'not_exists':
          return value === undefined || value === null;
        default:
          return false;
      }
    });
  }
  
  // Obter valor do evento de auditoria
  private getAuditEventValue(event: AuditEvent, field: string): any {
    if (field.startsWith('details.')) {
      const detailField = field.substring(8);
      return event.details[detailField];
    }
    if (field.startsWith('metadata.')) {
      const metadataField = field.substring(9);
      return event.metadata[metadataField];
    }
    return (event as any)[field];
  }
  
  // Executar ações de compliance
  private async executeComplianceActions(
    actions: ComplianceAction[],
    event: AuditEvent,
    rule: ComplianceRule
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'alert':
            await this.sendComplianceAlert(event, rule, action.parameters);
            break;
          case 'block':
            await this.blockComplianceViolation(event, action.parameters);
            break;
          case 'log':
            await this.logComplianceEvent(event, rule, action.parameters);
            break;
          case 'notify':
            await this.notifyComplianceTeam(event, rule, action.parameters);
            break;
          case 'remediate':
            await this.initiateRemediation(event, rule, action.parameters);
            break;
          case 'escalate':
            await this.escalateComplianceIssue(event, rule, action.parameters);
            break;
        }
      } catch (error) {
        console.error(`Erro ao executar ação de compliance ${action.type}:`, error);
      }
    }
  }
  
  // Enviar alerta de compliance
  private async sendComplianceAlert(
    event: AuditEvent,
    rule: ComplianceRule,
    parameters: Record<string, any>
  ): Promise<void> {
    console.log(`ALERTA DE COMPLIANCE [${rule.category}]:`, {
      rule: rule.name,
      event: event.type,
      user: event.userEmail,
      resource: event.resource,
      timestamp: event.timestamp
    });
  }
  
  // Bloquear violação de compliance
  private async blockComplianceViolation(
    event: AuditEvent,
    parameters: Record<string, any>
  ): Promise<void> {
    if (event.userId) {
      // Implementar bloqueio baseado em compliance
      console.log(`Usuário ${event.userId} bloqueado por violação de compliance`);
    }
  }
  
  // Log de evento de compliance
  private async logComplianceEvent(
    event: AuditEvent,
    rule: ComplianceRule,
    parameters: Record<string, any>
  ): Promise<void> {
    try {
      // Determinar o nível de severidade baseado na regra
      const severity = rule.severity;

      // Log do evento de compliance
      await realtimeSecurityMonitor.recordEvent(
        SecurityEventType.SYSTEM_OVERLOAD, // Usando um tipo válido do SecurityEventType
        severity,
        event.ip,
        event.userAgent,
        'compliance',
        {
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          eventType: event.type,
          resource: event.resource,
          userId: event.userId,
          result: event.result,
          timestamp: event.timestamp
        },
        event.userId
      );
    } catch (error) {
      console.error('Erro ao registrar evento de compliance:', error);
    }
  }
  
  // Notificar equipe de compliance
  private async notifyComplianceTeam(
    event: AuditEvent,
    rule: ComplianceRule,
    parameters: Record<string, any>
  ): Promise<void> {
    // Implementar notificação para equipe de compliance
    console.log(`Notificação de compliance enviada para:`, parameters.recipients);
  }
  
  // Iniciar remediação
  private async initiateRemediation(
    event: AuditEvent,
    rule: ComplianceRule,
    parameters: Record<string, any>
  ): Promise<void> {
    // Implementar processo de remediação automática
    console.log(`Remediação iniciada para regra ${rule.name}`);
  }
  
  // Escalar problema de compliance
  private async escalateComplianceIssue(
    event: AuditEvent,
    rule: ComplianceRule,
    parameters: Record<string, any>
  ): Promise<void> {
    // Implementar escalação para níveis superiores
    console.log(`Problema de compliance escalado para: ${parameters.to}`);
  }
  
  // Verificar thresholds de alerta
  private checkAlertThresholds(event: AuditEvent): void {
    const key = `${event.riskLevel}_${Math.floor(Date.now() / 60000)}`;
    const count = (this.eventCounts.get(key) || 0) + 1;
    this.eventCounts.set(key, count);
    
    // Mapear o nível de risco para o threshold apropriado
    let thresholdKey: keyof typeof this.config.alertThresholds;
    if (event.riskLevel === SecuritySeverity.CRITICAL) {
      thresholdKey = 'criticalEvents';
    } else if (event.riskLevel === SecuritySeverity.HIGH) {
      thresholdKey = 'highRiskEvents';
    } else if (event.type === AuditEventType.USER_LOGIN && event.result === 'failure') {
      thresholdKey = 'failedLogins';
    } else if (event.type === AuditEventType.DATA_ACCESS) {
      thresholdKey = 'dataAccess';
    } else {
      return; // Não há threshold específico para este tipo de evento
    }
    
    const threshold = this.config.alertThresholds[thresholdKey];
    if (threshold && count >= threshold) {
      console.log(`Threshold de alerta excedido: ${thresholdKey} (${count}/${threshold})`);
    }
  }
  
  // Gerar relatório de compliance
  async generateComplianceReport(
    category: ComplianceCategory,
    startDate: Date,
    endDate: Date,
    generatedBy: string
  ): Promise<ComplianceReport> {
    const report: ComplianceReport = {
      id: this.generateReportId(),
      category,
      period: { start: startDate, end: endDate },
      status: ComplianceStatus.UNDER_REVIEW,
      score: 0,
      findings: [],
      recommendations: [],
      generatedAt: new Date(),
      generatedBy
    };
    
    // Analisar eventos do período
    const relevantEvents = await this.getEventsForPeriod(startDate, endDate, category);
    
    // Verificar regras de compliance
    const categoryRules = this.complianceRules.filter(rule => rule.category === category);
    
    for (const rule of categoryRules) {
      const finding = await this.evaluateComplianceRule(rule, relevantEvents);
      if (finding) {
        report.findings.push(finding);
      }
    }
    
    // Calcular score de compliance
    report.score = this.calculateComplianceScore(report.findings);
    
    // Determinar status geral
    report.status = this.determineComplianceStatus(report.score, report.findings);
    
    // Gerar recomendações
    report.recommendations = this.generateRecommendations(report.findings);
    
    // Salvar relatório
    await this.persistComplianceReport(report);
    
    this.complianceReports.push(report);
    
    return report;
  }
  
  // Obter eventos para período específico
  private async getEventsForPeriod(
    startDate: Date,
    endDate: Date,
    category: ComplianceCategory
  ): Promise<AuditEvent[]> {
    try {
      const supabase = createApiSupabaseClient();
      
      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .contains('compliance_categories', [category]);
      
      if (error) throw error;
      
      return data.map(this.mapDatabaseEventToAuditEvent);
    } catch (error) {
      console.error('Erro ao obter eventos para relatório:', error);
      return [];
    }
  }
  
  // Mapear evento do banco para AuditEvent
  private mapDatabaseEventToAuditEvent(dbEvent: any): AuditEvent {
    return {
      id: dbEvent.id,
      type: dbEvent.event_type,
      timestamp: new Date(dbEvent.timestamp),
      userId: dbEvent.user_id,
      userEmail: dbEvent.user_email,
      ip: dbEvent.ip_address,
      userAgent: dbEvent.user_agent,
      resource: dbEvent.resource,
      action: dbEvent.action,
      details: this.config.enableEncryption ? this.decryptData(dbEvent.details) : dbEvent.details,
      result: dbEvent.result,
      riskLevel: dbEvent.risk_level,
      complianceCategories: dbEvent.compliance_categories,
      metadata: dbEvent.metadata
    };
  }
  
  // Avaliar regra de compliance para relatório
  private async evaluateComplianceRule(
    rule: ComplianceRule,
    events: AuditEvent[]
  ): Promise<ComplianceFinding | null> {
    const violatingEvents = events.filter(event => 
      this.evaluateComplianceConditions(rule.conditions, event)
    );
    
    if (violatingEvents.length === 0 && rule.severity !== 'critical') {
      return null; // Regra está sendo cumprida
    }
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: violatingEvents.length === 0 ? ComplianceStatus.COMPLIANT : ComplianceStatus.NON_COMPLIANT,
      description: rule.description,
      evidence: violatingEvents.slice(0, 10), // Limitar evidências
      remediation: this.generateRemediationSteps(rule),
      dueDate: this.calculateRemediationDueDate(rule.severity, new Date())
    };
  }
  
  // Calcular score de compliance
  private calculateComplianceScore(findings: ComplianceFinding[]): number {
    if (findings.length === 0) return 100;
    
    const totalWeight = findings.length;
    const compliantWeight = findings.filter(f => f.status === ComplianceStatus.COMPLIANT).length;
    const partialWeight = findings.filter(f => f.status === ComplianceStatus.PARTIALLY_COMPLIANT).length * 0.5;
    
    return Math.round(((compliantWeight + partialWeight) / totalWeight) * 100);
  }
  
  // Determinar status de compliance
  private determineComplianceStatus(score: number, findings: ComplianceFinding[]): ComplianceStatus {
    // Verificar se há findings críticos
    const criticalFindings = findings.filter(f => f.severity === SecuritySeverity.CRITICAL);
    if (criticalFindings.length > 0) {
      return ComplianceStatus.NON_COMPLIANT;
    }

    // Avaliar por score
    if (score >= 95) {
      return ComplianceStatus.COMPLIANT;
    } else if (score >= 80) {
      return ComplianceStatus.PARTIALLY_COMPLIANT;
    } else {
      return ComplianceStatus.NON_COMPLIANT;
    }
  }
  
  // Gerar recomendações
  private generateRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = [];
    
    const nonCompliantFindings = findings.filter(f => f.status === ComplianceStatus.NON_COMPLIANT);
    
    if (nonCompliantFindings.length > 0) {
      recommendations.push('Implementar correções imediatas para violações identificadas');
      recommendations.push('Revisar e atualizar políticas de segurança');
      recommendations.push('Treinar equipe sobre requisitos de compliance');
    }
    
    const criticalFindings = findings.filter(f => f.severity === SecuritySeverity.CRITICAL);
    if (criticalFindings.length > 0) {
      recommendations.push('Priorizar correção de problemas críticos de compliance');
      recommendations.push('Implementar monitoramento contínuo para problemas críticos');
    }
    
    return recommendations;
  }
  
  // Gerar passos de remediação
  private generateRemediationSteps(rule: ComplianceRule): string {
    const baseSteps = {
      [ComplianceCategory.GDPR]: 'Implementar controles de privacidade e consentimento adequados',
      [ComplianceCategory.LGPD]: 'Adequar processos de tratamento de dados pessoais',
      [ComplianceCategory.SOX]: 'Implementar controles financeiros e de auditoria',
      [ComplianceCategory.PCI_DSS]: 'Fortalecer proteção de dados de cartão',
      [ComplianceCategory.ISO_27001]: 'Implementar controles de segurança da informação',
      [ComplianceCategory.HIPAA]: 'Proteger informações de saúde',
      [ComplianceCategory.NIST]: 'Implementar framework de cibersegurança',
      [ComplianceCategory.OWASP]: 'Corrigir vulnerabilidades de segurança'
    };
    
    return baseSteps[rule.category] || 'Implementar controles adequados de compliance';
  }
  
  // Calcular data limite para remediação
  private calculateRemediationDueDate(severity: SecuritySeverity, detectedAt: Date): Date {
    const dueDate = new Date(detectedAt);
    
    switch (severity) {
      case SecuritySeverity.CRITICAL:
        dueDate.setDate(dueDate.getDate() + 1); // 1 dia
        break;
      case SecuritySeverity.HIGH:
        dueDate.setDate(dueDate.getDate() + 7); // 1 semana
        break;
      case SecuritySeverity.MEDIUM:
        dueDate.setDate(dueDate.getDate() + 30); // 1 mês
        break;
      case SecuritySeverity.LOW:
        dueDate.setDate(dueDate.getDate() + 90); // 3 meses
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 30); // padrão 1 mês
    }
    
    return dueDate;
  }
  
  // Persistir relatório de compliance
  private async persistComplianceReport(report: ComplianceReport): Promise<void> {
    try {
      const supabase = createApiSupabaseClient();
      
      await supabase.from('compliance_reports').insert({
        framework: report.category,
        period_start: report.period.start.toISOString(),
        period_end: report.period.end.toISOString(),
        status: report.status === 'compliant' ? 'completed' : report.status === 'non_compliant' ? 'failed' : 'draft',
        score: report.score,
        findings: JSON.stringify(report.findings),
        recommendations: JSON.stringify(report.recommendations),
        generated_at: report.generatedAt.toISOString(),
        generated_by: report.generatedBy
      });
    } catch (error) {
      console.error('Erro ao salvar relatório de compliance:', error);
    }
  }
  
  // Iniciar verificações periódicas
  private startPeriodicChecks(): void {
    // Verificação diária de compliance
    setInterval(() => {
      this.performDailyComplianceCheck();
    }, 24 * 60 * 60 * 1000);
    
    // Limpeza de dados antigos
    setInterval(() => {
      this.cleanupOldData();
    }, 7 * 24 * 60 * 60 * 1000); // Semanal
  }
  
  // Verificação diária de compliance
  private async performDailyComplianceCheck(): Promise<void> {
    console.log('Executando verificação diária de compliance...');
    
    for (const rule of this.complianceRules.filter(r => r.enabled)) {
      try {
        // Verificar eventos das últimas 24 horas
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const today = new Date();
        
        const events = await this.getEventsForPeriod(yesterday, today, rule.category);
        const finding = await this.evaluateComplianceRule(rule, events);
        
        if (finding && finding.status === ComplianceStatus.NON_COMPLIANT) {
          await this.executeComplianceActions(rule.actions, events[0], rule);
        }
      } catch (error) {
        console.error(`Erro na verificação da regra ${rule.id}:`, error);
      }
    }
  }
  
  // Limpeza de dados antigos
  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.config.retentionPeriodDays * 24 * 60 * 60 * 1000);
    
    try {
      const supabase = createApiSupabaseClient();
      
      // Remover eventos antigos (exceto os críticos para compliance)
      await supabase
        .from('audit_events')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .not('compliance_categories', 'cs', '{"gdpr","lgpd","sox"}'); // Manter eventos GDPR/LGPD/SOX
      
      console.log(`Limpeza de dados concluída. Removidos eventos anteriores a ${cutoffDate}`);
    } catch (error) {
      console.error('Erro na limpeza de dados:', error);
    }
  }
  
  // Utilitários de criptografia e integridade
  private encryptData(data: any): string {
    // Implementar criptografia real aqui
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }
  
  private decryptData(encryptedData: string): any {
    // Implementar descriptografia real aqui
    try {
      return JSON.parse(Buffer.from(encryptedData, 'base64').toString());
    } catch {
      return encryptedData;
    }
  }
  
  private calculateIntegrityHash(event: AuditEvent): string {
    // Implementar hash de integridade real aqui
    const data = JSON.stringify({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      userId: event.userId,
      resource: event.resource,
      action: event.action
    });
    
    return Buffer.from(data).toString('base64');
  }
  
  // Geradores de ID
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Métodos públicos para consulta
  getRecentAuditEvents(limit: number = 100): AuditEvent[] {
    return this.auditEvents.slice(-limit);
  }
  
  getAuditEventsByType(type: AuditEventType, limit: number = 100): AuditEvent[] {
    return this.auditEvents
      .filter(event => event.type === type)
      .slice(-limit);
  }
  
  getComplianceRules(): ComplianceRule[] {
    return [...this.complianceRules];
  }
  
  getComplianceReports(): ComplianceReport[] {
    return [...this.complianceReports];
  }
  
  async getAuditStatistics(): Promise<Record<string, any>> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentEvents = this.auditEvents.filter(event => event.timestamp > oneDayAgo);
    const weeklyEvents = this.auditEvents.filter(event => event.timestamp > oneWeekAgo);
    
    return {
      totalEvents: this.auditEvents.length,
      dailyEvents: recentEvents.length,
      weeklyEvents: weeklyEvents.length,
      eventsByType: this.groupEventsByType(recentEvents),
      eventsByRisk: this.groupEventsByRisk(recentEvents),
      complianceRulesActive: this.complianceRules.filter(r => r.enabled).length,
      complianceScore: await this.calculateOverallComplianceScore()
    };
  }
  
  private groupEventsByType(events: AuditEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private groupEventsByRisk(events: AuditEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private async calculateOverallComplianceScore(): Promise<number> {
    const activeRules = this.complianceRules.filter(r => r.enabled);
    const compliantRules = activeRules.filter(r => r.status === ComplianceStatus.COMPLIANT);
    
    return activeRules.length > 0 ? Math.round((compliantRules.length / activeRules.length) * 100) : 100;
  }
}

// Instância global do sistema de auditoria
export const auditComplianceSystem = new AuditComplianceSystem();

// Funções utilitárias para uso direto
export function recordAuditEvent(
  type: AuditEventType,
  userId: string | undefined,
  userEmail: string | undefined,
  ip: string,
  userAgent: string,
  resource: string,
  action: string,
  details: Record<string, any> = {},
  result: 'success' | 'failure' | 'partial' = 'success',
  riskLevel: SecuritySeverity = SecuritySeverity.LOW
): Promise<AuditEvent> {
  return auditComplianceSystem.recordAuditEvent(
    type, userId, userEmail, ip, userAgent, resource, action, details, result, riskLevel
  );
}

export function generateComplianceReport(
  category: ComplianceCategory,
  startDate: Date,
  endDate: Date,
  generatedBy: string
): Promise<ComplianceReport> {
  return auditComplianceSystem.generateComplianceReport(category, startDate, endDate, generatedBy);
}

export function getAuditStatistics(): Promise<Record<string, any>> {
  return auditComplianceSystem.getAuditStatistics();
}

export default auditComplianceSystem;