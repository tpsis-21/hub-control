// Script para diagnosticar o problema da rota /login
const http = require('http');

// Função para fazer requisição HTTP
function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testRoutes() {
  console.log('🔍 Testando diferentes rotas para diagnosticar o problema...');
  
  const routes = [
    { path: '/login', description: 'Página de login' },
    { path: '/api/auth/login', description: 'API de login' },
    { path: '/dashboard', description: 'Dashboard (protegida)' },
    { path: '/', description: 'Página inicial' },
    { path: '/favicon.ico', description: 'Favicon (pública)' }
  ];

  for (const route of routes) {
    try {
      console.log(`\n📍 Testando: ${route.path} (${route.description})`);
      const response = await makeRequest(route.path);
      
      console.log(`   Status: ${response.statusCode} ${response.statusMessage}`);
      console.log(`   Content-Type: ${response.headers['content-type'] || 'N/A'}`);
      
      // Mostrar apenas os primeiros 200 caracteres do body
      const bodyPreview = response.body.substring(0, 200);
      console.log(`   Body (preview): ${bodyPreview}${response.body.length > 200 ? '...' : ''}`);
      
      // Verificar se é um redirect
      if (response.headers.location) {
        console.log(`   🔄 Redirect para: ${response.headers.location}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
  
  console.log('\n✅ Teste concluído!');
}

// Executar o teste
testRoutes().catch(console.error);