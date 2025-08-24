// Script para debugar especificamente a função isAuthenticated
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugIsAuthenticated() {
  console.log('🔍 Debugando função isAuthenticated...');
  
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
  
  // 2. Simular exatamente a função isAuthenticated da API
  console.log('\n2. Simulando isAuthenticated...');
  
  async function simulateIsAuthenticated(authHeader) {
    console.log('   📝 AuthHeader:', authHeader ? authHeader.substring(0, 30) + '...' : 'null');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('   ❌ Header não começa com Bearer');
      return { authenticated: false };
    }
    
    const extractedToken = authHeader.replace('Bearer ', '');
    console.log('   🔑 Token extraído (50 chars):', extractedToken.substring(0, 50) + '...');
    
    try {
      // Exatamente como na API
      const { createClient } = await import('@supabase/supabase-js');
      console.log('   📦 Módulo importado');
      
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
      
      console.log('   🔧 Cliente criado');
      
      // Verificar se o token é válido
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      console.log('   📊 Resultado getUser:');
      console.log('     - Error:', error ? error.message : 'null');
      console.log('     - User:', user ? user.email : 'null');
      
      if (error || !user) {
        console.log('   ❌ Falha na autenticação');
        return { authenticated: false };
      }
      
      console.log('   ✅ Autenticação bem-sucedida');
      return { authenticated: true, user };
    } catch (error) {
      console.log('   ❌ Erro na função:', error.message);
      console.log('   📋 Stack:', error.stack);
      return { authenticated: false };
    }
  }
  
  // 3. Testar com header correto
  const authHeader = `Bearer ${token}`;
  const result = await simulateIsAuthenticated(authHeader);
  
  console.log('\n3. Resultado final:');
  console.log('   Autenticado:', result.authenticated);
  if (result.user) {
    console.log('   Usuário:', result.user.email);
  }
  
  // 4. Testar diferentes formas de criar o cliente
  console.log('\n4. Testando diferentes configurações...');
  
  // Método 1: Com headers globais (como na API)
  console.log('\n   Método 1: Headers globais');
  try {
    const client1 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user: user1 }, error: error1 } = await client1.auth.getUser();
    console.log('     Resultado:', error1 ? error1.message : `Usuário: ${user1?.email}`);
  } catch (e) {
    console.log('     Erro:', e.message);
  }
  
  // Método 2: Setando session diretamente
  console.log('\n   Método 2: Session direta');
  try {
    const client2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    await client2.auth.setSession({
      access_token: token,
      refresh_token: loginData.session.refresh_token
    });
    
    const { data: { user: user2 }, error: error2 } = await client2.auth.getUser();
    console.log('     Resultado:', error2 ? error2.message : `Usuário: ${user2?.email}`);
  } catch (e) {
    console.log('     Erro:', e.message);
  }
  
  // 5. Logout
  await supabase.auth.signOut();
  console.log('\n5. Logout realizado.');
}

debugIsAuthenticated().catch(console.error);