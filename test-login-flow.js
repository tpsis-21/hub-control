// Script para testar o fluxo completo de login e upload
const https = require('https');
const http = require('http');
const fs = require('fs');
const FormData = require('form-data');

// Configurar para aceitar certificados auto-assinados (apenas para desenvolvimento)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      if (typeof data === 'string') {
        req.write(data);
      } else if (data instanceof FormData) {
        data.pipe(req);
        return;
      }
    }
    
    req.end();
  });
}

function parseCookies(cookies) {
  const cookieMap = {};
  cookies.forEach(cookie => {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    if (name && value) {
      cookieMap[name.trim()] = value.trim();
    }
  });
  return cookieMap;
}

function formatCookies(cookieMap) {
  return Object.entries(cookieMap)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function testLoginFlow() {
  console.log('=== TESTE DO FLUXO DE LOGIN E UPLOAD ===\n');
  
  let cookies = {};
  
  try {
    // 1. Tentar fazer login via Supabase Auth
    console.log('1. Testando login...');
    const loginData = JSON.stringify({
      email: 'admin@test.com',
      password: '123456'
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log(`Status do login: ${loginResponse.statusCode}`);
    console.log(`Resposta: ${loginResponse.body}`);
    
    if (loginResponse.cookies.length > 0) {
      cookies = { ...cookies, ...parseCookies(loginResponse.cookies) };
      console.log('Cookies recebidos:', Object.keys(cookies));
    }
    
    // 2. Se o login falhou, tentar acessar uma página que pode definir cookies de sessão
    if (loginResponse.statusCode !== 200) {
      console.log('\n2. Tentando acessar página principal para obter cookies...');
      const homeOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/',
        method: 'GET',
        headers: {}
      };
      
      const homeResponse = await makeRequest(homeOptions);
      console.log(`Status da página principal: ${homeResponse.statusCode}`);
      
      if (homeResponse.cookies.length > 0) {
        cookies = { ...cookies, ...parseCookies(homeResponse.cookies) };
        console.log('Cookies da página principal:', Object.keys(cookies));
      }
    }
    
    // 3. Tentar upload com os cookies obtidos
    console.log('\n3. Testando upload com cookies...');
    
    // Criar arquivo de teste
    const testContent = 'Este é um arquivo de teste para upload';
    fs.writeFileSync('test-upload-file.txt', testContent);
    
    const form = new FormData();
    form.append('file', fs.createReadStream('test-upload-file.txt'));
    form.append('type', 'document');
    form.append('bucket', 'avatars');
    
    const uploadOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/secure',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Cookie': formatCookies(cookies)
      }
    };
    
    console.log('Headers do upload:', uploadOptions.headers);
    
    const uploadResponse = await makeRequest(uploadOptions, form);
    console.log(`\nStatus do upload: ${uploadResponse.statusCode}`);
    console.log(`Resposta do upload: ${uploadResponse.body}`);
    
    // Limpar arquivo de teste
    fs.unlinkSync('test-upload-file.txt');
    
  } catch (error) {
    console.error('Erro durante o teste:', error.message);
  }
  
  console.log('\n=== TESTE CONCLUÍDO ===');
}

testLoginFlow();