// 🔒 Sistema de Auditoria e Compliance
// Garante conformidade com regulamentações de segurança (LGPD, GDPR, SOX, etc.)

import { createClient } from '@/lib/supabase/server';
// import { logSecurityEvent } from './security-config';
import { SecuritySeverity } from './security';
import { threatDetection } from './threat-detection';
import type { Database } from '@/lib/database.types';

// Tipos de regulamentações suportadas
export type ComplianceFramework = 
  | 'LGPD'     // Lei Geral de Proteção de Dados (Brasil)
  | 'GDPR'     // General Data Protection Regulation (EU)
  | 'SOX'      // Sarbanes-Oxley Act
  | 'HIPAA'    // Health Insurance Portability and Accountability Act
  | 'PCI_DSS'  // Payment Card Industry Data Security Standard
  | 'ISO27001' // ISO/IEC 27001
  | 'NIST'     // NIST Cybersecurity Framework
  | 'CIS'      // Center for Internet Security
  | 'OWASP';   // Open Web Application Security Project

// Tipos de eventos de auditoria
export type AuditEventType = 
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'DATA_DELETION'
  | 'DATA_EXPORT'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PERMISSION_CHANGE'
  | 'SYSTEM_CONFIGURATION'
  | 'SECURITY_INCIDENT'
  | 'COMPLIANCE_VIOLATION'
  | 'DATA_BREACH'
  | 'BACKUP_OPERATION'
  | 'RESTORE_OPERATION'
  | 'ADMIN_ACTION'
  | 'API_ACCESS';

// Interface para eventos de auditoria
interface AuditEvent {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  resource: string;
  action: string;
  details: any;
  compliance: ComplianceFramework[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  retention: number; // dias para retenção
  encrypted: boolean;
  hash: string; // hash para integridade
}

// Interface para relatórios de compliance
interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  period: {
    start: Date;
    end: Date;
  };
  status: 'compliant' | 'non_compliant' | 'partial' | 'unknown';
  score: number; // 0-100
  findings: ComplianceFinding[];
  recommendations: string[];
  generatedAt: Date;
  generatedBy: string;
}

// Interface para achados de compliance
interface ComplianceFinding {
  id: string;
  type: 'violation' | 'risk' | 'gap' | 'improvement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  control: string;
  description: string;
  evidence: any[];
  remediation: string;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
}

// Configurações de compliance por framework
const COMPLIANCE_CONFIGS: Record<ComplianceFramework, {
  name: string;
  description: string;
  retention: number; // dias
  controls: string[];
  criticalEvents: AuditEventType[];
  dataClassification: string[];
  reportingFrequency: number; // dias
}> = {
  LGPD: {
    name: 'Lei Geral de Proteção de Dados',
    description: 'Regulamentação brasileira de proteção de dados pessoais',
    retention: 2555, // 7 anos
    controls: [
      'data_minimization',
      'consent_management',
      'data_subject_rights',
      'breach_notification',
      'privacy_by_design',
      'data_protection_officer'
    ],
    criticalEvents: [
      'DATA_ACCESS',
      'DATA_MODIFICATION',
      'DATA_DELETION',
      'DATA_EXPORT',
      'DATA_BREACH'
    ],
    dataClassification: ['confidential', 'restricted'],
    reportingFrequency: 30
  },
  GDPR: {
    name: 'General Data Protection Regulation',
    description: 'Regulamentação europeia de proteção de dados',
    retention: 2555, // 7 anos
    controls: [
      'lawful_basis',
      'data_minimization',
      'consent_management',
      'data_subject_rights',
      'breach_notification',
      'privacy_by_design',
      'data_protection_impact_assessment'
    ],
    criticalEvents: [
      'DATA_ACCESS',
      'DATA_MODIFICATION',
      'DATA_DELETION',
      'DATA_EXPORT',
      'DATA_BREACH'
    ],
    dataClassification: ['confidential', 'restricted'],
    reportingFrequency: 30
  },
  SOX: {
    name: 'Sarbanes-Oxley Act',
    description: 'Regulamentação de controles financeiros e auditoria',
    retention: 2555, // 7 anos
    controls: [
      'financial_reporting',
      'internal_controls',
      'audit_trail',
      'segregation_of_duties',
      'change_management',
      'access_controls'
    ],
    criticalEvents: [
      'DATA_MODIFICATION',
      'PERMISSION_CHANGE',
      'SYSTEM_CONFIGURATION',
      'ADMIN_ACTION'
    ],
    dataClassification: ['confidential', 'restricted'],
    reportingFrequency: 90
  },
  ISO27001: {
    name: 'ISO/IEC 27001',
    description: 'Padrão internacional de gestão de segurança da informação',
    retention: 1095, // 3 anos
    controls: [
      'information_security_policy',
      'risk_management',
      'asset_management',
      'access_control',
      'incident_management',
      'business_continuity'
    ],
    criticalEvents: [
      'SECURITY_INCIDENT',
      'DATA_BREACH',
      'SYSTEM_CONFIGURATION',
      'PERMISSION_CHANGE'
    ],
    dataClassification: ['internal', 'confidential', 'restricted'],
    reportingFrequency: 90
  },
  NIST: {
    name: 'NIST Cybersecurity Framework',
    description: 'Framework de cibersegurança do NIST',
    retention: 1095, // 3 anos
    controls: [
      'identify',
      'protect',
      'detect',
      'respond',
      'recover'
    ],
    criticalEvents: [
      'SECURITY_INCIDENT',
      'DATA_BREACH',
      'SYSTEM_CONFIGURATION'
    ],
    dataClassification: ['internal', 'confidential', 'restricted'],
    reportingFrequency: 90
  },
  PCI_DSS: {
    name: 'Payment Card Industry Data Security Standard',
    description: 'Padrão de segurança para dados de cartão de pagamento',
    retention: 1095, // 3 anos
    controls: [
      'network_security',
      'data_protection',
      'vulnerability_management',
      'access_control',
      'monitoring',
      'security_policy'
    ],
    criticalEvents: [
      'DATA_ACCESS',
      'DATA_MODIFICATION',
      'SECURITY_INCIDENT',
      'API_ACCESS'
    ],
    dataClassification: ['restricted'],
    reportingFrequency: 90
  },
  HIPAA: {
    name: 'Health Insurance Portability and Accountability Act',
    description: 'Regulamentação de proteção de dados de saúde',
    retention: 2190, // 6 anos
    controls: [
      'administrative_safeguards',
      'physical_safeguards',
      'technical_safeguards',
      'breach_notification'
    ],
    criticalEvents: [
      'DATA_ACCESS',
      'DATA_MODIFICATION',
      'DATA_EXPORT',
      'DATA_BREACH'
    ],
    dataClassification: ['restricted'],
    reportingFrequency: 30
  },
  CIS: {
    name: 'Center for Internet Security',
    description: 'Controles de segurança cibernética do CIS',
    retention: 1095, // 3 anos
    controls: [
      'inventory_control',
      'software_control',
      'configuration_management',
      'vulnerability_assessment',
      'access_control',
      'incident_response'
    ],
    criticalEvents: [
      'SYSTEM_CONFIGURATION',
      'SECURITY_INCIDENT',
      'PERMISSION_CHANGE'
    ],
    dataClassification: ['internal', 'confidential', 'restricted'],
    reportingFrequency: 90
  },
  OWASP: {
    name: 'Open Web Application Security Project',
    description: 'Práticas de segurança para aplicações web',
    retention: 365, // 1 ano
    controls: [
      'injection_prevention',
      'authentication',
      'sensitive_data_exposure',
      'xml_external_entities',
      'broken_access_control',
      'security_misconfiguration'
    ],
    criticalEvents: [
      'SECURITY_INCIDENT',
      'API_ACCESS',
      'DATA_BREACH'
    ],
    dataClassification: ['public', 'internal', 'confidential'],
    reportingFrequency: 30
  }
};

// Armazenamento de eventos de auditoria
const auditEvents = new Map<string, AuditEvent>();
const complianceReports = new Map<string, ComplianceReport>();

// Classe principal de auditoria e compliance
export class AuditComplianceSystem {
  private static instance: AuditComplianceSystem;
  private enabledFrameworks: Set<ComplianceFramework> = new Set();
  private isEnabled = true;
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-key';
    
    // Configurar frameworks padrão
    this.enabledFrameworks.add('LGPD');
    this.enabledFrameworks.add('ISO27001');
    this.enabledFrameworks.add('OWASP');
    
    // Configurar limpeza automática
    setInterval(() => this.cleanupExpiredEvents(), 24 * 60 * 60 * 1000); // Diário
    
