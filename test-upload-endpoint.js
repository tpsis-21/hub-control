// Script para testar o endpoint de upload após a correção
// Verificar se o erro "invalid session token" foi resolvido

const http = require('http');
const FormData = require('form-data');
const fs = require('fs');

async function testUploadEndpoint() {
  console.log('=== TESTE DO ENDPOINT DE UPLOAD ===\n');
  
  // Criar um arquivo de teste simples
  const testContent = 'Conteúdo de teste para upload';
  const testFileName = 'test-file.txt';
  
  // Escrever arquivo temporário
  fs.writeFileSync(testFileName, testContent);
  
  try {
    // Criar FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(testFileName));
    form.append('type', 'document');
    form.append('bucket', 'user-uploads');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/secure',
      method: 'POST',
      headers: {
        ...form.getHeaders()
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
          
          // Limpar arquivo de teste
          try {
            fs.unlinkSync(testFileName);
          } catch (e) {
            console.log('Erro ao limpar arquivo de teste:', e.message);
          }
          
          resolve(data);
        });
      });
      
      req.on('error', (e) => {
        console.error(`Erro na requisição: ${e.message}`);
        // Limpar arquivo de teste em caso de erro
        try {
          fs.unlinkSync(testFileName);
        } catch (cleanupError) {
          // Ignorar erro de limpeza
        }
        reject(e);
      });
      
      // Enviar os dados do formulário
      form.pipe(req);
    });
    
  } catch (error) {
    // Limpar arquivo de teste em caso de erro
    try {
      fs.unlinkSync(testFileName);
    } catch (cleanupError) {
      // Ignorar erro de limpeza
    }
    throw error;
  }
}

// Executar o teste
testUploadEndpoint()
  .then(() => {
    console.log('\n=== TESTE CONCLUÍDO ===');
  })
  .catch((error) => {
    console.error('Erro no teste:', error);
  });