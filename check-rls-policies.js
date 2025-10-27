const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkRLSPolicies() {
  console.log('🔍 Verificando políticas RLS do bucket avatars...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Verificar se conseguimos listar objetos do bucket
    console.log('\n📂 Testando acesso ao bucket avatars...');
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .getBucket('avatars');
    
    if (bucketError) {
      console.log('❌ Erro ao acessar bucket:', bucketError.message);
      return;
    }
    
    console.log('✅ Bucket encontrado:', bucketData.name);
    console.log('   - Público:', bucketData.public);
    
    // Testar upload com usuário anônimo (deve falhar)
    console.log('\n🧪 Testando upload anônimo (deve falhar)...');
    const anonSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const testFile = Buffer.from('test-image-data');
    const { data: uploadData, error: uploadError } = await anonSupabase
      .storage
      .from('avatars')
      .upload('test-anon.jpg', testFile, {
        contentType: 'image/jpeg'
      });
    
    if (uploadError) {
      if (uploadError.message.includes('policy')) {
        console.log('✅ Upload anônimo bloqueado corretamente (RLS funcionando)');
      } else {
        console.log('⚠️ Upload anônimo falhou por outro motivo:', uploadError.message);
      }
    } else {
      console.log('❌ Upload anônimo permitido (RLS não está funcionando!)');
    }
    
    // Listar arquivos existentes
    console.log('\n📋 Listando arquivos no bucket...');
    const { data: files, error: listError } = await supabase
      .storage
      .from('avatars')
      .list();
    
    if (listError) {
      console.log('❌ Erro ao listar arquivos:', listError.message);
    } else {
      console.log(`✅ ${files.length} arquivos encontrados no bucket`);
      files.forEach(file => {
        console.log(`   - ${file.name}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

checkRLSPolicies();