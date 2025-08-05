
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
    
    if (transaction.type === 'income') {
      monthlyData[month].total_income += amount;
      monthlyData[month].income_count++;
    } else if (transaction.type === 'expense') {
      monthlyData[month].total_expenses += Math.abs(amount);
      monthlyData[month].expense_count++;
    }
    
    monthlyData[month].net_profit += amount;
    monthlyData[month].total_transactions++;
  });
  
  return Object.values(monthlyData).sort((a, b) => new Date(b.month) - new Date(a.month));
}
      