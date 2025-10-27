/**
 * Script para debugar problema com JWT token no middleware
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugJWTToken() {
  console.log('🔍 DEBUG: JWT Token Issue');
  console.log('================================');
  
  // Configuração do Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Configurações:');
  console.log('- URL:', supabaseUrl ? '✅ Configurada' : '❌ Não encontrada');
  console.log('- ANON_KEY:', supabaseAnonKey ? '✅ Configurada' : '❌ Não encontrada');
  console.log('- SERVICE_KEY:', supabaseServiceKey ? '✅ Configurada' : '❌ Não encontrada');
  console.log('');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Configurações do Supabase não encontradas!');
    return;
  }
  
  // Cliente para autenticação
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // 1. Tentar fazer login com usuário de teste
    console.log('🔐 Tentando fazer login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123456'
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('- User ID:', authData.user?.id);
    console.log('- Email:', authData.user?.email);
    
    // 2. Verificar o token JWT
    const session = authData.session;
    if (session) {
      console.log('\n🎫 Informações do Token:');
      console.log('- Access Token (primeiros 50 chars):', session.access_token.substring(0, 50) + '...');
      console.log('- Refresh Token (primeiros 50 chars):', session.refresh_token.substring(0, 50) + '...');
      console.log('- Token Type:', session.token_type);
      console.log('- Expires At:', new Date(session.expires_at * 1000).toISOString());
      
      // 3. Testar o token com uma requisição
      console.log('\n🧪 Testando token com requisição HTTP...');
      
      const fetch = require('node-fetch');
      
      try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'test123456'
          })
        });
        
        const result = await response.text();
        console.log('- Status:', response.status);
        console.log('- Response:', result);
        
      } catch (fetchError) {
        console.error('❌ Erro na requisição HTTP:', fetchError.message);
      }
      
      // 4. Verificar se o token é válido no Supabase
      console.log('\n🔍 Verificando validade do token no Supabase...');
      
      const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
      
      if (userError) {
        console.error('❌ Token inválido no Supabase:', userError.message);
      } else {
        console.log('✅ Token válido no Supabase!');
        console.log('- User ID:', userData.user?.id);
        console.log('- Email:', userData.user?.email);
      }
      
    } else {
      console.error('❌ Nenhuma sessão encontrada após login!');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar o debug
debugJWTToken().catch(console.error);