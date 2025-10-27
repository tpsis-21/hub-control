/**
 * TESTE COMPLETO DA APLICAÇÃO HUB CONTROL
 * Script para testar todas as funcionalidades principais
 */

const BASE_URL = 'http://localhost:8080';

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

// Função para fazer requisições HTTP
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      timeout: 10000,
      ...options
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    let data = null;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      responseTime,
      contentType
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

// 1. TESTE DE APIS PÚBLICAS
async function testPublicAPIs() {
  logSection('🌐 TESTE DE APIs PÚBLICAS');
  
  const publicAPIs = [
    { name: 'Atividades Recentes', endpoint: '/api/activities/recent' },
    { name: 'Monitoramento', endpoint: '/api/monitoring/test' },
    { name: 'Cache Status', endpoint: '/api/cache' }
  ];
  
  const results = [];
  
  for (const api of publicAPIs) {
    log(`\n🔍 Testando: ${api.name}`);
    const result = await makeRequest(api.endpoint);
    
    if (result.success) {
      log(`  ✅ ${api.name}: ${result.status} (${result.responseTime}ms)`, 'green');
    } else {
      log(`  ❌ ${api.name}: ${result.status || 'ERRO'} - ${result.error || result.statusText}`, 'red');
    }
    
    results.push({ ...api, ...result });
  }
  
  return results;
}

// 2. TESTE DE APIS PROTEGIDAS (sem autenticação)
async function testProtectedAPIs() {
  logSection('🔒 TESTE DE APIs PROTEGIDAS (Verificação de Segurança)');
  
  const protectedAPIs = [
    { name: 'Auth User', endpoint: '/api/auth/user' },
    { name: 'Admin Plans', endpoint: '/api/admin/plans' },
    { name: 'Notifications In-App', endpoint: '/api/notifications/in-app' },
    { name: 'Upload Secure', endpoint: '/api/upload/secure' }
  ];
  
  const results = [];
  
  for (const api of protectedAPIs) {
    log(`\n🔍 Testando: ${api.name}`);
    const result = await makeRequest(api.endpoint);
    
    // Para APIs protegidas, esperamos 401 (Unauthorized) ou 400 (Bad Request)
    if (result.status === 401 || result.status === 400) {
      log(`  ✅ ${api.name}: Corretamente protegida (${result.status})`, 'green');
    } else if (result.success) {
      log(`  ⚠️  ${api.name}: Acessível sem autenticação (${result.status})`, 'yellow');
    } else {
      log(`  ❌ ${api.name}: Erro inesperado (${result.status || 'ERRO'})`, 'red');
    }
    
    results.push({ ...api, ...result });
  }
  
  return results;
}

// 3. TESTE DE PÁGINAS PRINCIPAIS
async function testMainPages() {
  logSection('📄 TESTE DE PÁGINAS PRINCIPAIS');
  
  const pages = [
    { name: 'Home', endpoint: '/' },
    { name: 'Login', endpoint: '/login' },
    { name: 'Dashboard', endpoint: '/dashboard' }
  ];
  
  const results = [];
  
  for (const page of pages) {
    log(`\n🔍 Testando: ${page.name}`);
    const result = await makeRequest(page.endpoint);
    
    if (result.success) {
      log(`  ✅ ${page.name}: Carregou com sucesso (${result.responseTime}ms)`, 'green');
    } else {
      log(`  ❌ ${page.name}: ${result.status || 'ERRO'} - ${result.error || result.statusText}`, 'red');
    }
    
    results.push({ ...page, ...result });
  }
  
  return results;
}

