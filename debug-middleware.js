// Script para diagnosticar problemas no middleware
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

console.log('🔍 Diagnóstico do Middleware');
console.log('============================');

// Testar rotas públicas
const PUBLIC_ROUTES = [
  '/login',
  '/register', 
  '/reset-password',
  '/auth',
  '/favicon.ico',
  '/_next',
  '/public',
  '/static',
  '/@vite'
];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

// Testar algumas rotas
const testRoutes = [
  '/login',
  '/favicon.ico',
  '/dashboard',
  '/servidores',
  '/_next/static/test.js'
];

console.log('\n📋 Testando lógica de rotas públicas:');
testRoutes.forEach(route => {
  const isPublic = isPublicRoute(route);
  console.log(`${isPublic ? '✅' : '❌'} ${route} - ${isPublic ? 'PÚBLICA' : 'PROTEGIDA'}`);
});

// Testar conexão com Supabase
async function testSupabaseConnection() {
  try {
    console.log('\n🔗 Testando conexão com Supabase...');
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Testar uma query simples
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
    } else {
      console.log('✅ Conexão com Supabase OK');
    }
    
  } catch (error) {
    console.log('❌ Erro ao conectar com Supabase:', error.message);
  }
}

// Testar requisição HTTP para a aplicação
async function testHttpRequest() {
  try {
    console.log('\n🌐 Testando requisição HTTP...');
    
    const response = await fetch('http://localhost:3001/login', {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`Body (primeiros 200 chars):`, text.substring(0, 200));
    
  } catch (error) {
    console.log('❌ Erro na requisição HTTP:', error.message);
  }
}

async function runDiagnostics() {
  await testSupabaseConnection();
  await testHttpRequest();
}

runDiagnostics();