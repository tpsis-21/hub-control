// scripts/diagnose-dashboard-abort.js
// Script para diagnosticar erro net::ERR_ABORTED no dashboard
// Data: 2024-12-23

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configurações
const BASE_URL = 'http://localhost:9010';
const DASHBOARD_URL = `${BASE_URL}/dashboard`;
const API_BASE = `${BASE_URL}/api`;

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

// Função para testar conectividade básica
async function testBasicConnectivity() {
  logSection('🌐 TESTE DE CONECTIVIDADE BÁSICA');
  
  const tests = [
    { name: 'Servidor Next.js', url: BASE_URL },
    { name: 'Página de Login', url: `${BASE_URL}/login` },
    { name: 'API Health Check', url: `${API_BASE}/health` },
    { name: 'Dashboard (GET)', url: DASHBOARD_URL }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      log(`\n🔍 Testando: ${test.name}`);
      
      const startTime = Date.now();
      const response = await fetch(test.url, {
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'Dashboard-Diagnostic-Script/1.0'
        }
      });
      const endTime = Date.now();
      
      const result = {
        name: test.name,
        url: test.url,
        status: response.status,
        statusText: response.statusText,
        responseTime: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        success: response.ok
      };
      
      if (response.ok) {
        log(`  ✅ ${test.name}: ${response.status} (${result.responseTime}ms)`, 'green');
      } else {
        log(`  ❌ ${test.name}: ${response.status} ${response.statusText}`, 'red');
      }
      
      results.push(result);
      
    } catch (error) {
      log(`  🚫 ${test.name}: ${error.message}`, 'red');
      results.push({
        name: test.name,
        url: test.url,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

// Função para testar redirecionamentos
async function testRedirects() {
  logSection('🔄 TESTE DE REDIRECIONAMENTOS');
  
  const tests = [
    { name: 'Raiz para Dashboard', url: BASE_URL },
    { name: 'Dashboard direto', url: DASHBOARD_URL }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      log(`\n🔍 Testando redirecionamentos: ${test.name}`);
      
      const response = await fetch(test.url, {
        method: 'GET',
        redirect: 'manual', // Não seguir redirecionamentos automaticamente
        timeout: 10000
      });
      
      const result = {
        name: test.name,
        url: test.url,
        status: response.status,
        statusText: response.statusText,
        location: response.headers.get('location'),
        isRedirect: [301, 302, 303, 307, 308].includes(response.status)
      };
      
      if (result.isRedirect) {
        log(`  🔄 ${test.name}: ${response.status} → ${result.location}`, 'yellow');
      } else {
        log(`  ✅ ${test.name}: ${response.status} (sem redirecionamento)`, 'green');
      }
      
      results.push(result);
      
    } catch (error) {
      log(`  🚫 ${test.name}: ${error.message}`, 'red');
      results.push({
        name: test.name,
        url: test.url,
        error: error.message
      });
    }
  }
  
  return results;
}

// Função para testar APIs específicas do dashboard
async function testDashboardAPIs() {
  logSection('📊 TESTE DE APIs DO DASHBOARD');
  
  const apis = [
    { name: 'Clientes', endpoint: '/api/clientes' },
    { name: 'Planos', endpoint: '/api/planos' },
    { name: 'Servidores', endpoint: '/api/servidores' },
    { name: 'Logs', endpoint: '/api/logs' },
    { name: 'Reports', endpoint: '/api/reports' }
  ];
  
  const results = [];
  
  for (const api of apis) {
    try {
      log(`\n🔍 Testando API: ${api.name}`);
      
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}${api.endpoint}`, {
        method: 'GET',
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Dashboard-Diagnostic-Script/1.0'
        }
      });
      const endTime = Date.now();
      
      const result = {
        name: api.name,
        endpoint: api.endpoint,
        status: response.status,
        statusText: response.statusText,
        responseTime: endTime - startTime,
        contentType: response.headers.get('content-type'),
        success: response.ok
      };
      
      if (response.ok) {
        log(`  ✅ ${api.name}: ${response.status} (${result.responseTime}ms)`, 'green');
      } else {
        log(`  ❌ ${api.name}: ${response.status} ${response.statusText}`, 'red');
      }
      
      results.push(result);
      
    } catch (error) {
      log(`  🚫 ${api.name}: ${error.message}`, 'red');
      results.push({
        name: api.name,
        endpoint: api.endpoint,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

// Função para verificar arquivos críticos
async function checkCriticalFiles() {
  logSection('📁 VERIFICAÇÃO DE ARQUIVOS CRÍTICOS');
  
  const files = [
    'src/app/(app)/dashboard/page.tsx',
    'src/app/(app)/dashboard/dashboard-content.tsx',
    'src/app/(app)/layout.tsx',
    'src/components/app/modern-header.tsx',
    'src/components/app/modern-sidebar.tsx',
    'src/hooks/useDashboardMetrics.ts',
    'src/services/dashboard.service.ts'
  ];
  
  const results = [];
  
  for (const file of files) {
    try {
      const fullPath = path.join(process.cwd(), file);
      const exists = fs.existsSync(fullPath);
      
      if (exists) {
        const stats = fs.statSync(fullPath);
        log(`  ✅ ${file} (${stats.size} bytes)`, 'green');
        results.push({ file, exists: true, size: stats.size });
      } else {
        log(`  ❌ ${file} (não encontrado)`, 'red');
        results.push({ file, exists: false });
      }
      
    } catch (error) {
      log(`  🚫 ${file}: ${error.message}`, 'red');
      results.push({ file, exists: false, error: error.message });
    }
  }
  
  return results;
}

// Função para simular navegação do dashboard
async function simulateDashboardNavigation() {
  logSection('🧭 SIMULAÇÃO DE NAVEGAÇÃO DO DASHBOARD');
  
  const navigationSteps = [
    { name: 'Acesso inicial', url: BASE_URL },
    { name: 'Dashboard direto', url: DASHBOARD_URL },
    { name: 'Dashboard com parâmetros', url: `${DASHBOARD_URL}?refresh=true` }
  ];
  
  const results = [];
  
  for (const step of navigationSteps) {
    try {
      log(`\n🔍 ${step.name}: ${step.url}`);
      
      const startTime = Date.now();
      const response = await fetch(step.url, {
        method: 'GET',
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });
      const endTime = Date.now();
      
      const result = {
        name: step.name,
        url: step.url,
        status: response.status,
        statusText: response.statusText,
        responseTime: endTime - startTime,
        contentLength: response.headers.get('content-length'),
        success: response.ok
      };
      
      if (response.ok) {
        log(`  ✅ ${step.name}: ${response.status} (${result.responseTime}ms)`, 'green');
      } else {
        log(`  ❌ ${step.name}: ${response.status} ${response.statusText}`, 'red');
      }
      
      results.push(result);
      
    } catch (error) {
      log(`  🚫 ${step.name}: ${error.message}`, 'red');
      results.push({
        name: step.name,
        url: step.url,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

// Função principal
async function main() {
  log('🔍 DIAGNÓSTICO DE ERRO net::ERR_ABORTED NO DASHBOARD', 'bold');
  log('Data: ' + new Date().toLocaleString('pt-BR'), 'cyan');
  
  const report = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  try {
    // Executar todos os testes
    report.tests.connectivity = await testBasicConnectivity();
    report.tests.redirects = await testRedirects();
    report.tests.dashboardAPIs = await testDashboardAPIs();
    report.tests.criticalFiles = await checkCriticalFiles();
    report.tests.navigation = await simulateDashboardNavigation();
    
    // Gerar relatório final
    logSection('📋 RELATÓRIO FINAL');
    
    const allTests = Object.values(report.tests).flat();
    const successfulTests = allTests.filter(test => test.success === true);
    const failedTests = allTests.filter(test => test.success === false);
    const totalTests = allTests.length;
    const successRate = Math.round((successfulTests.length / totalTests) * 100);
    
    log(`\n📊 Estatísticas:`);
    log(`  • Total de testes: ${totalTests}`);
    log(`  • Sucessos: ${successfulTests.length}`, 'green');
    log(`  • Falhas: ${failedTests.length}`, failedTests.length > 0 ? 'red' : 'green');
    log(`  • Taxa de sucesso: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
    
    if (failedTests.length > 0) {
      log(`\n❌ Testes que falharam:`, 'red');
      failedTests.forEach(test => {
        log(`  • ${test.name}: ${test.error || test.statusText || 'Erro desconhecido'}`, 'red');
      });
    }
    
    // Recomendações específicas para net::ERR_ABORTED
    log(`\n💡 Análise do erro net::ERR_ABORTED:`, 'yellow');
    log(`  • Este erro geralmente indica que uma requisição foi cancelada`);
    log(`  • Possíveis causas:`);
    log(`    - Redirecionamentos em loop`);
    log(`    - Timeout de requisições`);
    log(`    - Problemas de JavaScript no frontend`);
    log(`    - Cancelamento manual de requisições`);
    log(`    - Problemas de middleware`);
    
    log(`\n🔧 Próximos passos recomendados:`, 'cyan');
    log(`  1. Verificar console do navegador para erros JavaScript`);
    log(`  2. Verificar Network tab para requisições canceladas`);
    log(`  3. Verificar logs do servidor Next.js`);
    log(`  4. Testar com cache do navegador limpo`);
    log(`  5. Verificar se há loops de redirecionamento`);
    
    // Salvar relatório
    const reportPath = path.join(process.cwd(), 'scripts', 'dashboard-abort-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n💾 Relatório salvo em: ${reportPath}`, 'cyan');
    
  } catch (error) {
    log(`\n🚫 Erro durante diagnóstico: ${error.message}`, 'red');
    console.error(error);
  }
}

// Executar diagnóstico
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };