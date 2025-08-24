require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function diagnoseProfileIssue() {
  console.log('🔍 Diagnosticando problema da tabela profiles...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // 1. Verificar se a tabela existe e sua estrutura
    console.log('\n📋 Verificando estrutura da tabela...');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela profiles:', error);
      return;
    }
    
    if (profiles && profiles.length > 0) {
      console.log('✅ Tabela profiles existe');
      console.log('📊 Colunas encontradas:', Object.keys(profiles[0]));
    } else {
      console.log('⚠️ Tabela profiles vazia');
    }
    
    // 2. Verificar usuário específico
    console.log('\n👤 Verificando usuário topplaytv7@gmail.com...');
    
    // Buscar por user_id
    const { data: profileByUserId, error: errorUserId } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', '2f67bed8-9448-446f-8f38-9306f773620d')
      .single();
    
    console.log('Busca por user_id:', { data: profileByUserId, error: errorUserId });
    
    // Buscar por id
    const { data: profileById, error: errorId } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '2f67bed8-9448-446f-8f38-9306f773620d')
      .single();
    
    console.log('Busca por id:', { data: profileById, error: errorId });
    
    // 3. Listar todos os perfis
    console.log('\n📊 Todos os perfis na tabela:');
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('*');
    
    if (allError) {
      console.error('❌ Erro ao listar perfis:', allError);
    } else {
      console.log(`✅ Total de perfis: ${allProfiles?.length || 0}`);
      allProfiles?.forEach(p => {
        console.log(`  - ID: ${p.id}, User_ID: ${p.user_id}, Role: ${p.role}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

diagnoseProfileIssue();