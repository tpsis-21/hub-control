/**
 * Script para criar um usuário de teste no Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createTestUser() {
  console.log('🚀 Criando usuário de teste...');
  
  // Cliente com service role para operações administrativas
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  try {
    // 1. Criar usuário na auth
    console.log('👤 Criando usuário na autenticação...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@test.com',
      password: 'admin123',
      email_confirm: true // Confirmar email automaticamente
    });
    
    if (authError) {
      console.error('❌ Erro ao criar usuário na auth:', authError.message);
      return;
    }
    
    console.log('✅ Usuário criado na auth:', authUser.user.id);
    
    // 2. Criar perfil do usuário
    console.log('📋 Criando perfil do usuário...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin Teste'
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError.message);
      
      // Se o perfil já existe, apenas atualizar
      if (profileError.code === '23505') {
        console.log('📝 Perfil já existe, atualizando...');
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            role: 'admin',
            name: 'Admin Teste'
          })
          .eq('user_id', authUser.user.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erro ao atualizar perfil:', updateError.message);
        } else {
          console.log('✅ Perfil atualizado:', updatedProfile);
        }
      }
    } else {
      console.log('✅ Perfil criado:', profile);
    }
    
    // 3. Verificar se o usuário pode fazer login
    console.log('🔐 Testando login do usuário...');
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
    } else {
      console.log('✅ Login realizado com sucesso!');
      console.log('👤 Usuário logado:', loginData.user.email);
      
      // Fazer logout
      await supabaseClient.auth.signOut();
    }
    
    console.log('\n🎉 Usuário de teste criado com sucesso!');
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Senha: admin123');
    console.log('👑 Role: admin');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar
createTestUser().then(() => {
  console.log('\n✅ Script concluído!');
}).catch(error => {
  console.error('❌ Erro no script:', error);
  process.exit(1);
});