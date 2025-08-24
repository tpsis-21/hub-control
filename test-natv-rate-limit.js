// test-natv-rate-limit.js
// Script para testar rate limiting da API NATV

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações de teste
const TEST_CONFIG = {
  email: 'topplaytv7@gmail.com',
  password: 'Admin123!@#',
  baseUrl: 'http://localhost:3000',
  // Rate limit configurado: 50 requests por minuto (1m)
  rateLimitTests: {
    normalLoad: 10,    // Teste normal - deve passar
    heavyLoad: 55,     // Teste pesado - deve atingir rate limit
    burstLoad: 20      // Teste de rajada - deve passar se espaçado
  }
};

let authToken = null;

// Função para fazer login
async function login() {
  console.log('🔐 Fazendo login...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_CONFIG.email,
    password: TEST_CONFIG.password
  });
  
  if (error) {
    console.error('❌ Erro no login:', error.message);
    return false;
  }
  
  authToken = data.session.access_token;
  console.log('✅ Login realizado com sucesso');
  console.log('🎫 Token obtido:', authToken.substring(0, 20) + '...');
  return true;
}

// Função para fazer requisição à API NATV
async function makeNATVRequest(action, delay = 0) {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  const url = `${TEST_CONFIG.baseUrl}/api/proxy/natv?action=${action}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    return {
      status: response.status,
      success: response.ok,
      data: data,
      headers: {
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || 'N/A',
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || 'N/A',
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') || 'N/A'
      }
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message
    };
  }
}

// Teste de carga normal
async function testNormalLoad() {
  console.log('\n📊 Teste de Carga Normal (10 requisições)');
  console.log('=' .repeat(50));
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 1; i <= TEST_CONFIG.rateLimitTests.normalLoad; i++) {
    console.log(`Requisição ${i}/${TEST_CONFIG.rateLimitTests.normalLoad}...`);
    
    const result = await makeNATVRequest('get_line_status');
    results.push(result);
    
    console.log(`  Status: ${result.status} | Sucesso: ${result.success}`);
    if (result.headers && result.headers['x-ratelimit-remaining'] !== 'N/A') {
      console.log(`  Rate Limit Restante: ${result.headers['x-ratelimit-remaining']}`);
    }
    if (!result.success && result.data) {
      console.log(`  Erro: ${result.data.error || 'Erro desconhecido'}`);
    }
    
    // Pequeno delay para evitar sobrecarga
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const successCount = results.filter(r => r.success).length;
  const rateLimitCount = results.filter(r => r.status === 429).length;
  
  console.log('\n📈 Resultados do Teste Normal:');
  console.log(`  Duração: ${duration}ms`);
  console.log(`  Sucessos: ${successCount}/${results.length}`);
  console.log(`  Rate Limits: ${rateLimitCount}/${results.length}`);
  
  return { successCount, rateLimitCount, duration };
}

// Teste de carga pesada (deve atingir rate limit)
async function testHeavyLoad() {
  console.log('\n🔥 Teste de Carga Pesada (55 requisições - deve atingir rate limit)');
  console.log('=' .repeat(70));
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 1; i <= TEST_CONFIG.rateLimitTests.heavyLoad; i++) {
    const result = await makeNATVRequest('get_line_status');
    results.push(result);
    
    if (i % 10 === 0 || result.status === 429) {
      console.log(`Requisição ${i}: Status ${result.status} | Restante: ${result.headers && result.headers['x-ratelimit-remaining'] || 'N/A'}`);
      if (!result.success && result.data) {
        console.log(`  Erro: ${result.data.error || 'Erro desconhecido'}`);
      }
    }
    
    // Se atingiu rate limit, parar o teste
    if (result.status === 429) {
      console.log(`🚫 Rate limit atingido na requisição ${i}`);
      break;
    }
    
    // Delay mínimo para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const successCount = results.filter(r => r.success).length;
  const rateLimitCount = results.filter(r => r.status === 429).length;
  
  console.log('\n📈 Resultados do Teste Pesado:');
  console.log(`  Duração: ${duration}ms`);
  console.log(`  Sucessos: ${successCount}/${results.length}`);
  console.log(`  Rate Limits: ${rateLimitCount}/${results.length}`);
  console.log(`  Primeira ocorrência de rate limit: requisição ${results.findIndex(r => r.status === 429) + 1}`);
  
  return { successCount, rateLimitCount, duration, firstRateLimit: results.findIndex(r => r.status === 429) + 1 };
}

// Teste de rajada com delay
async function testBurstWithDelay() {
  console.log('\n⚡ Teste de Rajada com Delay (20 requisições com 3s de intervalo)');
  console.log('=' .repeat(65));
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 1; i <= TEST_CONFIG.rateLimitTests.burstLoad; i++) {
    console.log(`Requisição ${i}/${TEST_CONFIG.rateLimitTests.burstLoad}...`);
    
    const result = await makeNATVRequest('get_line_status', i > 1 ? 3000 : 0);
    results.push(result);
    
    console.log(`  Status: ${result.status} | Restante: ${result.headers && result.headers['x-ratelimit-remaining'] || 'N/A'}`);
    if (!result.success && result.data) {
      console.log(`  Erro: ${result.data.error || 'Erro desconhecido'}`);
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const successCount = results.filter(r => r.success).length;
  const rateLimitCount = results.filter(r => r.status === 429).length;
  
  console.log('\n📈 Resultados do Teste de Rajada:');
  console.log(`  Duração: ${duration}ms`);
  console.log(`  Sucessos: ${successCount}/${results.length}`);
  console.log(`  Rate Limits: ${rateLimitCount}/${results.length}`);
  
  return { successCount, rateLimitCount, duration };
}

// Função principal
async function main() {
  console.log('🧪 TESTE DE RATE LIMITING - API NATV');
  console.log('=' .repeat(50));
  console.log('Configuração:');
  console.log(`  Rate Limit: 50 requisições por minuto`);
  console.log(`  Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`  Email: ${TEST_CONFIG.email}`);
  
  // Verificar variáveis de ambiente
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não configuradas');
    return;
  }
  
  // Fazer login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Falha no login. Abortando testes.');
    return;
  }
  
  try {
    // Executar testes
    const normalResults = await testNormalLoad();
    
    // Aguardar um pouco antes do próximo teste
    console.log('\n⏳ Aguardando 5 segundos antes do próximo teste...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const heavyResults = await testHeavyLoad();
    
    // Aguardar reset do rate limit
    console.log('\n⏳ Aguardando 65 segundos para reset do rate limit...');
    await new Promise(resolve => setTimeout(resolve, 65000));
    
    const burstResults = await testBurstWithDelay();
    
    // Resumo final
    console.log('\n🎯 RESUMO FINAL DOS TESTES');
    console.log('=' .repeat(50));
    console.log('Teste Normal:');
    console.log(`  ✅ Sucessos: ${normalResults.successCount}/10`);
    console.log(`  🚫 Rate Limits: ${normalResults.rateLimitCount}/10`);
    
    console.log('\nTeste Pesado:');
    console.log(`  ✅ Sucessos: ${heavyResults.successCount}`);
    console.log(`  🚫 Rate Limits: ${heavyResults.rateLimitCount}`);
    console.log(`  📍 Primeiro rate limit: requisição ${heavyResults.firstRateLimit}`);
    
    console.log('\nTeste de Rajada:');
    console.log(`  ✅ Sucessos: ${burstResults.successCount}/20`);
    console.log(`  🚫 Rate Limits: ${burstResults.rateLimitCount}/20`);
    
    // Análise
    console.log('\n🔍 ANÁLISE:');
    if (heavyResults.firstRateLimit > 0 && heavyResults.firstRateLimit <= 50) {
      console.log('✅ Rate limiting funcionando corretamente');
    } else {
      console.log('⚠️  Rate limiting pode não estar funcionando como esperado');
    }
    
    if (burstResults.rateLimitCount === 0) {
      console.log('✅ Requests espaçadas não atingem rate limit');
    } else {
      console.log('⚠️  Requests espaçadas estão atingindo rate limit inesperadamente');
    }
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Executar testes
main().catch(console.error);