// test-natv-error-handling.js
// Teste para validar o tratamento de erros melhorado na integração NATV

const { createClient } = require('@supabase/supabase-js');

// Configuração do teste
const TEST_CONFIG = {
  email: 'topplaytv7@gmail.com',
  password: 'Admin123!@#',
  baseUrl: 'http://localhost:9002'
};

// Configurar Supabase
const supabase = createClient(
  'https://htwiupmnqlmwvzqzroal.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0d2l1cG1ucWxtd3Z6cXpyb2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODYyMzEsImV4cCI6MjA2ODg2MjIzMX0.brpx754H-Ma8yqJMmXoNpj8MPT5DbE3R0LOOzk4kkvk'
);

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
  console.log('✅ Login realizado com sucesso!');
  return true;
}

// Função para testar diferentes cenários de erro
async function testErrorScenario(name, url, options = {}) {
  console.log(`\n🧪 Testando: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }
    
    console.log(`   📊 Status: ${response.status} ${response.statusText}`);
    
    if (responseData.error) {
      console.log(`   ❌ Erro: ${responseData.error}`);
      if (responseData.message) {
        console.log(`   💬 Mensagem: ${responseData.message}`);
      }
      if (responseData.code) {
        console.log(`   🏷️  Código: ${responseData.code}`);
      }
      if (responseData.timestamp) {
        console.log(`   ⏰ Timestamp: ${responseData.timestamp}`);
      }
      // Debug: mostrar estrutura completa
      console.log(`   🔍 Debug - Estrutura completa:`, JSON.stringify(responseData, null, 2));
    } else {
      console.log(`   ✅ Resposta:`, JSON.stringify(responseData, null, 2).substring(0, 200) + '...');
    }
    
    return {
      status: response.status,
      success: response.ok,
      data: responseData
    };
    
  } catch (error) {
    console.log(`   🚨 Erro na requisição: ${error.message}`);
    return {
      status: 0,
      success: false,
      error: error.message
    };
  }
}

// Função principal de teste
async function testNATVErrorHandling() {
  console.log('🧪 TESTE DE TRATAMENTO DE ERROS - INTEGRAÇÃO NATV');
  console.log('==================================================');
  console.log('Objetivo: Validar melhorias no tratamento de erros');
  console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
  
  // 1. Fazer login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Falha no login. Encerrando teste.');
    return;
  }
  
  // 2. Cenários de teste de erro
  const errorTests = [
    {
      name: 'Ação inválida (deve retornar erro de validação)',
      url: `${TEST_CONFIG.baseUrl}/api/proxy/natv?action=invalid_action`,
      method: 'GET'
    },
    {
      name: 'Sem parâmetro action (deve retornar erro de validação)',
      url: `${TEST_CONFIG.baseUrl}/api/proxy/natv`,
      method: 'GET'
    },
    {
      name: 'Método não permitido (deve retornar erro 405)',
      url: `${TEST_CONFIG.baseUrl}/api/proxy/natv?action=get_line_status`,
      method: 'PATCH'
    },
    {
      name: 'Ação válida mas sem configuração NATV (deve retornar erro 503)',
      url: `${TEST_CONFIG.baseUrl}/api/proxy/natv?action=get_line_status`,
      method: 'GET'
    },
    {
      name: 'POST com ação inválida',
      url: `${TEST_CONFIG.baseUrl}/api/proxy/natv?action=invalid_post_action`,
      method: 'POST',
      body: { test: 'data' }
    }
  ];
  
  console.log('\n🔍 EXECUTANDO CENÁRIOS DE TESTE');
  console.log('================================');
  
  const results = [];
  
  for (const test of errorTests) {
    const result = await testErrorScenario(test.name, test.url, {
      method: test.method,
      body: test.body
    });
    
    results.push({
      name: test.name,
      ...result
    });
    
    // Pequeno delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 3. Análise dos resultados
  console.log('\n📊 ANÁLISE DOS RESULTADOS');
  console.log('=========================');
  
  let errorsWithProperStructure = 0;
  let errorsWithTimestamp = 0;
  let errorsWithCode = 0;
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   Status: ${result.status}`);
    
    if (result.data && result.data.error) {
      errorsWithProperStructure++;
      console.log(`   ✅ Estrutura de erro adequada`);
      
      if (result.data.timestamp) {
        errorsWithTimestamp++;
        console.log(`   ✅ Timestamp presente`);
      }
      
      if (result.data.code) {
        errorsWithCode++;
        console.log(`   ✅ Código de erro presente`);
      }
    } else {
      console.log(`   ❌ Estrutura de erro inadequada`);
    }
  });
  
  console.log('\n🎯 RESUMO FINAL');
  console.log('===============');
  console.log(`Total de testes: ${results.length}`);
  console.log(`Erros com estrutura adequada: ${errorsWithProperStructure}/${results.length}`);
  console.log(`Erros com timestamp: ${errorsWithTimestamp}/${results.length}`);
  console.log(`Erros com código: ${errorsWithCode}/${results.length}`);
  
  const successRate = (errorsWithProperStructure / results.length) * 100;
  console.log(`\n📈 Taxa de sucesso: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 80) {
    console.log('✅ Tratamento de erros funcionando adequadamente!');
  } else {
    console.log('⚠️  Tratamento de erros precisa de melhorias.');
  }
}

// Executar teste
testNATVErrorHandling().catch(console.error);