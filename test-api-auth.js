// Script para testar a autenticação exatamente como na API
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testApiAuth() {
  console.log('🔍 Testando autenticação como na API...');
  
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
  
  // 2. Simular exatamente o que acontece na função isAuthenticated
  console.log('\n2. Simulando função isAuthenticated...');
  
  async function simulateIsAuthenticated(authHeader) {
    console.log('   📝 AuthHeader recebido:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('   ❌ Header não começa com Bearer');
      return { authenticated: false };
    }
    
    const extractedToken = authHeader.replace('Bearer ', '');
    console.log('   🔑 Token extraído (primeiros 50 chars):', extractedToken.substring(0, 50) + '...');
    
    try {
      // Criar cliente Supabase com token do usuário (exatamente como na API)
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${extractedToken}`
            }
          }
        }
      );
      
      console.log('   🔧 Cliente Supabase criado com token');
      
      // Verificar se o token é válido
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (error) {
        console.log('   ❌ Erro ao verificar usuário:', error.message);
        return { authenticated: false };
      }
      
      if (!user) {
        console.log('   ❌ Usuário não encontrado');
        return { authenticated: false };
      }
      
      console.log('   ✅ Usuário autenticado:', user.email);
      return { authenticated: true, user };
    } catch (error) {
      console.log('   ❌ Erro na função:', error.message);
      return { authenticated: false };
    }
  }
  
  // 3. Testar com header correto
  const authHeader = `Bearer ${token}`;
  const result = await simulateIsAuthenticated(authHeader);
  
  console.log('\n3. Resultado da simulação:');
  console.log('   Autenticado:', result.authenticated);
  if (result.user) {
    console.log('   Usuário:', result.user.email);
  }
  
  // 4. Logout
  await supabase.auth.signOut();
  console.log('\n4. Logout realizado.');
}

testApiAuth().catch(console.error);