/**
 * Script para configurar monitoramento em produção
 * Configura logs, métricas, alertas e health checks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Função para executar comandos
function runCommand(command, description) {
  try {
    log(`Executando: ${command}`, 'yellow');
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    logSuccess(`${description} - Concluído`);
    return output;
  } catch (error) {
    logError(`${description} - Falhou: ${error.message}`);
    throw error;
  }
}

// Função para verificar se arquivo existe
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Função para criar diretório se não existir
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logSuccess(`Diretório criado: ${dirPath}`);
  }
}

// Função para verificar variáveis de ambiente
function checkEnvironmentVariables() {
  logStep('1', 'Verificando variáveis de ambiente de monitoramento');
  
  const requiredVars = [
    'NODE_ENV',
    'LOG_LEVEL',
    'LOG_ENABLE_CONSOLE',
    'LOG_ENABLE_FILE',
    'LOG_ENABLE_REMOTE',
  ];
  
  const optionalVars = [
    'LOG_DIR',
    'LOG_REMOTE_ENDPOINT',
    'LOG_REMOTE_API_KEY',
    'ALERT_EMAIL_ENABLED',
    'ALERT_SLACK_ENABLED',
    'ALERT_WEBHOOK_ENABLED',
    'ALERT_SLACK_WEBHOOK_URL',
    'ALERT_EMAIL_FROM',
    'ALERT_EMAIL_TO',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
  ];
  
  let missingRequired = [];
  let missingOptional = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    }
  });
  
  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  });
  
  if (missingRequired.length > 0) {
    logError(`Variáveis obrigatórias ausentes: ${missingRequired.join(', ')}`);
    return false;
  }
  
  if (missingOptional.length > 0) {
    logWarning(`Variáveis opcionais ausentes: ${missingOptional.join(', ')}`);
    logInfo('Algumas funcionalidades de monitoramento podem estar limitadas');
  }
  
  logSuccess('Verificação de variáveis de ambiente concluída');
  return true;
}

// Função para configurar estrutura de logs
function setupLoggingStructure() {
  logStep('2', 'Configurando estrutura de logs');
  
  const logDir = process.env.LOG_DIR || './logs';
  const logPath = path.resolve(logDir);
  
  ensureDirectory(logPath);
  
  // Criar arquivos de log iniciais
  const logFiles = ['debug.log', 'info.log', 'warn.log', 'error.log', 'fatal.log'];
  
  logFiles.forEach(file => {
    const filePath = path.join(logPath, file);
    if (!fileExists(filePath)) {
      fs.writeFileSync(filePath, '');
      logSuccess(`Arquivo de log criado: ${file}`);
    }
  });
  
  // Criar arquivo de configuração de rotação de logs
  const logrotateConfig = `${logPath}/*.log {
  daily
  missingok
  rotate 30
  compress
  delaycompress
  notifempty
  create 0644 www-data www-data
  postrotate
    # Reiniciar aplicação se necessário
    # systemctl reload hub-control
  endscript
}`;
  
  const logrotateConfigPath = path.join(logPath, 'logrotate.conf');
  fs.writeFileSync(logrotateConfigPath, logrotateConfig);
  logSuccess('Configuração de rotação de logs criada');
  
  logSuccess('Estrutura de logs configurada');
}

// Função para configurar alertas
function setupAlerting() {
  logStep('3', 'Configurando sistema de alertas');
  
  // Verificar configurações de canais de alerta
  const channels = {
    email: process.env.ALERT_EMAIL_ENABLED === 'true',
    slack: process.env.ALERT_SLACK_ENABLED === 'true',
    webhook: process.env.ALERT_WEBHOOK_ENABLED === 'true',
    sms: process.env.ALERT_SMS_ENABLED === 'true',
  };
  
  const enabledChannels = Object.entries(channels)
    .filter(([_, enabled]) => enabled)
    .map(([channel, _]) => channel);
  
  if (enabledChannels.length === 0) {
    logWarning('Nenhum canal de alerta configurado');
    logInfo('Configure pelo menos um canal para receber alertas');
  } else {
    logSuccess(`Canais de alerta configurados: ${enabledChannels.join(', ')}`);
  }
  
  // Testar configuração do Slack se habilitado
  if (channels.slack) {
    const webhookUrl = process.env.ALERT_SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      logError('ALERT_SLACK_WEBHOOK_URL não configurado');
    } else {
      logSuccess('Configuração do Slack verificada');
    }
  }
  
  // Testar configuração de email se habilitado
  if (channels.email) {
    const requiredEmailVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'ALERT_EMAIL_FROM', 'ALERT_EMAIL_TO'];
    const missingEmailVars = requiredEmailVars.filter(varName => !process.env[varName]);
    
    if (missingEmailVars.length > 0) {
      logError(`Variáveis de email ausentes: ${missingEmailVars.join(', ')}`);
    } else {
      logSuccess('Configuração de email verificada');
    }
  }
  
  logSuccess('Sistema de alertas configurado');
}

// Função para configurar health checks
function setupHealthChecks() {
  logStep('4', 'Configurando health checks');
  
  const healthCheckEndpoints = [
    '/api/health',
    '/api/health/bpix',
    '/api/metrics',
    '/api/monitoring/dashboard',
  ];
  
  logInfo(`Endpoints de health check disponíveis:`);
  healthCheckEndpoints.forEach(endpoint => {
    logInfo(`  - ${endpoint}`);
  });
  
  // Criar script de health check para monitoramento externo
  const healthCheckScript = `#!/bin/bash
# Script de health check para monitoramento externo

BASE_URL="\${1:-http://localhost:3000}"
TIMEOUT="\${2:-10}"

echo "Verificando health checks em \$BASE_URL..."

# Verificar endpoint principal
if curl -f -s --max-time \$TIMEOUT "\$BASE_URL/api/health" > /dev/null; then
  echo "✅ Health check principal: OK"
else
  echo "❌ Health check principal: FALHOU"
  exit 1
fi

# Verificar BPIX
if curl -f -s --max-time \$TIMEOUT "\$BASE_URL/api/health/bpix" > /dev/null; then
  echo "✅ Health check BPIX: OK"
else
  echo "⚠️  Health check BPIX: FALHOU"
fi

# Verificar métricas
if curl -f -s --max-time \$TIMEOUT "\$BASE_URL/api/metrics" > /dev/null; then
  echo "✅ Endpoint de métricas: OK"
else
  echo "⚠️  Endpoint de métricas: FALHOU"
fi

echo "Health checks concluídos"
`;
  
  const scriptsDir = path.resolve('./scripts');
  ensureDirectory(scriptsDir);
  
  const healthCheckPath = path.join(scriptsDir, 'health-check.sh');
  fs.writeFileSync(healthCheckPath, healthCheckScript);
  
  // Tornar o script executável (Unix/Linux)
  try {
    execSync(`chmod +x "${healthCheckPath}"`);
  } catch (error) {
    // Ignorar erro no Windows
  }
  
  logSuccess('Script de health check criado');
  logSuccess('Health checks configurados');
}

// Função para configurar métricas
function setupMetrics() {
  logStep('5', 'Configurando coleta de métricas');
  
  // Criar configuração de métricas personalizadas
  const metricsConfig = {
    enabled: true,
    interval: 60000, // 1 minuto
    retention: {
      raw: '1h',      // Dados brutos por 1 hora
      aggregated: '7d', // Dados agregados por 7 dias
      summary: '30d',   // Resumos por 30 dias
    },
    metrics: {
      system: {
        memory: true,
        cpu: true,
        disk: false, // Desabilitado por padrão
      },
      application: {
        requests: true,
        errors: true,
        responseTime: true,
        database: true,
        cache: true,
      },
      business: {
        users: true,
        channels: true,
        streams: true,
        payments: true,
      },
    },
    alerts: {
      enabled: true,
      thresholds: {
        memoryUsage: 80,
        errorRate: 5,
        responseTime: 2000,
        diskUsage: 85,
      },
    },
  };
  
  const configDir = path.resolve('./config');
  ensureDirectory(configDir);
  
  const metricsConfigPath = path.join(configDir, 'metrics.json');
  fs.writeFileSync(metricsConfigPath, JSON.stringify(metricsConfig, null, 2));
  
  logSuccess('Configuração de métricas criada');
  logSuccess('Coleta de métricas configurada');
}

// Função para testar configuração
function testConfiguration() {
  logStep('6', 'Testando configuração de monitoramento');
  
  try {
    // Testar importação dos módulos de monitoramento
    const loggerPath = path.resolve('./src/lib/logger.ts');
    const alertsPath = path.resolve('./src/lib/alerts.ts');
    
    if (!fileExists(loggerPath)) {
      throw new Error('Módulo de logger não encontrado');
    }
    
    if (!fileExists(alertsPath)) {
      throw new Error('Módulo de alertas não encontrado');
    }
    
    logSuccess('Módulos de monitoramento encontrados');
    
    // Verificar endpoints de API
    const apiEndpoints = [
      './src/pages/api/health/index.ts',
      './src/pages/api/health/bpix.ts',
      './src/pages/api/metrics/index.ts',
      './src/pages/api/monitoring/dashboard.ts',
      './src/pages/api/monitoring/alerts.ts',
    ];
    
    apiEndpoints.forEach(endpoint => {
      if (fileExists(path.resolve(endpoint))) {
        logSuccess(`Endpoint encontrado: ${path.basename(endpoint)}`);
      } else {
        logWarning(`Endpoint não encontrado: ${path.basename(endpoint)}`);
      }
    });
    
    logSuccess('Teste de configuração concluído');
  } catch (error) {
    logError(`Erro no teste de configuração: ${error.message}`);
    throw error;
  }
}

// Função para gerar relatório de configuração
function generateConfigurationReport() {
  logStep('7', 'Gerando relatório de configuração');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    monitoring: {
      logging: {
        enabled: true,
        level: process.env.LOG_LEVEL || 'info',
        console: process.env.LOG_ENABLE_CONSOLE !== 'false',
        file: process.env.LOG_ENABLE_FILE === 'true',
        remote: process.env.LOG_ENABLE_REMOTE === 'true',
        directory: process.env.LOG_DIR || './logs',
      },
      alerts: {
        enabled: process.env.NODE_ENV === 'production',
        channels: {
          email: process.env.ALERT_EMAIL_ENABLED === 'true',
          slack: process.env.ALERT_SLACK_ENABLED === 'true',
          webhook: process.env.ALERT_WEBHOOK_ENABLED === 'true',
          sms: process.env.ALERT_SMS_ENABLED === 'true',
        },
      },
      metrics: {
        enabled: true,
        endpoints: [
          '/api/health',
          '/api/health/bpix',
          '/api/metrics',
          '/api/monitoring/dashboard',
          '/api/monitoring/alerts',
        ],
      },
    },
    recommendations: [],
  };
  
  // Adicionar recomendações baseadas na configuração
  if (!report.monitoring.alerts.enabled) {
    report.recommendations.push('Habilitar alertas em produção');
  }
  
  if (!report.monitoring.logging.file && report.environment === 'production') {
    report.recommendations.push('Habilitar logs em arquivo para produção');
  }
  
  if (!Object.values(report.monitoring.alerts.channels).some(Boolean)) {
    report.recommendations.push('Configurar pelo menos um canal de alerta');
  }
  
  const reportsDir = path.resolve('./reports');
  ensureDirectory(reportsDir);
  
  const reportPath = path.join(reportsDir, `monitoring-setup-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Relatório gerado: ${reportPath}`);
  
  // Exibir resumo
  log('\n📊 RESUMO DA CONFIGURAÇÃO:', 'bright');
  log(`Environment: ${report.environment}`);
  log(`Logging: ${report.monitoring.logging.enabled ? '✅' : '❌'}`);
  log(`Alerts: ${report.monitoring.alerts.enabled ? '✅' : '❌'}`);
  log(`Metrics: ${report.monitoring.metrics.enabled ? '✅' : '❌'}`);
  
  if (report.recommendations.length > 0) {
    log('\n💡 RECOMENDAÇÕES:', 'yellow');
    report.recommendations.forEach(rec => {
      log(`  - ${rec}`);
    });
  }
  
  return report;
}

// Função principal
async function main() {
  try {
    log('🚀 CONFIGURAÇÃO DE MONITORAMENTO EM PRODUÇÃO', 'bright');
    log('================================================', 'bright');
    
    // Verificar se estamos em ambiente de produção
    if (process.env.NODE_ENV !== 'production') {
      logWarning('Não está em ambiente de produção');
      logInfo('Algumas configurações podem não ser aplicáveis');
    }
    
    // Executar etapas de configuração
    const envCheck = checkEnvironmentVariables();
    if (!envCheck) {
      logError('Configuração de variáveis de ambiente falhou');
      process.exit(1);
    }
    
    setupLoggingStructure();
    setupAlerting();
    setupHealthChecks();
    setupMetrics();
    testConfiguration();
    
    const report = generateConfigurationReport();
    
    log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!', 'green');
    log('=====================================', 'green');
    
    log('\n📋 PRÓXIMOS PASSOS:', 'cyan');
    log('1. Revisar variáveis de ambiente em .env.production');
    log('2. Configurar canais de alerta (Slack, email, etc.)');
    log('3. Testar endpoints de health check');
    log('4. Configurar monitoramento externo');
    log('5. Implementar rotação de logs');
    
    log('\n📚 DOCUMENTAÇÃO:', 'blue');
    log('- Health checks: /api/health');
    log('- Métricas: /api/metrics');
    log('- Dashboard: /api/monitoring/dashboard');
    log('- Alertas: /api/monitoring/alerts');
    
  } catch (error) {
    logError(`Erro durante a configuração: ${error.message}`);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  main,
  checkEnvironmentVariables,
  setupLoggingStructure,
  setupAlerting,
  setupHealthChecks,
  setupMetrics,
  testConfiguration,
  generateConfigurationReport,
};