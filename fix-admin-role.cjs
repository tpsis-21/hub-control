require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixAdminRole() {
  console.log('🔧 Corrigindo role do admin principal...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Atualizar o role do admin principal
    const adminId = '2f67bed8-9448-446f-8f38-9306f773620d';
    
    console.log('📝 Atualizando role para admin...');
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', adminId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar role:', error.message);
      
      // Tentar inserir se não existir
      console.log('🔄 Tentando inserir perfil...');
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .upsert({ 
          id: adminId, 
          role: 'admin' 
        }, { 
          onConflict: 'id' 
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Erro ao inserir/atualizar perfil:', insertError.message);
      } else {
        console.log('✅ Perfil inserido/atualizado com sucesso!');
        console.log('📊 Dados:', insertData);
      }
    } else {
      console.log('✅ Role atualizado com sucesso!');
      console.log('📊 Dados atualizados:', data);
    }
    
    // Verificar o resultado
    console.log('\n🔍 Verificando resultado...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminId)
      .single();
    
    if (verifyError) {
      console.error('❌ Erro ao verificar:', verifyError.message);
    } else {
      console.log('✅ Verificação concluída:');
      console.log(`  - ID: ${verifyData.id}`);
      console.log(`  - Role: ${verifyData.role}`);
      console.log(`  - Criado em: ${verifyData.created_at}`);
      console.log(`  - Atualizado em: ${verifyData.updated_at}`);
    }
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

fixAdminRole();