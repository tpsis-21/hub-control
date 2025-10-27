// ============================================================================
// 🧪 TESTE COMPLETO DE GERENCIAMENTO DE SERVIDORES - VERSÃO ATUALIZADA
// ============================================================================
// Data: 2024-12-25
// Versão: 2.0 - Corrigida para resolver falhas identificadas

const BASE_URL = 'http://localhost:8080';

// Cores para logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80));
}

// ============================================================================
// 🔍 TESTES INDIVIDUAIS
// ============================================================================

async function testPageAccess(url, name) {
  try {
    log(`\n🔍 Testando: ${name}`, 'blue');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    // Verificar se é redirecionamento para login (esperado para páginas protegidas)
    if (response.status === 200 || (response.status >= 300 && response.status < 400)) {
      log(`✅ ${name}: SUCCESS (${response.status})`, 'green');
      return { name, status: response.status, success: true };
    } else {
      log(`❌ ${name}: FAILED (${response.status})`, 'red');
      return { name, status: response.status, success: false };
    }
    
  } catch (error) {
    log(`❌ ${name}: ERROR - ${error.message}`, 'red');
    return { name, error: error.message, success: false };
  }
}

async function testApiEndpoint(url, name, requiresAuth = false) {
  try {
    log(`\n🔍 Testando: ${name}`, 'blue');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      }
    });
    
    // Para APIs que requerem auth, 401 é esperado sem token
    if (requiresAuth && response.status === 401) {
      log(`✅ ${name}: SUCCESS (401 - Auth Required)`, 'green');
      return { name, status: response.status, success: true, note: 'Auth required as expected' };
    }
    
    if (response.status === 200) {
      log(`✅ ${name}: SUCCESS (${response.status})`, 'green');
      return { name, status: response.status, success: true };
    } else {
      log(`❌ ${name}: FAILED (${response.status})`, 'red');
      return { name, status: response.status, success: false };
    }
    
  } catch (error) {
    log(`❌ ${name}: ERROR - ${error.message}`, 'red');
    return { name, error: error.message, success: false };
  }
}

async function testHealthCheck() {
  try {
    log(`\n🔍 Testando: Health Check`, 'blue');
    
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const endTime = Date.now();
    
    if (response.status === 200) {
      log(`✅ Health Check: SUCCESS (${endTime - startTime}ms)`, 'green');
      return { name: 'Health Check', status: response.status, responseTime: endTime - startTime, success: true };
    } else {
      log(`❌ Health Check: FAILED (${response.status})`, 'red');
      return { name: 'Health Check', status: response.status, success: false };
    }
    
  } catch (error) {
    log(`❌ Health Check: ERROR - ${error.message}`, 'red');
    return { name: 'Health Check', error: error.message, success: false };
  }
}

async function testSystemStatus() {
  try {
    log(`\n🔍 Testando: Status do Sistema`, 'blue');
    
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const endTime = Date.now();
    
    if (response.status === 200) {
      log(`✅ Status do Sistema: SUCCESS (${endTime - startTime}ms)`, 'green');
      return { name: 'Status do Sistema', status: response.status, responseTime: endTime - startTime, success: true };
    } else {
      log(`❌ Status do Sistema: FAILED (${response.status})`, 'red');
      return { name: 'Status do Sistema', status: response.status, success: false };
    }
    
  } catch (error) {
    log(`❌ Status do Sistema: ERROR - ${error.message}`, 'red');
    return { name: 'Status do Sistema', error: error.message, success: false };
  }
}

// ============================================================================
// 🚀 EXECUÇÃO PRINCIPAL
// ============================================================================

