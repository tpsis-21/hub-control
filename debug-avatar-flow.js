// Script para debugar o fluxo completo do avatar
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  let browser;
  
  try {
    console.log('🔍 Iniciando debug do fluxo de avatar...');
    
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Interceptar logs do console
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      // Filtrar logs relevantes para avatar/upload
      if (text.includes('avatar') || text.includes('upload') || text.includes('formData') || 
          text.includes('ImageUpload') || text.includes('onChange') || text.includes('URL')) {
        console.log(`[BROWSER-${type.toUpperCase()}] ${text}`);
      }
    });
    
    // Interceptar erros
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });
    
    // Interceptar requisições de rede
    page.on('request', request => {
      if (request.url().includes('/api/upload') || request.url().includes('avatar')) {
        console.log(`[NETWORK] ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/upload') || response.url().includes('avatar')) {
        console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('📱 Navegando para a página de perfil...');
    await page.goto('http://localhost:8080/perfil', { waitUntil: 'networkidle0' });
    
    // Verificar se foi redirecionado para login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('🔐 Redirecionado para login. Aguardando login manual...');
      console.log('⏳ Por favor, faça login manualmente. Aguardando 60 segundos...');
      
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      // Verificar se ainda está na página de login
      const urlAfterWait = page.url();
      if (urlAfterWait.includes('/login')) {
        console.log('❌ Login não foi realizado. Encerrando teste.');
        return;
      }
      
      console.log('✅ Login realizado com sucesso!');
      
      // Navegar novamente para o perfil após login
      await page.goto('http://localhost:8080/perfil', { waitUntil: 'networkidle0' });
    }
    
    console.log('🔍 Verificando estado inicial do avatar...');
    
    // Verificar se há uma imagem de avatar atual
    const currentAvatar = await page.evaluate(() => {
      const avatarImg = document.querySelector('img[alt="Avatar"], .avatar img, [class*="avatar"] img');
      return avatarImg ? avatarImg.src : null;
    });
    
    console.log('🖼️ Avatar atual:', currentAvatar || 'Nenhum avatar encontrado');
    
    // Verificar o valor atual do formData.avatar_url no estado do React
    const formDataState = await page.evaluate(() => {
      // Tentar acessar o estado do React através do DevTools
      const reactFiber = document.querySelector('[data-reactroot]')?._reactInternalFiber ||
                         document.querySelector('#__next')?._reactInternalFiber;
      
      if (reactFiber) {
        // Procurar pelo componente que tem formData
        let current = reactFiber;
        while (current) {
          if (current.memoizedState && current.memoizedState.avatar_url !== undefined) {
            return current.memoizedState;
          }
          current = current.child || current.sibling || current.return;
        }
      }
      
      return 'Estado não encontrado';
    });
    
    console.log('📊 Estado do formData:', formDataState);
    
    // Procurar pelo input de arquivo
    console.log('🔍 Procurando input de upload...');
    const fileInput = await page.$('input[type="file"]');
    
    if (!fileInput) {
      console.log('❌ Input de arquivo não encontrado!');
      
      // Listar todos os elementos que podem ser relacionados ao upload
      const uploadElements = await page.evaluate(() => {
        const elements = [];
        
        // Procurar por botões com texto relacionado
        document.querySelectorAll('button').forEach(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('upload') || text.includes('foto') || text.includes('imagem') || text.includes('alterar')) {
            elements.push({ type: 'button', text: btn.textContent, classes: btn.className });
          }
        });
        
        // Procurar por divs clicáveis
        document.querySelectorAll('div[role="button"], div[onclick], .cursor-pointer').forEach(div => {
          const text = div.textContent?.toLowerCase() || '';
          if (text.includes('upload') || text.includes('foto') || text.includes('imagem') || text.includes('alterar')) {
            elements.push({ type: 'div', text: div.textContent, classes: div.className });
          }
        });
        
        return elements;
      });
      
      console.log('🔍 Elementos de upload encontrados:', uploadElements);
      await page.screenshot({ path: 'debug-no-file-input.png' });
      return;
    }
    
    console.log('✅ Input de arquivo encontrado!');
    
    // Criar uma imagem de teste
    console.log('🖼️ Criando imagem de teste...');
    const testImagePath = path.join(__dirname, 'debug-avatar.png');
    
    // Criar uma imagem PNG simples colorida (100x100 pixels)
    const canvas = require('canvas');
    const canvasObj = canvas.createCanvas(100, 100);
    const ctx = canvasObj.getContext('2d');
    
    // Desenhar um círculo colorido
    ctx.fillStyle = '#3B82F6'; // Azul
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST', 50, 55);
    
    const buffer = canvasObj.toBuffer('image/png');
    fs.writeFileSync(testImagePath, buffer);
    
    console.log('📤 Fazendo upload da imagem de teste...');
    await fileInput.uploadFile(testImagePath);
    
    console.log('⏳ Aguardando processamento do upload...');
    
    // Aguardar e monitorar mudanças
    let uploadCompleted = false;
    let attempts = 0;
    const maxAttempts = 20; // 20 segundos
    
    while (!uploadCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      // Verificar se houve mudança na imagem do avatar
      const newAvatar = await page.evaluate(() => {
        const avatarImg = document.querySelector('img[alt="Avatar"], .avatar img, [class*="avatar"] img');
        return avatarImg ? avatarImg.src : null;
      });
      
      if (newAvatar && newAvatar !== currentAvatar) {
        console.log(`✅ Avatar atualizado após ${attempts} segundos:`, newAvatar);
        uploadCompleted = true;
      } else {
        console.log(`⏳ Tentativa ${attempts}/${maxAttempts} - Avatar ainda não atualizado`);
      }
      
      // Verificar se há mensagens de erro ou sucesso
      const toasts = await page.$$eval('[data-testid="toast"], .toast, [class*="toast"]', toasts => 
        toasts.map(toast => toast.textContent)
      );
      
      if (toasts.length > 0) {
        console.log('📢 Toasts detectados:', toasts);
      }
    }
    
    if (!uploadCompleted) {
      console.log('⚠️ Upload não foi completado no tempo esperado');
    }
    
    // Verificar o estado final do formData
    const finalFormDataState = await page.evaluate(() => {
      // Tentar acessar window.formData se estiver disponível para debug
      if (window.formData) {
        return window.formData;
      }
      return 'Estado final não acessível';
    });
    
    console.log('📊 Estado final do formData:', finalFormDataState);
    
    // Tentar salvar o perfil
    console.log('💾 Procurando botão de salvar...');
    const saveButton = await page.$('button:has-text("Salvar"), button:has-text("Salvar Alterações")');
    
    if (saveButton) {
      console.log('💾 Clicando em salvar...');
      await saveButton.click();
      
      // Aguardar resposta
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verificar toasts de resultado
      const resultToasts = await page.$$eval('[data-testid="toast"], .toast, [class*="toast"]', toasts => 
        toasts.map(toast => toast.textContent)
      );
      
      console.log('📢 Resultado do salvamento:', resultToasts);
    } else {
      console.log('⚠️ Botão de salvar não encontrado');
    }
    
    // Screenshot final
    await page.screenshot({ path: 'debug-avatar-final.png' });
    console.log('📸 Screenshot final salva: debug-avatar-final.png');
    
    // Limpar arquivo de teste
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    console.log('✅ Debug do fluxo de avatar concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error);
    
    if (browser) {
      const page = (await browser.pages())[0];
      if (page) {
        await page.screenshot({ path: 'debug-avatar-error.png' });
        console.log('📸 Screenshot de erro salva: debug-avatar-error.png');
      }
    }
  } finally {
    if (browser) {
      console.log('🔄 Mantendo navegador aberto para inspeção manual...');
      console.log('⏳ Aguardando 30 segundos antes de fechar...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      await browser.close();
    }
  }
})();