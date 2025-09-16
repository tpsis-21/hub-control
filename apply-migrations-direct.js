require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

console.log('🚀 Verificando migrações TheBest...');
console.log('\n📋 INSTRUÇÕES PARA APLICAR AS MIGRAÇÕES:');
console.log('\n1. Acesse o Dashboard do Supabase:');
console.log('   https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql');
console.log('\n2. Execute as seguintes migrações na ordem:');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

// Lista das migrações na ordem correta
const migrations = [
  '20250114000001_create_thebest_plan_mappings.sql',
  '20250114000002_create_mapping_functions.sql', 
  '20250114000003_update_thebest_dashboard_view.sql',
  '20250114000004_create_sync_functions.sql',
  '20250114000005_create_automation_triggers.sql',
  '20250114000006_create_business_validations.sql'
];

let allMigrationsExist = true;

for (let i = 0; i < migrations.length; i++) {
  const migration = migrations[i];
  const migrationPath = path.join(migrationsDir, migration);
  
  if (!fs.existsSync(migrationPath)) {
    console.log(`   ❌ ${i + 1}. ${migration} - ARQUIVO NÃO ENCONTRADO`);
    allMigrationsExist = false;
  } else {
    console.log(`   ✅ ${i + 1}. ${migration}`);
  }
}

if (allMigrationsExist) {
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('\n1. Copie e cole cada arquivo SQL no editor do Supabase');
  console.log('2. Execute um por vez na ordem listada acima');
  console.log('3. Verifique se não há erros antes de prosseguir para o próximo');
  console.log('\n⚠️  IMPORTANTE:');
  console.log('- Execute as migrações na ordem exata listada');
  console.log('- Aguarde cada migração terminar antes da próxima');
  console.log('- Se houver erro, corrija antes de continuar');
  
  console.log('\n📁 Localização dos arquivos:');
  console.log(`   ${migrationsDir}`);
  
  console.log('\n🔗 Links úteis:');
  console.log('   Dashboard: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal');
  console.log('   SQL Editor: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql');
  console.log('   Tabelas: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/editor');
} else {
  console.log('\n❌ Algumas migrações não foram encontradas!');
  console.log('   Verifique se todos os arquivos estão no diretório correto.');
}

console.log('\n✨ Após executar as migrações, a integração TheBest estará pronta!');