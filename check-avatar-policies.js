/**
 * Script para verificar se as políticas RLS do bucket 'avatars' estão configuradas corretamente
 * Este script testa especificamente as políticas de acesso ao Storage do Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

// Clientes Supabase
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Criar um arquivo de imagem simulado (1x1 pixel PNG)
function createTestImage() {
  // PNG de 1x1 pixel transparente em base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return Buffer.from(pngBase64, 'base64');
}

async function checkAvatarPolicies() {
  console.log('🔍 Verificando políticas RLS do bucket avatars...\n');

  // 1. Verificar se o bucket existe usando service role
  console.log('1️⃣ Verificando existência do bucket avatars...');
  try {
    const { data: buckets, error } = await supabaseService.storage.listBuckets();
    
    if (error) {
      console.log('❌ Erro ao listar buckets:', error.message);
      return;
    }
    
    const avatarBucket = buckets.find(bucket => bucket.name === 'avatars');
    if (!avatarBucket) {
      console.log('❌ Bucket avatars NÃO EXISTE!');
      console.log('📋 Buckets disponíveis:', buckets.map(b => b.name).join(', ') || 'Nenhum');
      console.log('\n🔧 AÇÃO NECESSÁRIA: Criar o bucket "avatars" no painel do Supabase');
      return;
    }
    
    console.log('✅ Bucket avatars existe');
    console.log(`📋 Configuração: público=${avatarBucket.public}, tamanho_limite=${avatarBucket.file_size_limit || 'sem limite'}`);
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message);
    return;
  }

  // 2. Verificar visibilidade com anon key
  console.log('\n2️⃣ Testando visibilidade do bucket com anon key...');
  try {
    const { data: buckets, error } = await supabaseAnon.storage.listBuckets();
    
    if (error) {
      console.log('❌ Erro ao listar buckets com anon key:', error.message);
    } else {
      const avatarBucket = buckets.find(bucket => bucket.name === 'avatars');
      if (avatarBucket) {
        console.log('✅ Bucket avatars é visível com anon key');
      } else {
        console.log('⚠️  Bucket avatars NÃO é visível com anon key');
        console.log('📋 Buckets visíveis:', buckets.map(b => b.name).join(', ') || 'Nenhum');
      }
    }
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message);
  }

  // 3. Verificar se consegue listar arquivos no bucket
  console.log('\n3️⃣ Testando listagem de arquivos no bucket...');
  try {
    const { data: files, error } = await supabaseAnon.storage
      .from('avatars')
      .list('', { limit: 5 });
    
    if (error) {
      console.log('❌ Erro ao listar arquivos com anon key:', error.message);
    } else {
      console.log('✅ Consegue listar arquivos no bucket com anon key');
      console.log(`📁 Arquivos encontrados: ${files.length}`);
    }
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message);
  }

  // 4. Testar upload com anon key (deve falhar se as políticas estão corretas)
  console.log('\n4️⃣ Testando upload com anon key (deve falhar)...');
  const testFileName = `test-anon-${Date.now()}.png`;
  const testImage = createTestImage();
  
  try {
    const { data: uploadData, error: uploadError } = await supabaseAnon.storage
      .from('avatars')
      .upload(testFileName, testImage, {
        contentType: 'image/png'
      });
    
    if (uploadError) {
      console.log('✅ Upload com anon key falhou (correto):', uploadError.message);
    } else {
      console.log('⚠️  Upload com anon key FUNCIONOU (política muito permissiva!)');
      // Limpar arquivo se foi criado
      await supabaseAnon.storage.from('avatars').remove([testFileName]);
    }
  } catch (err) {
    console.log('❌ Erro inesperado no upload:', err.message);
  }

  // 5. Testar upload com service role (deve funcionar)
  console.log('\n5️⃣ Testando upload com service role...');
  const serviceFileName = `test-service-${Date.now()}.png`;
  
  try {
    const { data: serviceUpload, error: serviceError } = await supabaseService.storage
      .from('avatars')
      .upload(serviceFileName, testImage, {
        contentType: 'image/png'
      });
    
    if (serviceError) {
      console.log('❌ Upload com service role falhou:', serviceError.message);
    } else {
      console.log('✅ Upload com service role funcionou');
      
      // 6. Testar URL pública
      console.log('\n6️⃣ Testando URL pública...');
      const { data: publicUrl } = supabaseService.storage
        .from('avatars')
        .getPublicUrl(serviceFileName);
      
      console.log('🔗 URL pública gerada:', publicUrl.publicUrl);
      
      // 7. Testar acesso à URL pública com anon key
      console.log('\n7️⃣ Testando acesso à URL pública...');
      try {
        const { data: downloadData, error: downloadError } = await supabaseAnon.storage
          .from('avatars')
          .download(serviceFileName);
        
        if (downloadError) {
          console.log('❌ Download com anon key falhou:', downloadError.message);
        } else {
          console.log('✅ Download com anon key funcionou (política de leitura OK)');
        }
      } catch (err) {
        console.log('❌ Erro no download:', err.message);
      }
      
      // Limpar arquivo de teste
      console.log('\n🧹 Limpando arquivo de teste...');
      const { error: deleteError } = await supabaseService.storage
        .from('avatars')
        .remove([serviceFileName]);
      
      if (deleteError) {
        console.log('⚠️  Erro ao deletar arquivo de teste:', deleteError.message);
      } else {
        console.log('✅ Arquivo de teste removido');
      }
    }
  } catch (err) {
    console.log('❌ Erro inesperado com service role:', err.message);
  }

  // 8. Verificar arquivos existentes
  console.log('\n8️⃣ Verificando arquivos existentes...');
  try {
    const { data: existingFiles, error: listError } = await supabaseService.storage
      .from('avatars')
      .list('', { limit: 10 });
    
    if (listError) {
      console.log('❌ Erro ao listar arquivos existentes:', listError.message);
    } else {
      console.log(`📁 Total de arquivos no bucket: ${existingFiles.length}`);
      if (existingFiles.length > 0) {
        console.log('📋 Primeiros arquivos:');
        existingFiles.slice(0, 3).forEach(file => {
          console.log(`   - ${file.name} (${file.metadata?.size || 'tamanho desconhecido'} bytes)`);
        });
      }
    }
  } catch (err) {
    console.log('❌ Erro inesperado ao listar:', err.message);
  }

  console.log('\n📋 RESUMO DA VERIFICAÇÃO:');
  console.log('Para o sistema de avatar funcionar corretamente, você precisa:');
  console.log('1. ✅ Bucket "avatars" deve existir');
  console.log('2. ✅ Bucket visível com anon key (para listagem)');
  console.log('3. ✅ Política de leitura pública (para visualizar avatares)');
  console.log('4. ❌ Upload restrito apenas para usuários autenticados');
  console.log('5. ✅ URLs públicas funcionando');
  console.log('\n💡 Se algum teste falhou, configure as políticas RLS no painel do Supabase:');
  console.log('   - Política SELECT: permitir leitura pública');
  console.log('   - Política INSERT: permitir apenas usuários autenticados');
  console.log('   - Política UPDATE: permitir apenas usuários autenticados');
  console.log('   - Política DELETE: permitir apenas usuários autenticados');
}

// Executar verificação
checkAvatarPolicies().catch(console.error);