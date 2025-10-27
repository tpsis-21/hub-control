const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 VERIFICAÇÃO DAS POLÍTICAS RLS DO BUCKET AVATARS');
console.log('==================================================');

async function checkStoragePolicies() {
  try {
    console.log('\n📋 Consultando políticas RLS do storage...');
    
    const { data, error } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects')
      .like('policyname', '%avatars%');
    
    if (error) {
      console.log('❌ Erro ao consultar políticas:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhuma política encontrada para o bucket avatars');
      console.log('\n🔧 Verificando políticas gerais do storage...');
      
      const { data: allPolicies, error: allError } = await supabaseAdmin
        .from('pg_policies')
        .select('*')
        .eq('schemaname', 'storage')
        .eq('tablename', 'objects');
      
      if (allError) {
        console.log('❌ Erro ao consultar todas as políticas:', allError.message);
        return;
      }
      
      console.log(`\n📊 Total de políticas encontradas: ${allPolicies.length}`);
      allPolicies.forEach((policy, index) => {
        console.log(`\n${index + 1}. ${policy.policyname}`);
        console.log(`   - Comando: ${policy.cmd}`);
        console.log(`   - Roles: ${policy.roles}`);
        console.log(`   - Qual: ${policy.qual}`);
      });
      
      return;
    }
    
    console.log(`\n✅ Encontradas ${data.length} políticas para o bucket avatars:`);
    
    data.forEach((policy, index) => {
      console.log(`\n${index + 1}. ${policy.policyname}`);
      console.log(`   - Comando: ${policy.cmd}`);
      console.log(`   - Permissivo: ${policy.permissive}`);
      console.log(`   - Roles: ${policy.roles}`);
      console.log(`   - Qual: ${policy.qual}`);
    });
    
  } catch (error) {
    console.log('❌ Erro na verificação:', error.message);
  }
}

async function testUploadWithAuth() {
  console.log('\n🧪 TESTE DE UPLOAD COM DIFERENTES CONFIGURAÇÕES');
  console.log('===============================================');
  
  // Criar uma imagem de teste simples
  const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==', 'base64');
  const fileName = `test-${Date.now()}.png`;
  
  console.log('\n1️⃣ Teste com Service Role Key (deve funcionar):');
  try {
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, testImageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.log('❌ Erro no upload com service role:', uploadError.message);
    } else {
      console.log('✅ Upload com service role funcionou!');
      console.log('   - Path:', uploadData.path);
      
      // Testar URL pública
      const { data: urlData } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log('   - URL pública:', urlData.publicUrl);
      
      // Limpar arquivo de teste
      await supabaseAdmin.storage.from('avatars').remove([fileName]);
      console.log('   - Arquivo de teste removido');
    }
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
  }
  
  console.log('\n2️⃣ Verificando configuração do bucket:');
  try {
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.getBucket('avatars');
    
    if (bucketError) {
      console.log('❌ Erro ao obter configuração do bucket:', bucketError.message);
    } else {
      console.log('✅ Configuração do bucket:');
      console.log('   - Nome:', bucketData.name);
      console.log('   - Público:', bucketData.public);
      console.log('   - Tamanho máximo:', bucketData.file_size_limit);
      console.log('   - Tipos permitidos:', bucketData.allowed_mime_types);
    }
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

async function main() {
  await checkStoragePolicies();
  await testUploadWithAuth();
  
  console.log('\n🎯 RESUMO:');
  console.log('- Se as políticas não aparecem, elas precisam ser criadas via painel web');
  console.log('- Se o upload com service role falha, há problema na configuração do bucket');
  console.log('- Se o upload funciona mas o anon falha, as políticas RLS estão muito restritivas');
}

main().catch(console.error);