const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Dados do administrador
const adminData = {
  email: 'topplaytv7@gmail.com',
  password: 'Admin123!@#',
  fullName: 'Administrador Sistema',
  company: 'TopPlay TV',
  role: 'admin'
};

async function createAdminUser() {
  console.log('🚀 Iniciando criação do usuário administrador...');
  
  try {
    // 1. Verificar se o usuário já existe
    console.log('🔍 Verificando se o usuário já existe...');
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('full_name', adminData.email)
      .single();
    
    if (existingProfile) {
      console.log('⚠️  Usuário já existe. Atualizando permissões...');
      
      // Atualizar perfil existente para admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          approved: true,
          full_name: adminData.fullName,
          company: adminData.company,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingProfile.user_id);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar perfil:', updateError.message);
        return;
      }
      
      console.log('✅ Perfil atualizado com sucesso!');
      console.log('👑 Usuário promovido a administrador');
      return;
    }
    
    // 2. Criar novo usuário usando Supabase Auth
    console.log('👤 Criando novo usuário...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminData.email,
      password: adminData.password,
      options: {
        data: {
          full_name: adminData.fullName,
          role: adminData.role,
          company: adminData.company
        }
      }
    });
    
    if (authError) {
      console.error('❌ Erro ao criar usuário:', authError.message);
      return;
    }
    
    if (!authData.user) {
      console.error('❌ Erro: Usuário não foi criado');
      return;
    }
    
    console.log('✅ Usuário criado no Auth:', authData.user.id);
    
    // 3. Aguardar um pouco para o trigger criar o perfil
    console.log('⏳ Aguardando criação do perfil...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Atualizar perfil para admin
    console.log('👑 Configurando permissões de administrador...');
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        approved: true,
        full_name: adminData.fullName,
        company: adminData.company,
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id);
    
    if (profileError) {
      console.error('❌ Erro ao atualizar perfil:', profileError.message);
      console.log('ℹ️  O usuário foi criado, mas pode precisar de aprovação manual');
      return;
    }
    
    // 5. Criar configurações do usuário
    console.log('⚙️  Criando configurações do usuário...');
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert({
        user_id: authData.user.id,
        theme: 'light',
        language: 'pt-BR',
        notifications_enabled: true
      });
    
    if (settingsError) {
      console.log('⚠️  Aviso: Erro ao criar configurações:', settingsError.message);
    }
    
    // 6. Verificar criação
    console.log('🔍 Verificando usuário criado...');
    const { data: finalProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (checkError) {
      console.error('❌ Erro ao verificar perfil:', checkError.message);
      return;
    }
    
    // 7. Relatório final
    console.log('\n🎉 USUÁRIO ADMIN CRIADO COM SUCESSO!');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Senha:', adminData.password);
    console.log('👑 Role:', finalProfile.role);
    console.log('✅ Aprovado:', finalProfile.approved);
    console.log('🏢 Empresa:', finalProfile.company);
    console.log('📅 Criado em:', finalProfile.created_at);
    console.log('═══════════════════════════════════════');
    console.log('🚀 Sistema pronto para uso!');
    console.log('\n⚠️  IMPORTANTE:');
    console.log('- Altere a senha após o primeiro login');
    console.log('- Este usuário tem privilégios de administrador');
    console.log('- Mantenha as credenciais seguras');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

// Executar script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('\n✅ Script concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser };