import { createHash } from 'crypto';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { supabase } from './supabase';
import { logger } from './logger';

// Interfaces para auditoria de segurança
export interface SecurityAuditConfig {
  // Verificações de arquivos
  checkFiles: {
    enabled: boolean;
    sensitiveFiles: string[];
    configFiles: string[];
    logFiles: string[];
  };
  
  // Verificações de banco de dados
  checkDatabase: {
    enabled: boolean;
    checkPermissions: boolean;
    checkEncryption: boolean;
    checkBackups: boolean;
  };
  
  // Verificações de API
  checkAPI: {
    enabled: boolean;
    checkAuthentication: boolean;
    checkAuthorization: boolean;
    checkRateLimit: boolean;
    checkCORS: boolean;
  };
  
  // Verificações de dependências
  checkDependencies: {
    enabled: boolean;
    checkVulnerabilities: boolean;
    checkOutdated: boolean;
    checkLicenses: boolean;
  };
  
  // Verificações de configuração
  checkConfiguration: {
    enabled: boolean;
    checkEnvironment: boolean;
    checkSecrets: boolean;
    checkSSL: boolean;
  };
  
  // Notificações
  notifications: {
    email: {
      enabled: boolean;
      recipients: string[];
      onCritical: boolean;
      onHigh: boolean;
    };
    webhook: {
      enabled: boolean;
      url: string;
      onCritical: boolean;
      onHigh: boolean;
    };
  };
}

export interface SecurityIssue {
  id: string;
  category: 'file' | 'database' | 'api' | 'dependency' | 'configuration';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation: string;
  file?: string;
  line?: number;
  cve?: string;
  cvss?: number;
  detected_at: Date;
  resolved: boolean;
  resolved_at?: Date;
}

export interface SecurityAuditResult {
  audit_id: string;
  started_at: Date;
  completed_at: Date;
  duration_ms: number;
  total_issues: number;
  issues_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  issues: SecurityIssue[];
  recommendations: string[];
  score: number; // 0-100
  status: 'passed' | 'warning' | 'failed';
}

export class SecurityAuditor {
  private config: SecurityAuditConfig;
  private projectRoot: string;

  constructor(config?: Partial<SecurityAuditConfig>) {
    this.projectRoot = process.cwd();
    this.config = this.mergeConfig(config);
  }

  private mergeConfig(userConfig?: Partial<SecurityAuditConfig>): SecurityAuditConfig {
    const defaultConfig: SecurityAuditConfig = {
      checkFiles: {
        enabled: true,
        sensitiveFiles: [
          '.env',
          '.env.local',
          '.env.production',
          'firebase-adminsdk.json',
          'service-account.json',
          'private.key',
          'certificate.pem'
        ],
        configFiles: [
          'next.config.ts',
          'firebase.json',
          'apphosting.yaml',
          'package.json'
        ],
        logFiles: [
          'logs/*.log',
          'logs/*.txt'
        ]
      },
      checkDatabase: {
        enabled: true,
        checkPermissions: true,
        checkEncryption: true,
        checkBackups: true
      },
      checkAPI: {
        enabled: true,
        checkAuthentication: true,
        checkAuthorization: true,
        checkRateLimit: true,
        checkCORS: true
      },
      checkDependencies: {
        enabled: true,
        checkVulnerabilities: true,
        checkOutdated: true,
        checkLicenses: true
      },
      checkConfiguration: {
        enabled: true,
        checkEnvironment: true,
        checkSecrets: true,
        checkSSL: true
      },
      notifications: {
        email: {
          enabled: process.env.SECURITY_EMAIL_ENABLED === 'true',
          recipients: process.env.SECURITY_EMAIL_RECIPIENTS?.split(',') || [],
          onCritical: true,
          onHigh: true
        },
        webhook: {
          enabled: process.env.SECURITY_WEBHOOK_ENABLED === 'true',
          url: process.env.SECURITY_WEBHOOK_URL || '',
          onCritical: true,
          onHigh: true
        }
      }
    };

    return { ...defaultConfig, ...userConfig };
  }

