// Script para verificar e corrigir status do admin
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Configurações do Supabase não encontradas!');
  process.exit(1);
}

// Cliente com privilégios de service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixAdmin() {
  try {
    console.log('🔍 Verificando status do usuário admin...');
    
    // 1. Buscar usuário pelo email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError.message);
      return;
    }
    
    const adminUser = users.find(user => user.email === 'topplaytv7@gmail.com');
    
    if (!adminUser) {
      console.error('❌ Usuário admin não encontrado!');
      return;
    }
    
    console.log('✅ Usuário encontrado:', adminUser.id);
    console.log('📧 Email:', adminUser.email);
    console.log('📅 Criado em:', adminUser.created_at);
    console.log('✉️ Email confirmado:', adminUser.email_confirmed_at ? '✅ Sim' : '❌ Não');
    console.log('🔐 Último login:', adminUser.last_sign_in_at || 'Nunca');
    
    // 2. Se email não confirmado, confirmar
    if (!adminUser.email_confirmed_at) {
      console.log('\n🔧 Confirmando email do usuário...');
      
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        {
          email_confirm: true
        }
      );
      
      if (confirmError) {
        console.error('❌ Erro ao confirmar email:', confirmError.message);
      } else {
        console.log('✅ Email confirmado com sucesso!');
      }
    }
    
    // 3. Verificar perfil na tabela profiles
    console.log('\n🔍 Verificando perfil...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single();
    
    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError.message);
      
      // Criar perfil se não existir
      console.log('🔧 Criando perfil...');
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: adminUser.id,
          email: adminUser.email,
          full_name: 'Administrador Sistema',
          role: 'admin',
          is_approved: true,
          company: 'TopPlay TV',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (createProfileError) {
        console.error('❌ Erro ao criar perfil:', createProfileError.message);
      } else {
        console.log('✅ Perfil criado com sucesso!');
      }
    } else {
      console.log('✅ Perfil encontrado:');
      console.log('👤 Nome:', profile.full_name);
      console.log('👑 Role:', profile.role);
      console.log('✅ Aprovado:', profile.is_approved);
      console.log('🏢 Empresa:', profile.company);
      
      // Atualizar para admin se necessário
      if (profile.role !== 'admin' || !profile.is_approved) {
        console.log('🔧 Atualizando permissões...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'admin',
            is_approved: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', adminUser.id);
        
        if (updateError) {
          console.error('❌ Erro ao atualizar perfil:', updateError.message);
        } else {
          console.log('✅ Permissões atualizadas!');
        }
      }
    }
    
    // 4. Testar login
    console.log('\n🧪 Testando login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'topplaytv7@gmail.com',
      password: 'Admin123!@#'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      
      // Tentar redefinir senha
      console.log('🔧 Redefinindo senha...');
      const { error: resetError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        {
          password: 'Admin123!@#'
        }
      );
      
      if (resetError) {
        console.error('❌ Erro ao redefinir senha:', resetError.message);
      } else {
        console.log('✅ Senha redefinida com sucesso!');
        
        // Testar login novamente
        const { data: retryLogin, error: retryError } = await supabase.auth.signInWithPassword({
          email: 'topplaytv7@gmail.com',
          password: 'Admin123!@#'
        });
        
        if (retryError) {
          console.error('❌ Login ainda falhou:', retryError.message);
        } else {
          console.log('✅ Login realizado com sucesso!');
          console.log('🔑 Token:', retryLogin.session?.access_token?.substring(0, 20) + '...');
          
          // Fazer logout
          await supabase.auth.signOut();
        }
      }
    } else {
      console.log('✅ Login realizado com sucesso!');
      console.log('🔑 Token:', loginData.session?.access_token?.substring(0, 20) + '...');
      
      // Fazer logout
      await supabase.auth.signOut();
    }
    
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkAndFixAdmin();