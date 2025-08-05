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

async function removeFakeData() {
  console.log('🔍 Verificando dados fictícios...');
  
  try {
    // Buscar todos os dados atuais
    const { data: allData, error: fetchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Erro ao buscar dados:', fetchError);
      return;
    }
    
    console.log(`📊 Total de transações encontradas: ${allData.length}`);
    
    // Identificar dados fictícios (exemplo: descrições que contenham "exemplo")
    const fakeData = allData.filter(transaction => 
      transaction.description && (
        transaction.description.toLowerCase().includes('exemplo') ||
        transaction.description.toLowerCase().includes('teste') ||
        transaction.notes && transaction.notes.toLowerCase().includes('exemplo')
      )
    );
    
    console.log(`🎭 Dados fictícios encontrados: ${fakeData.length}`);
    
    if (fakeData.length > 0) {
      console.log('📋 Dados fictícios:');
      fakeData.forEach(item => {
        console.log(`  - ID: ${item.id}, Descrição: ${item.description}, Valor: ${item.amount}`);
      });
      
      // Remover dados fictícios
      const idsToDelete = fakeData.map(item => item.id);
      
      const { error: deleteError } = await supabase
        .from('financial_transactions')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error('❌ Erro ao remover dados fictícios:', deleteError);
      } else {
        console.log(`✅ ${fakeData.length} registros fictícios removidos com sucesso!`);
      }
    } else {
      console.log('✅ Nenhum dado fictício encontrado!');
    }
    
    // Mostrar dados reais restantes
    const { data: realData, error: realError } = await supabase
      .from('financial_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });
    
    if (!realError) {
      console.log(`\n📈 Dados reais restantes: ${realData.length}`);
      if (realData.length > 0) {
        console.log('📋 Últimas 5 transações reais:');
        realData.slice(0, 5).forEach(item => {
          console.log(`  - ${item.transaction_date}: ${item.description} - R$ ${item.amount}`);
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

removeFakeData();