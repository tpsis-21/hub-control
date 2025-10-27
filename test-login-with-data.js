// Script para testar o endpoint de login com dados válidos
// Criado para debugar o erro "invalid session token"

const https = require('https');
const http = require('http');

async function testLoginEndpoint() {
  console.log('=== TESTE DO ENDPOINT DE LOGIN ===\n');
  
  // Dados de teste válidos
  const loginData = {
    email: 'test@example.com',
    password: 'password123'
  };
  
  const postData = JSON.stringify(loginData);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n=== RESPOSTA DO SERVIDOR ===');
        try {
          const jsonData = JSON.parse(data);
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('Resposta não é JSON válido:');
          console.log(data);
        }
        resolve(data);
      });
    });
    
    req.on('error', (e) => {
      console.error(`Erro na requisição: ${e.message}`);
      reject(e);
    });
    
    // Enviar os dados
    req.write(postData);
    req.end();
  });
}

// Executar o teste
testLoginEndpoint()
  .then(() => {
    console.log('\n=== TESTE CONCLUÍDO ===');
  })
  .catch((error) => {
    console.error('Erro no teste:', error);
  });