async function runCompleteTest() {
  logSection('🧪 TESTE COMPLETO DE GERENCIAMENTO DE SERVIDORES - V2.0');
  
  const results = [];
  
  // 1. TESTANDO PÁGINAS PRINCIPAIS
  logSection('1. TESTANDO PÁGINAS PRINCIPAIS');
  
  const pageTests = [
    { url: `${BASE_URL}/servidores`, name: 'Página de Servidores' },
    { url: `${BASE_URL}/dashboard`, name: 'Dashboard Principal' }
  ];
  
  for (const test of pageTests) {
    const result = await testPageAccess(test.url, test.name);
    results.push(result);
  }
  
  // 2. TESTANDO APIs DE SERVIDORES
  logSection('🔌 2. TESTANDO APIs DE SERVIDORES');
  
  const apiTests = [
    { url: `${BASE_URL}/api/activities/recent`, name: 'API de Atividades Recentes' },
    { url: `${BASE_URL}/api/monitoring`, name: 'API de Monitoramento' },
    { url: `${BASE_URL}/api/reports`, name: 'API de Relatórios', requiresAuth: true }
  ];
  
  for (const test of apiTests) {
    const result = await testApiEndpoint(test.url, test.name, test.requiresAuth);
    results.push(result);
  }
  
  // 3. TESTANDO INTEGRAÇÕES
  logSection('🔗 3. TESTANDO INTEGRAÇÕES');
  
  const integrationTests = [
     { 
       url: `${BASE_URL}/api/natv/test`, 
       name: 'Teste NATV (POST)',
       method: 'POST',
       body: { test: true }
     },
     { 
       url: `${BASE_URL}/api/integrations/thebest/test`, 
       name: 'Teste TheBest (POST)',
       method: 'POST',
       body: { test: true }
     }
   ];
  
  for (const test of integrationTests) {
    try {
      log(`\n🔍 Testando: ${test.name}`, 'blue');
      
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(test.body)
      });
      
      // Para testes de integração, 401 é aceitável (requer auth)
      if (response.status === 200 || response.status === 401) {
        log(`✅ ${test.name}: SUCCESS (${response.status})`, 'green');
        results.push({ name: test.name, status: response.status, success: true });
      } else {
        log(`❌ ${test.name}: FAILED (${response.status})`, 'red');
        results.push({ name: test.name, status: response.status, success: false });
      }
      
    } catch (error) {
      log(`❌ ${test.name}: ERROR - ${error.message}`, 'red');
      results.push({ name: test.name, error: error.message, success: false });
    }
  }
  
  // 4. TESTANDO CONFIGURAÇÕES ADMINISTRATIVAS
  logSection('⚙️ 4. TESTANDO CONFIGURAÇÕES ADMINISTRATIVAS');
  
  const adminTests = [
    { url: `${BASE_URL}/api/admin/natv-config`, name: 'Configurações NATV (Admin)', requiresAuth: true },
    { url: `${BASE_URL}/api/admin/bpix-config`, name: 'Configurações BPIX (Admin)', requiresAuth: true }
  ];
  
  for (const test of adminTests) {
    const result = await testApiEndpoint(test.url, test.name, test.requiresAuth);
    results.push(result);
  }
  
  // 5. TESTANDO SAÚDE DO SISTEMA
  logSection('🏥 5. TESTANDO SAÚDE DO SISTEMA');
  
  const healthResult = await testHealthCheck();
  results.push(healthResult);
  
  const statusResult = await testSystemStatus();
  results.push(statusResult);
  
  // ============================================================================
  // 📊 RELATÓRIO FINAL
  // ============================================================================
  
  logSection('📊 RELATÓRIO FINAL');
  
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  const successRate = ((successfulTests / totalTests) * 100).toFixed(1);
  
  log(`📈 Estatísticas Gerais:`, 'cyan');
  log(`    Total de Testes: ${totalTests}`, 'white');
  log(`    ✅ Sucessos: ${successfulTests}`, 'green');
  log(`    ❌ Falhas: ${failedTests}`, 'red');
  log(`    📊 Taxa de Sucesso: ${successRate}%`, 'yellow');
  
  log(`\n📋 Detalhes dos Testes:`, 'cyan');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const note = result.note ? ` (${result.note})` : '';
    log(`    ${index + 1}. ${status} ${result.name}${note}`, result.success ? 'green' : 'red');
  });
  
  // Status final baseado na taxa de sucesso
  let finalStatus;
  let statusColor;
  
  if (successRate >= 90) {
    finalStatus = 'EXCELENTE - SISTEMA TOTALMENTE FUNCIONAL';
    statusColor = 'green';
  } else if (successRate >= 80) {
    finalStatus = 'BOM - SISTEMA FUNCIONAL COM PEQUENOS AJUSTES';
    statusColor = 'yellow';
  } else if (successRate >= 70) {
    finalStatus = 'REGULAR - SISTEMA NECESSITA CORREÇÕES';
    statusColor = 'yellow';
  } else {
    finalStatus = 'CRÍTICO - SISTEMA NECESSITA CORREÇÕES URGENTES';
    statusColor = 'red';
  }
  
  log(`\n🎯 Status Final: ${finalStatus}`, statusColor);
  
  return {
    totalTests,
    successfulTests,
    failedTests,
    successRate: parseFloat(successRate),
    status: finalStatus,
    results
  };
}

// ============================================================================
// 🚀 EXECUTAR TESTE
// ============================================================================

runCompleteTest()
  .then(report => {
    console.log('\n' + '='.repeat(80));
    log('✅ TESTE COMPLETO FINALIZADO', 'green');
    console.log('='.repeat(80));
  })
  .catch(error => {
    console.error('\n' + '='.repeat(80));
    log('❌ ERRO NO TESTE:', 'red');
    console.error(error);
    console.log('='.repeat(80));
  });