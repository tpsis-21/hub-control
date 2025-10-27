#!/usr/bin/env node

/**
 * Script para configurar ambiente de teste automatizado
 * Configura credenciais, banco de dados e serviços necessários para automação
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function copyFile(source, destination) {
  try {
    fs.copyFileSync(source, destination);
    return true;
  } catch (error) {
    log(`❌ Erro ao copiar ${source} para ${destination}: ${error.message}`, 'red');
    return false;
  }
}

function createTestDatabase() {
  log('🗄️  Configurando banco de dados de teste...', 'blue');
  
  try {
    // Verifica se PostgreSQL está disponível
    execSync('psql --version', { stdio: 'ignore' });
    
    // Cria banco de teste se não existir
    const createDbCommand = `
      psql -U postgres -c "CREATE DATABASE hub_control_test;" 2>/dev/null || echo "Database already exists"
    `;
    
    execSync(createDbCommand, { stdio: 'inherit' });
    log('✅ Banco de dados de teste configurado', 'green');
    
  } catch (error) {
    log('⚠️  PostgreSQL não encontrado. Configure manualmente o banco de teste.', 'yellow');
    log('   Comando: CREATE DATABASE hub_control_test;', 'cyan');
  }
}

function setupTestCredentials() {
  log('🔑 Configurando credenciais de teste...', 'blue');
  
  const envTestPath = path.join(process.cwd(), '.env.test');
  
  if (checkFileExists(envTestPath)) {
    log('✅ Arquivo .env.test já existe e está configurado', 'green');
    return true;
  }
  
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!checkFileExists(envExamplePath)) {
    log('❌ Arquivo .env.example não encontrado', 'red');
    return false;
  }
  
  if (copyFile(envExamplePath, envTestPath)) {
    log('✅ Credenciais de teste criadas em .env.test', 'green');
    log('⚠️  Revise as credenciais em .env.test antes de executar testes', 'yellow');
    return true;
  }
  
  return false;
}

function installTestDependencies() {
  log('📦 Verificando dependências de teste...', 'blue');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!checkFileExists(packageJsonPath)) {
    log('❌ package.json não encontrado', 'red');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const devDeps = packageJson.devDependencies || {};
    
    const requiredTestDeps = [
      'jest',
      '@testing-library/react',
      '@testing-library/jest-dom',
      'jest-environment-jsdom'
    ];
    
    const missingDeps = requiredTestDeps.filter(dep => !devDeps[dep]);
    
    if (missingDeps.length > 0) {
      log(`⚠️  Dependências de teste faltando: ${missingDeps.join(', ')}`, 'yellow');
      log('   Execute: npm install --save-dev ' + missingDeps.join(' '), 'cyan');
    } else {
      log('✅ Todas as dependências de teste estão instaladas', 'green');
    }
    
    return true;
    
  } catch (error) {
    log(`❌ Erro ao verificar dependências: ${error.message}`, 'red');
    return false;
  }
}

function createTestScripts() {
  log('📝 Criando scripts de teste...', 'blue');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    // Scripts de teste recomendados
    const testScripts = {
      'test': 'jest',
      'test:watch': 'jest --watch',
      'test:coverage': 'jest --coverage',
      'test:ci': 'jest --ci --coverage --watchAll=false',
      'test:automation': 'NODE_ENV=test jest --testPathPattern=automation'
    };
    
    let scriptsAdded = 0;
    
    Object.entries(testScripts).forEach(([script, command]) => {
      if (!packageJson.scripts[script]) {
        packageJson.scripts[script] = command;
        scriptsAdded++;
      }
    });
    
    if (scriptsAdded > 0) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      log(`✅ ${scriptsAdded} scripts de teste adicionados ao package.json`, 'green');
    } else {
      log('✅ Scripts de teste já estão configurados', 'green');
    }
    
    return true;
    
  } catch (error) {
    log(`❌ Erro ao configurar scripts: ${error.message}`, 'red');
    return false;
  }
}

function validateTestEnvironment() {
  log('🔍 Validando ambiente de teste...', 'blue');
  
  const checks = [
    {
      name: 'Node.js versão',
      check: () => {
        const version = process.version;
        const majorVersion = parseInt(version.slice(1).split('.')[0]);
        return majorVersion >= 16;
      },
      message: 'Node.js 16+ necessário'
    },
    {
      name: 'Arquivo .env.test',
      check: () => checkFileExists('.env.test'),
      message: 'Arquivo .env.test deve existir'
    },
    {
      name: 'Arquivo jest.setup.js',
      check: () => checkFileExists('jest.setup.js'),
      message: 'Arquivo jest.setup.js deve existir'
    },
    {
      name: 'Diretório src/',
      check: () => fs.existsSync('src') && fs.statSync('src').isDirectory(),
      message: 'Diretório src/ deve existir'
    }
  ];
  
  let allPassed = true;
  
  checks.forEach(({ name, check, message }) => {
    try {
      if (check()) {
        log(`  ✅ ${name}`, 'green');
      } else {
        log(`  ❌ ${name}: ${message}`, 'red');
        allPassed = false;
      }
    } catch (error) {
      log(`  ❌ ${name}: Erro na verificação`, 'red');
      allPassed = false;
    }
  });
  
  return allPassed;
}

function showTestCommands() {
  log('\n📋 Comandos de teste disponíveis:', 'bright');
  log('  npm test                 - Executar todos os testes', 'cyan');
  log('  npm run test:watch       - Executar testes em modo watch', 'cyan');
  log('  npm run test:coverage    - Executar testes com cobertura', 'cyan');
  log('  npm run test:ci          - Executar testes para CI/CD', 'cyan');
  log('  npm run test:automation  - Executar apenas testes de automação', 'cyan');
  log('\n🔧 Configuração adicional:', 'bright');
  log('  1. Revise as credenciais em .env.test', 'yellow');
  log('  2. Configure o banco de dados de teste', 'yellow');
  log('  3. Execute os testes para validar a configuração', 'yellow');
}

// Função principal
async function main() {
  log('🚀 Configurando ambiente de teste para Hub Control', 'bright');
  log('=' .repeat(50), 'blue');
  
  try {
    // Executar configurações
    setupTestCredentials();
    createTestDatabase();
    installTestDependencies();
    createTestScripts();
    
    log('\n🔍 Validação final:', 'bright');
    const isValid = validateTestEnvironment();
    
    if (isValid) {
      log('\n✅ Ambiente de teste configurado com sucesso!', 'green');
      showTestCommands();
    } else {
      log('\n⚠️  Ambiente de teste configurado com algumas pendências', 'yellow');
      log('   Revise os itens marcados com ❌ acima', 'yellow');
    }
    
  } catch (error) {
    log(`\n❌ Erro durante a configuração: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  setupTestCredentials,
  createTestDatabase,
  installTestDependencies,
  createTestScripts,
  validateTestEnvironment
};