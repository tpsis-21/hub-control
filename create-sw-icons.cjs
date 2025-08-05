const sharp = require('sharp');
const path = require('path');

async function createServiceWorkerIcons() {
  const logoPath = 'public/assets/images/logo/hub-control-icon.png';
  const publicDir = 'public';
  
  try {
    // Criar ícones para o service worker
    await sharp(logoPath)
      .resize(192, 192)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(publicDir, 'icon-192x192.png'));
    
    await sharp(logoPath)
      .resize(72, 72)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(publicDir, 'icon-72x72.png'));
    
    // Criar ícones específicos para notificações
    await sharp(logoPath)
      .resize(48, 48)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(publicDir, 'icon-view.png'));
    
    await sharp(logoPath)
      .resize(48, 48)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(publicDir, 'icon-dismiss.png'));
    
    console.log('✅ Ícones do service worker criados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar ícones do service worker:', error);
  }
}

createServiceWorkerIcons().catch(console.error);