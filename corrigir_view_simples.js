require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function corrigirView() {
  console.log('🔧 CORRIGINDO VIEW thebest_dashboard');
  console.log('=' .repeat(50));
  
  try {
    // 1. Primeiro, vamos tentar remover a view existente
    console.log('1. Removendo view existente...');
    try {
      const { error: dropError } = await supabase.rpc('exec_sql', {
        sql_query: 'DROP VIEW IF EXISTS public.thebest_dashboard'
      });
      
      if (dropError) {
        console.log(`   ⚠️  Aviso: ${dropError.message}`);
      } else {
        console.log('   ✅ View removida com sucesso');
      }
    } catch (err) {
      console.log(`   ⚠️  Aviso: ${err.message}`);
    }
    
    // 2. Criar a nova view
    console.log('\n2. Criando nova view...');
    const createViewSQL = `
      CREATE OR REPLACE VIEW public.thebest_dashboard AS 
      SELECT 
          tp.thebest_package_id as package_id,
          tp.package_name as name,
          COALESCE(p.name, 'Plano não encontrado') as plan_description,
          COALESCE(p.price, 0) as price,
          tp.status,
          tp.created_at,
          tp.currency,
          tp.billing_cycle,
          COUNT(tp.id) as total_subscriptions,
          SUM(CASE WHEN tp.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
          SUM(CASE WHEN tp.status = 'inactive' THEN 1 ELSE 0 END) as inactive_subscriptions,
          SUM(CASE WHEN tp.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions
      FROM thebest_packages tp
      LEFT JOIN plans p ON p.panel_plan_id = tp.thebest_package_id
      GROUP BY 
          tp.thebest_package_id, 
          tp.package_name, 
          p.name, 
          p.price, 
          tp.status, 
          tp.created_at, 
          tp.currency, 
          tp.billing_cycle
      ORDER BY tp.created_at DESC
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_query: createViewSQL
    });
    
    if (createError) {
      console.error(`   ❌ Erro ao criar view: ${createError.message}`);
      throw createError;
    } else {
      console.log('   ✅ View criada com sucesso');
    }
    
    // 3. Adicionar comentário
    console.log('\n3. Adicionando comentário...');
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql_query: "COMMENT ON VIEW public.thebest_dashboard IS 'Dashboard de pacotes TheBest - View corrigida usando thebest_packages e plans'"
    });
    
    if (commentError) {
      console.log(`   ⚠️  Aviso: ${commentError.message}`);
    } else {
      console.log('   ✅ Comentário adicionado');
    }
    
    // 4. Testar a view
    console.log('\n4. Testando a view...');
    const { data: testData, error: testError } = await supabase
      .from('thebest_dashboard')
      .select('*')
      .limit(3);
    
    if (testError) {
      console.error(`   ❌ Erro no teste: ${testError.message}`);
      throw testError;
    } else {
      console.log('   ✅ View funcionando corretamente!');
      console.log(`   📊 Registros encontrados: ${testData.length}`);
      
      if (testData.length > 0) {
        console.log('\n   📋 Primeiros registros:');
        testData.forEach((row, idx) => {
          console.log(`      ${idx + 1}. ${row.name} - ${row.status} (${row.active_subscriptions} ativos)`);
        });
      }
    }
    
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('=' .repeat(50));
    console.log('✅ A view thebest_dashboard foi corrigida.');
    console.log('✅ Agora você pode usar no SQL Editor sem erros.');
    console.log('\n📝 SQL corrigido que você pode usar:');
    console.log('SELECT * FROM public.thebest_dashboard LIMIT 10;');
    
  } catch (error) {
    console.error('\n❌ ERRO NA CORREÇÃO:', error.message);
    console.log('\n🔧 SOLUÇÃO MANUAL:');
    console.log('Execute este SQL no Supabase SQL Editor:');
    console.log('\n' + '='.repeat(50));
    console.log(`
DROP VIEW IF EXISTS public.thebest_dashboard;

CREATE OR REPLACE VIEW public.thebest_dashboard AS 
SELECT 
    tp.thebest_package_id as package_id,
    tp.package_name as name,
    COALESCE(p.name, 'Plano não encontrado') as plan_description,
    COALESCE(p.price, 0) as price,
    tp.status,
    tp.created_at,
    tp.currency,
    tp.billing_cycle,
    COUNT(tp.id) as total_subscriptions,
    SUM(CASE WHEN tp.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions
FROM thebest_packages tp
LEFT JOIN plans p ON p.panel_plan_id = tp.thebest_package_id
GROUP BY tp.thebest_package_id, tp.package_name, p.name, p.price, tp.status, tp.created_at, tp.currency, tp.billing_cycle
ORDER BY tp.created_at DESC;
`);
    console.log('='.repeat(50));
  }
}

// Executar correção
corrigirView()
  .then(() => {
    console.log('\n✅ Script finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro no script:', error.message);
    process.exit(1);
  });