const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPlanMigration() {
  console.log('🚀 Aplicando migração para garantir IDs numéricos únicos nos planos...');
  
  try {
    // 1. Verificar se a coluna panel_plan_id existe
    console.log('🔍 Verificando estrutura da tabela plans...');
    const { data: testData, error: testError } = await supabase
      .from('plans')
      .select('id, name, panel_plan_id')
      .limit(1);
    
    if (testError) {
      // Se o erro for sobre coluna não existir, significa que precisamos criar
      if (testError.message && testError.message.includes('panel_plan_id')) {
        console.log('📝 Coluna panel_plan_id não existe.');
        const hasColumn = false;
      } else {
        console.error('❌ Erro ao verificar tabela plans:', testError);
        return;
      }
    }
    
    const hasColumn = testError ? false : true;
    
    if (!hasColumn) {
      console.log('📝 Coluna panel_plan_id não existe, será necessário adicioná-la manualmente via SQL Editor do Supabase.');
      console.log('\n📋 Execute este SQL no Supabase SQL Editor:');
      console.log('\n-- Adicionar coluna panel_plan_id');
      console.log('ALTER TABLE plans ADD COLUMN panel_plan_id TEXT;');
      console.log('\n-- Criar índice único');
      console.log('CREATE UNIQUE INDEX idx_plans_panel_plan_id ON plans(panel_plan_id) WHERE panel_plan_id IS NOT NULL;');
      console.log('\n-- Função para gerar IDs únicos');
      console.log(`CREATE OR REPLACE FUNCTION generate_unique_panel_plan_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    id_exists BOOLEAN;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 90;
BEGIN
    LOOP
        new_id := (10 + floor(random() * 90))::TEXT;
        
        SELECT EXISTS(
            SELECT 1 FROM plans 
            WHERE panel_plan_id = new_id
        ) INTO id_exists;
        
        IF NOT id_exists THEN
            RETURN new_id;
        END IF;
        
        attempt_count := attempt_count + 1;
        
        IF attempt_count >= max_attempts THEN
            new_id := (100 + floor(random() * 900))::TEXT;
            
            SELECT EXISTS(
                SELECT 1 FROM plans 
                WHERE panel_plan_id = new_id
            ) INTO id_exists;
            
            IF NOT id_exists THEN
                RETURN new_id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;`);
      console.log('\n⚠️  Após executar o SQL acima, execute este script novamente.');
      return;
    } else {
      console.log('✅ Coluna panel_plan_id já existe!');
    }
    
    // 2. Verificar se a função generate_unique_panel_plan_id existe
    console.log('🔍 Verificando função generate_unique_panel_plan_id...');
    const { data: functionData, error: functionError } = await supabase.rpc('generate_unique_panel_plan_id');
    
    if (functionError) {
      console.log('📝 Função generate_unique_panel_plan_id não existe, será necessário criá-la.');
      console.log('\n📋 Execute este SQL no Supabase SQL Editor:');
      console.log(`CREATE OR REPLACE FUNCTION generate_unique_panel_plan_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    id_exists BOOLEAN;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 90;
BEGIN
    LOOP
        new_id := (10 + floor(random() * 90))::TEXT;
        
        SELECT EXISTS(
            SELECT 1 FROM plans 
            WHERE panel_plan_id = new_id
        ) INTO id_exists;
        
        IF NOT id_exists THEN
            RETURN new_id;
        END IF;
        
        attempt_count := attempt_count + 1;
        
        IF attempt_count >= max_attempts THEN
            new_id := (100 + floor(random() * 900))::TEXT;
            
            SELECT EXISTS(
                SELECT 1 FROM plans 
                WHERE panel_plan_id = new_id
            ) INTO id_exists;
            
            IF NOT id_exists THEN
                RETURN new_id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;`);
      console.log('\n⚠️  Após executar o SQL acima, execute este script novamente.');
      return;
    } else {
      console.log('✅ Função generate_unique_panel_plan_id já existe!');
    }
    
    // 3. Buscar planos existentes sem panel_plan_id
    console.log('🔍 Buscando planos existentes...');
    const { data: plans, error: selectError } = await supabase
      .from('plans')
      .select('id, name, panel_plan_id')
      .is('panel_plan_id', null);
    
    if (selectError) {
      console.error('❌ Erro ao buscar planos:', selectError);
      return;
    }
    
    console.log(`📊 Encontrados ${plans?.length || 0} planos sem ID numérico`);
    
    // 4. Atualizar cada plano com um ID único
    if (plans && plans.length > 0) {
      for (const plan of plans) {
        console.log(`🔄 Atualizando plano: ${plan.name}`);
        
        // Gerar ID único
        const { data: newIdData, error: idError } = await supabase.rpc('generate_unique_panel_plan_id');
        
        if (idError) {
          console.error(`❌ Erro ao gerar ID para ${plan.name}:`, idError);
          continue;
        }
        
        // Atualizar plano
        const { error: updateError } = await supabase
          .from('plans')
          .update({ panel_plan_id: newIdData })
          .eq('id', plan.id);
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar ${plan.name}:`, updateError);
        } else {
          console.log(`✅ ${plan.name} atualizado com ID: ${newIdData}`);
        }
      }
    } else {
      console.log('✅ Todos os planos já possuem IDs numéricos!');
    }
    
    // 5. Mostrar resultado final
    console.log('\n📋 Resultado final:');
    const { data: finalPlans, error: finalError } = await supabase
      .from('plans')
      .select('name, panel_plan_id')
      .order('panel_plan_id');
    
    if (finalError) {
      console.error('❌ Erro ao buscar resultado final:', finalError);
      return;
    }
    
    console.log('\n📊 Planos com seus IDs numéricos:');
    finalPlans?.forEach(plan => {
      console.log(`  - ${plan.name}: ${plan.panel_plan_id || 'SEM ID'}`);
    });
    
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  }
}

applyPlanMigration();