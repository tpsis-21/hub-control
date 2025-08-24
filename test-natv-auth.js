// Script para testar a API NATV com autenticação
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Configurações do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNATVWithAuth() {
  try {
    console.log('🔍 Testando autenticação e API NATV...');
    
    // 1. Fazer login com credenciais de teste
    console.log('\n1. Fazendo login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'topplaytv7@gmail.com', // Email do admin criado
      password: 'Admin123!@#' // Senha do admin criado
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('📧 Usuário:', authData.user?.email);
    
    // 2. Obter o token de acesso
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.error('❌ Token de acesso não encontrado!');
      return;
    }
    
    console.log('🔑 Token obtido:', session.access_token.substring(0, 20) + '...');
    
    // 3. Testar a API NATV com o token
    console.log('\n2. Testando API NATV...');
    
    const response = await fetch('http://localhost:9002/api/proxy/natv?action=test', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status da resposta:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta da API NATV:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na API NATV:', errorText);
    }
    
    // 4. Fazer logout
    await supabase.auth.signOut();
    console.log('\n3. Logout realizado.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
testNATVWithAuth();