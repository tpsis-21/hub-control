/**
 * Script para verificar se o bucket 'avatars' existe no Supabase
 * e orientar sobre os próximos passos
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.log('Verifique se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarBucketAvatars() {
  console.log('🔍 VERIFICAÇÃO DO BUCKET AVATARS');
  console.log('=================================\n');

  try {
    // Verificar se o bucket 'avatars' existe
    console.log('📦 Verificando existência do bucket "avatars"...');
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('❌ Erro ao listar buckets:', error.message);
      return false;
    }

    const avatarBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (avatarBucket) {
      console.log('✅ Bucket "avatars" encontrado!');
      console.log(`📋 Configurações:`);
      console.log(`   - Público: ${avatarBucket.public ? '✅ Sim' : '❌ Não'}`);
      console.log(`   - Limite de tamanho: ${avatarBucket.file_size_limit ? (avatarBucket.file_size_limit / 1024 / 1024).toFixed(1) + 'MB' : 'Sem limite'}`);
      
      if (!avatarBucket.public) {
        console.log('\n⚠️  ATENÇÃO: O bucket não está configurado como público!');
        console.log('   Isso pode causar problemas na visualização dos avatares.');
      }
      
      return true;
    } else {
      console.log('❌ Bucket "avatars" NÃO ENCONTRADO!');
      console.log('\n🔧 AÇÃO NECESSÁRIA:');
      console.log('   O bucket "avatars" precisa ser criado no painel do Supabase.');
      console.log('\n📖 GUIA COMPLETO:');
      console.log('   Consulte o arquivo: CRIAR_BUCKET_AVATARS_MANUAL.md');
      console.log('\n🎯 PRÓXIMOS PASSOS:');
      console.log('   1. Abra o painel do Supabase: https://supabase.com/dashboard');
      console.log('   2. Vá para Storage > Buckets');
      console.log('   3. Clique em "New bucket"');
      console.log('   4. Nome: "avatars"');
      console.log('   5. Marque como "Public bucket"');
      console.log('   6. Configure as políticas RLS conforme o guia');
      
      return false;
    }
  } catch (error) {
    console.log('❌ Erro durante a verificação:', error.message);
    return false;
  }
}

async function main() {
  const bucketExiste = await verificarBucketAvatars();
  
  console.log('\n📊 RESULTADO FINAL');
  console.log('==================');
  
  if (bucketExiste) {
    console.log('✅ Bucket "avatars" configurado!');
    console.log('\n🎯 PRÓXIMO PASSO:');
    console.log('   Execute: node verify-avatar-policies-manual.js');
    console.log('   Para verificar as políticas RLS completas.');
  } else {
    console.log('❌ Bucket "avatars" precisa ser criado!');
    console.log('\n📖 CONSULTE O GUIA:');
    console.log('   Arquivo: CRIAR_BUCKET_AVATARS_MANUAL.md');
  }
  
  console.log('\n🏁 Verificação concluída!');
}

main().catch(console.error);