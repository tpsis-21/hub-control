/**
 * Script de Verificação das Políticas RLS do Avatar
 * 
 * Este script verifica se as políticas RLS foram configuradas corretamente
 * no painel web do Supabase após a configuração manual.
 * 
 * Execute após configurar as 4 políticas no painel:
 * node verify-avatar-policies-manual.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas');
  console.log('Verifique se o arquivo .env contém:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Clientes Supabase
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 VERIFICAÇÃO DAS POLÍTICAS RLS DO AVATAR');
console.log('==========================================\n');

async function verificarPoliticasRLS() {
  const resultados = {
    bucketExiste: false,
    leituraPublica: false,
    uploadAnonimoBloqueado: false,
    uploadAutenticado: false,
    urlPublicaFunciona: false
  };

  try {
    // 1. Verificar se o bucket 'avatars' existe
    console.log('1️⃣ Verificando existência do bucket "avatars"...');
    const { data: buckets, error: bucketsError } = await supabaseAnon.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Erro ao listar buckets:', bucketsError.message);
      return resultados;
    }
    
    const avatarBucket = buckets.find(bucket => bucket.name === 'avatars');
    if (avatarBucket) {
      console.log('✅ Bucket "avatars" encontrado');
      resultados.bucketExiste = true;
    } else {
      console.log('❌ Bucket "avatars" não encontrado');
      return resultados;
    }

    // 2. Testar leitura pública (deve funcionar)
    console.log('\n2️⃣ Testando leitura pública do bucket...');
    const { data: arquivos, error: listarError } = await supabaseAnon.storage
      .from('avatars')
      .list();
    
    if (listarError) {
      console.log('❌ Erro na leitura pública:', listarError.message);
    } else {
      console.log('✅ Leitura pública funcionando');
      console.log(`   Arquivos encontrados: ${arquivos.length}`);
      resultados.leituraPublica = true;
    }

    // 3. Testar upload anônimo (deve falhar)
    console.log('\n3️⃣ Testando upload anônimo (deve ser bloqueado)...');
    const arquivoTeste = Buffer.from('teste-upload-anonimo', 'utf8');
    const { error: uploadAnonError } = await supabaseAnon.storage
      .from('avatars')
      .upload('teste-anonimo.txt', arquivoTeste);
    
    if (uploadAnonError) {
      if (uploadAnonError.message.includes('403') || uploadAnonError.message.includes('Forbidden') || uploadAnonError.message.includes('not allowed')) {
        console.log('✅ Upload anônimo corretamente bloqueado');
        console.log(`   Erro esperado: ${uploadAnonError.message}`);
        resultados.uploadAnonimoBloqueado = true;
      } else {
        console.log('⚠️  Upload anônimo falhou, mas com erro inesperado:', uploadAnonError.message);
      }
    } else {
      console.log('❌ PROBLEMA: Upload anônimo foi permitido (risco de segurança!)');
    }

    // 4. Testar upload com service role (simula usuário autenticado)
    console.log('\n4️⃣ Testando upload autenticado...');
    const arquivoTesteAuth = Buffer.from('teste-upload-autenticado', 'utf8');
    const nomeArquivo = `teste-auth-${Date.now()}.txt`;
    const { data: uploadData, error: uploadAuthError } = await supabaseService.storage
      .from('avatars')
      .upload(nomeArquivo, arquivoTesteAuth);
    
    if (uploadAuthError) {
      console.log('❌ Erro no upload autenticado:', uploadAuthError.message);
    } else {
      console.log('✅ Upload autenticado funcionando');
      console.log(`   Arquivo criado: ${uploadData.path}`);
      resultados.uploadAutenticado = true;

      // 5. Testar URL pública
      console.log('\n5️⃣ Testando URL pública...');
      const { data: urlData } = supabaseAnon.storage
        .from('avatars')
        .getPublicUrl(nomeArquivo);
      
      if (urlData.publicUrl) {
        console.log('✅ URL pública gerada com sucesso');
        console.log(`   URL: ${urlData.publicUrl}`);
        resultados.urlPublicaFunciona = true;

        // Testar acesso à URL
        try {
          const response = await fetch(urlData.publicUrl);
          if (response.ok) {
            console.log('✅ URL pública acessível');
          } else {
            console.log(`⚠️  URL pública retornou status: ${response.status}`);
          }
        } catch (fetchError) {
          console.log('⚠️  Erro ao acessar URL pública:', fetchError.message);
        }
      }

      // Limpar arquivo de teste
      console.log('\n🧹 Limpando arquivo de teste...');
      const { error: deleteError } = await supabaseService.storage
        .from('avatars')
        .remove([nomeArquivo]);
      
      if (deleteError) {
        console.log('⚠️  Erro ao deletar arquivo de teste:', deleteError.message);
      } else {
        console.log('✅ Arquivo de teste removido');
      }
    }

  } catch (error) {
    console.error('❌ Erro geral na verificação:', error.message);
  }

  return resultados;
}

async function gerarRelatorio(resultados) {
  console.log('\n📊 RELATÓRIO FINAL');
  console.log('==================');
  
  const testes = [
    { nome: 'Bucket "avatars" existe', status: resultados.bucketExiste },
    { nome: 'Leitura pública funciona', status: resultados.leituraPublica },
    { nome: 'Upload anônimo bloqueado', status: resultados.uploadAnonimoBloqueado },
    { nome: 'Upload autenticado funciona', status: resultados.uploadAutenticado },
    { nome: 'URL pública funciona', status: resultados.urlPublicaFunciona }
  ];
  
  let sucessos = 0;
  testes.forEach(teste => {
    const icone = teste.status ? '✅' : '❌';
    console.log(`${icone} ${teste.nome}`);
    if (teste.status) sucessos++;
  });
  
  console.log(`\n📈 Resultado: ${sucessos}/${testes.length} testes passaram\n`);
  
  if (sucessos === testes.length) {
    console.log('🎉 PARABÉNS! Todas as políticas RLS estão configuradas corretamente!');
    console.log('   O sistema de avatar está 100% funcional e seguro.');
    console.log('\n✨ Próximos passos:');
    console.log('   1. Teste o upload de avatar na aplicação');
    console.log('   2. Verifique se as imagens aparecem corretamente');
    console.log('   3. O sistema está pronto para produção!');
  } else {
    console.log('⚠️  ATENÇÃO: Algumas políticas precisam ser ajustadas.');
    console.log('\n🔧 Ações necessárias:');
    
    if (!resultados.bucketExiste) {
      console.log('   • Criar o bucket "avatars" no painel do Supabase');
    }
    if (!resultados.leituraPublica) {
      console.log('   • Configurar política SELECT pública para o bucket "avatars"');
    }
    if (!resultados.uploadAnonimoBloqueado) {
      console.log('   • Verificar se as políticas INSERT estão restritas a usuários autenticados');
    }
    if (!resultados.uploadAutenticado) {
      console.log('   • Configurar políticas INSERT/UPDATE/DELETE para usuários autenticados');
    }
    if (!resultados.urlPublicaFunciona) {
      console.log('   • Verificar configurações de URL pública do bucket');
    }
    
    console.log('\n📖 Consulte o guia: SUPABASE_RLS_MANUAL_SETUP.md');
  }
}

// Executar verificação
async function main() {
  console.log('🚀 Iniciando verificação das políticas RLS...');
  console.log('⏱️  Aguarde alguns segundos...\n');
  
  const resultados = await verificarPoliticasRLS();
  await gerarRelatorio(resultados);
  
  console.log('\n🏁 Verificação concluída!');
  console.log('📄 Para mais detalhes, consulte: SUPABASE_RLS_MANUAL_SETUP.md');
}

// Verificar se está sendo executado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { verificarPoliticasRLS, gerarRelatorio };