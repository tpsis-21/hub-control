const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Configurações do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createFinancialSummaryView() {
  console.log('🚀 Criando view financial_summary...');
  
  const sql = `
    -- Criar view financial_summary com a coluna correta
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
  `;
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Erro ao criar view:', error);
      // Tentar método alternativo
      const { data: altData, error: altError } = await supabase
        .from('financial_transactions')
        .select('*')
        .limit(1);
      
      if (altError) {
        console.error('❌ Erro de conexão:', altError);
        return;
      }
      
      console.log('✅ Conexão com Supabase OK, mas não foi possível criar a view via RPC');
      console.log('💡 Execute o SQL manualmente no Supabase SQL Editor:');
      console.log(sql);
    } else {
      console.log('✅ View financial_summary criada com sucesso!');
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.log('💡 Execute o SQL manualmente no Supabase SQL Editor:');
    console.log(sql);
  }
}

createFinancialSummaryView();