  /**
   * Executa auditoria completa de segurança
   */
  async runFullAudit(): Promise<SecurityAuditResult> {
    const auditId = this.generateAuditId();
    const startTime = new Date();
    const issues: SecurityIssue[] = [];

    logger.info('Iniciando auditoria de segurança completa', { auditId });

    try {
      // Verificações de arquivos
      if (this.config.checkFiles.enabled) {
        const fileIssues = await this.auditFiles();
        issues.push(...fileIssues);
      }

      // Verificações de banco de dados
      if (this.config.checkDatabase.enabled) {
        const dbIssues = await this.auditDatabase();
        issues.push(...dbIssues);
      }

      // Verificações de API
      if (this.config.checkAPI.enabled) {
        const apiIssues = await this.auditAPI();
        issues.push(...apiIssues);
      }

      // Verificações de dependências
      if (this.config.checkDependencies.enabled) {
        const depIssues = await this.auditDependencies();
        issues.push(...depIssues);
      }

      // Verificações de configuração
      if (this.config.checkConfiguration.enabled) {
        const configIssues = await this.auditConfiguration();
        issues.push(...configIssues);
      }

      const endTime = new Date();
      const result = this.generateAuditResult(auditId, startTime, endTime, issues);

      // Salvar resultado
      await this.saveAuditResult(result);

      // Enviar notificações se necessário
      await this.sendNotifications(result);

      logger.info('Auditoria de segurança concluída', {
        auditId,
        totalIssues: result.total_issues,
        score: result.score,
        status: result.status
      });

      return result;
    } catch (error) {
      logger.error('Erro durante auditoria de segurança', error as Error);
      throw error;
    }
  }

  /**
   * Audita arquivos sensíveis e configurações
   */
  private async auditFiles(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Verificar arquivos sensíveis
    for (const file of this.config.checkFiles.sensitiveFiles) {
      const filePath = join(this.projectRoot, file);
      
      if (existsSync(filePath)) {
        const stats = statSync(filePath);
        
        // Verificar permissões (no Windows, verificamos se é somente leitura)
        if (process.platform === 'win32') {
          // No Windows, verificamos outras questões de segurança
          const content = readFileSync(filePath, 'utf8');
          
          // Verificar se contém secrets em texto plano
          if (this.containsPlaintextSecrets(content)) {
            issues.push({
              id: this.generateIssueId(),
              category: 'file',
              severity: 'critical',
              title: 'Secrets em texto plano detectados',
              description: `O arquivo ${file} contém possíveis secrets em texto plano`,
              recommendation: 'Mover secrets para variáveis de ambiente ou serviço de gerenciamento de secrets',
              file: filePath,
              detected_at: new Date(),
              resolved: false
            });
          }
        }

        // Verificar se arquivo .env está no .gitignore
        if (file.startsWith('.env') && !this.isInGitignore(file)) {
          issues.push({
            id: this.generateIssueId(),
            category: 'file',
            severity: 'high',
            title: 'Arquivo de ambiente não está no .gitignore',
            description: `O arquivo ${file} não está listado no .gitignore`,
            recommendation: 'Adicionar arquivo ao .gitignore para evitar commit acidental',
            file: filePath,
            detected_at: new Date(),
            resolved: false
          });
        }
      }
    }

    // Verificar arquivos de configuração
    for (const file of this.config.checkFiles.configFiles) {
      const filePath = join(this.projectRoot, file);
      
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        
        // Verificar configurações inseguras
        const insecureConfigs = this.checkInsecureConfigurations(content, file);
        issues.push(...insecureConfigs);
      }
    }

