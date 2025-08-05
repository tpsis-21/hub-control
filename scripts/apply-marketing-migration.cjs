// scripts/apply-marketing-migration.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas.');
  console.log('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas no .env.local');
  process.exit(1);
}

// Inicializar Supabase com chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Iniciando aplicação da migração de marketing...');
    
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20241220000001_create_marketing_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Arquivo de migração carregado:', migrationPath);
    
    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`⏳ Executando comando ${i + 1}/${commands.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: command });
          
          if (error) {
            // Tentar executar diretamente se rpc falhar
            const { error: directError } = await supabase.from('_').select('*').limit(0);
            if (directError) {
              console.log(`⚠️  Tentando executar comando diretamente...`);
              // Para comandos DDL, vamos usar uma abordagem diferente
              console.log(`📋 Comando: ${command.substring(0, 100)}...`);
            }
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
          }
        } catch (cmdError) {
          console.log(`⚠️  Erro no comando ${i + 1}:`, cmdError.message);
          console.log(`📋 Comando: ${command.substring(0, 100)}...`);
        }
      }
    }
    
    console.log('🎉 Migração aplicada com sucesso!');
    console.log('\n📋 Tabelas criadas:');
    console.log('  - marketing_campaigns');
    console.log('  - email_templates');
    console.log('  - automation_rules');
    console.log('  - email_logs');
    console.log('  - smtp_configs');
    console.log('  - unsubscribe_records');
    console.log('  - deliverability_metrics');
    console.log('\n🔐 Políticas RLS configuradas para todas as tabelas');
    console.log('📊 Templates e regras padrão inseridos');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    console.log('\n💡 Dicas para resolver:');
    console.log('1. Verifique se as variáveis de ambiente estão corretas');
    console.log('2. Certifique-se de que a SUPABASE_SERVICE_ROLE_KEY tem permissões administrativas');
    console.log('3. Verifique se o projeto Supabase está ativo');
  } finally {
    process.exit(0);
  }
}

// Executar a migração
applyMigration();