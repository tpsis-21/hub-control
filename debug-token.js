// Script para debugar o token JWT do Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugToken() {
  console.log('🔍 Debugando token JWT...');
  
  // 1. Fazer login
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
  
  console.log('✅ Login realizado com sucesso!');
  console.log('📧 Usuário:', loginData.user.email);
  console.log('🔑 Token (primeiros 50 chars):', loginData.session.access_token.substring(0, 50) + '...');
  
  // 2. Verificar se o token é válido diretamente
  console.log('\n2. Verificando token diretamente...');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error('❌ Erro ao verificar usuário:', userError.message);
  } else {
    console.log('✅ Token válido! Usuário:', userData.user.email);
  }
  
  // 3. Testar criação de cliente com token explícito
  console.log('\n3. Testando cliente com token explícito...');
  const supabaseWithToken = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${loginData.session.access_token}`
        }
      }
    }
  );
  
  const { data: explicitUserData, error: explicitUserError } = await supabaseWithToken.auth.getUser();
  
  if (explicitUserError) {
    console.error('❌ Erro com token explícito:', explicitUserError.message);
  } else {
    console.log('✅ Token explícito funciona! Usuário:', explicitUserData.user.email);
  }
  
  // 4. Verificar variáveis de ambiente
  console.log('\n4. Verificando variáveis de ambiente...');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definida' : '❌ Não definida');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida');
  
  // 5. Logout
  await supabase.auth.signOut();
  console.log('\n5. Logout realizado.');
}

debugToken().catch(console.error);