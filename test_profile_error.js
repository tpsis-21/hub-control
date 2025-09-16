// Script de teste para reproduzir o erro de chave duplicada na tabela profiles
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configuração do Supabase com service_role para bypass do RLS
const supabaseUrl = 'https://htwiupmnqlmwvzqzroal.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0d2l1cG1ucWxtd3Z6cXpyb2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzI4NjIzMSwiZXhwIjoyMDY4ODYyMjMxfQ.R5aVBW9w_ushxXtW8WNLcMSWpeMdTuwssJ64BluXQN0';

// Usar service_role para bypass do RLS durante teste
const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('🔧 Usando service_role_key para bypass do RLS');

async function testProfileOperations() {
  console.log('🔍 Iniciando teste de operações de perfil...');
  
  try {
    // 1. Verificar usuários autenticados existentes
    console.log('\n1. Verificando usuários na tabela auth.users:');
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .limit(5);
    
    if (authError) {
      console.log('⚠️ Não foi possível acessar auth.users diretamente (esperado):', authError.message);
    } else {
      console.log('✅ Usuários encontrados:', authUsers?.length || 0);
    }

    // 2. Verificar registros existentes na tabela profiles
    console.log('\n2. Verificando registros existentes na tabela profiles:');
    const { data: allProfiles, error: listError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, created_at')
      .order('created_at', { ascending: false });
    
    if (listError) {
      console.error('❌ Erro ao listar perfis:', listError);
      return;
    } else {
      console.log('✅ Perfis encontrados:', allProfiles?.length || 0);
      allProfiles?.forEach((profile, index) => {
        console.log(`   ${index + 1}. ID: ${profile.id}, User ID: ${profile.user_id}, Nome: ${profile.full_name}`);
      });
    }

    // 3. Verificar constraints da tabela
    console.log('\n3. Verificando estrutura da tabela profiles:');
    const { data: tableInfo, error: infoError } = await supabase
      .rpc('get_table_constraints', { table_name: 'profiles' });
    
    if (infoError) {
      console.log('⚠️ Não foi possível obter constraints (função não existe):', infoError.message);
    }

    // 4. Testar inserção com UUID válido
    console.log('\n4. Testando inserção com UUID válido...');
    const testUserId = uuidv4();
    
    const profileData = {
      user_id: testUserId,
      full_name: 'Teste Usuario',
      phone: '(11) 99999-9999',
      company: 'Empresa Teste',
      updated_at: new Date().toISOString()
    };

    console.log('Dados para teste:', profileData);

    const { data: insertResult, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select();

    if (insertError) {
      console.error('❌ Erro na inserção:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
    } else {
      console.log('✅ Inserção realizada com sucesso:', insertResult);
      
      // 5. Testar upsert no mesmo user_id (deve atualizar)
      console.log('\n5. Testando upsert no mesmo user_id...');
      const updatedData = {
        user_id: testUserId,
        full_name: 'Teste Usuario Atualizado',
        phone: '(11) 88888-8888',
        company: 'Nova Empresa',
        updated_at: new Date().toISOString()
      };

      const { data: upsertResult, error: upsertError } = await supabase
        .from('profiles')
        .upsert(updatedData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select();

      if (upsertError) {
        console.error('❌ Erro no upsert:', {
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        });
      } else {
        console.log('✅ Upsert realizado com sucesso:', upsertResult);
      }
      
      // 6. Testar inserção duplicada (deve falhar)
      console.log('\n6. Testando inserção duplicada (deve falhar)...');
      const { data: dupResult, error: dupError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select();

      if (dupError) {
        console.log('✅ Erro esperado na inserção duplicada:', {
          message: dupError.message,
          code: dupError.code
        });
      } else {
        console.log('⚠️ Inserção duplicada não falhou (inesperado):', dupResult);
      }
      
      // Limpar dados de teste
      console.log('\n7. Limpando dados de teste...');
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', testUserId);
        
      if (deleteError) {
        console.error('❌ Erro ao limpar dados:', deleteError);
      } else {
        console.log('🧹 Dados de teste removidos');
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar teste
testProfileOperations().then(() => {
  console.log('\n🏁 Teste concluído');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});