require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEstrutura() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA thebest_packages');
  console.log('=' .repeat(60));
  
  try {
    // Verificar alguns registros da tabela thebest_packages
    const { data: packages, error: errorPackages } = await supabase
      .from('thebest_packages')
      .select('*')
      .limit(3);
    
    if (errorPackages) {
      console.error('❌ Erro ao buscar thebest_packages:', errorPackages.message);
    } else {
      console.log('\n📋 ESTRUTURA DA TABELA thebest_packages:');
      console.log('-'.repeat(50));
      
      if (packages && packages.length > 0) {
        console.log('Colunas encontradas:');
        const colunas = Object.keys(packages[0]);
        colunas.forEach((coluna, index) => {
          const valor = packages[0][coluna];
          const tipo = typeof valor;
          console.log(`${index + 1}. ${coluna} (${tipo}): ${valor}`);
        });
        
        console.log(`\n✅ Total de registros encontrados: ${packages.length}`);
      } else {
        console.log('❌ Nenhum registro encontrado na tabela');
      }
    }
    
    // Verificar tabela plans também
    console.log('\n🔍 VERIFICANDO ESTRUTURA DA TABELA plans:');
    console.log('-'.repeat(50));
    
    const { data: plans, error: errorPlans } = await supabase
      .from('plans')
      .select('*')
      .limit(3);
    
    if (errorPlans) {
      console.error('❌ Erro ao buscar plans:', errorPlans.message);
    } else if (plans && plans.length > 0) {
      console.log('Colunas encontradas:');
      const colunas = Object.keys(plans[0]);
      colunas.forEach((coluna, index) => {
        const valor = plans[0][coluna];
        const tipo = typeof valor;
        console.log(`${index + 1}. ${coluna} (${tipo}): ${valor}`);
      });
      
      console.log(`\n✅ Total de registros encontrados: ${plans.length}`);
    } else {
      console.log('❌ Nenhum registro encontrado na tabela plans');
    }
    
    // Verificar se existe alguma tabela de subscriptions ou similar
    console.log('\n🔍 VERIFICANDO POSSÍVEIS TABELAS DE ASSINATURA:');
    console.log('-'.repeat(50));
    
    const tabelasAssinatura = ['user_plans', 'user_subscriptions', 'plan_subscriptions', 'thebest_subscriptions'];
    
    for (const tabela of tabelasAssinatura) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tabela}: ${error.message}`);
        } else {
          console.log(`✅ ${tabela}: Existe!`);
          if (data && data.length > 0) {
            const colunas = Object.keys(data[0]);
            console.log(`   Colunas: ${colunas.join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${tabela}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar verificação
verificarEstrutura()
  .then(() => {
    console.log('\n✅ Verificação de estrutura concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro na verificação:', error.message);
    process.exit(1);
  });