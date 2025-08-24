require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarTabelasExistentes() {
  console.log('🔍 VERIFICANDO TABELAS EXISTENTES NO BANCO DE DADOS');
  console.log('=' .repeat(60));
  
  // Lista de tabelas para verificar
  const tabelasParaVerificar = [
    'packages', 'subscriptions', 'thebest_packages', 'plans', 'users', 
    'servers', 'empresas', 'in_app_notifications', 'expenses',
    'analytics_events', 'analytics_sessions', 'analytics_page_views'
  ];
  
  console.log('\n📋 VERIFICANDO TABELAS ESPECÍFICAS:');
  console.log('-'.repeat(40));
  
  const tabelasExistentes = [];
  const tabelasInexistentes = [];
  
  for (const tabela of tabelasParaVerificar) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tabela}: ${error.message}`);
        tabelasInexistentes.push(tabela);
      } else {
        console.log(`✅ ${tabela}: Existe`);
        tabelasExistentes.push(tabela);
      }
    } catch (err) {
      console.log(`❌ ${tabela}: ${err.message}`);
      tabelasInexistentes.push(tabela);
    }
  }
  
  console.log('\n📊 RESUMO:');
  console.log('-'.repeat(40));
  console.log(`✅ Tabelas existentes: ${tabelasExistentes.length}`);
  if (tabelasExistentes.length > 0) {
    tabelasExistentes.forEach(t => console.log(`   • ${t}`));
  }
  
  console.log(`\n❌ Tabelas não encontradas: ${tabelasInexistentes.length}`);
  if (tabelasInexistentes.length > 0) {
    tabelasInexistentes.forEach(t => console.log(`   • ${t}`));
  }
  
  // Verificar views específicas
  console.log('\n🔍 VERIFICANDO VIEWS ESPECÍFICAS:');
  console.log('-'.repeat(40));
  
  const viewsParaVerificar = [
    'thebest_dashboard', 'analytics_device_metrics', 'user_activity_summary',
    'analytics_popular_pages', 'analytics_daily_active_users'
  ];
  
  const viewsExistentes = [];
  const viewsInexistentes = [];
  
  for (const view of viewsParaVerificar) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${view}: ${error.message}`);
        viewsInexistentes.push(view);
      } else {
        console.log(`✅ ${view}: Existe`);
        viewsExistentes.push(view);
      }
    } catch (err) {
      console.log(`❌ ${view}: ${err.message}`);
      viewsInexistentes.push(view);
    }
  }
  
  console.log('\n📊 RESUMO VIEWS:');
  console.log('-'.repeat(40));
  console.log(`✅ Views existentes: ${viewsExistentes.length}`);
  if (viewsExistentes.length > 0) {
    viewsExistentes.forEach(v => console.log(`   • ${v}`));
  }
  
  console.log(`\n❌ Views não encontradas: ${viewsInexistentes.length}`);
  if (viewsInexistentes.length > 0) {
    viewsInexistentes.forEach(v => console.log(`   • ${v}`));
  }
}

// Executar verificação
verificarTabelasExistentes()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro na verificação:', error.message);
    process.exit(1);
  });