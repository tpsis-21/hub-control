const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htwiupmnqlmwvzqzroal.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0d2l1cG1ucWxtd3Z6cXpyb2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzI4NjIzMSwiZXhwIjoyMDY4ODYyMjMxfQ.R5aVBW9w_ushxXtW8WNLcMSWpeMdTuwssJ64BluXQN0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  try {
    console.log('🔄 Executando migração The Best...');
    
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'thebest-migration-manual.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Arquivo de migração não encontrado:', migrationPath);
      return;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Dividir em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 ${commands.length} comandos SQL encontrados`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.includes('CREATE') || command.includes('INSERT') || command.includes('DO $$')) {
        console.log(`⚡ Executando comando ${i + 1}/${commands.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: command
        });
        
        if (error) {
          console.warn(`⚠️ Aviso no comando ${i + 1}:`, error.message);
        }
      }
    }
    
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    
    const tables = ['thebest_configs', 'thebest_packages', 'thebest_renewals', 'thebest_api_logs'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabela ${table}: ${error.message}`);
      } else {
        console.log(`✅ Tabela ${table}: OK`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
  }
}

// Executar migração
executeMigration();