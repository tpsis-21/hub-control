// Script para testar diretamente a API com requisição HTTP real
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDirectAPI() {
  console.log('🔍 Testando API diretamente com requisição HTTP...');
  
  // 1. Fazer login para obter token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  console.log('\n1. Fazendo login...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'topplaytv7@gmail.com',
    password: 'Admin123!@#'
  });
  
  if (loginError) {
    console.error('❌ Erro no login:', loginError.message);
    return;
  }
  
  const token = loginData.session.access_token;
  console.log('✅ Token obtido!');
  console.log('🔑 Token (primeiros 50 chars):', token.substring(0, 50) + '...');
  
  // 2. Testar diferentes endpoints e métodos
  const tests = [
    {
      name: 'GET /api/proxy/natv?action=test',
      url: 'http://localhost:9002/api/proxy/natv?action=test',
      method: 'GET'
    },
    {
      name: 'POST /api/proxy/natv',
      url: 'http://localhost:9002/api/proxy/natv',
      method: 'POST',
      body: JSON.stringify({ action: 'test' })
    }
  ];
  
  for (const test of tests) {
    console.log(`\n2. Testando ${test.name}...`);
    
    try {
      const options = {
        method: test.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Node.js Test Script'
        }
      };
      
      if (test.body) {
        options.body = test.body;
      }
      
      console.log('   📤 Enviando requisição...');
      console.log('   🔗 URL:', test.url);
      console.log('   📋 Método:', test.method);
      console.log('   🔑 Authorization header:', `Bearer ${token.substring(0, 20)}...`);
      
      const response = await fetch(test.url, options);
      
      console.log('   📊 Status:', response.status);
      console.log('   📋 Status Text:', response.statusText);
      
      // Verificar headers de resposta
      console.log('   📄 Headers de resposta:');
      for (const [key, value] of response.headers.entries()) {
        console.log(`     ${key}: ${value}`);
      }
      
      const responseText = await response.text();
      console.log('   📝 Resposta:', responseText);
      
      if (response.ok) {
        console.log('   ✅ Sucesso!');
      } else {
        console.log('   ❌ Falha!');
      }
      
    } catch (error) {
      console.log('   ❌ Erro na requisição:', error.message);
    }
  }
  
  // 3. Testar sem token para comparar
  console.log('\n3. Testando sem token (para comparar)...');
  try {
    const response = await fetch('http://localhost:9002/api/proxy/natv?action=test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   📊 Status sem token:', response.status);
    const responseText = await response.text();
    console.log('   📝 Resposta sem token:', responseText);
  } catch (error) {
    console.log('   ❌ Erro sem token:', error.message);
  }
  
  // 4. Logout
  await supabase.auth.signOut();
  console.log('\n4. Logout realizado.');
}

testDirectAPI().catch(console.error);