const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Usar service role key para operações administrativas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔧 Aplicando migração de política RLS para servidores...');
  
  try {
    // Primeiro, vamos verificar se a tabela servers existe e suas políticas atuais
    console.log('🔍 Verificando estrutura atual da tabela servers...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('servers')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Erro ao acessar tabela servers:', tableError.message);
      return;
    }
    
    console.log('✅ Tabela servers acessível');
    
    // Tentar inserir um registro de teste para verificar a política atual
    console.log('\n🧪 Testando política atual...');
    
    const testServer = {
      name: 'Teste Migração',
      integration_type: 'manual',
      status: 'active',
      url: 'https://teste-migracao.com',
      api_key: 'test-key-migration'
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('servers')
      .insert([testServer])
      .select();
    
    if (insertError) {
      console.log('❌ Inserção bloqueada (esperado se RLS estiver ativo):', insertError.message);
      console.log('Código do erro:', insertError.code);
      
      if (insertError.code === '42501') {
        console.log('\n🔧 Política RLS está bloqueando inserções. Vamos verificar as permissões...');
        
        // Verificar permissões da tabela
        console.log('\n📋 Verificando permissões da tabela servers...');
        
        const { data: permissions, error: permError } = await supabase
          .rpc('check_table_permissions', { table_name: 'servers' })
          .single();
        
        if (permError) {
          console.log('ℹ️ Não foi possível verificar permissões via RPC:', permError.message);
          
          // Tentar uma abordagem alternativa - verificar se conseguimos fazer SELECT
          console.log('\n🔍 Testando permissões de SELECT...');
          const { data: selectTest, error: selectError } = await supabase
            .from('servers')
            .select('id, name')
            .limit(5);
          
          if (selectError) {
            console.log('❌ SELECT também bloqueado:', selectError.message);
          } else {
            console.log('✅ SELECT permitido, encontrados', selectTest?.length || 0, 'registros');
          }
          
          // Vamos tentar aplicar as permissões necessárias
          console.log('\n🔧 Tentando aplicar permissões necessárias...');
          
          // Usar uma query SQL direta através de uma função personalizada
          const grantSQL = `
            -- Conceder permissões básicas para o role authenticated
            GRANT SELECT, INSERT, UPDATE, DELETE ON servers TO authenticated;
            
            -- Conceder permissões de SELECT para o role anon (se necessário)
            GRANT SELECT ON servers TO anon;
          `;
          
          console.log('📝 Aplicando permissões SQL...');
          
          // Como não podemos executar SQL diretamente, vamos tentar uma abordagem diferente
          // Vamos verificar se existe alguma função RPC disponível
          const { data: rpcFunctions, error: rpcError } = await supabase
            .rpc('get_available_functions')
            .select();
          
          if (rpcError) {
            console.log('ℹ️ Não foi possível listar funções RPC:', rpcError.message);
          } else {
            console.log('📋 Funções RPC disponíveis:', rpcFunctions);
          }
          
        } else {
          console.log('📋 Permissões encontradas:', permissions);
        }
        
      }
      
    } else {
      console.log('✅ Inserção bem-sucedida! Política permite inserções.');
      console.log('Dados inseridos:', insertTest);
      
      // Limpar o registro de teste
      if (insertTest && insertTest[0]) {
        const { error: deleteError } = await supabase
          .from('servers')
          .delete()
          .eq('id', insertTest[0].id);
        
        if (!deleteError) {
          console.log('✅ Registro de teste removido');
        }
      }
    }
    
    // Verificar se conseguimos listar as políticas de alguma forma
    console.log('\n🔍 Tentando verificar informações do schema...');
    
    // Tentar acessar informações do sistema
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'servers')
      .eq('table_schema', 'public');
    
    if (schemaError) {
      console.log('ℹ️ Não foi possível acessar information_schema:', schemaError.message);
    } else {
      console.log('📋 Informações da tabela:', schemaInfo);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar a verificação
applyMigration().then(() => {
  console.log('\n🏁 Diagnóstico concluído');
  console.log('\n💡 Próximos passos:');
  console.log('1. Verificar no painel do Supabase se as políticas RLS estão configuradas corretamente');
  console.log('2. Aplicar a migração manualmente no SQL Editor do Supabase');
  console.log('3. Verificar se as permissões para os roles authenticated e anon estão corretas');
}).catch(error => {
  console.error('❌ Erro no processo:', error);
});