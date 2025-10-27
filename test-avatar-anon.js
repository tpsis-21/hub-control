const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧪 TESTE ESPECÍFICO COM ANON KEY');
console.log('================================');

async function testAnonAccess() {
  // Criar uma imagem de teste simples
  const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==', 'base64');
  const fileName = `anon-test-${Date.now()}.png`;
  
  console.log('\n1️⃣ Teste de LEITURA com anon key:');
  try {
    const { data, error } = await supabaseAnon.storage
      .from('avatars')
      .list('', { limit: 1 });
    
    if (error) {
      console.log('❌ Erro na leitura:', error.message);
      console.log('   - Código:', error.statusCode);
    } else {
      console.log('✅ Leitura funcionou!');
      console.log(`   - Arquivos encontrados: ${data.length}`);
    }
  } catch (error) {
    console.log('❌ Erro na leitura:', error.message);
  }
  
  console.log('\n2️⃣ Teste de UPLOAD com anon key:');
  try {
    const { data: uploadData, error: uploadError } = await supabaseAnon.storage
      .from('avatars')
      .upload(fileName, testImageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.log('❌ Erro no upload:', uploadError.message);
      console.log('   - Código:', uploadError.statusCode);
      
      if (uploadError.message.includes('row-level security')) {
        console.log('\n🔧 DIAGNÓSTICO: Política RLS bloqueando upload');
        console.log('   - As políticas INSERT não estão configuradas corretamente');
        console.log('   - Verifique se a política permite role "anon"');
      }
    } else {
      console.log('✅ Upload funcionou!');
      console.log('   - Path:', uploadData.path);
      
      // Testar URL pública
      const { data: urlData } = supabaseAnon.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log('   - URL pública:', urlData.publicUrl);
      
      // Limpar arquivo de teste
      await supabaseAdmin.storage.from('avatars').remove([fileName]);
      console.log('   - Arquivo de teste removido');
    }
  } catch (error) {
    console.log('❌ Erro no upload:', error.message);
  }
  
  console.log('\n3️⃣ Teste de URL PÚBLICA:');
  try {
    // Primeiro criar um arquivo com service role
    const testFile = `public-test-${Date.now()}.png`;
    const { data: adminUpload, error: adminError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(testFile, testImageBuffer, {
        contentType: 'image/png'
      });
    
    if (adminError) {
      console.log('❌ Erro ao criar arquivo de teste:', adminError.message);
      return;
    }
    
    // Testar acesso público
    const { data: urlData } = supabaseAnon.storage
      .from('avatars')
      .getPublicUrl(testFile);
    
    console.log('✅ URL pública gerada:', urlData.publicUrl);
    
    // Testar se a URL é acessível
    const fetch = require('node-fetch');
    try {
      const response = await fetch(urlData.publicUrl);
      if (response.ok) {
        console.log('✅ URL pública acessível!');
        console.log('   - Status:', response.status);
        console.log('   - Content-Type:', response.headers.get('content-type'));
      } else {
        console.log('❌ URL pública não acessível');
        console.log('   - Status:', response.status);
      }
    } catch (fetchError) {
      console.log('❌ Erro ao acessar URL:', fetchError.message);
    }
    
    // Limpar arquivo de teste
    await supabaseAdmin.storage.from('avatars').remove([testFile]);
    console.log('   - Arquivo de teste removido');
    
  } catch (error) {
    console.log('❌ Erro no teste de URL pública:', error.message);
  }
}

async function showPolicyInstructions() {
  console.log('\n📋 INSTRUÇÕES PARA CORRIGIR AS POLÍTICAS RLS');
  console.log('============================================');
  
  console.log('\n🌐 Acesse o painel do Supabase:');
  console.log('   1. Vá para: https://supabase.com/dashboard');
  console.log('   2. Selecione seu projeto: htwiupmnqlmwvzqzroal');
  console.log('   3. Vá em Storage > Policies');
  
  console.log('\n🔧 Verifique se existem estas 4 políticas para o bucket "avatars":');
  console.log('\n   📖 POLÍTICA DE LEITURA PÚBLICA:');
  console.log('   - Nome: avatars_public_read');
  console.log('   - Operação: SELECT');
  console.log('   - Target roles: public');
  console.log('   - USING expression: bucket_id = \'avatars\'');
  
  console.log('\n   📤 POLÍTICA DE UPLOAD:');
  console.log('   - Nome: avatars_authenticated_insert');
  console.log('   - Operação: INSERT');
  console.log('   - Target roles: authenticated');
  console.log('   - USING expression: bucket_id = \'avatars\' AND auth.role() = \'authenticated\'');
  
  console.log('\n   ✏️ POLÍTICA DE ATUALIZAÇÃO:');
  console.log('   - Nome: avatars_authenticated_update');
  console.log('   - Operação: UPDATE');
  console.log('   - Target roles: authenticated');
  console.log('   - USING expression: bucket_id = \'avatars\' AND auth.role() = \'authenticated\'');
  
  console.log('\n   🗑️ POLÍTICA DE EXCLUSÃO:');
  console.log('   - Nome: avatars_authenticated_delete');
  console.log('   - Operação: DELETE');
  console.log('   - Target roles: authenticated');
  console.log('   - USING expression: bucket_id = \'avatars\' AND auth.role() = \'authenticated\'');
  
  console.log('\n⚠️ IMPORTANTE:');
  console.log('   - Se as políticas não existem, crie-as manualmente no painel');
  console.log('   - Se existem mas não funcionam, verifique as expressões USING');
  console.log('   - Para upload anônimo, mude a política INSERT para role "public"');
}

async function main() {
  await testAnonAccess();
  await showPolicyInstructions();
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Configure as políticas RLS no painel do Supabase');
  console.log('2. Execute este script novamente para verificar');
  console.log('3. Teste o upload na aplicação');
}

main().catch(console.error);