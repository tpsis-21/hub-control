// Script para testar as funções de rota do middleware
// Verificar se /api/auth/login está sendo identificada corretamente

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

function isPublicApiRoute(pathname) {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
}

function isProtectedApiRoute(pathname) {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))
}

// Testar as rotas
const testRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/admin/users',
  '/api/upload/secure',
  '/api/messages/send'
]

console.log('=== TESTE DAS FUNÇÕES DE ROTA DO MIDDLEWARE ===\n')

testRoutes.forEach(route => {
  const isPublic = isPublicApiRoute(route)
  const isProtected = isProtectedApiRoute(route)
  
  console.log(`Rota: ${route}`)
  console.log(`  - É pública: ${isPublic}`)
  console.log(`  - É protegida: ${isProtected}`)
  console.log(`  - Status: ${isPublic ? 'PERMITIDA' : isProtected ? 'REQUER AUTH' : 'NÃO CATEGORIZADA'}`)
  console.log('')
})

// Verificar especificamente /api/auth/login
const loginRoute = '/api/auth/login'
console.log('=== ANÁLISE ESPECÍFICA DE /api/auth/login ===\n')
console.log(`Rota testada: ${loginRoute}`)
console.log(`PUBLIC_API_ROUTES: ${JSON.stringify(PUBLIC_API_ROUTES)}`)
console.log(`Resultado de isPublicApiRoute('${loginRoute}'): ${isPublicApiRoute(loginRoute)}`)

// Testar o método startsWith manualmente
console.log('\n=== TESTE MANUAL DO STARTSWITH ===\n')
PUBLIC_API_ROUTES.forEach(route => {
  const result = loginRoute.startsWith(route)
  console.log(`'${loginRoute}'.startsWith('${route}') = ${result}`)
})