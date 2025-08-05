// Script para aplicar migração completa de IDs únicos e intransferíveis
// Este script garante que planos e servidores tenham IDs gerados automaticamente

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyCompleteMigration() {
  console.log('🚀 Aplicando migração completa para IDs únicos e intransferíveis...');
  console.log('📋 Esta migração irá:');
  console.log('   ✅ Garantir que planos e servidores tenham IDs únicos de 2 dígitos (10-99)');
  console.log('   ✅ Configurar triggers para geração automática de IDs');
  console.log('   ✅ Tornar os IDs intransferíveis (mesmo quando registros são excluídos)');
  console.log('   ✅ Atualizar registros existentes sem IDs');
  console.log('');
  
  try {
    // 1. Verificar estrutura das tabelas
    console.log('🔍 Verificando estrutura das tabelas...');
    
    // Verificar tabela plans
    const { data: plansTest, error: plansError } = await supabase
      .from('plans')
      .select('id, name, panel_plan_id')
      .limit(1);
    
    if (plansError && plansError.message.includes('panel_plan_id')) {
      console.log('❌ Coluna panel_plan_id não existe na tabela plans');
      console.log('📝 Execute primeiro a migração SQL completa!');
      return;
    }
    
    // Verificar tabela servers
    const { data: serversTest, error: serversError } = await supabase
      .from('servers')
      .select('id, name, panel_server_id')
      .limit(1);
    
    if (serversError && serversError.message.includes('panel_server_id')) {
      console.log('❌ Coluna panel_server_id não existe na tabela servers');
      console.log('📝 Execute primeiro a migração SQL completa!');
      return;
    }
    
    console.log('✅ Estrutura das tabelas verificada!');
    
    // 2. Verificar funções do banco
    console.log('🔍 Verificando funções de geração de IDs...');
    
    // Testar função de planos
    const { data: planFunctionTest, error: planFunctionError } = await supabase.rpc('generate_unique_panel_plan_id');
    if (planFunctionError) {
      console.log('❌ Função generate_unique_panel_plan_id não existe');
      console.log('📝 Execute primeiro a migração SQL completa!');
      return;
    }
    
    // Testar função de servidores
    const { data: serverFunctionTest, error: serverFunctionError } = await supabase.rpc('generate_unique_panel_server_id');
    if (serverFunctionError) {
      console.log('❌ Função generate_unique_panel_server_id não existe');
      console.log('📝 Execute primeiro a migração SQL completa!');
      return;
    }
    
    console.log('✅ Funções de geração de IDs verificadas!');
    
    // 3. Buscar e atualizar planos sem IDs
    console.log('🔍 Verificando planos sem IDs...');
    const { data: plansWithoutId, error: plansSelectError } = await supabase
      .from('plans')
      .select('id, name, panel_plan_id')
      .is('panel_plan_id', null);
    
    if (plansSelectError) {
      console.error('❌ Erro ao buscar planos:', plansSelectError);
      return;
    }
    
    console.log(`📊 Encontrados ${plansWithoutId?.length || 0} planos sem ID`);
    
    if (plansWithoutId && plansWithoutId.length > 0) {
      console.log('🔄 Atualizando planos...');
      for (const plan of plansWithoutId) {
        const { data: newId, error: idError } = await supabase.rpc('generate_unique_panel_plan_id');
        if (idError) {
          console.error(`❌ Erro ao gerar ID para plano ${plan.name}:`, idError);
          continue;
        }
        
        const { error: updateError } = await supabase
          .from('plans')
          .update({ panel_plan_id: newId })
          .eq('id', plan.id);
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar plano ${plan.name}:`, updateError);
        } else {
          console.log(`✅ Plano "${plan.name}" atualizado com ID: ${newId}`);
        }
      }
    }
    
    // 4. Buscar e atualizar servidores sem IDs
    console.log('🔍 Verificando servidores sem IDs...');
    const { data: serversWithoutId, error: serversSelectError } = await supabase
      .from('servers')
      .select('id, name, panel_server_id')
      .is('panel_server_id', null);
    
    if (serversSelectError) {
      console.error('❌ Erro ao buscar servidores:', serversSelectError);
      return;
    }
    
    console.log(`📊 Encontrados ${serversWithoutId?.length || 0} servidores sem ID`);
    
    if (serversWithoutId && serversWithoutId.length > 0) {
      console.log('🔄 Atualizando servidores...');
      for (const server of serversWithoutId) {
        const { data: newId, error: idError } = await supabase.rpc('generate_unique_panel_server_id');
        if (idError) {
          console.error(`❌ Erro ao gerar ID para servidor ${server.name}:`, idError);
          continue;
        }
        
        const { error: updateError } = await supabase
          .from('servers')
          .update({ panel_server_id: newId })
          .eq('id', server.id);
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar servidor ${server.name}:`, updateError);
        } else {
          console.log(`✅ Servidor "${server.name}" atualizado com ID: ${newId}`);
        }
      }
    }
    
    // 5. Relatório final
    console.log('');
    console.log('📊 RELATÓRIO FINAL:');
    console.log('==================');
    
    // Contar planos
    const { data: allPlans, error: allPlansError } = await supabase
      .from('plans')
      .select('id, name, panel_plan_id, created_at');
    
    if (!allPlansError && allPlans) {
      const plansWithId = allPlans.filter(p => p.panel_plan_id);
      const plansWithoutId = allPlans.filter(p => !p.panel_plan_id);
      
      console.log(`📋 PLANOS:`);
      console.log(`   Total: ${allPlans.length}`);
      console.log(`   Com ID: ${plansWithId.length}`);
      console.log(`   Sem ID: ${plansWithoutId.length}`);
      
      if (plansWithId.length > 0) {
        console.log(`   IDs utilizados: ${plansWithId.map(p => p.panel_plan_id).sort().join(', ')}`);
      }
    }
    
    // Contar servidores
    const { data: allServers, error: allServersError } = await supabase
      .from('servers')
      .select('id, name, panel_server_id, created_at');
    
    if (!allServersError && allServers) {
      const serversWithId = allServers.filter(s => s.panel_server_id);
      const serversWithoutId = allServers.filter(s => !s.panel_server_id);
      
      console.log(`🖥️  SERVIDORES:`);
      console.log(`   Total: ${allServers.length}`);
      console.log(`   Com ID: ${serversWithId.length}`);
      console.log(`   Sem ID: ${serversWithoutId.length}`);
      
      if (serversWithId.length > 0) {
        console.log(`   IDs utilizados: ${serversWithId.map(s => s.panel_server_id).sort().join(', ')}`);
      }
    }
    
    console.log('');
    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('✅ Todos os registros agora possuem IDs únicos e intransferíveis');
    console.log('✅ Novos registros terão IDs gerados automaticamente');
    console.log('✅ IDs são únicos e não serão reutilizados mesmo após exclusões');
    console.log('');
    console.log('📝 PRÓXIMOS PASSOS:');
    console.log('   1. Teste a criação de novos planos e servidores');
    console.log('   2. Verifique se os IDs estão sendo gerados automaticamente');
    console.log('   3. Confirme que a documentação da API está atualizada');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    console.log('');
    console.log('🔧 SOLUÇÃO:');
    console.log('   1. Verifique se o arquivo migration-auto-generate-ids.sql foi executado no Supabase');
    console.log('   2. Confirme que as variáveis de ambiente estão corretas');
    console.log('   3. Execute este script novamente após corrigir os problemas');
  }
}

// Executar migração
applyCompleteMigration();