    // Configurar geração automática de relatórios
    setInterval(() => this.generateScheduledReports(), 24 * 60 * 60 * 1000); // Diário
  }

  public static getInstance(): AuditComplianceSystem {
    if (!AuditComplianceSystem.instance) {
      AuditComplianceSystem.instance = new AuditComplianceSystem();
    }
    return AuditComplianceSystem.instance;
  }

  // Registrar evento de auditoria
  public async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'compliance' | 'encrypted' | 'hash'>): Promise<string> {
    if (!this.isEnabled) return '';

    try {
      const eventId = this.generateEventId();
      const timestamp = new Date();
      
      // Determinar frameworks aplicáveis
      const applicableFrameworks = this.determineApplicableFrameworks(event);
      
      // Criar evento completo
      const auditEvent: AuditEvent = {
        ...event,
        id: eventId,
        timestamp,
        compliance: applicableFrameworks,
        encrypted: this.shouldEncrypt(event.dataClassification),
        hash: ''
      };
      
      // Gerar hash para integridade
      auditEvent.hash = await this.generateEventHash(auditEvent);
      
      // Criptografar se necessário
      if (auditEvent.encrypted) {
        auditEvent.details = await this.encryptData(auditEvent.details);
      }
      
      // Armazenar evento
      auditEvents.set(eventId, auditEvent);
      
      // Persistir no banco de dados
      await this.persistAuditEvent(auditEvent);
      
      // Verificar compliance em tempo real
      await this.checkRealTimeCompliance(auditEvent);
      
      return eventId;
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
      throw error;
    }
  }

  // Determinar frameworks aplicáveis
  private determineApplicableFrameworks(event: Partial<AuditEvent>): ComplianceFramework[] {
    const applicable: ComplianceFramework[] = [];
    
    for (const framework of this.enabledFrameworks) {
      const config = COMPLIANCE_CONFIGS[framework];
      
      // Verificar se o tipo de evento é crítico para o framework
      if (event.type && config.criticalEvents.includes(event.type)) {
        applicable.push(framework);
        continue;
      }
      
      // Verificar classificação de dados
      if (event.dataClassification && config.dataClassification.includes(event.dataClassification)) {
        applicable.push(framework);
        continue;
      }
    }
    
    return applicable;
  }

  // Verificar compliance em tempo real
  private async checkRealTimeCompliance(event: AuditEvent): Promise<void> {
    for (const framework of event.compliance) {
      const violations = await this.checkFrameworkCompliance(event, framework);
      
      if (violations.length > 0) {
        await this.handleComplianceViolation(framework, violations, event);
      }
    }
  }

  // Verificar compliance de framework específico
  private async checkFrameworkCompliance(
    event: AuditEvent, 
    framework: ComplianceFramework
  ): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    const config = COMPLIANCE_CONFIGS[framework];
    
    // Verificações específicas por framework
    switch (framework) {
      case 'LGPD':
      case 'GDPR':
        findings.push(...await this.checkDataProtectionCompliance(event));
        break;
        
      case 'SOX':
        findings.push(...await this.checkFinancialCompliance(event));
        break;
        
      case 'ISO27001':
        findings.push(...await this.checkInformationSecurityCompliance(event));
        break;
        
      case 'PCI_DSS':
        findings.push(...await this.checkPaymentCardCompliance(event));
        break;
        
      case 'HIPAA':
        findings.push(...await this.checkHealthcareCompliance(event));
        break;
        
      case 'NIST':
      case 'CIS':
      case 'OWASP':
        findings.push(...await this.checkCybersecurityCompliance(event));
        break;
    }
    
    return findings;
  }

  // Verificações específicas de proteção de dados (LGPD/GDPR)
  private async checkDataProtectionCompliance(event: AuditEvent): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Verificar acesso a dados pessoais sem consentimento
    if (event.type === 'DATA_ACCESS' && event.dataClassification === 'restricted') {
      if (!event.details?.consent && !event.details?.legalBasis) {
        findings.push({
          id: this.generateFindingId(),
          type: 'violation',
          severity: 'high',
          control: 'consent_management',
          description: 'Acesso a dados pessoais sem base legal ou consentimento',
          evidence: [event],
          remediation: 'Verificar base legal para processamento de dados',
          status: 'open'
        });
      }
    }
    
    // Verificar retenção de dados
    if (event.type === 'DATA_DELETION') {
      const retentionPeriod = event.details?.retentionPeriod;
      if (!retentionPeriod || retentionPeriod > 2555) { // Mais de 7 anos
        findings.push({
          id: this.generateFindingId(),
          type: 'risk',
          severity: 'medium',
          control: 'data_minimization',
          description: 'Período de retenção pode exceder o necessário',
          evidence: [event],
          remediation: 'Revisar política de retenção de dados',
          status: 'open'
        });
      }
    }
    
    return findings;
  }

  // Verificações de compliance financeiro (SOX)
  private async checkFinancialCompliance(event: AuditEvent): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Verificar segregação de funções
    if (event.type === 'PERMISSION_CHANGE' && event.details?.financialAccess) {
      if (event.userId === event.details?.approver) {
        findings.push({
          id: this.generateFindingId(),
          type: 'violation',
          severity: 'critical',
          control: 'segregation_of_duties',
          description: 'Usuário aprovou suas próprias mudanças de permissão financeira',
          evidence: [event],
          remediation: 'Implementar aprovação por terceiros para mudanças financeiras',
          status: 'open'
        });
      }
    }
    
    return findings;
  }

  // Verificações de segurança da informação (ISO27001)
  private async checkInformationSecurityCompliance(event: AuditEvent): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Verificar incidentes de segurança não reportados
    if (event.type === 'SECURITY_INCIDENT' && event.severity === 'critical') {
      const reportTime = event.details?.reportedAt;
      if (!reportTime || (new Date().getTime() - new Date(reportTime).getTime()) > 24 * 60 * 60 * 1000) {
        findings.push({
          id: this.generateFindingId(),
          type: 'violation',
          severity: 'high',
          control: 'incident_management',
          description: 'Incidente crítico não reportado dentro de 24 horas',
          evidence: [event],
          remediation: 'Reportar incidente imediatamente',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'open'
        });
      }
    }
    
    return findings;
  }

  // Verificações de compliance de cartão de pagamento (PCI DSS)
  private async checkPaymentCardCompliance(event: AuditEvent): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Verificar acesso a dados de cartão
    if (event.type === 'DATA_ACCESS' && event.details?.cardData) {
      if (!event.details?.masked) {
        findings.push({
          id: this.generateFindingId(),
          type: 'violation',
          severity: 'critical',
          control: 'data_protection',
          description: 'Acesso a dados de cartão não mascarados',
          evidence: [event],
          remediation: 'Implementar mascaramento de dados de cartão',
          status: 'open'
        });
      }
    }
    
    return findings;
  }

  // Verificações de compliance de saúde (HIPAA)
  private async checkHealthcareCompliance(event: AuditEvent): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Verificar acesso a PHI (Protected Health Information)
    if (event.type === 'DATA_ACCESS' && event.details?.phi) {
      if (!event.details?.minimumNecessary) {
        findings.push({
          id: this.generateFindingId(),
          type: 'violation',
          severity: 'high',
          control: 'administrative_safeguards',
          description: 'Acesso a PHI pode violar princípio do mínimo necessário',
          evidence: [event],
          remediation: 'Verificar se acesso segue princípio do mínimo necessário',
          status: 'open'
        });
      }
    }
    
    return findings;
  }

  // Verificações de cibersegurança (NIST/CIS/OWASP)
  private async checkCybersecurityCompliance(event: AuditEvent): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Verificar configurações inseguras
    if (event.type === 'SYSTEM_CONFIGURATION') {
      if (event.details?.securityLevel === 'low') {
        findings.push({
          id: this.generateFindingId(),
          type: 'risk',
          severity: 'medium',
          control: 'configuration_management',
          description: 'Configuração do sistema com nível de segurança baixo',
          evidence: [event],
          remediation: 'Revisar e fortalecer configurações de segurança',
          status: 'open'
        });
      }
    }
    
    return findings;
  }

  // Lidar com violação de compliance
  private async handleComplianceViolation(
    framework: ComplianceFramework,
    violations: ComplianceFinding[],
    event: AuditEvent
  ): Promise<void> {
    try {
      // Log das violações
      for (const violation of violations) {
        // await logSecurityEvent({
        //   action: 'COMPLIANCE_VIOLATION',
        //   details: `Violação ${violation.severity}: ${violation.control}`,
        //   severity: SecuritySeverity.HIGH,
        //   metadata: {
        //     violationType: violation.type,
        //     resource: event.resource,
        //     details: violation.description
        //   }
        // });

        // Notificar stakeholders críticos
        if (violation.severity === 'critical') {
          await this.notifyCriticalViolation(framework, violation, event);
        }
      }
      
    } catch (error) {
      console.error('Erro ao lidar com violação de compliance:', error);
    }
  }

  // Notificar violação crítica
  private async notifyCriticalViolation(
    framework: ComplianceFramework,
    violation: ComplianceFinding,
    event: AuditEvent
  ): Promise<void> {
    // Implementar notificação (email, Slack, etc.)
    console.warn(`🚨 VIOLAÇÃO CRÍTICA DE COMPLIANCE: ${framework}`);
    console.warn(`Controle: ${violation.control}`);
    console.warn(`Descrição: ${violation.description}`);
    console.warn(`Evento: ${event.id}`);
  }

  // Gerar relatório de compliance
  public async generateComplianceReport(
    framework: ComplianceFramework,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    try {
      const reportId = this.generateReportId();
      const config = COMPLIANCE_CONFIGS[framework];
      
      // Coletar eventos relevantes
      const relevantEvents = Array.from(auditEvents.values())
        .filter(event => 
          event.timestamp >= startDate &&
          event.timestamp <= endDate &&
          event.compliance.includes(framework)
        );
      
      // Analisar compliance
      const findings: ComplianceFinding[] = [];
      for (const event of relevantEvents) {
        const eventFindings = await this.checkFrameworkCompliance(event, framework);
        findings.push(...eventFindings);
      }
      
      // Calcular score de compliance
      const score = this.calculateComplianceScore(findings, relevantEvents.length);
      
      // Determinar status
      const status = this.determineComplianceStatus(score, findings);
      
      // Gerar recomendações
      const recommendations = this.generateRecommendations(framework, findings);
      
      const report: ComplianceReport = {
        id: reportId,
        framework,
        period: { start: startDate, end: endDate },
        status,
        score,
        findings,
        recommendations,
        generatedAt: new Date(),
        generatedBy: 'audit-system'
      };
      
      // Armazenar relatório
      complianceReports.set(reportId, report);
      
      // Persistir no banco
      await this.persistComplianceReport(report);
      
      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório de compliance:', error);
      throw error;
    }
  }

  // Calcular score de compliance
  private calculateComplianceScore(findings: ComplianceFinding[], totalEvents: number): number {
    if (totalEvents === 0) return 100;
    
    const weights = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5
    };
    
    const totalDeductions = findings.reduce((sum, finding) => {
      return sum + weights[finding.severity];
    }, 0);
    
    const maxPossibleDeductions = totalEvents * weights.critical;
    const score = Math.max(0, 100 - (totalDeductions / maxPossibleDeductions) * 100);
    
    return Math.round(score);
  }

  // Determinar status de compliance
  private determineComplianceStatus(
    score: number, 
    findings: ComplianceFinding[]
  ): 'compliant' | 'non_compliant' | 'partial' | 'unknown' {
    const criticalFindings = findings.filter(f => f.severity === 'critical').length;
    
    if (criticalFindings > 0) return 'non_compliant';
    if (score >= 90) return 'compliant';
    if (score >= 70) return 'partial';
    return 'non_compliant';
  }

  // Gerar recomendações
  private generateRecommendations(
    framework: ComplianceFramework,
    findings: ComplianceFinding[]
  ): string[] {
    const recommendations: string[] = [];
    const config = COMPLIANCE_CONFIGS[framework];
    
    // Recomendações baseadas em achados
    const controlCounts = findings.reduce((acc, finding) => {
      acc[finding.control] = (acc[finding.control] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    for (const [control, count] of Object.entries(controlCounts)) {
      if (count > 1) {
        recommendations.push(`Revisar e fortalecer controle: ${control} (${count} achados)`);
      }
    }
    
    // Recomendações gerais por framework
    if (framework === 'LGPD' || framework === 'GDPR') {
      recommendations.push('Implementar Privacy by Design em novos desenvolvimentos');
      recommendations.push('Realizar treinamento de proteção de dados para equipe');
    }
    
    if (framework === 'ISO27001') {
      recommendations.push('Realizar análise de risco de segurança da informação');
      recommendations.push('Atualizar política de segurança da informação');
    }
    
    return recommendations;
  }

  // Funções auxiliares
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFindingId(): string {
    return `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldEncrypt(classification: string): boolean {
    return ['confidential', 'restricted'].includes(classification);
  }

  private async generateEventHash(event: AuditEvent): Promise<string> {
    // Implementar hash criptográfico para integridade
    const data = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      userId: event.userId,
      action: event.action,
      resource: event.resource
    });
    
    // Usar crypto para hash real em produção
    return Buffer.from(data).toString('base64');
  }

  private async encryptData(data: any): Promise<string> {
    // Implementar criptografia real em produção
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private async decryptData(encryptedData: string): Promise<any> {
    // Implementar descriptografia real em produção
    return JSON.parse(Buffer.from(encryptedData, 'base64').toString());
  }

  private async persistAuditEvent(event: AuditEvent): Promise<void> {
    // Implementar persistência no banco de dados
    try {
      const supabase = await createClient();
      
      await supabase.from('audit_events').insert({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        user_id: event.userId,
        session_id: event.sessionId,
        ip: event.ip,
        user_agent: event.userAgent,
        resource: event.resource,
        action: event.action,
        details: event.details,
        compliance: event.compliance,
        severity: event.severity,
        data_classification: event.dataClassification,
        retention: event.retention,
        encrypted: event.encrypted,
        hash: event.hash
      });
    } catch (error) {
      console.error('Erro ao persistir evento de auditoria:', error);
    }
  }

  private async persistComplianceReport(report: ComplianceReport): Promise<void> {
    // Implementar persistência do relatório
    try {
      const supabase = await createClient();
      
      const insertData: Database['public']['Tables']['compliance_reports']['Insert'] = {
        id: report.id,
        framework: report.framework,
        period_start: report.period.start.toISOString(),
        period_end: report.period.end.toISOString(),
        // Mapear status para valores aceitos pela tabela
        status:
          report.status === 'compliant'
            ? 'completed'
            : report.status === 'non_compliant'
            ? 'failed'
            : report.status === 'partial'
            ? 'in_progress'
            : 'draft',
        score: report.score,
        findings: (report.findings || []).map((f) => ({
          ...f,
          dueDate: f.dueDate ? f.dueDate.toISOString() : undefined,
        })) as unknown as Database['public']['Tables']['compliance_reports']['Row']['findings'],
        recommendations: report.recommendations as unknown as Database['public']['Tables']['compliance_reports']['Row']['recommendations'],
        generated_at: report.generatedAt.toISOString(),
        generated_by: report.generatedBy,
      };

      await supabase.from('compliance_reports').insert(insertData);
    } catch (error) {
      console.error('Erro ao persistir relatório de compliance:', error);
    }
  }

  private cleanupExpiredEvents(): void {
    const now = new Date();
    
    for (const [id, event] of auditEvents.entries()) {
      const expiryDate = new Date(event.timestamp.getTime() + event.retention * 24 * 60 * 60 * 1000);
      
      if (now > expiryDate) {
        auditEvents.delete(id);
      }
    }
  }

  private async generateScheduledReports(): Promise<void> {
    const now = new Date();
    
    for (const framework of this.enabledFrameworks) {
      const config = COMPLIANCE_CONFIGS[framework];
      const lastReport = Array.from(complianceReports.values())
        .filter(r => r.framework === framework)
        .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];
      
      if (!lastReport || 
          (now.getTime() - lastReport.generatedAt.getTime()) > config.reportingFrequency * 24 * 60 * 60 * 1000) {
        
        const startDate = new Date(now.getTime() - config.reportingFrequency * 24 * 60 * 60 * 1000);
        await this.generateComplianceReport(framework, startDate, now);
      }
    }
  }

  // Métodos públicos
  public enableFramework(framework: ComplianceFramework): void {
    this.enabledFrameworks.add(framework);
    // logSecurityEvent({
    //   action: 'COMPLIANCE_FRAMEWORK_ENABLED',
    //   details: `Framework de compliance habilitado: ${framework}`,
    //   severity: SecuritySeverity.LOW
    // });
  }

  public disableFramework(framework: ComplianceFramework): void {
    this.enabledFrameworks.delete(framework);
    // logSecurityEvent({
    //   action: 'COMPLIANCE_FRAMEWORK_DISABLED',
    //   details: `Framework de compliance desabilitado: ${framework}`,
    //   severity: SecuritySeverity.MEDIUM
    // });
  }

  public getEnabledFrameworks(): ComplianceFramework[] {
    return Array.from(this.enabledFrameworks);
  }

  public getAuditEvents(
    startDate?: Date,
    endDate?: Date,
    framework?: ComplianceFramework
  ): AuditEvent[] {
    let events = Array.from(auditEvents.values());
    
    if (startDate) {
      events = events.filter(e => e.timestamp >= startDate);
    }
    
    if (endDate) {
      events = events.filter(e => e.timestamp <= endDate);
    }
    
    if (framework) {
      events = events.filter(e => e.compliance.includes(framework));
    }
    
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getComplianceReports(framework?: ComplianceFramework): ComplianceReport[] {
    let reports = Array.from(complianceReports.values());
    
    if (framework) {
      reports = reports.filter(r => r.framework === framework);
    }
    
    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  public async exportAuditData(
    format: 'json' | 'csv' | 'xml',
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    const events = this.getAuditEvents(startDate, endDate);
    
    switch (format) {
      case 'json':
        return JSON.stringify(events, null, 2);
        
      case 'csv':
        // Implementar exportação CSV
        const headers = ['id', 'timestamp', 'type', 'userId', 'action', 'resource', 'severity'];
        const csvData = events.map(e => [
          e.id,
          e.timestamp.toISOString(),
          e.type,
          e.userId || '',
          e.action,
          e.resource,
          e.severity
        ]);
        
        return [headers, ...csvData].map(row => row.join(',')).join('\n');
        
      case 'xml':
        // Implementar exportação XML
        const xmlEvents = events.map(e => `
    <event>
      <id>${e.id}</id>
      <timestamp>${e.timestamp.toISOString()}</timestamp>
      <type>${e.type}</type>
      <action>${e.action}</action>
      <resource>${e.resource}</resource>
      <severity>${e.severity}</severity>
    </event>`).join('');
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<auditEvents>${xmlEvents}
</auditEvents>`;
        
      default:
        throw new Error(`Formato não suportado: ${format}`);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    // logSecurityEvent({
    //   action: 'AUDIT_SYSTEM_TOGGLED',
    //   details: `Sistema de auditoria ${enabled ? 'habilitado' : 'desabilitado'}`,
    //   severity: SecuritySeverity.MEDIUM
    // });
  }
}

// Instância singleton
export const auditCompliance = AuditComplianceSystem.getInstance();

// Funções de conveniência para registro de eventos
export const AuditLogger = {
  // Registrar acesso a dados
  dataAccess: (userId: string, resource: string, ip: string, userAgent: string, details?: any) => {
    return auditCompliance.recordAuditEvent({
      type: 'DATA_ACCESS',
      userId,
      ip,
      userAgent,
      resource,
      action: 'access',
      details,
      severity: 'medium',
      dataClassification: 'confidential',
      retention: 2555 // 7 anos
    });
  },
  
  // Registrar modificação de dados
  dataModification: (userId: string, resource: string, ip: string, userAgent: string, details?: any) => {
    return auditCompliance.recordAuditEvent({
      type: 'DATA_MODIFICATION',
      userId,
      ip,
      userAgent,
      resource,
      action: 'modify',
      details,
      severity: 'high',
      dataClassification: 'confidential',
      retention: 2555
    });
  },
  
  // Registrar login de usuário
  userLogin: (userId: string, ip: string, userAgent: string, sessionId: string, details?: any) => {
    return auditCompliance.recordAuditEvent({
      type: 'USER_LOGIN',
      userId,
      sessionId,
      ip,
      userAgent,
      resource: 'authentication',
      action: 'login',
      details,
      severity: 'low',
      dataClassification: 'internal',
      retention: 365
    });
  },
  
  // Registrar incidente de segurança
  securityIncident: (resource: string, ip: string, userAgent: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'high') => {
    return auditCompliance.recordAuditEvent({
      type: 'SECURITY_INCIDENT',
      ip,
      userAgent,
      resource,
      action: 'incident',
      details,
      severity,
      dataClassification: 'restricted',
      retention: 2555
    });
  },
  
  // Registrar mudança de permissão
  permissionChange: (userId: string, resource: string, ip: string, userAgent: string, details: any) => {
    return auditCompliance.recordAuditEvent({
      type: 'PERMISSION_CHANGE',
      userId,
      ip,
      userAgent,
      resource,
      action: 'permission_change',
      details,
      severity: 'high',
      dataClassification: 'restricted',
      retention: 2555
    });
  }
};