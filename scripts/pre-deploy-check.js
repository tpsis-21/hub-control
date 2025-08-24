#!/usr/bin/env node

/**
 * Script de Verificação Pré-Deploy
 * 
 * Executa uma série de verificações antes do deploy para produção:
 * - Variáveis de ambiente
 * - Testes
 * - Lint
 * - TypeScript
 * - Segurança
 * - Build
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
  log(`\n🔍 ${step}: ${description}`, 'cyan');
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

function runCommand(command, description) {
  try {
    log(`   Executando: ${command}`, 'blue');
    execSync(command, { stdio: 'pipe' });
    logSuccess(description);
    return true;
  } catch (error) {
    logError(`${description} - ${error.message}`);
    return false;
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description} encontrado`);
    return true;
  } else {
    logError(`${description} não encontrado: ${filePath}`);
    return false;
  }
}

function checkEnvVars() {
  logStep('1', 'Verificando variáveis de ambiente');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  let allPresent = true;
  
  // Verificar se arquivo .env.production existe
  if (!checkFile('.env.production', 'Arquivo .env.production')) {
    logWarning('Crie o arquivo .env.production baseado no .env.production.example');
    allPresent = false;
  }
  
  // Verificar variáveis essenciais
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`${varName} configurada`);
    } else {
      logError(`${varName} não configurada`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

function checkDependencies() {
  logStep('2', 'Verificando dependências');
  
  return runCommand('npm audit --audit-level=high', 'Auditoria de segurança das dependências');
}

function runTests() {
  logStep('3', 'Executando testes');
  
  return runCommand('npm test -- --passWithNoTests', 'Testes unitários');
}

function runLint() {
  logStep('4', 'Verificando qualidade do código');
  
  const lintResult = runCommand('npm run lint', 'ESLint');
  const typeCheckResult = runCommand('npm run typecheck', 'TypeScript');
  
  return lintResult && typeCheckResult;
}

function checkSecurity() {
  logStep('5', 'Verificações de segurança');
  
  let allSecure = true;
  
  // Verificar se há arquivos sensíveis
  const sensitiveFiles = ['.env', '.env.local', '.env.development'];
  sensitiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logWarning(`Arquivo sensível encontrado: ${file} (certifique-se de que está no .gitignore)`);
    }
  });
  
  // Verificar .gitignore
  if (checkFile('.gitignore', 'Arquivo .gitignore')) {
    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    const requiredIgnores = ['.env', '.env.local', '.env.production', 'node_modules'];
    
    requiredIgnores.forEach(pattern => {
      if (gitignoreContent.includes(pattern)) {
        logSuccess(`${pattern} está no .gitignore`);
      } else {
        logError(`${pattern} não está no .gitignore`);
        allSecure = false;
      }
    });
  }
  
  return allSecure;
}

function checkBuild() {
  logStep('6', 'Verificando build de produção');
  
  // Limpar build anterior
  try {
    execSync('rm -rf .next out', { stdio: 'pipe' });
  } catch (error) {
    // Ignorar erro se diretórios não existem
  }
  
  return runCommand('npm run build:static', 'Build estático para produção');
}

function checkFirebaseConfig() {
  logStep('7', 'Verificando configuração do Firebase');
  
  let allConfigured = true;
  
  allConfigured &= checkFile('firebase.json', 'Configuração do Firebase');
  allConfigured &= checkFile('.firebaserc', 'Projeto do Firebase');
  
  // Verificar se Firebase CLI está instalado
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    logSuccess('Firebase CLI instalado');
  } catch (error) {
    logError('Firebase CLI não instalado. Execute: npm install -g firebase-tools');
    allConfigured = false;
  }
  
  return allConfigured;
}

function generateReport(results) {
  log('\n' + '='.repeat(50), 'magenta');
  log('📊 RELATÓRIO DE VERIFICAÇÃO PRÉ-DEPLOY', 'magenta');
  log('='.repeat(50), 'magenta');
  
  const checks = [
    { name: 'Variáveis de Ambiente', result: results.envVars },
    { name: 'Dependências', result: results.dependencies },
    { name: 'Testes', result: results.tests },
    { name: 'Qualidade do Código', result: results.lint },
    { name: 'Segurança', result: results.security },
    { name: 'Build', result: results.build },
    { name: 'Configuração Firebase', result: results.firebase }
  ];
  
  checks.forEach(check => {
    const status = check.result ? '✅ PASSOU' : '❌ FALHOU';
    const color = check.result ? 'green' : 'red';
    log(`${check.name}: ${status}`, color);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  log('\n' + '='.repeat(50), 'magenta');
  
  if (allPassed) {
    log('🎉 TODAS AS VERIFICAÇÕES PASSARAM!', 'green');
    log('✅ Pronto para deploy em produção', 'green');
    log('\n💡 Execute: npm run deploy:prod', 'cyan');
  } else {
    log('🚫 ALGUMAS VERIFICAÇÕES FALHARAM!', 'red');
    log('❌ NÃO está pronto para deploy', 'red');
    log('\n🔧 Corrija os problemas acima antes de fazer deploy', 'yellow');
  }
  
  log('='.repeat(50), 'magenta');
  
  return allPassed;
}

// Função principal
function main() {
  log('🚀 INICIANDO VERIFICAÇÃO PRÉ-DEPLOY', 'magenta');
  log('='.repeat(50), 'magenta');
  
  const results = {
    envVars: checkEnvVars(),
    dependencies: checkDependencies(),
    tests: runTests(),
    lint: runLint(),
    security: checkSecurity(),
    build: checkBuild(),
    firebase: checkFirebaseConfig()
  };
  
  const success = generateReport(results);
  
  process.exit(success ? 0 : 1);
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };