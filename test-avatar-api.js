// Script para testar a API de upload de avatar diretamente
const fs = require('fs');
const path = require('path');

// Função para criar uma imagem de teste
function createTestImage() {
  const testImagePath = path.join(__dirname, 'test-avatar.png');
  
  // Criar uma imagem PNG simples de 1x1 pixel (base64)
  const pngData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==',
    'base64'
  );
  
  fs.writeFileSync(testImagePath, pngData);
  return testImagePath;
}

// Função para testar o upload
async function testAvatarUpload() {
  try {
    console.log('🚀 Testando API de upload de avatar...');
    
    // Criar imagem de teste
    const imagePath = createTestImage();
    console.log('🖼️ Imagem de teste criada:', imagePath);
    
    // Ler o arquivo
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Criar FormData
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('file', imageBuffer, {
      filename: 'test-avatar.png',
      contentType: 'image/png'
    });
    form.append('type', 'avatar');
    form.append('bucket', 'avatars');
    
    console.log('📤 Enviando requisição para /api/upload/secure...');
    
    // Fazer requisição
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:8080/api/upload/secure', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        // Simular um token de autenticação (você precisará de um token válido)
        'Cookie': 'sb-htwiupmnqlmwvzqzroal-auth-token=your-token-here'
      }
    });
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📄 Corpo da resposta:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Upload bem-sucedido!');
        console.log('🔗 URL da imagem:', data.url);
        console.log('📝 Dados completos:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('⚠️ Resposta não é JSON válido');
      }
    } else {
      console.log('❌ Erro no upload:', response.status, responseText);
    }
    
    // Limpar arquivo de teste
    fs.unlinkSync(imagePath);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar teste
testAvatarUpload();