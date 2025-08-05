const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Configurações do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createView() {
  console.log('🚀 Testando conexão e criando view...');
  
  try {
    // Primeiro, vamos verificar se a tabela financial_transactions existe
    const { data: tables, error: tablesError } = await supabase
      .from('financial_transactions')
      .select('*')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Erro ao acessar financial_transactions:', tablesError);
      return;
    }
    
    console.log('✅ Tabela financial_transactions acessível!');
    
    // Agora vamos tentar criar alguns dados de exemplo se não existirem
    const { data: existingData, error: countError } = await supabase
      .from('financial_transactions')
      .select('id')
      .limit(1);
    
    if (!countError && (!existingData || existingData.length === 0)) {
      console.log('📝 Inserindo dados de exemplo...');
      
      const { error: insertError } = await supabase
        .from('financial_transactions')
        .insert([
          {
            type: 'receita',
            description: 'Exemplo de Receita',
            amount: 1000.00,
            category: 'Vendas',
            transaction_date: new Date().toISOString().split('T')[0],
            notes: 'Transação de exemplo'
          },
          {
            type: 'despesa',
            description: 'Exemplo de Despesa',
            amount: -500.00,
            category: 'Operacional',
            transaction_date: new Date().toISOString().split('T')[0],
            notes: 'Transação de exemplo'
          }
        ]);
      
      if (insertError) {
        console.error('❌ Erro ao inserir dados de exemplo:', insertError);
      } else {
        console.log('✅ Dados de exemplo inseridos!');
      }
    }
    
    console.log('💡 Para criar a view financial_summary, execute o seguinte SQL no Supabase SQL Editor:');
    console.log(`
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT
    DATE_TRUNC('month', transaction_date) as month,
    SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'despesa' THEN ABS(amount) ELSE 0 END) as total_expenses,
    SUM(CASE WHEN type = 'receita' THEN amount ELSE amount END) as net_profit,
    COUNT(CASE WHEN type = 'receita' THEN 1 END) as income_count,
    COUNT(CASE WHEN type = 'despesa' THEN 1 END) as expense_count,
    COUNT(*) as total_transactions
FROM public.financial_transactions
GROUP BY month
ORDER BY month DESC;
`);
    
    console.log('🌐 Acesse: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql/new');
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

createView();