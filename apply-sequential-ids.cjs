// Script para aplicar correção de IDs sequenciais
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function applySequentialIds() {
  console.log('🔧 Aplicando correção para IDs sequenciais...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'Não definida');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Definida' : 'Não definida');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('\n⚠️  IMPORTANTE: Execute o seguinte SQL no Supabase SQL Editor:');
    console.log('\n' + '='.repeat(80));
    console.log(`
-- CORREÇÃO: Gerar IDs sequenciais em vez de aleatórios
-- Execute este SQL no Supabase SQL Editor

-- Função corrigida para planos (IDs sequenciais)
CREATE OR REPLACE FUNCTION generate_unique_panel_plan_id()
RETURNS TEXT AS $$
DECLARE
    new_id INTEGER;
    max_id INTEGER;
BEGIN
    -- Buscar o maior ID existente
    SELECT COALESCE(MAX(panel_plan_id::INTEGER), 9) INTO max_id
    FROM plans 
    WHERE panel_plan_id IS NOT NULL 
    AND panel_plan_id ~ '^[0-9]+$'; -- Apenas IDs numéricos
    
    -- Próximo ID sequencial
    new_id := max_id + 1;
    
    -- Garantir que seja pelo menos 10 (2 dígitos)
    IF new_id < 10 THEN
        new_id := 10;
    END IF;
    
    RETURN new_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Função corrigida para servidores (IDs sequenciais)
CREATE OR REPLACE FUNCTION generate_unique_panel_server_id()
RETURNS TEXT AS $$
DECLARE
    new_id INTEGER;
    max_id INTEGER;
BEGIN
    -- Buscar o maior ID existente
    SELECT COALESCE(MAX(panel_server_id::INTEGER), 9) INTO max_id
    FROM servers 
    WHERE panel_server_id IS NOT NULL 
    AND panel_server_id ~ '^[0-9]+$'; -- Apenas IDs numéricos
    
    -- Próximo ID sequencial
    new_id := max_id + 1;
    
    -- Garantir que seja pelo menos 10 (2 dígitos)
    IF new_id < 10 THEN
        new_id := 10;
    END IF;
    
    RETURN new_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Testar as funções
SELECT 'Próximo ID de plano será:' as info, generate_unique_panel_plan_id() as proximo_id;
SELECT 'Próximo ID de servidor será:' as info, generate_unique_panel_server_id() as proximo_id;
`);
    console.log('='.repeat(80));
    
    // Mostrar IDs atuais para referência
    console.log('\n📊 IDs atuais para referência:');
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('panel_plan_id, name')
      .order('panel_plan_id', { ascending: true });
    
    if (!plansError && plans) {
      console.log('\n📋 Planos:');
      plans.forEach(plan => {
        console.log(`  ID ${plan.panel_plan_id}: ${plan.name}`);
      });
      console.log(`\n✅ Próximo plano terá ID: ${Math.max(...plans.map(p => parseInt(p.panel_plan_id))) + 1}`);
    }
    
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('panel_server_id, name')
      .order('panel_server_id', { ascending: true });
    
    if (!serversError && servers) {
      console.log('\n🖥️ Servidores:');
      servers.forEach(server => {
        console.log(`  ID ${server.panel_server_id}: ${server.name}`);
      });
      if (servers.length > 0) {
        console.log(`\n✅ Próximo servidor terá ID: ${Math.max(...servers.map(s => parseInt(s.panel_server_id))) + 1}`);
      }
    }
    
    console.log('\n📝 Após executar o SQL acima no Supabase:');
    console.log('   • Os novos planos terão IDs sequenciais (18, 19, 20, ...)');
    console.log('   • Os novos servidores terão IDs sequenciais');
    console.log('   • Não haverá mais IDs aleatórios como 44');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applySequentialIds();