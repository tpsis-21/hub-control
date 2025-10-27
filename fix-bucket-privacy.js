const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase com service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixBucketPrivacy() {
  try {
    console.log('🔧 Corrigindo configuração de privacidade dos buckets...');
    
    // Atualizar bucket user-uploads para ser privado
    const { data, error } = await supabase.storage.updateBucket('user-uploads', {
      public: false
    });
    
    if (error) {
      console.error('❌ Erro ao atualizar bucket user-uploads:', error.message);
    } else {
      console.log('✅ Bucket user-uploads configurado como privado');
    }
    
    // Verificar configuração atual
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError.message);
      return;
    }
    
    console.log('\n📊 Configuração atual dos buckets:');
    buckets.forEach(bucket => {
      const privacy = bucket.public ? '🌐 Público' : '🔒 Privado';
      console.log(`  ${bucket.id}: ${privacy}`);
    });
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

// Executar correção
fixBucketPrivacy();