// 4. TESTE DE PERFORMANCE
async function testPerformance() {
  logSection('⚡ TESTE DE PERFORMANCE');
  
  const performanceTests = [
    { name: 'Atividades (Cache)', endpoint: '/api/activities/recent' },
    { name: 'Monitoramento', endpoint: '/api/monitoring/test' },
    { name: 'Home Page', endpoint: '/' }
  ];
  
  const results = [];
  
  for (const test of performanceTests) {
    log(`\n🔍 Testando performance: ${test.name}`);
    
    // Fazer 3 requisições para testar consistência
    const times = [];
    for (let i = 0; i < 3; i++) {
      const result = await makeRequest(test.endpoint);
      if (result.success) {
        times.push(result.responseTime);
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      log(`  📊 ${test.name}:`, 'blue');
      log(`     Média: ${avgTime.toFixed(0)}ms`);
      log(`     Min: ${minTime}ms | Max: ${maxTime}ms`);
      
      if (avgTime < 500) {
        log(`     ✅ Performance excelente`, 'green');
      } else if (avgTime < 1000) {
        log(`     ⚠️  Performance aceitável`, 'yellow');
      } else {
        log(`     ❌ Performance ruim`, 'red');
      }
      
      results.push({
        ...test,
        avgTime,
        minTime,
        maxTime,
        performance: avgTime < 500 ? 'excelente' : avgTime < 1000 ? 'aceitável' : 'ruim'
      });
    } else {
      log(`  ❌ ${test.name}: Falhou em todas as tentativas`, 'red');
      results.push({ ...test, error: 'Falhou em todas as tentativas' });
    }
  }
  
  return results;
}

// 5. TESTE DE INTEGRAÇÕES
async function testIntegrations() {
  logSection('🔗 TESTE DE INTEGRAÇÕES');
  
  const integrations = [
    { name: 'NATV Config', endpoint: '/api/natv/config' },
    { name: 'NATV Test', endpoint: '/api/natv/test' },
    { name: 'TheBest Config', endpoint: '/api/integrations/thebest/config' },
    { name: 'TheBest Test', endpoint: '/api/integrations/thebest/test' }
  ];
  
  const results = [];
  
  for (const integration of integrations) {
    log(`\n🔍 Testando: ${integration.name}`);
    const result = await makeRequest(integration.endpoint);
    
    // Para integrações, esperamos 401 (precisa auth) ou 200 (configurada)
    if (result.status === 401) {
      log(`  ✅ ${integration.name}: Endpoint protegido corretamente`, 'green');
    } else if (result.success) {
      log(`  ✅ ${integration.name}: Configuração acessível (${result.status})`, 'green');
    } else {
      log(`  ❌ ${integration.name}: ${result.status || 'ERRO'} - ${result.error || result.statusText}`, 'red');
    }
    
    results.push({ ...integration, ...result });
  }
  
  return results;
}

// 6. RELATÓRIO FINAL
function generateReport(testResults) {
  logSection('📊 RELATÓRIO FINAL DE TESTES');
  
  const allResults = Object.values(testResults).flat();
  const totalTests = allResults.length;
  const successfulTests = allResults.filter(r => r.success || r.status === 401 || r.status === 400).length;
  const failedTests = totalTests - successfulTests;
  
  log(`\n📈 ESTATÍSTICAS GERAIS:`, 'bold');
  log(`   Total de testes: ${totalTests}`);
  log(`   Sucessos: ${successfulTests}`, 'green');
  log(`   Falhas: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`   Taxa de sucesso: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
  
  // Análise por categoria
  Object.entries(testResults).forEach(([category, results]) => {
    const categorySuccess = results.filter(r => r.success || r.status === 401 || r.status === 400).length;
    const categoryTotal = results.length;
    const categoryRate = ((categorySuccess / categoryTotal) * 100).toFixed(1);
    
    log(`\n📋 ${category.toUpperCase()}:`, 'blue');
    log(`   Sucessos: ${categorySuccess}/${categoryTotal} (${categoryRate}%)`);
    
    // Mostrar falhas específicas
    const failures = results.filter(r => !r.success && r.status !== 401 && r.status !== 400);
    if (failures.length > 0) {
      log(`   ❌ Falhas:`, 'red');
      failures.forEach(f => {
        log(`      - ${f.name}: ${f.error || f.statusText || 'Erro desconhecido'}`);
      });
    }
  });
  
  // Recomendações
  log(`\n💡 RECOMENDAÇÕES:`, 'bold');
  
  if (failedTests === 0) {
    log(`   ✅ Aplicação está funcionando perfeitamente!`, 'green');
    log(`   ✅ Todas as APIs e páginas estão respondendo corretamente`);
    log(`   ✅ Segurança implementada adequadamente`);
  } else {
    log(`   ⚠️  Existem ${failedTests} problemas que precisam ser corrigidos`, 'yellow');
    log(`   🔧 Verifique os logs acima para detalhes específicos`);
  }
  
  // Performance
  if (testResults.performance) {
    const avgPerformance = testResults.performance.filter(p => p.avgTime).reduce((acc, p) => acc + p.avgTime, 0) / testResults.performance.filter(p => p.avgTime).length;
    if (avgPerformance < 500) {
      log(`   ⚡ Performance excelente (média: ${avgPerformance.toFixed(0)}ms)`, 'green');
    } else {
      log(`   ⚠️  Performance pode ser melhorada (média: ${avgPerformance.toFixed(0)}ms)`, 'yellow');
    }
  }
  
  log(`\n🎯 STATUS GERAL: ${failedTests === 0 ? 'APLICAÇÃO PRONTA PARA PRODUÇÃO' : 'NECESSITA CORREÇÕES'}`, failedTests === 0 ? 'green' : 'yellow');
}

// FUNÇÃO PRINCIPAL
async function runCompleteTest() {
  log('🚀 INICIANDO TESTE COMPLETO DA APLICAÇÃO HUB CONTROL', 'bold');
  log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  log(`🌐 URL Base: ${BASE_URL}`);
  
  const testResults = {};
  
  try {
    // Executar todos os testes
    testResults.publicAPIs = await testPublicAPIs();
    testResults.protectedAPIs = await testProtectedAPIs();
    testResults.mainPages = await testMainPages();
    testResults.performance = await testPerformance();
    testResults.integrations = await testIntegrations();
    
    // Gerar relatório final
    generateReport(testResults);
    
  } catch (error) {
    log(`\n❌ ERRO CRÍTICO NO TESTE: ${error.message}`, 'red');
    console.error(error);
  }
  
  log(`\n✅ TESTE COMPLETO FINALIZADO EM ${new Date().toLocaleString('pt-BR')}`, 'bold');
}

// Executar o teste
if (require.main === module) {
  runCompleteTest().catch(console.error);
}

module.exports = {
  runCompleteTest,
  testPublicAPIs,
  testProtectedAPIs,
  testMainPages,
  testPerformance,
  testIntegrations
};