// Teste completo da API NATV
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://htwiupmnqlmwvzqzroal.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0d2l1cG1ucWxtd3Z6cXpyb2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODYyMzEsImV4cCI6MjA2ODg2MjIzMX0.brpx754H-Ma8yqJMmXoNpj8MPT5DbE3R0LOOzk4kkvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNATVAPI() {
  console.log('🚀 Iniciando teste completo da API NATV...');
  
  try {
    // 1. Fazer login
    console.log('\n1. Fazendo login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'topplaytv7@gmail.com',
      password: 'Admin123!@#'
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }
    
    console.log('✅ Login bem-sucedido!');
    console.log('🔑 Token obtido:', authData.session.access_token.substring(0, 20) + '...');
    
    const token = authData.session.access_token;
    
    // 2. Testar diferentes actions da API NATV
    const tests = [
       {
         name: 'Verificar status da linha',
         method: 'GET',
         action: 'get_line_status'
       },
       {
         name: 'Obter informações do revendedor',
         method: 'GET', 
         action: 'get_reseller_info'
       },
       {
         name: 'Verificar créditos',
         method: 'GET',
         action: 'check_credits'
       },
       {
         name: 'Listar pacotes',
         method: 'GET',
         action: 'get_packages'
       },
       {
         name: 'Listar linhas',
         method: 'GET',
         action: 'list_lines'
       }
     ];
    
    for (const test of tests) {
      console.log(`\n2. Testando: ${test.name}...`);
      
      try {
        const url = test.method === 'GET' 
          ? `http://localhost:9002/api/proxy/natv?action=${test.action}`
          : 'http://localhost:9002/api/proxy/natv';
        
        const fetchOptions = {
          method: test.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };
        
        if (test.method === 'POST' && test.body) {
          fetchOptions.body = JSON.stringify(test.body);
        }
        
        const response = await fetch(url, fetchOptions);
        
        console.log(`   📊 Status: ${response.status} ${response.statusText}`);
        
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
        
        if (response.ok) {
          console.log(`   ✅ Sucesso!`);
          console.log(`   📝 Resposta:`, JSON.stringify(responseData, null, 2).substring(0, 200) + '...');
        } else {
          console.log(`   ❌ Falha!`);
          console.log(`   📝 Erro:`, responseData);
        }
        
      } catch (error) {
        console.log(`   🚨 Erro na requisição:`, error.message);
      }
    }
    
    // 3. Testar action inválida
    console.log(`\n3. Testando action inválida...`);
     try {
       const response = await fetch('http://localhost:9002/api/proxy/natv?action=invalid_action', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({ test: 'data' })
       });
      
      console.log(`   📊 Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.log(`   📝 Resposta:`, responseData);
      
    } catch (error) {
      console.log(`   🚨 Erro na requisição:`, error.message);
    }
    
    // 4. Logout
    console.log('\n4. Fazendo logout...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado.');
    
  } catch (error) {
    console.error('🚨 Erro geral:', error);
  }
}

testNATVAPI();