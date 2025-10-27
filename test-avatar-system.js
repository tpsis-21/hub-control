// Teste do Sistema de Avatar
// Este script testa o fluxo completo de autenticação e upload de avatar

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configurações
const BASE_URL = 'http://localhost:8080';
const TEST_EMAIL = 'avatar-test@hubcontrol.com';
const TEST_PASSWORD = 'AvatarTest123!';

// Função para fazer login e obter cookies de sessão
async function login() {
  console.log('🔐 Fazendo login...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });
    
    const data = await response.json();
    console.log('📊 Resposta do login:', data);
    
    if (data.success) {
      // Extrair cookies da resposta
      const cookies = response.headers.get('set-cookie');
      console.log('🍪 Cookies recebidos:', cookies);
      return cookies;
    } else {
      console.error('❌ Erro no login:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro na requisição de login:', error.message);
    return null;
  }
}

// Função para criar uma imagem de teste
function createTestImage() {
  console.log('🖼️ Criando imagem de teste...');
  
  // Criar um buffer de imagem PNG simples (1x1 pixel vermelho)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // data
    0xE2, 0x21, 0xBC, 0x33, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  const testImagePath = path.join(__dirname, 'test-avatar.png');
  fs.writeFileSync(testImagePath, pngBuffer);
  console.log('✅ Imagem de teste criada:', testImagePath);
  
  return testImagePath;
}

// Função para testar upload de avatar
async function testAvatarUpload(cookies) {
  console.log('📤 Testando upload de avatar...');
  
  if (!cookies) {
    console.error('❌ Sem cookies de sessão para o upload');
    return false;
  }
  
  try {
    // Criar imagem de teste
    const imagePath = createTestImage();
    
    // Preparar FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));
    form.append('type', 'image');
    form.append('bucket', 'avatars');
    
    const response = await fetch(`${BASE_URL}/api/upload/secure`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      body: form
    });
    
    const data = await response.json();
    console.log('📊 Resposta do upload:', data);
    
    // Limpar arquivo de teste
    fs.unlinkSync(imagePath);
    
    return data.success;
  } catch (error) {
    console.error('❌ Erro no upload:', error.message);
    return false;
  }
}

// Função principal
async function testAvatarSystem() {
  console.log('🚀 Iniciando teste do sistema de avatar...');
  console.log('🌐 URL base:', BASE_URL);
  console.log('👤 Email de teste:', TEST_EMAIL);
  console.log('');
  
  // 1. Fazer login
  const cookies = await login();
  
  if (!cookies) {
    console.log('❌ Não foi possível fazer login. Teste abortado.');
    return;
  }
  
  console.log('✅ Login realizado com sucesso!');
  console.log('');
  
  // 2. Testar upload de avatar
  const uploadSuccess = await testAvatarUpload(cookies);
  
  if (uploadSuccess) {
    console.log('✅ Upload de avatar realizado com sucesso!');
  } else {
    console.log('❌ Falha no upload de avatar.');
  }
  
  console.log('');
  console.log('🏁 Teste concluído!');
}

// Executar teste
if (require.main === module) {
  testAvatarSystem().catch(console.error);
}

module.exports = { testAvatarSystem };