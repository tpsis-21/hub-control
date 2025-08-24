const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Script para configurar sistema de auditoria de segurança
 * 
 * Este script:
 * 1. Verifica variáveis de ambiente necessárias
 * 2. Cria estrutura de diretórios para logs de segurança
 * 3. Configura tabelas no banco de dados
 * 4. Cria arquivos de configuração
 * 5. Configura agendamento de auditorias
 * 6. Testa configuração
 */

class SecuritySetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.securityDir = path.join(this.projectRoot, 'security');
    this.logsDir = path.join(this.securityDir, 'logs');
    this.reportsDir = path.join(this.securityDir, 'reports');
    this.configFile = path.join(this.securityDir, 'security-config.json');
  }

  /**
   * Executa configuração completa
   */
  async run() {
    console.log('🔒 Configurando Sistema de Auditoria de Segurança...');
    console.log('=' .repeat(60));

    try {
      await this.checkEnvironment();
      await this.createDirectories();
      await this.createDatabaseTables();
      await this.createConfigFile();
      await this.createSecurityScripts();
      await this.setupScheduledAudits();
      await this.testConfiguration();
      await this.generateSummary();

      console.log('\n✅ Configuração de segurança concluída com sucesso!');
    } catch (error) {
      console.error('\n❌ Erro durante configuração:', error.message);
      process.exit(1);
    }
  }

  /**
   * Verifica variáveis de ambiente necessárias
   */
  async checkEnvironment() {
    console.log('\n📋 Verificando variáveis de ambiente...');

    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXTAUTH_SECRET'
    ];

    const optionalVars = [
      'SECURITY_EMAIL_ENABLED',
      'SECURITY_EMAIL_RECIPIENTS',
      'SECURITY_WEBHOOK_ENABLED',
      'SECURITY_WEBHOOK_URL'
    ];

    // Verificar variáveis obrigatórias
    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Variáveis obrigatórias não configuradas: ${missing.join(', ')}`);
    }

    console.log('   ✅ Variáveis obrigatórias configuradas');

    // Verificar variáveis opcionais
    const configured = optionalVars.filter(varName => process.env[varName]);
    console.log(`   ℹ️  Variáveis opcionais configuradas: ${configured.length}/${optionalVars.length}`);

    if (configured.length < optionalVars.length) {
      console.log('   ⚠️  Algumas notificações podem não funcionar sem configuração completa');
    }
  }

  /**
   * Cria estrutura de diretórios
   */
  async createDirectories() {
    console.log('\n📁 Criando estrutura de diretórios...');

    const directories = [
      this.securityDir,
      this.logsDir,
      this.reportsDir,
      path.join(this.securityDir, 'policies'),
      path.join(this.securityDir, 'templates')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ Criado: ${path.relative(this.projectRoot, dir)}`);
      } else {
        console.log(`   ℹ️  Já existe: ${path.relative(this.projectRoot, dir)}`);
      }
    }

    // Criar .gitignore para logs sensíveis
    const gitignorePath = path.join(this.securityDir, '.gitignore');
    const gitignoreContent = `# Logs de segurança sensíveis
logs/*.log
reports/*.json
reports/*.pdf

# Configurações locais
security-config.local.json
*.key
*.pem
`;

    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('   ✅ Criado .gitignore para arquivos sensíveis');
  }

  /**
   * Cria tabelas no banco de dados
   */
  async createDatabaseTables() {
    console.log('\n🗄️  Configurando tabelas do banco de dados...');

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // SQL para criar tabelas
    const createTablesSQL = `
      -- Tabela de auditorias de segurança
      CREATE TABLE IF NOT EXISTS security_audits (
        id SERIAL PRIMARY KEY,
        audit_id VARCHAR(255) UNIQUE NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_ms INTEGER NOT NULL,
        total_issues INTEGER NOT NULL DEFAULT 0,
        issues_by_severity JSONB NOT NULL DEFAULT '{}',
        score INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        recommendations TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Tabela de issues de segurança
      CREATE TABLE IF NOT EXISTS security_issues (
        id SERIAL PRIMARY KEY,
        audit_id VARCHAR(255) NOT NULL,
        issue_id VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        file_path TEXT,
        line_number INTEGER,
        cve VARCHAR(50),
        cvss DECIMAL(3,1),
        detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        acknowledged BOOLEAN DEFAULT FALSE,
        false_positive BOOLEAN DEFAULT FALSE,
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (audit_id) REFERENCES security_audits(audit_id) ON DELETE CASCADE
      );

      -- Índices para performance
      CREATE INDEX IF NOT EXISTS idx_security_audits_started_at ON security_audits(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_security_audits_status ON security_audits(status);
      CREATE INDEX IF NOT EXISTS idx_security_issues_audit_id ON security_issues(audit_id);
      CREATE INDEX IF NOT EXISTS idx_security_issues_severity ON security_issues(severity);
      CREATE INDEX IF NOT EXISTS idx_security_issues_resolved ON security_issues(resolved);
      CREATE INDEX IF NOT EXISTS idx_security_issues_detected_at ON security_issues(detected_at DESC);

      -- RLS (Row Level Security)
      ALTER TABLE security_audits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE security_issues ENABLE ROW LEVEL SECURITY;

      -- Políticas de acesso (apenas admins)
      CREATE POLICY IF NOT EXISTS "Admins can manage security audits" ON security_audits
        FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
      
      CREATE POLICY IF NOT EXISTS "Admins can manage security issues" ON security_issues
        FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    `;

    try {
      // Executar SQL via função do Supabase
      const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
      
      if (error) {
        console.log('   ⚠️  Erro ao criar tabelas via RPC, tentando método alternativo...');
        console.log('   ℹ️  Execute manualmente no Supabase SQL Editor:');
        console.log('   📝 SQL salvo em: security/sql/create-tables.sql');
        
        // Salvar SQL em arquivo para execução manual
        const sqlDir = path.join(this.securityDir, 'sql');
        if (!fs.existsSync(sqlDir)) {
          fs.mkdirSync(sqlDir, { recursive: true });
        }
        fs.writeFileSync(path.join(sqlDir, 'create-tables.sql'), createTablesSQL);
      } else {
        console.log('   ✅ Tabelas criadas com sucesso');
      }
    } catch (error) {
      console.log('   ⚠️  Não foi possível criar tabelas automaticamente');
      console.log('   ℹ️  Execute o SQL manualmente no Supabase Dashboard');
      
      // Salvar SQL em arquivo
      const sqlDir = path.join(this.securityDir, 'sql');
      if (!fs.existsSync(sqlDir)) {
        fs.mkdirSync(sqlDir, { recursive: true });
      }
      fs.writeFileSync(path.join(sqlDir, 'create-tables.sql'), createTablesSQL);
      console.log('   📝 SQL salvo em: security/sql/create-tables.sql');
    }
  }

  /**
   * Cria arquivo de configuração
   */
  async createConfigFile() {
    console.log('\n⚙️  Criando arquivo de configuração...');

    const config = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      
      // Configurações de auditoria
      audit: {
        enabled: true,
        schedule: {
          daily: '0 2 * * *',      // 02:00 todos os dias
          weekly: '0 3 * * 0',     // 03:00 aos domingos
          monthly: '0 4 1 * *'     // 04:00 no dia 1 de cada mês
        },
        retention: {
          audits_days: 90,
          issues_days: 365
        }
      },
      
      // Configurações de verificação
      checks: {
        files: {
          enabled: true,
          sensitive_extensions: ['.env', '.key', '.pem', '.p12', '.pfx'],
          config_files: ['next.config.ts', 'firebase.json', 'apphosting.yaml'],
          exclude_patterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
        },
        database: {
          enabled: true,
          check_permissions: true,
          check_encryption: true,
          check_backups: true
        },
        api: {
          enabled: true,
          check_auth: true,
          check_cors: true,
          check_rate_limit: true,
          check_https: true
        },
        dependencies: {
          enabled: true,
          check_vulnerabilities: true,
          check_outdated: true,
          severity_threshold: 'medium'
        }
      },
      
      // Configurações de notificação
      notifications: {
        email: {
          enabled: process.env.SECURITY_EMAIL_ENABLED === 'true',
          recipients: process.env.SECURITY_EMAIL_RECIPIENTS?.split(',') || [],
          severity_threshold: 'high'
        },
        webhook: {
          enabled: process.env.SECURITY_WEBHOOK_ENABLED === 'true',
          url: process.env.SECURITY_WEBHOOK_URL || '',
          severity_threshold: 'critical'
        },
        slack: {
          enabled: process.env.SECURITY_SLACK_ENABLED === 'true',
          webhook_url: process.env.SECURITY_SLACK_WEBHOOK_URL || '',
          channel: process.env.SECURITY_SLACK_CHANNEL || '#security'
        }
      },
      
      // Configurações de relatórios
      reports: {
        formats: ['json', 'html'],
        include_resolved: false,
        group_by_severity: true,
        include_recommendations: true
      }
    };

    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    console.log(`   ✅ Configuração salva em: ${path.relative(this.projectRoot, this.configFile)}`);

    // Criar template de configuração local
    const localConfigTemplate = {
      ...config,
      // Sobrescrever com configurações específicas do ambiente
      notifications: {
        ...config.notifications,
        email: {
          ...config.notifications.email,
          smtp: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: {
              user: 'your-email@example.com',
              pass: 'your-password'
            }
          }
        }
      }
    };

    const localConfigPath = path.join(this.securityDir, 'security-config.local.example.json');
    fs.writeFileSync(localConfigPath, JSON.stringify(localConfigTemplate, null, 2));
    console.log('   ✅ Template de configuração local criado');
  }

  /**
   * Cria scripts de segurança
   */
  async createSecurityScripts() {
    console.log('\n📜 Criando scripts de segurança...');

    // Script de auditoria manual
    const auditScript = `@echo off
REM Script para executar auditoria de segurança manual
echo Executando auditoria de segurança...
cd /d "%~dp0.."
npm run security:audit
echo.
echo Auditoria concluída. Verifique os resultados em security/reports/
pause
`;

    fs.writeFileSync(path.join(this.securityDir, 'run-audit.bat'), auditScript);
    console.log('   ✅ Script de auditoria manual criado');

    // Script de verificação rápida
    const quickCheckScript = `@echo off
REM Script para verificação rápida de segurança
echo Executando verificação rápida...
cd /d "%~dp0.."
npm run security:quick-check
echo.
echo Verificação concluída.
pause
`;

    fs.writeFileSync(path.join(this.securityDir, 'quick-check.bat'), quickCheckScript);
    console.log('   ✅ Script de verificação rápida criado');

    // Script Node.js para auditoria
    const nodeAuditScript = `const { securityAuditor } = require('../src/lib/security-audit');
const fs = require('fs');
const path = require('path');

async function runAudit() {
  try {
    console.log('Iniciando auditoria de segurança...');
    const result = await securityAuditor.runFullAudit();
    
    // Salvar relatório
    const reportPath = path.join(__dirname, 'reports', \`audit-\${new Date().toISOString().split('T')[0]}.json\`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    
    console.log(\`Auditoria concluída. Score: \${result.score}/100\`);
    console.log(\`Relatório salvo em: \${reportPath}\`);
    
    if (result.status === 'failed') {
      console.error('⚠️  Issues críticos encontrados!');
      process.exit(1);
    }
  } catch (error) {
    console.error('Erro durante auditoria:', error);
    process.exit(1);
  }
}

runAudit();
`;

    fs.writeFileSync(path.join(this.securityDir, 'run-audit.js'), nodeAuditScript);
    console.log('   ✅ Script Node.js de auditoria criado');
  }

  /**
   * Configura agendamento de auditorias
   */
  async setupScheduledAudits() {
    console.log('\n⏰ Configurando agendamento de auditorias...');

    // Criar script de agendamento para Windows Task Scheduler
    const taskScript = `@echo off
REM Script para criar tarefas agendadas de auditoria de segurança

echo Configurando tarefas agendadas...

REM Auditoria diária
schtasks /create /tn "Hub Control - Security Audit Daily" /tr "node %~dp0run-audit.js" /sc daily /st 02:00 /f
if %errorlevel% equ 0 (
    echo ✅ Auditoria diária agendada para 02:00
) else (
    echo ❌ Erro ao agendar auditoria diária
)

REM Auditoria semanal completa
schtasks /create /tn "Hub Control - Security Audit Weekly" /tr "node %~dp0run-audit.js" /sc weekly /d SUN /st 03:00 /f
if %errorlevel% equ 0 (
    echo ✅ Auditoria semanal agendada para domingos às 03:00
) else (
    echo ❌ Erro ao agendar auditoria semanal
)

echo.
echo Configuração de agendamento concluída.
echo Para visualizar tarefas: schtasks /query /tn "Hub Control*"
echo Para remover tarefas: schtasks /delete /tn "Hub Control*" /f
pause
`;

    fs.writeFileSync(path.join(this.securityDir, 'setup-scheduled-tasks.bat'), taskScript);
    console.log('   ✅ Script de agendamento criado');
    console.log('   ℹ️  Execute setup-scheduled-tasks.bat como administrador para configurar');

    // Criar arquivo de instruções
    const instructions = `# Configuração de Agendamento de Auditorias

## Windows Task Scheduler

1. Execute \`setup-scheduled-tasks.bat\` como administrador
2. Ou configure manualmente:
   - Abra o Agendador de Tarefas
   - Crie nova tarefa básica
   - Nome: "Hub Control - Security Audit"
   - Ação: Iniciar programa
   - Programa: node
   - Argumentos: security/run-audit.js
   - Diretório: ${this.projectRoot}

## Verificar Tarefas Agendadas

\`\`\`cmd
schtasks /query /tn "Hub Control*"
\`\`\`

## Remover Tarefas

\`\`\`cmd
schtasks /delete /tn "Hub Control*" /f
\`\`\`

## Logs de Execução

Os logs das execuções agendadas ficam em:
- \`security/logs/scheduled-audit.log\`
- Visualizador de Eventos do Windows
`;

    fs.writeFileSync(path.join(this.securityDir, 'SCHEDULING.md'), instructions);
    console.log('   ✅ Instruções de agendamento criadas');
  }

  /**
   * Testa configuração
   */
  async testConfiguration() {
    console.log('\n🧪 Testando configuração...');

    try {
      // Testar carregamento da configuração
      const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      console.log('   ✅ Arquivo de configuração válido');

      // Testar conexão com banco
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await supabase.from('security_audits').select('count').limit(1);
      if (error) {
        console.log('   ⚠️  Erro ao conectar com banco:', error.message);
      } else {
        console.log('   ✅ Conexão com banco de dados OK');
      }

      // Testar criação de diretórios
      const testFile = path.join(this.logsDir, 'test.log');
      fs.writeFileSync(testFile, 'Teste de escrita\n');
      fs.unlinkSync(testFile);
      console.log('   ✅ Permissões de escrita OK');

      // Testar importação do módulo de auditoria
      try {
        require('../src/lib/security-audit');
        console.log('   ✅ Módulo de auditoria carregado');
      } catch (error) {
        console.log('   ⚠️  Erro ao carregar módulo de auditoria:', error.message);
      }

    } catch (error) {
      console.log('   ❌ Erro durante teste:', error.message);
      throw error;
    }
  }

  /**
   * Gera resumo da configuração
   */
  async generateSummary() {
    console.log('\n📊 Resumo da Configuração');
    console.log('=' .repeat(40));

    const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));

    console.log('\n📁 Estrutura criada:');
    console.log('   • security/                 - Diretório principal');
    console.log('   • security/logs/            - Logs de auditoria');
    console.log('   • security/reports/         - Relatórios gerados');
    console.log('   • security/policies/        - Políticas de segurança');
    console.log('   • security/sql/             - Scripts SQL');

    console.log('\n⚙️  Configurações:');
    console.log(`   • Auditorias habilitadas:   ${config.audit.enabled ? '✅' : '❌'}`);
    console.log(`   • Verificação de arquivos:  ${config.checks.files.enabled ? '✅' : '❌'}`);
    console.log(`   • Verificação de banco:     ${config.checks.database.enabled ? '✅' : '❌'}`);
    console.log(`   • Verificação de API:       ${config.checks.api.enabled ? '✅' : '❌'}`);
    console.log(`   • Verificação de deps:      ${config.checks.dependencies.enabled ? '✅' : '❌'}`);

    console.log('\n📧 Notificações:');
    console.log(`   • Email:                    ${config.notifications.email.enabled ? '✅' : '❌'}`);
    console.log(`   • Webhook:                  ${config.notifications.webhook.enabled ? '✅' : '❌'}`);
    console.log(`   • Slack:                    ${config.notifications.slack.enabled ? '✅' : '❌'}`);

    console.log('\n📜 Scripts disponíveis:');
    console.log('   • npm run security:setup');
    console.log('   • npm run security:audit');
    console.log('   • npm run security:quick-check');
    console.log('   • npm run security:report');

    console.log('\n⏰ Próximos passos:');
    console.log('   1. Execute: npm run security:audit');
    console.log('   2. Configure agendamento: security/setup-scheduled-tasks.bat');
    console.log('   3. Revise configurações: security/security-config.json');
    console.log('   4. Configure notificações se necessário');

    console.log('\n📚 Documentação:');
    console.log('   • security/SCHEDULING.md    - Instruções de agendamento');
    console.log('   • SECURITY_GUIDE.md         - Guia completo (será criado)');
  }
}

// Executar configuração
if (require.main === module) {
  const setup = new SecuritySetup();
  setup.run().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = SecuritySetup;