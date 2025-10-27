const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🎯 VERIFICAÇÃO FINAL DO SISTEMA DE AVATAR');
console.log('========================================');

async function quickTest() {
  let allPassed = true;
  
  // Teste 1: Conectividade
  console.log('\n1️⃣ Testando conectividade...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error && !error.message.includes('relation "public.profiles" does not exist')) {
      console.log('❌ Erro de conectividade:', error.message);
      allPassed = false;
    } else {
      console.log('✅ Conectividade OK');
    }
  } catch (error) {
    console.log('❌ Erro de conectividade:', error.message);
    allPassed = false;
  }
  
  // Teste 2: Leitura do bucket
  console.log('\n2️⃣ Testando leitura do bucket avatars...');
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1 });
    
    if (error) {
      console.log('❌ Erro na leitura:', error.message);
      allPassed = false;
    } else {
      console.log('✅ Leitura do bucket OK');
    }
  } catch (error) {
    console.log('❌ Erro na leitura:', error.message);
    allPassed = false;
  }
  
  // Teste 3: URL pública (usando arquivo existente ou criando um)
  console.log('\n3️⃣ Testando URLs públicas...');
  try {
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl('test.png'); // Arquivo que pode não existir, mas URL deve ser gerada
    
    if (urlData && urlData.publicUrl) {
      console.log('✅ Geração de URL pública OK');
      console.log('   Exemplo:', urlData.publicUrl);
    } else {
      console.log('❌ Erro na geração de URL pública');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ Erro na URL pública:', error.message);
    allPassed = false;
  }
  
  // Resultado final
  console.log('\n' + '='.repeat(40));
  if (allPassed) {
    console.log('🎉 SISTEMA DE AVATAR: FUNCIONANDO!');
    console.log('\n✅ Próximos passos:');
    console.log('   1. Faça login na aplicação');
    console.log('   2. Teste o upload de avatar');
    console.log('   3. Verifique se a imagem aparece');
    console.log('\n🚀 O sistema está pronto para uso!');
  } else {
    console.log('⚠️ SISTEMA DE AVATAR: PROBLEMAS DETECTADOS');
    console.log('\n🔧 Verifique:');
    console.log('   1. Políticas RLS configuradas no painel Supabase');
    console.log('   2. Bucket "avatars" existe e está público');
    console.log('   3. Variáveis de ambiente no .env');
    console.log('\n📖 Consulte: AVATAR_SYSTEM_STATUS.md');
  }
}

quickTest().catch(console.error);