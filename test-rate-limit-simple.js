// test-rate-limit-simple.js
// Script simples para testar rate limiting do proxy NATV

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
  baseUrl: 'http://localhost:9002'
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
  return true;
}

// Função para fazer requisição à API NATV
async function makeNATVRequest(action) {
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
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || null,
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || null,
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') || null
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

// Teste de rate limiting básico
async function testRateLimit() {
  console.log('\n🧪 Teste de Rate Limiting Básico');
  console.log('=' .repeat(40));
  
  const results = [];
  const maxRequests = 60; // Tentar mais que o limite de 50
  
  console.log(`Fazendo ${maxRequests} requisições rápidas...`);
  
  for (let i = 1; i <= maxRequests; i++) {
    const result = await makeNATVRequest('get_line_status');
    results.push(result);
    
    // Log a cada 10 requisições ou quando atingir rate limit
    if (i % 10 === 0 || result.status === 429) {
      console.log(`Requisição ${i}: Status ${result.status}`);
      
      if (result.headers && result.headers['x-ratelimit-remaining']) {
        console.log(`  Rate Limit Restante: ${result.headers['x-ratelimit-remaining']}`);
      }
      
      if (result.data && result.data.error) {
        console.log(`  Erro: ${result.data.error}`);
      }
      
      // Se atingiu rate limit, parar
      if (result.status === 429) {
        console.log(`🚫 Rate limit atingido na requisição ${i}`);
        break;
      }
    }
    
    // Delay mínimo para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  // Análise dos resultados
  const successCount = results.filter(r => r.success).length;
  const rateLimitCount = results.filter(r => r.status === 429).length;
  const errorCount = results.filter(r => !r.success && r.status !== 429).length;
  const firstRateLimit = results.findIndex(r => r.status === 429) + 1;
  
  console.log('\n📊 Resultados:');
  console.log(`  Total de requisições: ${results.length}`);
  console.log(`  Sucessos: ${successCount}`);
  console.log(`  Rate Limits (429): ${rateLimitCount}`);
  console.log(`  Outros erros: ${errorCount}`);
  
  if (firstRateLimit > 0) {
    console.log(`  Primeira ocorrência de rate limit: requisição ${firstRateLimit}`);
  }
  
  // Mostrar alguns exemplos de erros
  const errorExamples = results.filter(r => !r.success).slice(0, 3);
  if (errorExamples.length > 0) {
    console.log('\n🔍 Exemplos de erros:');
    errorExamples.forEach((result, index) => {
      console.log(`  ${index + 1}. Status ${result.status}: ${result.data?.error || result.error || 'Erro desconhecido'}`);
    });
  }
  
  return {
    total: results.length,
    success: successCount,
    rateLimit: rateLimitCount,
    errors: errorCount,
    firstRateLimit
  };
}

// Função principal
async function main() {
  console.log('🧪 TESTE SIMPLES DE RATE LIMITING - PROXY NATV');
  console.log('=' .repeat(50));
  console.log('Objetivo: Verificar se o rate limiting está funcionando');
  console.log('Limite configurado: 50 requisições por minuto');
  console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
  
  // Verificar variáveis de ambiente
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não configuradas');
    return;
  }
  
  // Fazer login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Falha no login. Abortando teste.');
    return;
  }
  
  try {
    // Executar teste
    const results = await testRateLimit();
    
    // Análise final
    console.log('\n🎯 ANÁLISE FINAL:');
    console.log('=' .repeat(30));
    
    if (results.rateLimit > 0) {
      console.log('✅ Rate limiting está funcionando!');
      console.log(`   Bloqueou requisições a partir da ${results.firstRateLimit}ª tentativa`);
    } else if (results.errors > 0) {
      console.log('⚠️  Não foi possível testar rate limiting devido a outros erros');
      console.log('   Possíveis causas: API NATV não configurada, servidor offline, etc.');
    } else {
      console.log('❌ Rate limiting pode não estar funcionando');
      console.log('   Todas as requisições passaram sem bloqueio');
    }
    
    if (results.success > 0) {
      console.log(`✅ ${results.success} requisições foram bem-sucedidas`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar teste
main().catch(console.error);