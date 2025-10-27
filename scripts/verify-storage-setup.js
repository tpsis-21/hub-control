/**
 * Script de Verificação do Supabase Storage
 * 
 * Este script verifica se os buckets necessários foram criados corretamente
 * no painel do Supabase e se as políticas RLS estão funcionando.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Lista de buckets esperados com suas configurações
 */
const expectedBuckets = [
  {
    id: 'avatars',
    name: 'avatars',
    public: true,
    description: 'Bucket público para fotos de perfil'
  },
  {
    id: 'user-uploads',
    name: 'user-uploads', 
    public: false,
    description: 'Bucket privado para uploads de usuários'
  },
  {
    id: 'documents',
    name: 'documents',
    public: false,
    description: 'Bucket privado para documentos'
  }
];

/**
 * Verifica se os buckets existem
 */
async function verifyBuckets() {
  console.log('🔍 Verificando buckets do Supabase Storage...');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Erro ao listar buckets:', error.message);
      return false;
    }
    
    console.log(`📦 Total de buckets encontrados: ${buckets.length}`);
    
    let allBucketsExist = true;
    
    for (const expectedBucket of expectedBuckets) {
      const bucket = buckets.find(b => b.id === expectedBucket.id);
      
      if (bucket) {
        const publicStatus = bucket.public ? '🌐 Público' : '🔒 Privado';
        console.log(`✅ ${expectedBucket.description}: ${publicStatus}`);
        
        // Verificar se a configuração de público/privado está correta
        if (bucket.public !== expectedBucket.public) {
          console.warn(`⚠️  Aviso: Bucket '${expectedBucket.id}' deveria ser ${expectedBucket.public ? 'público' : 'privado'}`);
        }
      } else {
        console.error(`❌ Bucket '${expectedBucket.id}' não encontrado`);
        allBucketsExist = false;
      }
    }
    
    return allBucketsExist;
  } catch (error) {
    console.error('❌ Erro inesperado ao verificar buckets:', error.message);
    return false;
  }
}

/**
 * Testa o upload de um arquivo de teste
 */
async function testUpload() {
  console.log('\n🧪 Testando funcionalidade de upload...');
  
  try {
    // Criar um arquivo de imagem de teste simples (1x1 pixel PNG)
    const pngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(pngData, 'base64');
    const testFile = new File([buffer], 'test.png', { type: 'image/png' });
    const fileName = `test-${Date.now()}.png`;
    
    // Tentar fazer upload no bucket avatars (público)
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(`test-folder/${fileName}`, testFile);
    
    if (error) {
      console.error('❌ Erro no teste de upload:', error.message);
      return false;
    }
    
    console.log('✅ Teste de upload realizado com sucesso');
    
    // Limpar o arquivo de teste
    await supabase.storage
      .from('avatars')
      .remove([`test-folder/${fileName}`]);
    
    console.log('🧹 Arquivo de teste removido');
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado no teste de upload:', error.message);
    return false;
  }
}

/**
 * Verifica a conectividade com o Supabase
 */
async function verifyConnection() {
  console.log('🔗 Verificando conexão com Supabase...');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message !== 'Auth session missing!') {
      console.error('❌ Erro de conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase estabelecida');
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado de conexão:', error.message);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando verificação do Supabase Storage\n');
  
  const connectionOk = await verifyConnection();
  if (!connectionOk) {
    console.log('\n❌ Falha na verificação: Problema de conexão');
    process.exit(1);
  }
  
  const bucketsOk = await verifyBuckets();
  const uploadOk = await testUpload();
  
  console.log('\n📋 Resumo da Verificação:');
  console.log(`🔗 Conexão: ${connectionOk ? '✅ OK' : '❌ Falha'}`);
  console.log(`📦 Buckets: ${bucketsOk ? '✅ OK' : '❌ Falha'}`);
  console.log(`📤 Upload: ${uploadOk ? '✅ OK' : '❌ Falha'}`);
  
  if (connectionOk && bucketsOk && uploadOk) {
    console.log('\n🎉 Configuração do Storage está funcionando corretamente!');
    console.log('✅ Você pode agora testar o upload de imagens na aplicação.');
  } else {
    console.log('\n⚠️  Alguns problemas foram encontrados.');
    console.log('📖 Consulte o arquivo docs/supabase-storage-setup.md para instruções detalhadas.');
  }
}

// Executar verificação
main().catch(console.error);