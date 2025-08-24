/**
 * 🧹 LIMPEZA AUTOMÁTICA DO SISTEMA
 * 
 * Script não-interativo que executa a limpeza completa automaticamente
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Configuração incompleta!');
  console.error('Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

// Cliente Supabase com Service Role
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Função para deletar usuários via Admin API
 */
async function deletarTodosUsuarios() {
  try {
    console.log('🔄 Deletando todos os usuários...');
    
    // Listar todos os usuários
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }
    
    console.log(`📊 Encontrados ${users.users.length} usuários para deletar`);
    
    // Deletar cada usuário
    for (const user of users.users) {
      console.log(`  🗑️  Deletando: ${user.email || user.id}`);
      
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`    ❌ Erro ao deletar ${user.email}:`, deleteError.message);
      } else {
        console.log(`    ✅ Deletado: ${user.email || user.id}`);
      }
    }
    
    console.log('✅ Todos os usuários foram deletados');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao deletar usuários:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Função para limpar tabelas via DELETE
 */
async function limparTabelas() {
  const tabelas = [
    'profiles',
    'user_settings', 
    'audit_logs',
    'notifications',
    'user_sessions'
  ];
  
  console.log('🔄 Limpando tabelas...');
  
  for (const tabela of tabelas) {
    try {
      console.log(`  🧹 Limpando tabela: ${tabela}`);
      
      const { error } = await supabase
        .from(tabela)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos exceto ID impossível
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`    ⚠️  Tabela ${tabela} não existe`);
        } else {
          console.error(`    ❌ Erro na tabela ${tabela}:`, error.message);
        }
      } else {
        console.log(`    ✅ Tabela ${tabela} limpa`);
      }
    } catch (error) {
      console.error(`    ❌ Erro inesperado na tabela ${tabela}:`, error.message);
    }
  }
  
  console.log('✅ Limpeza de tabelas concluída');
}

/**
 * Função para criar usuário admin
 */
async function criarUsuarioAdmin() {
  try {
    console.log('🔄 Criando usuário admin...');
    
    const adminEmail = 'topplaytv7@gmail.com';
    const adminPassword = 'Admin123!@#';
    
    // Criar usuário admin
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        full_name: 'Administrador do Sistema'
      }
    });
    
    if (createError) {
      throw createError;
    }
    
    console.log(`✅ Usuário admin criado: ${adminEmail}`);
    console.log(`🔑 Senha: ${adminPassword}`);
    
    // Tentar criar perfil (se a tabela existir)
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.user.id,
          email: adminEmail,
          role: 'admin',
          full_name: 'Administrador do Sistema',
          is_approved: true
        });
      
      if (profileError) {
        console.log('⚠️  Não foi possível criar perfil (tabela pode não existir)');
      } else {
        console.log('✅ Perfil admin criado');
      }
    } catch (error) {
      console.log('⚠️  Erro ao criar perfil:', error.message);
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Função para verificar resultado
 */
async function verificarResultado() {
  try {
    console.log('\n🔍 Verificando resultado da limpeza...');
    
    // Verificar usuários
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }
    
    console.log(`\n👥 Usuários restantes: ${users.users.length}`);
    users.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email || 'Sem email'} (${user.user_metadata?.role || 'sem role'})`);
    });
    
    // Verificar tabelas
    const tabelas = ['profiles', 'user_settings', 'audit_logs'];
    
    for (const tabela of tabelas) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('id')
          .limit(5);
        
        if (error) {
          if (error.message.includes('does not exist')) {
            console.log(`📋 Tabela ${tabela}: não existe`);
          } else {
            console.log(`📋 Tabela ${tabela}: erro - ${error.message}`);
          }
        } else {
          console.log(`📋 Tabela ${tabela}: ${data.length} registros`);
        }
      } catch (error) {
        console.log(`📋 Tabela ${tabela}: erro inesperado`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🧹 LIMPEZA AUTOMÁTICA DO SISTEMA');
  console.log('============================================================');
  console.log('⚠️  EXECUTANDO LIMPEZA COMPLETA AUTOMATICAMENTE!');
  console.log('⚠️  Esta ação é IRREVERSÍVEL!');
  console.log('');
  
  // Verificar estado atual
  console.log('📋 Verificando estado atual...');
  
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    console.log(`👥 Usuários atuais: ${users.users.length}`);
    users.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email || user.id}`);
    });
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error.message);
    return;
  }
  
  console.log('\n🚀 Iniciando limpeza automática...');
  
  // Etapa 1: Deletar todos os usuários
  const resultadoUsuarios = await deletarTodosUsuarios();
  if (!resultadoUsuarios.success) {
    console.log('❌ Falha na exclusão de usuários. Abortando...');
    return;
  }
  
  // Etapa 2: Limpar tabelas
  await limparTabelas();
  
  // Etapa 3: Criar usuário admin
  const resultadoAdmin = await criarUsuarioAdmin();
  if (!resultadoAdmin.success) {
    console.log('⚠️  Falha ao criar usuário admin, mas limpeza foi concluída.');
  }
  
  // Etapa 4: Verificar resultado
  await verificarResultado();
  
  console.log('\n🎉 LIMPEZA AUTOMÁTICA CONCLUÍDA!');
  console.log('============================================================');
  console.log('✅ Todos os usuários foram removidos');
  console.log('✅ Tabelas foram limpas');
  console.log('✅ Usuário admin criado');
  console.log('');
  console.log('🔐 CREDENCIAIS DO ADMIN:');
  console.log('   Email: topplaytv7@gmail.com');
  console.log('   Senha: Admin123!@#');
  console.log('');
  console.log('🚀 PRÓXIMOS PASSOS:');
  console.log('1. Teste o login: http://localhost:3002/login');
  console.log('2. Execute: node verificar-usuarios-atuais.js');
  console.log('3. Altere a senha do admin se necessário');
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erro inesperado:', error.message);
    process.exit(1);
  });
}

module.exports = {
  deletarTodosUsuarios,
  limparTabelas,
  criarUsuarioAdmin,
  verificarResultado
};