const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

/**
 * Script para testar sistema de auditoria de segurança
 * 
 * Este script:
 * 1. Testa configuração do sistema
 * 2. Executa auditoria de teste
 * 3. Verifica funcionalidades principais
 * 4. Testa notificações
 * 5. Valida performance
 * 6. Gera relatório de testes
 */

class SecurityTester {
  constructor() {
    this.projectRoot = process.cwd();
    this.securityDir = path.join(this.projectRoot, 'security');
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.startTime = performance.now();
  }

  /**
   * Executa todos os testes
   */
  async run() {
    console.log('🧪 Testando Sistema de Auditoria de Segurança');
    console.log('=' .repeat(60));

    try {
      await this.testConfiguration();
      await this.testDirectoryStructure();
      await this.testDatabaseConnection();
      await this.testSecurityAuditor();
      await this.testNotifications();
      await this.testPerformance();
      await this.testReporting();
      await this.generateTestReport();

      const duration = Math.round(performance.now() - this.startTime);
      console.log(`\n✅ Testes concluídos em ${duration}ms`);
      
      if (this.testResults.failed > 0) {
        console.log(`❌ ${this.testResults.failed} teste(s) falharam`);
        process.exit(1);
      } else {
        console.log(`✅ Todos os ${this.testResults.passed} testes passaram`);
        if (this.testResults.warnings > 0) {
          console.log(`⚠️  ${this.testResults.warnings} aviso(s) encontrado(s)`);
        }
      }
    } catch (error) {
      console.error('\n❌ Erro durante execução dos testes:', error.message);
      process.exit(1);
    }
  }

  /**
   * Registra resultado de teste
   */
  recordTest(name, status, message = '', duration = 0) {
    const test = {
      name,
      status,
      message,
      duration,
      timestamp: new Date().toISOString()
    };

    this.testResults.tests.push(test);
    
    switch (status) {
      case 'passed':
        this.testResults.passed++;
        console.log(`   ✅ ${name}`);
        break;
      case 'failed':
        this.testResults.failed++;
        console.log(`   ❌ ${name}: ${message}`);
        break;
      case 'warning':
        this.testResults.warnings++;
        console.log(`   ⚠️  ${name}: ${message}`);
        break;
    }

    if (duration > 0) {
      console.log(`      (${duration}ms)`);
    }
  }

  /**
   * Testa configuração do sistema
   */
  async testConfiguration() {
    console.log('\n📋 Testando Configuração...');

    const testStart = performance.now();

    try {
      // Testar variáveis de ambiente
      const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXTAUTH_SECRET'];
      const missing = requiredVars.filter(varName => !process.env[varName]);
      
      if (missing.length > 0) {
        this.recordTest('Variáveis de ambiente', 'failed', `Faltando: ${missing.join(', ')}`);
      } else {
        this.recordTest('Variáveis de ambiente', 'passed');
      }

      // Testar arquivo de configuração
      const configPath = path.join(this.securityDir, 'security-config.json');
      if (!fs.existsSync(configPath)) {
        this.recordTest('Arquivo de configuração', 'failed', 'Arquivo não encontrado');
        return;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Validar estrutura da configuração
      const requiredSections = ['audit', 'checks', 'notifications', 'reports'];
      const missingSections = requiredSections.filter(section => !config[section]);
      
      if (missingSections.length > 0) {
        this.recordTest('Estrutura de configuração', 'failed', `Seções faltando: ${missingSections.join(', ')}`);
      } else {
        this.recordTest('Estrutura de configuração', 'passed');
      }

      // Validar configurações específicas
      if (!config.audit.enabled) {
        this.recordTest('Auditoria habilitada', 'warning', 'Auditoria desabilitada na configuração');
      } else {
        this.recordTest('Auditoria habilitada', 'passed');
      }

    } catch (error) {
      this.recordTest('Configuração geral', 'failed', error.message);
    }

    const duration = Math.round(performance.now() - testStart);
    console.log(`   Configuração testada em ${duration}ms`);
  }

  /**
   * Testa estrutura de diretórios
   */
  async testDirectoryStructure() {
    console.log('\n📁 Testando Estrutura de Diretórios...');

    const testStart = performance.now();

    const requiredDirs = [
      'security',
      'security/logs',
      'security/reports',
      'security/policies',
      'security/templates'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        this.recordTest(`Diretório ${dir}`, 'failed', 'Diretório não encontrado');
      } else {
        // Testar permissões de escrita
        try {
          const testFile = path.join(dirPath, '.test-write');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          this.recordTest(`Diretório ${dir}`, 'passed');
        } catch (error) {
          this.recordTest(`Diretório ${dir}`, 'failed', 'Sem permissão de escrita');
        }
      }
    }

    // Testar arquivos importantes
    const requiredFiles = [
      'security/security-config.json',
      'security/run-audit.bat',
      'security/quick-check.bat',
      'security/run-audit.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        this.recordTest(`Arquivo ${file}`, 'failed', 'Arquivo não encontrado');
      } else {
        this.recordTest(`Arquivo ${file}`, 'passed');
      }
    }

