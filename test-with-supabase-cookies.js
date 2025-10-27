// Script para testar upload com cookies do Supabase
const http = require('http');
const FormData = require('form-data');
const fs = require('fs');

// Cookies típicos do Supabase (você precisa obter estes do navegador)
// Para obter os cookies:
// 1. Abra o DevTools (F12)
// 2. Vá para Application > Storage > Cookies > http://localhost:3001
// 3. Copie os valores dos cookies que começam com 'sb-'

const SUPABASE_COOKIES = {
  // Substitua pelos valores reais do seu navegador
  'sb-localhost-auth-token': 'SEU_TOKEN_AQUI',
  'sb-localhost-auth-token-code-verifier': 'SEU_CODE_VERIFIER_AQUI',
  // Adicione outros cookies conforme necessário
};

function formatCookies(cookieMap) {
  return Object.entries(cookieMap)
    .filter(([name, value]) => value && value !== 'SEU_TOKEN_AQUI')
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      if (data instanceof FormData) {
        data.pipe(req);
        return;
      } else if (typeof data === 'string') {
        req.write(data);
      }
    }
    
    req.end();
  });
}

async function testUploadWithSupabaseCookies() {
  console.log('=== TESTE DE UPLOAD COM COOKIES DO SUPABASE ===\n');
  
  const cookieString = formatCookies(SUPABASE_COOKIES);
  
  if (!cookieString) {
    console.log('❌ ERRO: Nenhum cookie válido configurado!');
    console.log('\n📋 INSTRUÇÕES:');
    console.log('1. Abra http://localhost:3001 no navegador');
    console.log('2. Faça login se necessário');
    console.log('3. Abra DevTools (F12)');
    console.log('4. Vá para Application > Storage > Cookies > http://localhost:3001');
    console.log('5. Copie os valores dos cookies que começam com "sb-"');
    console.log('6. Substitua os valores no script\n');
    return;
  }
  
  console.log('🍪 Cookies configurados:', cookieString.substring(0, 100) + '...');
  
  try {
    // Criar arquivo de teste
    const testContent = 'Teste de upload com autenticação';
    fs.writeFileSync('test-auth-upload.txt', testContent);
    
    const form = new FormData();
    form.append('file', fs.createReadStream('test-auth-upload.txt'));
    form.append('type', 'document');
    form.append('bucket', 'avatars');
    
    const uploadOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/secure',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    console.log('\n🚀 Enviando requisição de upload...');
    const response = await makeRequest(uploadOptions, form);
    
    console.log(`\n📊 Status: ${response.statusCode}`);
    console.log(`📄 Resposta: ${response.body}`);
    
    if (response.statusCode === 200) {
      console.log('\n✅ SUCESSO: Upload realizado com sucesso!');
    } else if (response.statusCode === 401) {
      console.log('\n❌ ERRO: Ainda não autenticado. Verifique os cookies.');
    } else {
      console.log(`\n⚠️  Status inesperado: ${response.statusCode}`);
    }
    
    // Limpar arquivo de teste
    fs.unlinkSync('test-auth-upload.txt');
    
  } catch (error) {
    console.error('\n💥 Erro durante o teste:', error.message);
  }
  
  console.log('\n=== TESTE CONCLUÍDO ===');
}

// Função para listar cookies disponíveis no navegador (instruções)
function showCookieInstructions() {
  console.log('\n📋 COMO OBTER OS COOKIES DO SUPABASE:');
  console.log('\n1. Abra http://localhost:3001 no navegador');
  console.log('2. Certifique-se de estar logado');
  console.log('3. Pressione F12 para abrir DevTools');
  console.log('4. Vá para a aba "Application" (ou "Aplicação")');
  console.log('5. No painel esquerdo, expanda "Storage" > "Cookies"');
  console.log('6. Clique em "http://localhost:3001"');
  console.log('7. Procure por cookies que começam com "sb-"');
  console.log('8. Copie os valores e substitua no script');
  console.log('\n🔍 Cookies típicos do Supabase:');
  console.log('   - sb-localhost-auth-token');
  console.log('   - sb-localhost-auth-token-code-verifier');
  console.log('   - sb-localhost-refresh-token');
}

if (process.argv.includes('--help')) {
  showCookieInstructions();
} else {
  testUploadWithSupabaseCookies();
}