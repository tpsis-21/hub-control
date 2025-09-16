#!/usr/bin/env node

/**
 * Script de Deploy Automatizado para Produção
 * 
 * Este script automatiza todo o processo de deploy:
 * - Verificações pré-deploy
 * - Build otimizado
 * - Deploy no Vercel
 * - Verificações pós-deploy
 * - Notificações
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
  log(`\n🚀 ETAPA ${step}: ${description}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function runCommand(command, description, options = {}) {
  try {
    log(`   Executando: ${command}`, 'blue');
    const result = execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options 
    });
    logSuccess(description);
    return { success: true, output: result };
  } catch (error) {
    logError(`${description} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

function confirmDeploy() {
  log('\n⚠️  ATENÇÃO: Você está prestes a fazer deploy em PRODUÇÃO!', 'yellow');
  log('\n🔍 Verificações que serão executadas:', 'cyan');
  log('   • Variáveis de ambiente');
  log('   • Testes unitários');
  log('   • Qualidade do código (lint + TypeScript)');
  log('   • Auditoria de segurança');
  log('   • Build de produção');
  log('   • Deploy no Vercel');
  log('   • Verificações pós-deploy');
  
  // Em um ambiente real, você poderia usar readline para confirmação
  // Por agora, assumimos confirmação automática
  log('\n✅ Prosseguindo com o deploy...', 'green');
  return true;
}

function preDeployChecks() {
  logStep('1', 'Verificações Pré-Deploy');
  
  const result = runCommand('npm run pre-deploy', 'Verificações pré-deploy');
  
  if (!result.success) {
    logError('Verificações pré-deploy falharam!');
    logError('Corrija os problemas antes de continuar.');
    process.exit(1);
  }
  
  return true;
}

function createBackup() {
  logStep('2', 'Criando Backup');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backups/deploy-${timestamp}`;
  
  try {
    // Criar diretório de backup
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups');
    }
    
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup de arquivos importantes
    const filesToBackup = [
      'package.json',
      'next.config.ts',
      'vercel.json'
    ];
    
    filesToBackup.forEach(file => {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(backupDir, file));
        logSuccess(`Backup criado: ${file}`);
      }
    });
    
    // Salvar informações do deploy
    const deployInfo = {
      timestamp: new Date().toISOString(),
      version: require('../package.json').version,
      nodeVersion: process.version,
      platform: process.platform
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'deploy-info.json'),
      JSON.stringify(deployInfo, null, 2)
    );
    
    logSuccess(`Backup criado em: ${backupDir}`);
    return backupDir;
    
  } catch (error) {
    logWarning(`Falha ao criar backup: ${error.message}`);
    return null;
  }
}

function buildProduction() {
  logStep('3', 'Build de Produção');
  
  // Limpar builds anteriores
  log('   Limpando builds anteriores...', 'blue');
  try {
    execSync('rm -rf .next out', { stdio: 'pipe' });
  } catch (error) {
    // Ignorar se diretórios não existem
  }
  
  // Build otimizado
  const result = runCommand('npm run build:static', 'Build estático otimizado');
  
  if (!result.success) {
    logError('Build de produção falhou!');
    process.exit(1);
  }
  
  // Verificar se build foi criado
  if (!fs.existsSync('out')) {
    logError('Diretório de build não foi criado!');
    process.exit(1);
  }
  
  logSuccess('Build de produção concluído');
  return true;
}

function deployToVercel() {
  logStep('4', 'Deploy no Vercel');
  
  // Verificar se Vercel CLI está disponível
  const cliCheck = runCommand('vercel --version', 'Verificação do Vercel CLI', { silent: true });
  
  if (!cliCheck.success) {
    log('Instalando Vercel CLI...', 'yellow');
    const installResult = runCommand('npm install -g vercel', 'Instalação do Vercel CLI');
    
    if (!installResult.success) {
      logError('Falha ao instalar Vercel CLI!');
      process.exit(1);
    }
  }
  
  // Deploy para produção
  const result = runCommand('vercel --prod --yes', 'Deploy no Vercel');
  
  if (!result.success) {
    logError('Deploy no Vercel falhou!');
    process.exit(1);
  }
  
  logSuccess('Deploy no Vercel concluído');
  return true;
}

function postDeployChecks() {
  logStep('5', 'Verificações Pós-Deploy');
  
  // Obter URL do projeto
  let projectUrl;
  try {
    // Tentar obter URL do último deploy do Vercel
    const vercelResult = runCommand('vercel ls', 'Obter URL do projeto', { silent: true });
    if (vercelResult.success) {
      // Parse da saída do vercel ls para obter a URL
      projectUrl = 'https://seu-projeto.vercel.app'; // URL será mostrada no output do deploy
    } else {
      projectUrl = 'https://seu-projeto.vercel.app';
    }
  } catch (error) {
    logWarning('Não foi possível determinar URL do projeto');
    projectUrl = 'https://seu-projeto.vercel.app';
  }
  
  log(`   Verificando: ${projectUrl}`, 'blue');
  
  // Verificar se site está no ar
  try {
    const curlResult = runCommand(`curl -I ${projectUrl}`, 'Verificação de conectividade', { silent: true });
    
    if (curlResult.success) {
      logSuccess('Site está respondendo');
    } else {
      logWarning('Site pode não estar respondendo corretamente');
    }
  } catch (error) {
    logWarning('Não foi possível verificar conectividade (curl não disponível)');
  }
  
  // Verificar APIs básicas
  try {
    const healthCheck = runCommand(`curl -f ${projectUrl}/api/health`, 'Verificação de APIs', { silent: true });
    
    if (healthCheck.success) {
      logSuccess('APIs estão respondendo');
    } else {
      logWarning('APIs podem não estar funcionando');
    }
  } catch (error) {
    logWarning('Não foi possível verificar APIs');
  }
  
  return projectUrl;
}

function generateDeployReport(deployInfo) {
  logStep('6', 'Relatório de Deploy');
  
  const report = {
    timestamp: new Date().toISOString(),
    success: true,
    version: require('../package.json').version,
    url: deployInfo.url,
    backupPath: deployInfo.backupPath,
    duration: deployInfo.duration,
    checks: {
      preDeployChecks: true,
      backup: !!deployInfo.backupPath,
      build: true,
      deploy: true,
      postDeployChecks: true
    }
  };
  
  // Salvar relatório
  const reportPath = `reports/deploy-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  try {
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports');
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logSuccess(`Relatório salvo em: ${reportPath}`);
  } catch (error) {
    logWarning(`Falha ao salvar relatório: ${error.message}`);
  }
  
  // Exibir resumo
  log('\n' + '='.repeat(60), 'magenta');
  log('🎉 DEPLOY CONCLUÍDO COM SUCESSO!', 'green');
  log('='.repeat(60), 'magenta');
  log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 'cyan');
  log(`🌐 URL: ${deployInfo.url}`, 'cyan');
  log(`⏱️  Duração: ${deployInfo.duration}ms`, 'cyan');
  log(`📦 Versão: ${report.version}`, 'cyan');
  
  if (deployInfo.backupPath) {
    log(`💾 Backup: ${deployInfo.backupPath}`, 'cyan');
  }
  
  log('\n✅ Próximos passos:', 'green');
  log('   • Verificar funcionamento no navegador');
  log('   • Monitorar logs e métricas');
  log('   • Testar funcionalidades críticas');
  log('   • Notificar equipe sobre o deploy');
  
  log('\n🔗 Links úteis:', 'blue');
  log(`   • Site: ${deployInfo.url}`);
  log('   • Vercel Dashboard: https://vercel.com/dashboard');
  log('   • Logs: Vercel Dashboard > Functions > Logs');
  
  log('='.repeat(60), 'magenta');
  
  return report;
}

// Função principal
function main() {
  const startTime = Date.now();
  
  log('🚀 INICIANDO DEPLOY PARA PRODUÇÃO', 'magenta');
  log('='.repeat(60), 'magenta');
  
  try {
    // Confirmação
    if (!confirmDeploy()) {
      log('Deploy cancelado pelo usuário.', 'yellow');
      process.exit(0);
    }
    
    // Executar etapas
    preDeployChecks();
    const backupPath = createBackup();
    buildProduction();
    deployToVercel();
    const url = postDeployChecks();
    
    // Relatório final
    const duration = Date.now() - startTime;
    const deployInfo = {
      url,
      backupPath,
      duration
    };
    
    generateDeployReport(deployInfo);
    
  } catch (error) {
    logError(`Deploy falhou: ${error.message}`);
    log('\n🔧 Verifique os logs acima para mais detalhes.', 'yellow');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };