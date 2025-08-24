#!/usr/bin/env node

/**
 * Script para configurar o sistema de backup automatizado
 * Configura agendamento, estrutura de diretórios e testa a configuração
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações padrão
const DEFAULT_CONFIG = {
  schedule: {
    full: '0 2 * * 0', // Domingo às 2h
    incremental: '0 2 * * 1-6', // Segunda a sábado às 2h
    logs: '0 */6 * * *' // A cada 6 horas
  },
  retention: {
    full: 4, // 4 semanas
    incremental: 7, // 7 dias
    logs: 30 // 30 dias
  },
  storage: {
    local: {
      enabled: true,
      path: './backups'
    },
    remote: {
      enabled: false,
      type: 'aws-s3', // aws-s3, google-cloud, azure
      bucket: '',
      region: '',
      accessKey: '',
      secretKey: ''
    }
  },
  compression: {
    enabled: true,
    level: 6 // 1-9
  },
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    keyFile: './config/backup.key'
  },
  notifications: {
    email: {
      enabled: false,
      smtp: {
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: ''
      },
      to: [],
      onSuccess: false,
      onError: true
    },
    webhook: {
      enabled: false,
      url: '',
      onSuccess: false,
      onError: true
    }
  }
};

class BackupSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.configDir = path.join(this.projectRoot, 'config');
    this.backupDir = path.join(this.projectRoot, 'backups');
    this.scriptsDir = path.join(this.projectRoot, 'scripts');
  }

  async setup() {
    console.log('🔧 Configurando sistema de backup automatizado...');
    
    try {
      // 1. Verificar variáveis de ambiente
      await this.checkEnvironmentVariables();
      
      // 2. Criar estrutura de diretórios
      await this.createDirectoryStructure();
      
      // 3. Gerar chave de criptografia
      await this.generateEncryptionKey();
      
      // 4. Criar arquivo de configuração
      await this.createConfigFile();
      
      // 5. Criar scripts de backup
      await this.createBackupScripts();
      
      // 6. Configurar agendamento (Windows Task Scheduler)
      await this.setupScheduling();
      
      // 7. Testar configuração
      await this.testConfiguration();
      
      console.log('✅ Sistema de backup configurado com sucesso!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Erro na configuração:', error.message);
      process.exit(1);
    }
  }

  async checkEnvironmentVariables() {
    console.log('📋 Verificando variáveis de ambiente...');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL'
    ];
    
    const optionalVars = [
      'BACKUP_ENCRYPTION_KEY',
      'BACKUP_REMOTE_ENABLED',
      'BACKUP_AWS_ACCESS_KEY',
      'BACKUP_AWS_SECRET_KEY',
      'BACKUP_AWS_BUCKET',
      'BACKUP_AWS_REGION',
      'BACKUP_EMAIL_ENABLED',
      'BACKUP_EMAIL_HOST',
      'BACKUP_EMAIL_USER',
      'BACKUP_EMAIL_PASS',
      'BACKUP_WEBHOOK_URL'
    ];
    
    const missing = [];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Variáveis obrigatórias não encontradas: ${missing.join(', ')}`);
    }
    
    console.log('✅ Variáveis obrigatórias verificadas');
    
    // Verificar opcionais
    const foundOptional = optionalVars.filter(v => process.env[v]);
    if (foundOptional.length > 0) {
      console.log(`📝 Variáveis opcionais encontradas: ${foundOptional.join(', ')}`);
    }
  }

  async createDirectoryStructure() {
    console.log('📁 Criando estrutura de diretórios...');
    
    const dirs = [
      this.configDir,
      this.backupDir,
      path.join(this.backupDir, 'full'),
      path.join(this.backupDir, 'incremental'),
      path.join(this.backupDir, 'logs'),
      path.join(this.backupDir, 'temp'),
      path.join(this.backupDir, 'metadata')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✅ Criado: ${dir}`);
      } else {
        console.log(`  📁 Já existe: ${dir}`);
      }
    }
    
    // Criar .gitignore para backups
    const gitignorePath = path.join(this.backupDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, '# Ignorar todos os backups\n*\n!.gitignore\n!README.md\n');
    }
    
    // Criar README
    const readmePath = path.join(this.backupDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      const readme = `# Diretório de Backups\n\nEste diretório contém os backups automatizados do sistema.\n\n## Estrutura\n\n- \`full/\` - Backups completos (semanais)\n- \`incremental/\` - Backups incrementais (diários)\n- \`logs/\` - Backups de logs\n- \`temp/\` - Arquivos temporários\n- \`metadata/\` - Metadados dos backups\n\n## Segurança\n\n⚠️ **IMPORTANTE**: Este diretório contém dados sensíveis e está excluído do controle de versão.\n`;
      fs.writeFileSync(readmePath, readme);
    }
  }

  async generateEncryptionKey() {
    console.log('🔐 Gerando chave de criptografia...');
    
    const keyPath = path.join(this.configDir, 'backup.key');
    
    if (!fs.existsSync(keyPath)) {
      const crypto = require('crypto');
      const key = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
      console.log(`  ✅ Chave gerada: ${keyPath}`);
    } else {
      console.log(`  🔑 Chave já existe: ${keyPath}`);
    }
  }

  async createConfigFile() {
    console.log('⚙️ Criando arquivo de configuração...');
    
    const configPath = path.join(this.configDir, 'backup.json');
    
    // Mesclar configuração padrão com variáveis de ambiente
    const config = { ...DEFAULT_CONFIG };
    
    // Configurar armazenamento remoto se habilitado
    if (process.env.BACKUP_REMOTE_ENABLED === 'true') {
      config.storage.remote.enabled = true;
      config.storage.remote.bucket = process.env.BACKUP_AWS_BUCKET || '';
      config.storage.remote.region = process.env.BACKUP_AWS_REGION || 'us-east-1';
      config.storage.remote.accessKey = process.env.BACKUP_AWS_ACCESS_KEY || '';
      config.storage.remote.secretKey = process.env.BACKUP_AWS_SECRET_KEY || '';
    }
    
    // Configurar notificações por email
    if (process.env.BACKUP_EMAIL_ENABLED === 'true') {
      config.notifications.email.enabled = true;
      config.notifications.email.smtp.host = process.env.BACKUP_EMAIL_HOST || '';
      config.notifications.email.smtp.user = process.env.BACKUP_EMAIL_USER || '';
      config.notifications.email.smtp.pass = process.env.BACKUP_EMAIL_PASS || '';
      config.notifications.email.to = (process.env.BACKUP_EMAIL_TO || '').split(',').filter(Boolean);
    }
    
    // Configurar webhook
    if (process.env.BACKUP_WEBHOOK_URL) {
      config.notifications.webhook.enabled = true;
      config.notifications.webhook.url = process.env.BACKUP_WEBHOOK_URL;
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`  ✅ Configuração salva: ${configPath}`);
  }

  async createBackupScripts() {
    console.log('📜 Criando scripts de backup...');
    
    // Script principal de backup
    const backupScript = `@echo off
REM Script de backup automatizado
REM Executa backup baseado no tipo especificado

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%\..

cd /d "%PROJECT_DIR%"

if "%1"=="" (
    echo Uso: backup.bat [full^|incremental^|logs]
    exit /b 1
)

node scripts/run-backup.js %1

if %ERRORLEVEL% neq 0 (
    echo Erro no backup: %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo Backup concluído com sucesso
`;
    
    const backupScriptPath = path.join(this.scriptsDir, 'backup.bat');
    fs.writeFileSync(backupScriptPath, backupScript);
    
    // Script Node.js para executar backup
    const runBackupScript = `#!/usr/bin/env node

/**
 * Script para executar backups
 * Uso: node run-backup.js [full|incremental|logs]
 */

const { BackupManager } = require('../src/lib/backup');
const fs = require('fs');
const path = require('path');

async function main() {
  const backupType = process.argv[2] || 'incremental';
  
  if (!['full', 'incremental', 'logs'].includes(backupType)) {
    console.error('Tipo de backup inválido. Use: full, incremental ou logs');
    process.exit(1);
  }
  
  try {
    // Carregar configuração
    const configPath = path.join(__dirname, '..', 'config', 'backup.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Criar instância do backup manager
    const backupManager = new BackupManager(config);
    
    console.log(\`🚀 Iniciando backup \${backupType}...\`);
    
    let result;
    switch (backupType) {
      case 'full':
        result = await backupManager.createFullBackup();
        break;
      case 'incremental':
        result = await backupManager.createIncrementalBackup();
        break;
      case 'logs':
        result = await backupManager.createLogsBackup();
        break;
    }
    
    if (result.success) {
      console.log('✅ Backup concluído com sucesso!');
      console.log(\`📁 Arquivo: \${result.filePath}\`);
      console.log(\`📊 Tamanho: \${(result.size / 1024 / 1024).toFixed(2)} MB\`);
      console.log(\`⏱️ Duração: \${result.duration}ms\`);
    } else {
      console.error('❌ Falha no backup:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
`;
    
    const runBackupScriptPath = path.join(this.scriptsDir, 'run-backup.js');
    fs.writeFileSync(runBackupScriptPath, runBackupScript);
    
    console.log(`  ✅ Scripts criados:`);
    console.log(`    - ${backupScriptPath}`);
    console.log(`    - ${runBackupScriptPath}`);
  }

  async setupScheduling() {
    console.log('⏰ Configurando agendamento...');
    
    const taskScript = `@echo off
REM Configurar tarefas agendadas do Windows para backups

echo Configurando tarefas agendadas...

REM Backup completo (domingos às 2h)
schtasks /create /tn "HubControl-BackupFull" /tr "\"%~dp0backup.bat\" full" /sc weekly /d SUN /st 02:00 /f
if %ERRORLEVEL% equ 0 (
    echo ✅ Tarefa de backup completo configurada
) else (
    echo ❌ Erro ao configurar backup completo
)

REM Backup incremental (segunda a sábado às 2h)
schtasks /create /tn "HubControl-BackupIncremental" /tr "\"%~dp0backup.bat\" incremental" /sc daily /st 02:00 /f
if %ERRORLEVEL% equ 0 (
    echo ✅ Tarefa de backup incremental configurada
) else (
    echo ❌ Erro ao configurar backup incremental
)

REM Backup de logs (a cada 6 horas)
schtasks /create /tn "HubControl-BackupLogs" /tr "\"%~dp0backup.bat\" logs" /sc hourly /mo 6 /f
if %ERRORLEVEL% equ 0 (
    echo ✅ Tarefa de backup de logs configurada
) else (
    echo ❌ Erro ao configurar backup de logs
)

echo.
echo Tarefas configuradas. Para verificar:
echo schtasks /query /tn "HubControl-*"
echo.
echo Para remover as tarefas:
echo schtasks /delete /tn "HubControl-BackupFull" /f
echo schtasks /delete /tn "HubControl-BackupIncremental" /f
echo schtasks /delete /tn "HubControl-BackupLogs" /f
`;
    
    const taskScriptPath = path.join(this.scriptsDir, 'setup-backup-tasks.bat');
    fs.writeFileSync(taskScriptPath, taskScript);
    
    console.log(`  ✅ Script de agendamento criado: ${taskScriptPath}`);
    console.log('  ⚠️ Execute como administrador para configurar as tarefas agendadas');
  }

  async testConfiguration() {
    console.log('🧪 Testando configuração...');
    
    try {
      // Testar carregamento da configuração
      const configPath = path.join(this.configDir, 'backup.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('  ✅ Configuração carregada com sucesso');
      
      // Testar chave de criptografia
      const keyPath = path.join(this.configDir, 'backup.key');
      if (fs.existsSync(keyPath)) {
        const key = fs.readFileSync(keyPath, 'utf8');
        if (key.length === 64) { // 32 bytes em hex
          console.log('  ✅ Chave de criptografia válida');
        } else {
          console.log('  ⚠️ Chave de criptografia com tamanho inválido');
        }
      }
      
      // Testar criação de backup de teste
      console.log('  🧪 Executando backup de teste...');
      const { BackupManager } = require('../src/lib/backup');
      const backupManager = new BackupManager(config);
      
      // Criar backup de teste apenas dos logs
      const testResult = await backupManager.createLogsBackup();
      
      if (testResult.success) {
        console.log('  ✅ Backup de teste executado com sucesso');
        
        // Limpar backup de teste
        if (fs.existsSync(testResult.filePath)) {
          fs.unlinkSync(testResult.filePath);
          console.log('  🗑️ Backup de teste removido');
        }
      } else {
        console.log('  ⚠️ Falha no backup de teste:', testResult.error);
      }
      
    } catch (error) {
      console.log('  ❌ Erro no teste:', error.message);
    }
  }

  printSummary() {
    console.log('\n📋 RESUMO DA CONFIGURAÇÃO');
    console.log('=' .repeat(50));
    console.log('✅ Sistema de backup configurado');
    console.log('📁 Diretório de backups: ./backups');
    console.log('⚙️ Configuração: ./config/backup.json');
    console.log('🔐 Chave de criptografia: ./config/backup.key');
    console.log('📜 Scripts: ./scripts/backup.bat, ./scripts/run-backup.js');
    console.log('\n📅 AGENDAMENTO PADRÃO:');
    console.log('- Backup completo: Domingos às 2h');
    console.log('- Backup incremental: Segunda a sábado às 2h');
    console.log('- Backup de logs: A cada 6 horas');
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    console.log('1. Execute como administrador: scripts/setup-backup-tasks.bat');
    console.log('2. Teste manualmente: npm run backup:test');
    console.log('3. Configure notificações no arquivo de configuração');
    console.log('4. Configure armazenamento remoto se necessário');
    console.log('\n⚠️ IMPORTANTE:');
    console.log('- Mantenha a chave de criptografia segura');
    console.log('- Teste os backups regularmente');
    console.log('- Monitore o espaço em disco');
    console.log('- Configure alertas para falhas de backup');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const setup = new BackupSetup();
  setup.setup().catch(console.error);
}

module.exports = { BackupSetup };