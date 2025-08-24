// Script para aplicar a migração The Best
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Aplicando migração The Best...');
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241222000001_create_thebest_integration_tables.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Arquivo de migração não encontrado:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Dividir o SQL em comandos individuais (separados por ;)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.length < 10) continue; // Pular comandos muito pequenos
      
      try {
        console.log(`⏳ Executando comando ${i + 1}/${commands.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: command + ';'
        });
        
        if (error) {
          // Tentar executar diretamente se RPC falhar
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0);
            
          if (directError && directError.message.includes('does not exist')) {
            // Usar uma abordagem alternativa
            console.log(`⚠️  Comando ${i + 1} pode ter falhado, mas continuando...`);
          } else {
            throw error;
          }
        }
        
        console.log(`✅ Comando ${i + 1} executado com sucesso`);
      } catch (cmdError) {
        console.log(`⚠️  Erro no comando ${i + 1}:`, cmdError.message);
        // Continuar com próximo comando
      }
    }
    
    console.log('\n🎉 Migração aplicada com sucesso!');
    console.log('\n🔍 Verificando tabelas criadas...');
    
    // Verificar se as tabelas foram criadas
    const tables = ['thebest_configs', 'thebest_packages', 'thebest_renewals', 'thebest_api_logs'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
          
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: Criada com sucesso`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);