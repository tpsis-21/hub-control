// Teste direto do Supabase
// Este script testa a conexão e autenticação direta com o Supabase

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔧 Configurações do Supabase:');
console.log('URL:', supabaseUrl);
console.log('ANON_KEY:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NÃO ENCONTRADA');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas!');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('🚀 Testando conexão com Supabase...');
  
  try {
    // 1. Testar conexão básica
    console.log('\n1. 🔍 Testando conexão básica...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro na conexão:', testError.message);
    } else {
      console.log('✅ Conexão com Supabase estabelecida!');
    }
    
    // 2. Listar usuários existentes (se possível)
    console.log('\n2. 👥 Verificando usuários existentes...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Erro ao buscar perfis:', profilesError.message);
    } else {
      console.log('📊 Perfis encontrados:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ${profile.email || 'Email não definido'} (${profile.name || 'Nome não definido'})`);
        });
      }
    }
    
    // 3. Tentar criar um usuário de teste
    console.log('\n3. 👤 Criando usuário de teste...');
    const testEmail = 'teste-avatar@example.com';
    const testPassword = 'TesteAvatar123!';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Usuario Teste Avatar'
        }
      }
    });
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('ℹ️ Usuário já existe, tentando fazer login...');
        
        // Tentar fazer login
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });
        
        if (signInError) {
          console.error('❌ Erro no login:', signInError.message);
        } else {
          console.log('✅ Login realizado com sucesso!');
          console.log('👤 Usuário:', signInData.user?.email);
          console.log('🔑 Token:', signInData.session?.access_token ? 'Presente' : 'Ausente');
          
          // Testar uma operação autenticada
          console.log('\n4. 🔐 Testando operação autenticada...');
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('❌ Erro ao obter usuário:', userError.message);
          } else {
            console.log('✅ Usuário autenticado:', userData.user?.email);
          }
        }
      } else {
        console.error('❌ Erro no registro:', signUpError.message);
      }
    } else {
      console.log('✅ Usuário criado com sucesso!');
      console.log('👤 Usuário:', signUpData.user?.email);
      console.log('📧 Confirmação necessária:', signUpData.user?.email_confirmed_at ? 'Não' : 'Sim');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
  
  console.log('\n🏁 Teste concluído!');
}

// Executar teste
if (require.main === module) {
  testSupabaseConnection().catch(console.error);
}

module.exports = { testSupabaseConnection };