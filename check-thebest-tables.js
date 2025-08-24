// Script para verificar se as tabelas The Best existem
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Definida' : '❌ Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Verificando tabelas The Best...');
  
  const tables = [
    'thebest_configs',
    'thebest_packages', 
    'thebest_renewals',
    'thebest_api_logs'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
        
      if (error) {
        console.log(`❌ Tabela ${table}: ${error.message}`);
      } else {
        console.log(`✅ Tabela ${table}: OK`);
      }
    } catch (err) {
      console.log(`❌ Tabela ${table}: ${err.message}`);
    }
  }
  
  console.log('\n🔍 Verificação concluída!');
}

checkTables().catch(console.error);