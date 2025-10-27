// debug-auth-issue.js
// Script para debugar o problema de autenticação
// Data: 2024-12-23

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 DEBUGANDO PROBLEMA DE AUTENTICAÇÃO');
console.log('=====================================');

// 1. Verificar variáveis de ambiente
console.log('\n1. VERIFICANDO VARIÁVEIS DE AMBIENTE:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Não encontrada');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não encontrada');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Não encontrada');

async function testSupabaseConnection() {
  try {
    console.log('\n2. TESTANDO CONEXÃO COM SUPABASE:');
    
    // Criar cliente Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    console.log('✅ Cliente Supabase criado com sucesso');
    
    // Testar conexão básica
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
    } else {
      console.log('✅ Conexão com banco de dados funcionando');
    }
    
    console.log('\n3. TESTANDO AUTENTICAÇÃO COM USUÁRIO DE TESTE:');
    
    // Tentar login com usuário de teste
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword'
    });
    
    if (authError) {
      console.log('❌ Erro na autenticação:', authError.message);
      
      // Se usuário não existe, tentar criar
      if (authError.message.includes('Invalid login credentials')) {
        console.log('\n4. TENTANDO CRIAR USUÁRIO DE TESTE:');
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'test@example.com',
          password: 'testpassword'
        });
        
        if (signUpError) {
          console.log('❌ Erro ao criar usuário:', signUpError.message);
        } else {
          console.log('✅ Usuário de teste criado com sucesso');
          console.log('📧 Verifique o email para confirmar a conta');
        }
      }
    } else {
      console.log('✅ Autenticação funcionando!');
      console.log('👤 Usuário:', authData.user?.email);
      console.log('🔑 Token:', authData.session?.access_token ? 'Gerado com sucesso' : 'Não gerado');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

async function testMiddlewareLogic() {
  console.log('\n5. TESTANDO LÓGICA DO MIDDLEWARE:');
  
  const testRoutes = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/upload/secure',
    '/dashboard',
    '/login'
  ];
  
  const PUBLIC_API_ROUTES = ['/api/auth'];
  const PROTECTED_API_ROUTES = ['/api/admin', '/api/proxy', '/api/plan-groups', '/api/messages', '/api/push-notifications'];
  
  function isPublicApiRoute(pathname) {
    return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
  }
  
  function isProtectedApiRoute(pathname) {
    return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
  }
  
  testRoutes.forEach(route => {
    const isPublic = isPublicApiRoute(route);
    const isProtected = isProtectedApiRoute(route);
    
    console.log(`${route}: ${isPublic ? '🟢 Pública' : isProtected ? '🔴 Protegida' : '🟡 Não categorizada'}`);
  });
}

async function main() {
  await testSupabaseConnection();
  testMiddlewareLogic();
  
  console.log('\n=====================================');
  console.log('🏁 TESTE CONCLUÍDO');
}

main().catch(console.error);