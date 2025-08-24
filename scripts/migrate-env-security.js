#!/usr/bin/env node

/**
 * Script de Migração de Segurança - Hub Control
 * 
 * Este script ajuda na migração segura das variáveis de ambiente,
 * removendo exposições perigosas e configurando proxies adequados.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ENV_FILE = path.join(process.cwd(), '.env.local');
const SECURE_ENV_FILE = path.join(process.cwd(), '.env.local.secure');
const BACKUP_ENV_FILE = path.join(process.cwd(), '.env.local.backup');

// Configurações de segurança
const SECURITY_RULES = {
  // Variáveis que DEVEM ser privadas (nunca NEXT_PUBLIC_)
  PRIVATE_VARS: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'VAPID_PRIVATE_KEY',
    'TMDB_API_KEY',
    'BOT_API_KEY',
    'NATV_API_KEY'
  ],
  
  // Variáveis que podem ser públicas
  PUBLIC_VARS: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_API_URL'
  ],
  
  // Variáveis que devem ser removidas (exposições perigosas)
  REMOVE_VARS: [
    'NEXT_PUBLIC_TMDB_API_KEY',
    'NEXT_PUBLIC_BOT_API_KEY',
    'NEXT_PUBLIC_NATV_API_KEY'
  ]
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function readEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=');
        }
      }
    });
    
    return env;
  } catch (error) {
    log(`Erro ao ler arquivo ${filePath}: ${error.message}`, 'error');
    return {};
  }
}

function analyzeCurrentEnv() {
  log('🔍 Analisando configuração atual...', 'info');
  
  const currentEnv = readEnvFile(ENV_FILE);
  const issues = [];
  const recommendations = [];
  
  // Verifica exposições perigosas
  SECURITY_RULES.REMOVE_VARS.forEach(varName => {
    if (currentEnv[varName]) {
      issues.push(`❌ CRÍTICO: ${varName} está exposta publicamente`);
      recommendations.push(`Remover ${varName} e usar proxy em /app/api/proxy/`);
    }
  });
  
  // Verifica variáveis privadas expostas como públicas
  SECURITY_RULES.PRIVATE_VARS.forEach(varName => {
    const publicVersion = `NEXT_PUBLIC_${varName}`;
    if (currentEnv[publicVersion]) {
      issues.push(`❌ CRÍTICO: ${publicVersion} não deveria ser pública`);
      recommendations.push(`Renomear ${publicVersion} para ${varName}`);
    }
  });
  
  // Verifica se variáveis privadas existem
  SECURITY_RULES.PRIVATE_VARS.forEach(varName => {
    if (!currentEnv[varName] && !currentEnv[`NEXT_PUBLIC_${varName}`]) {
      issues.push(`⚠️  AVISO: ${varName} não encontrada`);
      recommendations.push(`Adicionar ${varName} com valor seguro`);
    }
  });
  
  return { issues, recommendations, currentEnv };
}

function createSecureEnv(currentEnv) {
  log('🔧 Criando configuração segura...', 'info');
  
  const secureEnv = {};
  
  // Copia variáveis públicas seguras
  SECURITY_RULES.PUBLIC_VARS.forEach(varName => {
    if (currentEnv[varName]) {
      secureEnv[varName] = currentEnv[varName];
    }
  });
  
  // Copia variáveis privadas (remove prefixo NEXT_PUBLIC_ se existir)
  SECURITY_RULES.PRIVATE_VARS.forEach(varName => {
    const publicVersion = `NEXT_PUBLIC_${varName}`;
    
    if (currentEnv[varName]) {
      secureEnv[varName] = currentEnv[varName];
    } else if (currentEnv[publicVersion]) {
      secureEnv[varName] = currentEnv[publicVersion];
      log(`📝 Movendo ${publicVersion} para ${varName}`, 'warning');
    }
  });
  
  // Adiciona outras variáveis não sensíveis
  Object.keys(currentEnv).forEach(key => {
    if (!SECURITY_RULES.REMOVE_VARS.includes(key) && 
        !SECURITY_RULES.PRIVATE_VARS.includes(key) && 
        !SECURITY_RULES.PUBLIC_VARS.includes(key) &&
        !key.startsWith('NEXT_PUBLIC_') &&
        !secureEnv[key]) {
      secureEnv[key] = currentEnv[key];
    }
  });
  
  return secureEnv;
}

function writeEnvFile(filePath, envObject) {
  const lines = [
    '# ============================================',
    '# HUB CONTROL - CONFIGURAÇÃO SEGURA',
    '# ============================================',
    '# Arquivo gerado automaticamente pelo script de migração',
    `# Data: ${new Date().toISOString()}`,
    '',
    '# ============================================',
    '# SUPABASE',
    '# ============================================'
  ];
  
  // Adiciona variáveis do Supabase
  ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].forEach(key => {
    if (envObject[key]) {
      lines.push(`${key}=${envObject[key]}`);
    }
  });
  
  lines.push('', '# ============================================', '# NOTIFICAÇÕES PUSH', '# ============================================');
  
  // Adiciona variáveis VAPID
  ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL'].forEach(key => {
    if (envObject[key]) {
      lines.push(`${key}=${envObject[key]}`);
    }
  });
  
  lines.push('', '# ============================================', '# APIs EXTERNAS (PRIVADAS)', '# ============================================');
  
  // Adiciona APIs externas
  ['TMDB_API_KEY', 'BOT_API_KEY', 'BOT_API_URL', 'NATV_API_KEY', 'NATV_API_URL'].forEach(key => {
    if (envObject[key]) {
      lines.push(`${key}=${envObject[key]}`);
    }
  });
  
  lines.push('', '# ============================================', '# CONFIGURAÇÕES DA APLICAÇÃO', '# ============================================');
  
  // Adiciona configurações da aplicação
  ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_API_URL', 'NODE_ENV'].forEach(key => {
    if (envObject[key]) {
      lines.push(`${key}=${envObject[key]}`);
    }
  });
  
  // Adiciona outras variáveis
  Object.keys(envObject).forEach(key => {
    if (![
      'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL',
      'TMDB_API_KEY', 'BOT_API_KEY', 'BOT_API_URL', 'NATV_API_KEY', 'NATV_API_URL',
      'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_API_URL', 'NODE_ENV'
    ].includes(key)) {
      lines.push(`${key}=${envObject[key]}`);
    }
  });
  
  fs.writeFileSync(filePath, lines.join('\n'));
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  log('🚀 Iniciando migração de segurança do Hub Control', 'info');
  log('', 'info');
  
  // Analisa configuração atual
  const analysis = analyzeCurrentEnv();
  
  if (analysis.issues.length > 0) {
    log('⚠️  PROBLEMAS DE SEGURANÇA ENCONTRADOS:', 'warning');
    analysis.issues.forEach(issue => log(`   ${issue}`, 'warning'));
    log('', 'info');
    
    log('💡 RECOMENDAÇÕES:', 'info');
    analysis.recommendations.forEach(rec => log(`   • ${rec}`, 'info'));
    log('', 'info');
  } else {
    log('✅ Nenhum problema crítico de segurança encontrado!', 'success');
  }
  
  const proceed = await askQuestion('Deseja prosseguir com a migração? (s/n): ');
  
  if (proceed !== 's' && proceed !== 'sim') {
    log('❌ Migração cancelada pelo usuário.', 'warning');
    rl.close();
    return;
  }
  
  // Cria backup
  if (fs.existsSync(ENV_FILE)) {
    log('📦 Criando backup do .env.local atual...', 'info');
    fs.copyFileSync(ENV_FILE, BACKUP_ENV_FILE);
    log(`✅ Backup criado: ${BACKUP_ENV_FILE}`, 'success');
  }
  
  // Cria nova configuração segura
  const secureEnv = createSecureEnv(analysis.currentEnv);
  writeEnvFile(ENV_FILE, secureEnv);
  
  log('✅ Migração concluída com sucesso!', 'success');
  log('', 'info');
  log('📋 PRÓXIMOS PASSOS:', 'info');
  log('   1. Verifique o novo .env.local', 'info');
  log('   2. Teste a aplicação: npm run dev', 'info');
  log('   3. Verifique se todas as funcionalidades funcionam', 'info');
  log('   4. Se houver problemas, restaure o backup:', 'info');
  log(`      cp ${BACKUP_ENV_FILE} ${ENV_FILE}`, 'info');
  log('', 'info');
  log('🔒 LEMBRE-SE:', 'warning');
  log('   • Nunca commite chaves sensíveis', 'warning');
  log('   • Use proxies para APIs externas', 'warning');
  log('   • Configure secrets no provedor de hospedagem', 'warning');
  
  rl.close();
}

if (require.main === module) {
  main().catch(error => {
    log(`Erro durante a migração: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  analyzeCurrentEnv,
  createSecureEnv,
  SECURITY_RULES
};