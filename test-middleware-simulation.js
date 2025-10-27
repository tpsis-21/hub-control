// Script para simular o comportamento do middleware
// Testar especificamente a rota /api/auth/login

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
]

const AUTH_ROUTES = [
  '/login',
  '/register',
  '/auth/login',
  '/auth/register',
  '/reset-password'
]

const PROTECTED_ROUTES = [
  '/dashboard',
  '/configuracoes',
  '/notificacoes',
  '/servidores',
  '/planos',
  '/testes',
  '/ajuda',
  '/clientes',
  '/admin',
  '/perfil'
]

const PUBLIC_API_ROUTES = [
  '/api/auth'
]

const PROTECTED_API_ROUTES = [
  '/api/admin',
  '/api/proxy',
  '/api/plan-groups',
  '/api/messages',
  '/api/push-notifications'
]

const ADMIN_API_ROUTES = [
  '/api/admin'
]

// Funções helper
function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function isAuthRoute(pathname) {
  return AUTH_ROUTES.some(route => pathname.startsWith(route))
}

function isProtectedRoute(pathname) {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

function isPublicApiRoute(pathname) {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
}

function isProtectedApiRoute(pathname) {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))
}

function isAdminApiRoute(pathname) {
  return ADMIN_API_ROUTES.some(route => pathname.startsWith(route))
}

// Simular o middleware
function simulateMiddleware(pathname) {
  console.log(`\n=== SIMULANDO MIDDLEWARE PARA: ${pathname} ===\n`)
  
  // 1. VERIFICAR ROTAS PÚBLICAS
  console.log('1. VERIFICANDO ROTAS PÚBLICAS:')
  
  // Permitir rota raiz
  if (pathname === '/') {
    console.log('   ✅ Rota raiz permitida')
    return 'PERMITIDA - Rota raiz'
  }
  
  // Permitir rotas públicas
  if (isPublicRoute(pathname)) {
    console.log(`   ✅ Rota pública permitida: ${pathname}`)
    return 'PERMITIDA - Rota pública'
  }
  
  // Permitir APIs públicas
  if (isPublicApiRoute(pathname)) {
    console.log(`   ✅ API pública permitida: ${pathname}`)
    return 'PERMITIDA - API pública'
  }
  
  console.log('   ❌ Não é rota pública')
  
  // 2. VERIFICAR SE PRECISA DE AUTENTICAÇÃO
  console.log('\n2. VERIFICANDO SE PRECISA DE AUTENTICAÇÃO:')
  
  const needsAuth = isProtectedRoute(pathname) || isProtectedApiRoute(pathname)
  
  console.log(`   - isProtectedRoute(${pathname}): ${isProtectedRoute(pathname)}`)
  console.log(`   - isProtectedApiRoute(${pathname}): ${isProtectedApiRoute(pathname)}`)
  console.log(`   - needsAuth: ${needsAuth}`)
  
  if (!needsAuth) {
    console.log(`   🟡 Rota não categorizada, permitindo: ${pathname}`)
    return 'PERMITIDA - Não categorizada'
  }
  
  console.log('   ❌ Rota requer autenticação')
  
  // 3. VERIFICAR AUTENTICAÇÃO (simulado)
  console.log('\n3. VERIFICANDO AUTENTICAÇÃO:')
  console.log('   ❌ Usuário não autenticado (simulado)')
  
  // Para APIs, retornar 401
  if (isProtectedApiRoute(pathname)) {
    console.log('   🚫 Retornando 401 para API protegida')
    return 'ERRO 401 - API protegida sem autenticação'
  }
  
  // Para páginas, redirecionar para login
  console.log('   🔄 Redirecionando para login')
  return 'REDIRECIONAMENTO - Para login'
}

// Testar rotas específicas
const testRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/upload/secure',
  '/dashboard',
  '/login',
  '/'
]

testRoutes.forEach(route => {
  const result = simulateMiddleware(route)
  console.log(`\n>>> RESULTADO FINAL: ${result}\n`)
  console.log('='.repeat(60))
})