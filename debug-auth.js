require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function debugAuth() {
  console.log('🔍 Debugando autenticação e perfil...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('\n📋 Variáveis de ambiente:');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
  console.log('ANON_KEY:', anonKey ? '✅ Configurada' : '❌ Não configurada');
  console.log('SERVICE_KEY:', serviceKey ? '✅ Configurada' : '❌ Não configurada');
  
  if (!supabaseUrl || !anonKey) {
    console.error('❌ Variáveis de ambiente obrigatórias não configuradas');
    return;
  }
  
  // Teste com cliente anônimo (como no frontend)
  const supabaseClient = createClient(supabaseUrl, anonKey);
  
  console.log('\n🔐 Testando autenticação...');
  
  try {
    // Verificar sessão atual
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError.message);
      return;
    }
    
    if (!session) {
      console.log('⚠️  Nenhuma sessão ativa encontrada');
      console.log('   Isso é normal se o usuário não estiver logado');
      return;
    }
    
    console.log('✅ Sessão ativa encontrada:');
    console.log('   User ID:', session.user.id);
    console.log('   Email:', session.user.email);
    console.log('   Criado em:', session.user.created_at);
    
    // Verificar perfil na tabela profiles
    console.log('\n👤 Verificando perfil na tabela profiles...');
    
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError.message);
      
      // Tentar buscar por id também
      console.log('\n🔄 Tentando buscar por id...');
      const { data: profileById, error: profileByIdError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileByIdError) {
        console.error('❌ Erro ao buscar perfil por id:', profileByIdError.message);
        
        // Verificar se existe algum perfil
        console.log('\n📊 Verificando todos os perfis...');
        const { data: allProfiles, error: allProfilesError } = await supabaseClient
          .from('profiles')
          .select('id, user_id, full_name, role, approved')
          .limit(10);
        
        if (allProfilesError) {
          console.error('❌ Erro ao buscar todos os perfis:', allProfilesError.message);
        } else {
          console.log('📋 Perfis encontrados:', allProfiles?.length || 0);
          if (allProfiles && allProfiles.length > 0) {
            allProfiles.forEach((p, i) => {
              console.log(`   ${i + 1}. ID: ${p.id}, User ID: ${p.user_id}, Nome: ${p.full_name || 'N/A'}, Role: ${p.role}`);
            });
          }
        }
      } else {
        console.log('✅ Perfil encontrado por id:', profileById);
      }
    } else {
      console.log('✅ Perfil encontrado por user_id:', profile);
    }
    
    // Verificar bucket de storage
    console.log('\n💾 Verificando bucket de storage...');
    const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError.message);
    } else {
      const profilesBucket = buckets.find(b => b.name === 'profiles');
      if (profilesBucket) {
        console.log('✅ Bucket "profiles" encontrado');
        console.log('   Público:', profilesBucket.public);
      } else {
        console.log('❌ Bucket "profiles" não encontrado');
        console.log('   Buckets disponíveis:', buckets.map(b => b.name).join(', '));
      }
    }
    
  } catch (error) {
    console.error('🚨 Erro geral:', error.message);
  }
}

debugAuth().catch(console.error);