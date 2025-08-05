const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Aplicando migração para adicionar IDs numéricos aos servidores...');
  
  try {
    // 1. Verificar se a coluna já existe tentando buscar servidores
    console.log('🔍 Verificando estrutura da tabela servers...');
    const { data: testData, error: testError } = await supabase
      .from('servers')
      .select('id, name, panel_server_id')
      .limit(1);
    
    if (testError) {
      // Se o erro for sobre coluna não existir, significa que precisamos criar
      if (testError.message && testError.message.includes('panel_server_id')) {
        console.log('📝 Coluna panel_server_id não existe.');
        const hasColumn = false;
      } else {
        console.error('❌ Erro ao verificar tabela servers:', testError);
        return;
      }
    }
    
    const hasColumn = testError ? false : true;
    
    if (!hasColumn) {
      console.log('📝 Coluna panel_server_id não existe, será necessário adicioná-la manualmente via SQL Editor do Supabase.');
      console.log('\n📋 Execute este SQL no Supabase SQL Editor:');
      console.log('\n-- Adicionar coluna panel_server_id');
      console.log('ALTER TABLE servers ADD COLUMN panel_server_id TEXT;');
      console.log('\n-- Criar índice único');
      console.log('CREATE UNIQUE INDEX idx_servers_panel_server_id ON servers(panel_server_id) WHERE panel_server_id IS NOT NULL;');
      console.log('\n-- Função para gerar IDs únicos');
      console.log(`CREATE OR REPLACE FUNCTION generate_unique_panel_server_id()
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
            SELECT 1 FROM servers 
            WHERE panel_server_id = new_id
        ) INTO id_exists;
        
        IF NOT id_exists THEN
            RETURN new_id;
        END IF;
        
        attempt_count := attempt_count + 1;
        
        IF attempt_count >= max_attempts THEN
            new_id := (100 + floor(random() * 900))::TEXT;
            
            SELECT EXISTS(
                SELECT 1 FROM servers 
                WHERE panel_server_id = new_id
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
      console.log('✅ Coluna panel_server_id já existe!');
    }
    
    // 3. Buscar servidores existentes sem panel_server_id
    console.log('🔍 Buscando servidores existentes...');
    const { data: servers, error: selectError } = await supabase
      .from('servers')
      .select('id, name, panel_server_id')
      .is('panel_server_id', null);
    
    if (selectError) {
      console.error('❌ Erro ao buscar servidores:', selectError);
      return;
    }
    
    console.log(`📊 Encontrados ${servers?.length || 0} servidores sem ID numérico`);
    
    // 4. Atualizar cada servidor com um ID único
    if (servers && servers.length > 0) {
      for (const server of servers) {
        console.log(`🔄 Atualizando servidor: ${server.name}`);
        
        // Gerar ID único
        const { data: newIdData, error: idError } = await supabase.rpc('generate_unique_panel_server_id');
        
        if (idError) {
          console.error(`❌ Erro ao gerar ID para ${server.name}:`, idError);
          continue;
        }
        
        // Atualizar servidor
        const { error: updateError } = await supabase
          .from('servers')
          .update({ panel_server_id: newIdData })
          .eq('id', server.id);
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar ${server.name}:`, updateError);
        } else {
          console.log(`✅ Servidor ${server.name} atualizado com ID: ${newIdData}`);
        }
      }
    }
    
    // 5. Verificar resultado final
    console.log('🔍 Verificando resultado final...');
    const { data: finalServers, error: finalError } = await supabase
      .from('servers')
      .select('name, panel_server_id')
      .order('panel_server_id');
    
    if (finalError) {
      console.error('❌ Erro ao verificar resultado:', finalError);
      return;
    }
    
    console.log('\n📋 Servidores com IDs numéricos:');
    finalServers?.forEach(server => {
      console.log(`  - ${server.name}: ${server.panel_server_id || 'SEM ID'}`);
    });
    
    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  }
}

applyMigration();