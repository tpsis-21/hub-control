// Script alternativo para alterar senha do admin
// Este script tenta diferentes abordagens para alterar a senha

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verificando configurações...');
console.log('- Supabase URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
console.log('- Anon Key:', anonKey ? '✅ Configurada' : '❌ Não configurada');
console.log('- Service Role Key:', serviceRoleKey && serviceRoleKey !== 'sua_service_role_key_aqui' ? '✅ Configurada' : '❌ Não configurada ou placeholder');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Configurações básicas do Supabase não encontradas');
  process.exit(1);
}

// Verificar se a service role key é um placeholder
if (!serviceRoleKey || serviceRoleKey === 'sua_service_role_key_aqui') {
  console.log('\n⚠️  Service Role Key não configurada ou é um placeholder');
  console.log('\n📋 Para alterar a senha do admin, você tem 3 opções:');
  console.log('\n1️⃣  **OPÇÃO RECOMENDADA**: Dashboard do Supabase');
  console.log('   - Acesse: https://supabase.com/dashboard');
  console.log('   - Vá em Authentication > Users');
  console.log('   - Encontre topplaytv7@gmail.com');
  console.log('   - Clique nos 3 pontos e selecione "Reset Password"');
  console.log('   - Verifique o email para o link de redefinição');
  
  console.log('\n2️⃣  **OPÇÃO TÉCNICA**: SQL Editor');
  console.log('   - Acesse: https://supabase.com/dashboard');
  console.log('   - Vá em SQL Editor');
  console.log('   - Execute o script: alterar-senha-admin.sql');
  
  console.log('\n3️⃣  **CONFIGURAR SERVICE ROLE KEY**:');
  console.log('   - Acesse: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/settings/api');
  console.log('   - Copie a "service_role" key (começa com eyJ...)');
  console.log('   - Substitua no .env.local: SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui');
  console.log('   - Execute este script novamente');
  
  console.log('\n📖 Consulte o arquivo GUIA_ALTERAR_SENHA_ADMIN.md para instruções detalhadas');
  process.exit(0);
}

// Tentar com service role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function alterarSenhaAdmin() {
  console.log('\n🔑 Tentando alterar senha do admin com Service Role Key...');
  
  try {
    // Verificar se conseguimos listar usuários
    console.log('🔍 Verificando acesso administrativo...');
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao acessar usuários:', listError.message);
      console.log('\n💡 Possíveis soluções:');
      console.log('1. Verifique se a Service Role Key está correta');
      console.log('2. Confirme que a chave tem permissões administrativas');
      console.log('3. Use o método do Dashboard (mais confiável)');
      return false;
    }
    
    console.log(`✅ Acesso administrativo confirmado. ${users.users.length} usuários encontrados.`);
    
    // Procurar o usuário admin
    const adminUser = users.users.find(user => user.email === 'topplaytv7@gmail.com');
    
    if (!adminUser) {
      console.error('❌ Usuário topplaytv7@gmail.com não encontrado');
      console.log('\n👥 Usuários disponíveis:');
      users.users.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
      return false;
    }
    
    console.log('👤 Usuário admin encontrado:', adminUser.email);
    console.log('📅 Criado em:', new Date(adminUser.created_at).toLocaleString('pt-BR'));
    console.log('📧 Email confirmado:', adminUser.email_confirmed_at ? '✅ Sim' : '❌ Não');
    
    // Alterar a senha
    console.log('\n🔄 Alterando senha...');
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id,
      { password: 'admin123456' }
    );
    
    if (error) {
      console.error('❌ Erro ao alterar senha:', error.message);
      return false;
    }
    
    console.log('✅ Senha alterada com sucesso!');
    console.log('📧 Email:', data.user.email);
    console.log('🔑 Nova senha: admin123456');
    console.log('🆔 ID do usuário:', data.user.id);
    
    // Testar login
    console.log('\n🧪 Testando login com nova senha...');
    const supabaseClient = createClient(supabaseUrl, anonKey);
    
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'topplaytv7@gmail.com',
      password: 'admin123456'
    });
    
    if (loginError) {
      console.error('❌ Erro no teste de login:', loginError.message);
      console.log('⚠️  A senha foi alterada, mas o teste de login falhou.');
      console.log('💡 Tente fazer login manualmente na aplicação.');
    } else {
      console.log('✅ Teste de login realizado com sucesso!');
      console.log('👤 Usuário logado:', loginData.user.email);
      
      // Fazer logout para não interferir
      await supabaseClient.auth.signOut();
      console.log('🚪 Logout realizado');
    }
    
    console.log('\n🎉 Processo concluído!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse: http://localhost:9002/login');
    console.log('2. Use: topplaytv7@gmail.com / admin123456');
    console.log('3. Altere para uma senha mais segura após o login');
    
    return true;
    
  } catch (error) {
    console.error('💥 Erro geral:', error.message);
    return false;
  }
}

// Executar
alterarSenhaAdmin().then(sucesso => {
  if (!sucesso) {
    console.log('\n📖 Consulte o arquivo GUIA_ALTERAR_SENHA_ADMIN.md para métodos alternativos');
  }
});