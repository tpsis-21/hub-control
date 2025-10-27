const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuração do Supabase com service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createStorageBuckets() {
  try {
    console.log('🚀 Iniciando criação dos buckets do Supabase Storage...');
    
    // Lista de buckets para criar
    const buckets = [
      {
        id: 'avatars',
        name: 'avatars',
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      },
      {
        id: 'user-uploads',
        name: 'user-uploads',
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
      },
      {
        id: 'documents',
        name: 'documents',
        public: false,
        fileSizeLimit: 20971520, // 20MB
        allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      },
      {
        id: 'profiles',
        name: 'profiles',
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      }
    ];
    
    // Criar cada bucket
    for (const bucketConfig of buckets) {
      console.log(`📦 Criando bucket '${bucketConfig.id}'...`);
      
      const { data, error } = await supabase.storage.createBucket(bucketConfig.id, {
        public: bucketConfig.public,
        fileSizeLimit: bucketConfig.fileSizeLimit,
        allowedMimeTypes: bucketConfig.allowedMimeTypes
      });
      
      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`✅ Bucket '${bucketConfig.id}' já existe`);
        } else {
          console.error(`❌ Erro ao criar bucket '${bucketConfig.id}':`, error.message);
        }
      } else {
        console.log(`✅ Bucket '${bucketConfig.id}' criado com sucesso`);
      }
    }
    
    console.log('\n🔍 Verificando buckets criados...');
    
    // Verificar buckets criados
    const { data: allBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError.message);
      return;
    }
    
    console.log(`📊 Total de buckets encontrados: ${allBuckets.length}`);
    
    buckets.forEach(expectedBucket => {
      const bucket = allBuckets.find(b => b.id === expectedBucket.id);
      if (bucket) {
        const publicStatus = bucket.public ? '🌐 Público' : '🔒 Privado';
        console.log(`✅ ${expectedBucket.id}: ${publicStatus}`);
      } else {
        console.log(`❌ ${expectedBucket.id}: Não encontrado`);
      }
    });
    
    console.log('\n🎉 Processo de criação de buckets concluído!');
    console.log('📝 Agora você pode testar o upload de imagens na aplicação.');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

// Executar criação dos buckets
createStorageBuckets();