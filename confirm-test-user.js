/**
 * Script para confirmar o usuário de teste e debugar autenticação
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function confirmAndTestUser() {
  console.log('🔧 CONFIRMANDO USUÁRIO DE TESTE');
  console.log('================================');
  
  // Configuração do Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Configurações do Supabase não encontradas!');
    return;
  }
  
  // Cliente admin para confirmar usuário
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Cliente normal para teste
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // 1. Confirmar o usuário de teste
    console.log('📧 Confirmando usuário test@example.com...');
    
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError.message);
      return;
    }
    
    const testUser = users.users.find(user => user.email === 'test@example.com');
    
    if (!testUser) {
      console.log('👤 Usuário não encontrado, criando...');
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'test@example.com',
        password: 'test123456',
        email_confirm: true // Confirmar automaticamente
      });
      
      if (createError) {
        console.error('❌ Erro ao criar usuário:', createError.message);
        return;
      }
      
      console.log('✅ Usuário criado e confirmado!');
      console.log('- ID:', newUser.user.id);
      console.log('- Email:', newUser.user.email);
      
    } else {
      console.log('👤 Usuário encontrado:', testUser.id);
      
      if (!testUser.email_confirmed_at) {
        console.log('📧 Confirmando email do usuário...');
        
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          testUser.id,
          { email_confirm: true }
        );
        
        if (updateError) {
          console.error('❌ Erro ao confirmar usuário:', updateError.message);
          return;
        }
        
        console.log('✅ Usuário confirmado!');
      } else {
        console.log('✅ Usuário já estava confirmado!');
      }
    }
    
    // 2. Aguardar um pouco para propagação
    console.log('\n⏳ Aguardando propagação...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Tentar fazer login
    console.log('\n🔐 Tentando fazer login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123456'
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('- User ID:', authData.user?.id);
    console.log('- Email:', authData.user?.email);
    
    // 4. Testar o endpoint de login
    const session = authData.session;
    if (session) {
      console.log('\n🧪 Testando endpoint /api/auth/login...');
      
      const fetch = require('node-fetch');
      
      try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'test123456'
          })
        });
        
        const result = await response.text();
        console.log('- Status:', response.status);
        console.log('- Response:', result);
        
        if (response.status === 200) {
          console.log('\n✅ PROBLEMA RESOLVIDO! O endpoint de login está funcionando!');
        } else {
          console.log('\n❌ Ainda há problemas com o endpoint de login.');
        }
        
      } catch (fetchError) {
        console.error('❌ Erro na requisição HTTP:', fetchError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar o script
confirmAndTestUser().catch(console.error);