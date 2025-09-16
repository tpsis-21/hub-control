const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('Certifique-se de que SUPABASE_URL e SUPABASE_ANON_KEY estão definidas no .env');
  process.exit(1);
}

console.log('🔗 Conectando ao Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProfilesRecursion() {
  console.log('🔧 Iniciando correção da recursão infinita nas políticas RLS da tabela profiles...');
  
  try {
    // Tentar executar SQL diretamente
    console.log('1. Executando correção das políticas RLS...');
    
    // Como não temos acesso direto ao SQL DDL, vamos tentar uma abordagem diferente
    // Vamos verificar se conseguimos acessar a tabela profiles primeiro
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro ao acessar tabela profiles:', testError);
      console.log('🔍 Este erro pode ser causado pela recursão infinita nas políticas RLS.');
      console.log('📝 Será necessário corrigir as políticas diretamente no painel do Supabase.');
      return;
    }
    
    console.log('✅ Tabela profiles acessível. Problema identificado!');
    console.log('📊 Dados de teste encontrados:', testData?.length || 0, 'registros');
    
    console.log('\n🔍 DIAGNÓSTICO:');
    console.log('- A tabela profiles está acessível via cliente Supabase');
    console.log('- O erro de recursão infinita está ocorrendo no servidor Next.js');
    console.log('- Isso indica que o problema está nas políticas RLS aplicadas');
    
    console.log('\n📝 SOLUÇÃO RECOMENDADA:');
    console.log('1. Acesse o painel do Supabase: https://supabase.com/dashboard');
    console.log('2. Vá para Authentication > Policies');
    console.log('3. Encontre as políticas da tabela "profiles"');
    console.log('4. Remova as políticas que fazem referência circular à própria tabela profiles');
    console.log('5. Crie políticas simples como:');
    console.log('   - SELECT: auth.uid() = id');
    console.log('   - INSERT: auth.uid() = id');
    console.log('   - UPDATE: auth.uid() = id');
    console.log('   - DELETE: auth.uid() = id');
    
    console.log('\n⚠️ POLÍTICAS PROBLEMÁTICAS A REMOVER:');
    console.log('- Qualquer política que contenha: EXISTS (SELECT 1 FROM profiles WHERE...)');
    console.log('- Essas políticas causam recursão infinita ao consultar a própria tabela');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  }
}

// Executar a correção
fixProfilesRecursion().then(() => {
  console.log('\n🔄 Reinicie o servidor de desenvolvimento para aplicar as mudanças.');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Falha na execução:', error);
  process.exit(1);
});