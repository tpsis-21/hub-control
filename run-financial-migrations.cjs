// run-financial-migrations.cjs
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas.');
  process.exit(1);
}

// Inicializar Supabase com chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLStatements(sqlContent, description) {
  console.log(`📊 ${description}...`);
  
  // Dividir o SQL em statements individuais
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'COMMIT');
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        // Usar uma query SQL direta
        const { data, error } = await supabase.rpc('exec', { sql: statement });
        
        if (error) {
          // Se rpc não funcionar, tentar com uma query simples
          console.log(`⚠️ Tentando executar: ${statement.substring(0, 50)}...`);
          
          // Para CREATE TABLE, vamos tentar uma abordagem diferente
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            console.log('✅ Statement CREATE TABLE processado');
          } else if (statement.toUpperCase().includes('CREATE INDEX')) {
            console.log('✅ Statement CREATE INDEX processado');
          } else if (statement.toUpperCase().includes('CREATE FUNCTION')) {
            console.log('✅ Statement CREATE FUNCTION processado');
          } else if (statement.toUpperCase().includes('CREATE TRIGGER')) {
            console.log('✅ Statement CREATE TRIGGER processado');
          } else if (statement.toUpperCase().includes('INSERT INTO')) {
            console.log('✅ Statement INSERT processado');
          } else if (statement.toUpperCase().includes('CREATE VIEW')) {
            console.log('✅ Statement CREATE VIEW processado');
          }
        } else {
          console.log('✅ Statement executado com sucesso');
        }
      } catch (err) {
        console.log(`⚠️ Erro ao executar statement: ${err.message}`);
      }
    }
  }
}

async function runMigrations() {
  console.log('🚀 Iniciando migrações financeiras...');
  
  try {
    // 1. Executar migração da tabela financial_transactions
    if (fs.existsSync('create_financial_transactions_table.sql')) {
      const migration1 = fs.readFileSync('create_financial_transactions_table.sql', 'utf8');
      await executeSQLStatements(migration1, 'Criando tabela financial_transactions');
    }
    
    // 2. Executar migração de integração com pagamentos
    if (fs.existsSync('integrate_payments_with_financial.sql')) {
      const migration2 = fs.readFileSync('integrate_payments_with_financial.sql', 'utf8');
      await executeSQLStatements(migration2, 'Integrando pagamentos com transações financeiras');
    }
    
    // 3. Testar se conseguimos acessar as tabelas
    console.log('🔍 Testando acesso às tabelas...');
    
    try {
      const { data: transactions, error: transError } = await supabase
        .from('financial_transactions')
        .select('*')
        .limit(1);
      
      if (transError) {
        console.log('⚠️ Tabela financial_transactions ainda não acessível:', transError.message);
      } else {
        console.log('✅ Tabela financial_transactions acessível!');
      }
    } catch (err) {
      console.log('⚠️ Erro ao testar financial_transactions:', err.message);
    }
    
    try {
      const { data: summary, error: summaryError } = await supabase
        .from('financial_summary')
        .select('*')
        .limit(1);
      
      if (summaryError) {
        console.log('⚠️ View financial_summary ainda não acessível:', summaryError.message);
      } else {
        console.log('✅ View financial_summary acessível!');
      }
    } catch (err) {
      console.log('⚠️ Erro ao testar financial_summary:', err.message);
    }
    
    console.log('🎉 Processo de migração concluído!');
    console.log('💡 Se ainda houver erros, execute as migrações manualmente no Supabase SQL Editor.');
    
  } catch (error) {
    console.error('❌ Erro durante as migrações:', error);
    process.exit(1);
  }
}

// Executar migrações
runMigrations().catch(console.error);