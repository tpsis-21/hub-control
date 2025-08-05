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

async function checkTransactionTypes() {
  console.log('🔍 Verificando tipos de transação...');
  
  try {
    // Buscar todos os dados com tipos
    const { data: allData, error: fetchError } = await supabase
      .from('financial_transactions')
      .select('id, type, description, amount, transaction_date')
      .order('transaction_date', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Erro ao buscar dados:', fetchError);
      return;
    }
    
    console.log(`📊 Total de transações: ${allData.length}`);
    
    // Agrupar por tipo
    const typeGroups = {};
    allData.forEach(transaction => {
      const type = transaction.type;
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(transaction);
    });
    
    console.log('\n📋 Tipos encontrados:');
    Object.keys(typeGroups).forEach(type => {
      console.log(`  - ${type}: ${typeGroups[type].length} transações`);
    });
    
    // Verificar se precisamos padronizar os tipos
    const hasIncomeExpense = Object.keys(typeGroups).some(type => 
      type === 'income' || type === 'expense'
    );
    
    const hasReceitaDespesa = Object.keys(typeGroups).some(type => 
      type === 'receita' || type === 'despesa'
    );
    
    if (hasIncomeExpense && !hasReceitaDespesa) {
      console.log('\n🔄 Detectado uso de income/expense. Convertendo para receita/despesa...');
      
      // Converter income para receita
      if (typeGroups['income']) {
        const { error: updateIncomeError } = await supabase
          .from('financial_transactions')
          .update({ type: 'receita' })
          .eq('type', 'income');
        
        if (updateIncomeError) {
          console.error('❌ Erro ao converter income:', updateIncomeError);
        } else {
          console.log(`✅ ${typeGroups['income'].length} transações convertidas de 'income' para 'receita'`);
        }
      }
      
      // Converter expense para despesa
      if (typeGroups['expense']) {
        const { error: updateExpenseError } = await supabase
          .from('financial_transactions')
          .update({ type: 'despesa' })
          .eq('type', 'expense');
        
        if (updateExpenseError) {
          console.error('❌ Erro ao converter expense:', updateExpenseError);
        } else {
          console.log(`✅ ${typeGroups['expense'].length} transações convertidas de 'expense' para 'despesa'`);
        }
      }
    }
    
    // Verificar dados após conversão
    const { data: updatedData, error: updatedError } = await supabase
      .from('financial_transactions')
      .select('type, description, amount')
      .order('transaction_date', { ascending: false });
    
    if (!updatedError) {
      console.log('\n📈 Dados após padronização:');
      const updatedGroups = {};
      updatedData.forEach(transaction => {
        const type = transaction.type;
        if (!updatedGroups[type]) {
          updatedGroups[type] = { count: 0, total: 0 };
        }
        updatedGroups[type].count++;
        updatedGroups[type].total += parseFloat(transaction.amount);
      });
      
      Object.keys(updatedGroups).forEach(type => {
        console.log(`  - ${type}: ${updatedGroups[type].count} transações, Total: R$ ${updatedGroups[type].total.toFixed(2)}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

checkTransactionTypes();