    const duration = Math.round(performance.now() - testStart);
    console.log(`   Estrutura testada em ${duration}ms`);
  }

  /**
   * Testa conexão com banco de dados
   */
  async testDatabaseConnection() {
    console.log('\n🗄️  Testando Conexão com Banco...');

    const testStart = performance.now();

    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Testar conexão básica
      const { data, error } = await supabase.from('security_audits').select('count').limit(1);
      
      if (error) {
        this.recordTest('Conexão com banco', 'failed', error.message);
        return;
      }

      this.recordTest('Conexão com banco', 'passed');

      // Testar tabelas necessárias
      const tables = ['security_audits', 'security_issues'];
      
      for (const table of tables) {
        try {
          const { error: tableError } = await supabase.from(table).select('*').limit(1);
          if (tableError) {
            this.recordTest(`Tabela ${table}`, 'failed', tableError.message);
          } else {
            this.recordTest(`Tabela ${table}`, 'passed');
          }
        } catch (error) {
          this.recordTest(`Tabela ${table}`, 'failed', error.message);
        }
      }

      // Testar inserção de teste
      try {
        const testAudit = {
          audit_id: `test-${Date.now()}`,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: 100,
          total_issues: 0,
          issues_by_severity: {},
          score: 100,
          status: 'completed'
        };

        const { error: insertError } = await supabase
          .from('security_audits')
          .insert(testAudit);

        if (insertError) {
          this.recordTest('Inserção de teste', 'failed', insertError.message);
        } else {
          this.recordTest('Inserção de teste', 'passed');
          
          // Limpar teste
          await supabase
            .from('security_audits')
            .delete()
            .eq('audit_id', testAudit.audit_id);
        }
      } catch (error) {
        this.recordTest('Inserção de teste', 'failed', error.message);
      }

    } catch (error) {
      this.recordTest('Configuração do Supabase', 'failed', error.message);
    }

    const duration = Math.round(performance.now() - testStart);
    console.log(`   Banco testado em ${duration}ms`);
  }

  /**
   * Testa módulo SecurityAuditor
   */
  async testSecurityAuditor() {
    console.log('\n🔍 Testando SecurityAuditor...');

    const testStart = performance.now();

    try {
      // Testar importação do módulo
      const { SecurityAuditor } = require('../src/lib/security-audit');
      this.recordTest('Importação do módulo', 'passed');

      // Testar instanciação
      const auditor = new SecurityAuditor();
      this.recordTest('Instanciação do auditor', 'passed');

      // Testar métodos principais
      const methods = [
        'generateAuditId',
        'generateIssueId',
        'calculateSecurityScore',
        'checkFiles',
        'checkDatabase',
        'checkAPI',
        'checkDependencies'
      ];

      for (const method of methods) {
        if (typeof auditor[method] === 'function') {
          this.recordTest(`Método ${method}`, 'passed');
        } else {
          this.recordTest(`Método ${method}`, 'failed', 'Método não encontrado');
        }
      }

      // Testar geração de ID
      try {
        const auditId = auditor.generateAuditId();
        if (auditId && auditId.startsWith('audit_')) {
          this.recordTest('Geração de audit ID', 'passed');
        } else {
          this.recordTest('Geração de audit ID', 'failed', 'Formato inválido');
        }
      } catch (error) {
        this.recordTest('Geração de audit ID', 'failed', error.message);
      }

      // Testar cálculo de score
      try {
        const testIssues = [
          { severity: 'critical' },
          { severity: 'high' },
          { severity: 'medium' }
        ];
        const score = auditor.calculateSecurityScore(testIssues);
        if (typeof score === 'number' && score >= 0 && score <= 100) {
          this.recordTest('Cálculo de score', 'passed');
        } else {
          this.recordTest('Cálculo de score', 'failed', 'Score inválido');
        }
      } catch (error) {
        this.recordTest('Cálculo de score', 'failed', error.message);
      }

    } catch (error) {
      this.recordTest('SecurityAuditor', 'failed', error.message);
    }

    const duration = Math.round(performance.now() - testStart);
    console.log(`   SecurityAuditor testado em ${duration}ms`);
  }

  /**
   * Testa sistema de notificações
   */
  async testNotifications() {
    console.log('\n📧 Testando Notificações...');

    const testStart = performance.now();

    try {
      const configPath = path.join(this.securityDir, 'security-config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Testar configuração de email
      if (config.notifications.email.enabled) {
        if (config.notifications.email.recipients.length > 0) {
          this.recordTest('Configuração de email', 'passed');
        } else {
          this.recordTest('Configuração de email', 'warning', 'Nenhum destinatário configurado');
        }
      } else {
        this.recordTest('Configuração de email', 'warning', 'Email desabilitado');
      }

      // Testar configuração de webhook
      if (config.notifications.webhook.enabled) {
        if (config.notifications.webhook.url) {
          this.recordTest('Configuração de webhook', 'passed');
        } else {
          this.recordTest('Configuração de webhook', 'failed', 'URL não configurada');
        }
      } else {
        this.recordTest('Configuração de webhook', 'warning', 'Webhook desabilitado');
      }

      // Testar configuração de Slack
      if (config.notifications.slack.enabled) {
        if (config.notifications.slack.webhook_url) {
          this.recordTest('Configuração de Slack', 'passed');
        } else {
          this.recordTest('Configuração de Slack', 'failed', 'Webhook URL não configurada');
        }
      } else {
        this.recordTest('Configuração de Slack', 'warning', 'Slack desabilitado');
      }

    } catch (error) {
      this.recordTest('Sistema de notificações', 'failed', error.message);
    }

    const duration = Math.round(performance.now() - testStart);
    console.log(`   Notificações testadas em ${duration}ms`);
  }

  /**
   * Testa performance do sistema
   */
  async testPerformance() {
    console.log('\n⚡ Testando Performance...');

    const testStart = performance.now();

    try {
      // Testar tempo de carregamento da configuração
      const configStart = performance.now();
      const configPath = path.join(this.securityDir, 'security-config.json');
      JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const configDuration = performance.now() - configStart;

      if (configDuration < 100) {
        this.recordTest('Carregamento de configuração', 'passed', '', Math.round(configDuration));
      } else {
        this.recordTest('Carregamento de configuração', 'warning', 'Lento', Math.round(configDuration));
      }

      // Testar tempo de conexão com banco
      const dbStart = performance.now();
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        await supabase.from('security_audits').select('count').limit(1);
        const dbDuration = performance.now() - dbStart;

        if (dbDuration < 1000) {
          this.recordTest('Conexão com banco', 'passed', '', Math.round(dbDuration));
        } else {
          this.recordTest('Conexão com banco', 'warning', 'Lenta', Math.round(dbDuration));
        }
      } catch (error) {
        this.recordTest('Conexão com banco', 'failed', error.message);
      }

      // Testar uso de memória
      const memUsage = process.memoryUsage();
      const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (memMB < 100) {
        this.recordTest('Uso de memória', 'passed', `${memMB}MB`);
      } else if (memMB < 200) {
        this.recordTest('Uso de memória', 'warning', `${memMB}MB`);
      } else {
        this.recordTest('Uso de memória', 'failed', `${memMB}MB - muito alto`);
      }

    } catch (error) {
      this.recordTest('Teste de performance', 'failed', error.message);
    }

    const duration = Math.round(performance.now() - testStart);
    console.log(`   Performance testada em ${duration}ms`);
  }

  /**
   * Testa sistema de relatórios
   */
  async testReporting() {
    console.log('\n📊 Testando Relatórios...');

    const testStart = performance.now();

    try {
      // Testar criação de relatório de teste
      const testReport = {
        audit_id: `test-report-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'completed',
        score: 85,
        total_issues: 3,
        issues_by_severity: {
          critical: 0,
          high: 1,
          medium: 2,
          low: 0
        },
        issues: [
          {
            id: 'test-issue-1',
            category: 'files',
            severity: 'high',
            title: 'Arquivo sensível exposto',
            description: 'Arquivo .env encontrado em local público'
          }
        ],
        recommendations: [
          'Mover arquivos sensíveis para local seguro',
          'Configurar .gitignore adequadamente'
        ]
      };

      // Testar salvamento em JSON
      const jsonPath = path.join(this.securityDir, 'reports', 'test-report.json');
      fs.writeFileSync(jsonPath, JSON.stringify(testReport, null, 2));
      
      if (fs.existsSync(jsonPath)) {
        this.recordTest('Relatório JSON', 'passed');
        fs.unlinkSync(jsonPath); // Limpar
      } else {
        this.recordTest('Relatório JSON', 'failed', 'Arquivo não criado');
      }

      // Testar estrutura do relatório
      const requiredFields = ['audit_id', 'timestamp', 'status', 'score', 'total_issues'];
      const missingFields = requiredFields.filter(field => !testReport[field]);
      
      if (missingFields.length === 0) {
        this.recordTest('Estrutura do relatório', 'passed');
      } else {
        this.recordTest('Estrutura do relatório', 'failed', `Campos faltando: ${missingFields.join(', ')}`);
      }

    } catch (error) {
      this.recordTest('Sistema de relatórios', 'failed', error.message);
    }

    const duration = Math.round(performance.now() - testStart);
    console.log(`   Relatórios testados em ${duration}ms`);
  }

  /**
   * Gera relatório final dos testes
   */
  async generateTestReport() {
    console.log('\n📋 Gerando Relatório de Testes...');

    const totalDuration = Math.round(performance.now() - this.startTime);
    
    const report = {
      summary: {
        total_tests: this.testResults.tests.length,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        warnings: this.testResults.warnings,
        success_rate: Math.round((this.testResults.passed / this.testResults.tests.length) * 100),
        total_duration_ms: totalDuration,
        timestamp: new Date().toISOString()
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory_usage: process.memoryUsage()
      },
      tests: this.testResults.tests,
      recommendations: this.generateRecommendations()
    };

    // Salvar relatório
    const reportPath = path.join(this.securityDir, 'reports', `test-report-${new Date().toISOString().split('T')[0]}.json`);
    
    // Criar diretório se não existir
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Relatório de Testes`);
    console.log('=' .repeat(40));
    console.log(`Total de testes:     ${report.summary.total_tests}`);
    console.log(`Passou:              ${report.summary.passed}`);
    console.log(`Falhou:              ${report.summary.failed}`);
    console.log(`Avisos:              ${report.summary.warnings}`);
    console.log(`Taxa de sucesso:    ${report.summary.success_rate}%`);
    console.log(`Duração total:       ${totalDuration}ms`);
    console.log(`\nRelatório salvo em:  ${path.relative(this.projectRoot, reportPath)}`);
  }

  /**
   * Gera recomendações baseadas nos resultados
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.testResults.failed > 0) {
      recommendations.push('Corrija os testes que falharam antes de usar o sistema em produção');
    }

    if (this.testResults.warnings > 0) {
      recommendations.push('Revise os avisos e configure as funcionalidades opcionais se necessário');
    }

    const failedTests = this.testResults.tests.filter(t => t.status === 'failed');
    const dbTests = failedTests.filter(t => t.name.includes('banco') || t.name.includes('Tabela'));
    
    if (dbTests.length > 0) {
      recommendations.push('Execute o SQL de criação de tabelas manualmente no Supabase Dashboard');
    }

    const notificationTests = this.testResults.tests.filter(t => 
      t.name.includes('email') || t.name.includes('webhook') || t.name.includes('Slack')
    );
    const failedNotifications = notificationTests.filter(t => t.status === 'failed');
    
    if (failedNotifications.length > 0) {
      recommendations.push('Configure as variáveis de ambiente para notificações se desejar recebê-las');
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistema está funcionando corretamente. Execute npm run security:audit para primeira auditoria');
    }

    return recommendations;
  }
}

// Executar testes
if (require.main === module) {
  const tester = new SecurityTester();
  tester.run().catch(error => {
    console.error('Erro fatal durante testes:', error);
    process.exit(1);
  });
}

module.exports = SecurityTester;