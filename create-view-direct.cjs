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

async function createViewDirect() {
  console.log('🚀 Tentando criar view financial_summary...');
  
  try {
    // Tentar executar o SQL diretamente usando rpc
    const createViewSQL = `
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
    
    // Tentar usando uma função SQL personalizada
    const { data, error } = await supabase.rpc('exec', { sql: createViewSQL });
    
    if (error) {
      console.log('❌ Método RPC não funcionou:', error.message);
      
      // Vamos tentar uma abordagem alternativa - criar uma função que retorna os dados
      console.log('🔄 Tentando abordagem alternativa...');
      
      // Vamos testar se conseguimos acessar os dados diretamente
      const { data: testData, error: testError } = await supabase
        .from('financial_transactions')
        .select(`
          transaction_date,
          type,
          amount
        `)
        .limit(5);
      
      if (testError) {
        console.error('❌ Erro ao acessar dados:', testError);
        return;
      }
      
      console.log('✅ Dados acessíveis:', testData);
      
      // Criar uma função que simula a view
      console.log('💡 Como a view não pode ser criada automaticamente, vou criar uma função helper...');
      
      // Criar um arquivo com função helper
      const helperContent = `
// Helper function para simular financial_summary view
export async function getFinancialSummary(supabase) {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('transaction_date, type, amount');
  
  if (error) throw error;
  
  // Agrupar por mês
  const monthlyData = {};
  
  data.forEach(transaction => {
    const month = new Date(transaction.transaction_date).toISOString().slice(0, 7) + '-01';
    
    if (!monthlyData[month]) {
      monthlyData[month] = {
        month: month,
        total_income: 0,
        total_expenses: 0,
        net_profit: 0,
        income_count: 0,
        expense_count: 0,
        total_transactions: 0
      };
    }
    
    const amount = parseFloat(transaction.amount);
    
    if (transaction.type === 'receita') {
      monthlyData[month].total_income += amount;
      monthlyData[month].income_count++;
    } else {
      monthlyData[month].total_expenses += Math.abs(amount);
      monthlyData[month].expense_count++;
    }
    
    monthlyData[month].net_profit += amount;
    monthlyData[month].total_transactions++;
  });
  
  return Object.values(monthlyData).sort((a, b) => new Date(b.month) - new Date(a.month));
}
      `;
      
      require('fs').writeFileSync('src/lib/financial-summary-helper.js', helperContent);
      console.log('✅ Arquivo helper criado: src/lib/financial-summary-helper.js');
      
    } else {
      console.log('✅ View criada com sucesso!');
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

createViewDirect();