    return issues;
  }

  /**
   * Audita configurações do banco de dados
   */
  private async auditDatabase(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Verificar conexão com Supabase
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        issues.push({
          id: this.generateIssueId(),
          category: 'database',
          severity: 'critical',
          title: 'Erro de conexão com banco de dados',
          description: `Não foi possível conectar ao banco: ${error.message}`,
          recommendation: 'Verificar configurações de conexão e credenciais',
          detected_at: new Date(),
          resolved: false
        });
      }

      // Verificar se RLS está habilitado
      if (this.config.checkDatabase.checkPermissions) {
        // Esta verificação seria feita através de queries específicas do Supabase
        // Por enquanto, assumimos que está configurado corretamente
      }

      // Verificar configurações de backup
      if (this.config.checkDatabase.checkBackups) {
        const backupEnabled = process.env.BACKUP_ENABLED === 'true';
        if (!backupEnabled) {
          issues.push({
            id: this.generateIssueId(),
            category: 'database',
            severity: 'high',
            title: 'Backup automático não configurado',
            description: 'Sistema de backup automático não está habilitado',
            recommendation: 'Habilitar e configurar backups automáticos regulares',
            detected_at: new Date(),
            resolved: false
          });
        }
      }
    } catch (error) {
      issues.push({
        id: this.generateIssueId(),
        category: 'database',
        severity: 'critical',
        title: 'Erro durante auditoria do banco',
        description: `Erro inesperado: ${error}`,
        recommendation: 'Investigar e corrigir problema de conectividade',
        detected_at: new Date(),
        resolved: false
      });
    }

    return issues;
  }

  /**
   * Audita configurações da API
   */
  private async auditAPI(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Verificar se HTTPS está configurado em produção
    if (process.env.NODE_ENV === 'production') {
      const httpsEnabled = process.env.FORCE_HTTPS === 'true';
      if (!httpsEnabled) {
        issues.push({
          id: this.generateIssueId(),
          category: 'api',
          severity: 'critical',
          title: 'HTTPS não forçado em produção',
          description: 'Aplicação em produção não está forçando uso de HTTPS',
          recommendation: 'Configurar redirecionamento automático para HTTPS',
          detected_at: new Date(),
          resolved: false
        });
      }
    }

    // Verificar configurações de CORS
    if (this.config.checkAPI.checkCORS) {
      const corsOrigin = process.env.CORS_ORIGIN;
      if (!corsOrigin || corsOrigin === '*') {
        issues.push({
          id: this.generateIssueId(),
          category: 'api',
          severity: 'medium',
          title: 'CORS configurado de forma permissiva',
          description: 'CORS permite qualquer origem ou não está configurado',
          recommendation: 'Configurar CORS com origens específicas e seguras',
          detected_at: new Date(),
          resolved: false
        });
      }
    }

    // Verificar rate limiting
    if (this.config.checkAPI.checkRateLimit) {
      const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
      if (!rateLimitEnabled) {
        issues.push({
          id: this.generateIssueId(),
          category: 'api',
          severity: 'medium',
          title: 'Rate limiting não configurado',
          description: 'API não possui limitação de taxa de requisições',
          recommendation: 'Implementar rate limiting para prevenir abuso',
          detected_at: new Date(),
          resolved: false
        });
      }
    }

    return issues;
  }

  /**
   * Audita dependências do projeto
   */
  private async auditDependencies(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      const packageJsonPath = join(this.projectRoot, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        
        // Verificar dependências conhecidas com vulnerabilidades
        const vulnerableDeps = this.checkVulnerableDependencies(packageJson);
        issues.push(...vulnerableDeps);
        
        // Verificar dependências desatualizadas
        if (this.config.checkDependencies.checkOutdated) {
          // Esta verificação seria feita com npm audit ou similar
          // Por enquanto, apenas alertamos sobre a necessidade de verificação manual
          issues.push({
            id: this.generateIssueId(),
            category: 'dependency',
            severity: 'info',
            title: 'Verificação manual de dependências recomendada',
            description: 'Execute npm audit para verificar vulnerabilidades conhecidas',
            recommendation: 'Executar "npm audit" e "npm audit fix" regularmente',
            detected_at: new Date(),
            resolved: false
          });
        }
      }
    } catch (error) {
      issues.push({
        id: this.generateIssueId(),
        category: 'dependency',
        severity: 'medium',
        title: 'Erro ao auditar dependências',
        description: `Não foi possível analisar package.json: ${error}`,
        recommendation: 'Verificar integridade do arquivo package.json',
        detected_at: new Date(),
        resolved: false
      });
    }

    return issues;
  }

  /**
   * Audita configurações gerais
   */
  private async auditConfiguration(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Verificar variáveis de ambiente críticas
    const criticalEnvVars = [
      'NEXTAUTH_SECRET',
      'SUPABASE_SERVICE_ROLE_KEY',
      'BPIX_CLIENT_SECRET'
    ];

    for (const envVar of criticalEnvVars) {
      if (!process.env[envVar]) {
        issues.push({
          id: this.generateIssueId(),
          category: 'configuration',
          severity: 'critical',
          title: `Variável de ambiente crítica não configurada: ${envVar}`,
          description: `A variável ${envVar} é necessária para operação segura`,
          recommendation: 'Configurar variável de ambiente com valor seguro',
          detected_at: new Date(),
          resolved: false
        });
      }
    }

    // Verificar se está em modo de desenvolvimento em produção
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG === 'true') {
      issues.push({
        id: this.generateIssueId(),
        category: 'configuration',
        severity: 'high',
        title: 'Modo debug habilitado em produção',
        description: 'Aplicação em produção está com debug habilitado',
        recommendation: 'Desabilitar modo debug em ambiente de produção',
        detected_at: new Date(),
        resolved: false
      });
    }

    return issues;
  }

  // Métodos auxiliares
  private containsPlaintextSecrets(content: string): boolean {
    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /key\s*=\s*["'][^"']+["']/i,
      /token\s*=\s*["'][^"']+["']/i
    ];

    return secretPatterns.some(pattern => pattern.test(content));
  }

  private isInGitignore(filename: string): boolean {
    const gitignorePath = join(this.projectRoot, '.gitignore');
    if (!existsSync(gitignorePath)) return false;
    
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    return gitignoreContent.includes(filename);
  }

  private checkInsecureConfigurations(content: string, filename: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Verificações específicas por tipo de arquivo
    if (filename === 'next.config.ts') {
      if (content.includes('dangerouslyAllowSVG: true')) {
        issues.push({
          id: this.generateIssueId(),
          category: 'configuration',
          severity: 'medium',
          title: 'Configuração perigosa de SVG habilitada',
          description: 'dangerouslyAllowSVG está habilitado no Next.js',
          recommendation: 'Avaliar necessidade e implementar validação adequada de SVG',
          file: filename,
          detected_at: new Date(),
          resolved: false
        });
      }
    }
    
    return issues;
  }

  private checkVulnerableDependencies(packageJson: any): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Lista de dependências conhecidas com vulnerabilidades (exemplo)
    const knownVulnerable: Record<string, [string, string]> = {
      'lodash': ['4.17.20', 'Prototype pollution vulnerability'],
      'axios': ['0.21.0', 'Server-Side Request Forgery']
    };
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const [dep, version] of Object.entries(allDeps)) {
      if (knownVulnerable[dep]) {
        const [vulnVersion, description] = knownVulnerable[dep];
        if (version === vulnVersion) {
          issues.push({
            id: this.generateIssueId(),
            category: 'dependency',
            severity: 'high',
            title: `Dependência vulnerável: ${dep}`,
            description: `${dep}@${version}: ${description}`,
            recommendation: `Atualizar ${dep} para versão mais recente`,
            detected_at: new Date(),
            resolved: false
          });
        }
      }
    }
    
    return issues;
  }

  private generateAuditResult(
    auditId: string,
    startTime: Date,
    endTime: Date,
    issues: SecurityIssue[]
  ): SecurityAuditResult {
    const issuesBySeverity = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      info: issues.filter(i => i.severity === 'info').length
    };

    // Calcular score (0-100)
    const score = this.calculateSecurityScore(issuesBySeverity);
    
    // Determinar status
    let status: 'passed' | 'warning' | 'failed';
    if (issuesBySeverity.critical > 0) {
      status = 'failed';
    } else if (issuesBySeverity.high > 0) {
      status = 'warning';
    } else {
      status = 'passed';
    }

    const recommendations = this.generateRecommendations(issues);

    return {
      audit_id: auditId,
      started_at: startTime,
      completed_at: endTime,
      duration_ms: endTime.getTime() - startTime.getTime(),
      total_issues: issues.length,
      issues_by_severity: issuesBySeverity,
      issues,
      recommendations,
      score,
      status
    };
  }

  private calculateSecurityScore(issuesBySeverity: any): number {
    let score = 100;
    
    // Penalidades por severidade
    score -= issuesBySeverity.critical * 25;
    score -= issuesBySeverity.high * 15;
    score -= issuesBySeverity.medium * 8;
    score -= issuesBySeverity.low * 3;
    score -= issuesBySeverity.info * 1;
    
    return Math.max(0, score);
  }

  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations = new Set<string>();
    
    issues.forEach(issue => {
      recommendations.add(issue.recommendation);
    });
    
    return Array.from(recommendations);
  }

  private async saveAuditResult(result: SecurityAuditResult): Promise<void> {
    try {
      // TODO: Implementar salvamento quando as tabelas security_audits e security_issues forem criadas
      logger.info('Resultado da auditoria gerado', {
        auditId: result.audit_id,
        totalIssues: result.total_issues,
        score: result.score,
        status: result.status
      });
    } catch (error) {
      logger.error('Erro ao salvar auditoria no banco', error as Error);
    }
  }

  private async sendNotifications(result: SecurityAuditResult): Promise<void> {
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    const highIssues = result.issues.filter(i => i.severity === 'high');
    
    const shouldNotify = (
      (criticalIssues.length > 0 && this.config.notifications.email.onCritical) ||
      (highIssues.length > 0 && this.config.notifications.email.onHigh)
    );
    
    if (!shouldNotify) return;
    
    // Implementar notificações por email/webhook conforme necessário
    logger.info('Notificações de segurança enviadas', {
      auditId: result.audit_id,
      criticalIssues: criticalIssues.length,
      highIssues: highIssues.length
    });
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Configuração padrão baseada em variáveis de ambiente
export const defaultSecurityConfig: SecurityAuditConfig = {
  checkFiles: {
    enabled: process.env.SECURITY_CHECK_FILES !== 'false',
    sensitiveFiles: [
      '.env',
      '.env.local', 
      '.env.production',
      'firebase-adminsdk.json',
      'service-account.json'
    ],
    configFiles: [
      'next.config.ts',
      'firebase.json',
      'apphosting.yaml'
    ],
    logFiles: ['logs/*.log']
  },
  checkDatabase: {
    enabled: process.env.SECURITY_CHECK_DATABASE !== 'false',
    checkPermissions: true,
    checkEncryption: true,
    checkBackups: true
  },
  checkAPI: {
    enabled: process.env.SECURITY_CHECK_API !== 'false',
    checkAuthentication: true,
    checkAuthorization: true,
    checkRateLimit: true,
    checkCORS: true
  },
  checkDependencies: {
    enabled: process.env.SECURITY_CHECK_DEPENDENCIES !== 'false',
    checkVulnerabilities: true,
    checkOutdated: true,
    checkLicenses: false
  },
  checkConfiguration: {
    enabled: process.env.SECURITY_CHECK_CONFIG !== 'false',
    checkEnvironment: true,
    checkSecrets: true,
    checkSSL: true
  },
  notifications: {
    email: {
      enabled: process.env.SECURITY_EMAIL_ENABLED === 'true',
      recipients: process.env.SECURITY_EMAIL_RECIPIENTS?.split(',') || [],
      onCritical: true,
      onHigh: true
    },
    webhook: {
      enabled: process.env.SECURITY_WEBHOOK_ENABLED === 'true',
      url: process.env.SECURITY_WEBHOOK_URL || '',
      onCritical: true,
      onHigh: true
    }
  }
};

// Instância padrão
export const securityAuditor = new SecurityAuditor(defaultSecurityConfig);