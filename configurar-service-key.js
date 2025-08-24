/**
 * 🔑 CONFIGURADOR AUTOMÁTICO - SERVICE ROLE KEY
 * 
 * Este script ajuda a configurar a Service Role Key do Supabase
 * de forma segura e automatizada.
 * 
 * IMPORTANTE: Você precisa copiar a chave manualmente do dashboard!
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuração
const ENV_FILE = '.env.local';
const PROJECT_URL = 'https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/settings/api';

// Interface para entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Função para fazer perguntas ao usuário
 */
function pergunta(questao) {
  return new Promise((resolve) => {
    rl.question(questao, (resposta) => {
      resolve(resposta.trim());
    });
  });
}

/**
 * Função para validar se a chave parece ser válida
 */
function validarServiceKey(key) {
  // Service Role Key do Supabase sempre começa com 'eyJ' e é bem longa
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  if (!key.startsWith('eyJ')) {
    return false;
  }
  
  if (key.length < 100) {
    return false;
  }
  
  // Verificar se não é a chave anônima (que já temos)
  if (key.includes('"role":"anon"')) {
    return false;
  }
  
  return true;
}

/**
 * Função para atualizar o arquivo .env.local
 */
function atualizarEnvFile(serviceKey) {
  try {
    // Ler arquivo atual
    const envPath = path.join(__dirname, ENV_FILE);
    let conteudo = fs.readFileSync(envPath, 'utf8');
    
    // Substituir a linha da Service Role Key
    const linhaAntiga = /SUPABASE_SERVICE_ROLE_KEY=.*/;
    const linhaNova = `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`;
    
    if (conteudo.match(linhaAntiga)) {
      conteudo = conteudo.replace(linhaAntiga, linhaNova);
    } else {
      // Se não encontrar a linha, adicionar no final
      conteudo += `\n${linhaNova}\n`;
    }
    
    // Salvar arquivo
    fs.writeFileSync(envPath, conteudo, 'utf8');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar .env.local:', error.message);
    return false;
  }
}

/**
 * Função para testar a conexão com a nova chave
 */
async function testarConexao(serviceKey) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      'https://htwiupmnqlmwvzqzroal.supabase.co',
      serviceKey
    );
    
    // Testar uma operação simples
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Erro na conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão testada com sucesso!');
    console.log(`📊 Usuários encontrados: ${data.users.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error.message);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🔑 CONFIGURADOR DE SERVICE ROLE KEY');
  console.log('==================================================\n');
  
  console.log('📋 INSTRUÇÕES:');
  console.log('1. Abra o link abaixo em seu navegador:');
  console.log(`   ${PROJECT_URL}`);
  console.log('2. Localize a seção "Project API keys"');
  console.log('3. Copie a chave "service_role" (NÃO a "anon"!)');
  console.log('4. Cole a chave quando solicitado\n');
  
  // Perguntar se o usuário quer abrir o link
  const abrirLink = await pergunta('🌐 Deseja abrir o link automaticamente? (s/n): ');
  
  if (abrirLink.toLowerCase() === 's' || abrirLink.toLowerCase() === 'sim') {
    try {
      const { exec } = require('child_process');
      exec(`start ${PROJECT_URL}`);
      console.log('🌐 Link aberto no navegador!');
    } catch (error) {
      console.log('⚠️  Não foi possível abrir automaticamente. Copie o link manualmente.');
    }
  }
  
  console.log('\n⏳ Aguardando você copiar a Service Role Key...\n');
  
  // Solicitar a chave
  const serviceKey = await pergunta('🔑 Cole a Service Role Key aqui: ');
  
  // Validar a chave
  if (!validarServiceKey(serviceKey)) {
    console.log('❌ Chave inválida!');
    console.log('\n🔍 Verifique se:');
    console.log('   - Copiou a chave "service_role" (não a "anon")');
    console.log('   - A chave está completa (começa com "eyJ")');
    console.log('   - Não há espaços extras no início ou fim\n');
    
    const tentar = await pergunta('🔄 Deseja tentar novamente? (s/n): ');
    if (tentar.toLowerCase() === 's' || tentar.toLowerCase() === 'sim') {
      rl.close();
      main(); // Reiniciar
      return;
    } else {
      console.log('❌ Configuração cancelada.');
      rl.close();
      return;
    }
  }
  
  console.log('✅ Chave válida!');
  
  // Atualizar arquivo .env.local
  console.log('\n📝 Atualizando .env.local...');
  
  if (!atualizarEnvFile(serviceKey)) {
    console.log('❌ Falha ao atualizar arquivo!');
    rl.close();
    return;
  }
  
  console.log('✅ Arquivo .env.local atualizado!');
  
  // Testar conexão
  console.log('\n🔍 Testando conexão...');
  
  const conexaoOk = await testarConexao(serviceKey);
  
  if (conexaoOk) {
    console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('==================================================');
    console.log('✅ Service Role Key configurada');
    console.log('✅ Conexão com Supabase testada');
    console.log('✅ Arquivo .env.local atualizado');
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('1. Execute: node executar-limpeza-completa.js');
    console.log('2. Ou execute: node verificar-usuarios-atuais.js');
  } else {
    console.log('\n⚠️  CONFIGURAÇÃO PARCIAL');
    console.log('==================================================');
    console.log('✅ Service Role Key salva no .env.local');
    console.log('❌ Falha no teste de conexão');
    console.log('\n🔍 POSSÍVEIS CAUSAS:');
    console.log('- Chave incorreta ou expirada');
    console.log('- Problemas de rede');
    console.log('- Permissões insuficientes');
    console.log('\n🔄 Tente executar: node verificar-usuarios-atuais.js');
  }
  
  rl.close();
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erro inesperado:', error.message);
    rl.close();
    process.exit(1);
  });
}

module.exports = { validarServiceKey, atualizarEnvFile, testarConexao };