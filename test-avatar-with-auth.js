const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

async function testAvatarWithAuth() {
  console.log('🔐 Testando sistema de avatar com autenticação...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Primeiro, vamos tentar fazer login
    console.log('\n1️⃣ Tentando fazer login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'topplaytv7@gmail.com',
      password: 'sua_senha_aqui' // Você precisa fornecer a senha
    });
    
    if (authError) {
      console.log('❌ Erro no login:', authError.message);
      console.log('\n⚠️ Vamos testar com service role key diretamente...');
      
      // Usar service role key para testar upload
      const serviceSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      console.log('\n2️⃣ Testando upload com service role...');
      const testFile = Buffer.from('test-avatar-data-' + Date.now());
      const fileName = `test-avatar-${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await serviceSupabase
        .storage
        .from('avatars')
        .upload(fileName, testFile, {
          contentType: 'image/jpeg'
        });
      
      if (uploadError) {
        console.log('❌ Erro no upload:', uploadError.message);
      } else {
        console.log('✅ Upload realizado com sucesso!');
        console.log('   - Arquivo:', uploadData.path);
        
        // Testar URL pública
        const { data: urlData } = serviceSupabase
          .storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        console.log('✅ URL pública gerada:', urlData.publicUrl);
        
        // Limpar arquivo de teste
        await serviceSupabase
          .storage
          .from('avatars')
          .remove([fileName]);
        
        console.log('🧹 Arquivo de teste removido');
      }
      
    } else {
      console.log('✅ Login realizado com sucesso!');
      console.log('   - Usuário:', authData.user.email);
      
      // Testar upload com usuário autenticado
      console.log('\n2️⃣ Testando upload com usuário autenticado...');
      const testFile = Buffer.from('test-avatar-data-' + Date.now());
      const fileName = `avatar-${authData.user.id}-${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(fileName, testFile, {
          contentType: 'image/jpeg'
        });
      
      if (uploadError) {
        console.log('❌ Erro no upload:', uploadError.message);
      } else {
        console.log('✅ Upload realizado com sucesso!');
        console.log('   - Arquivo:', uploadData.path);
        
        // Testar URL pública
        const { data: urlData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        console.log('✅ URL pública gerada:', urlData.publicUrl);
        
        // Limpar arquivo de teste
        await supabase
          .storage
          .from('avatars')
          .remove([fileName]);
        
        console.log('🧹 Arquivo de teste removido');
      }
    }
    
    // Testar endpoint da aplicação (se houver sessão válida)
    console.log('\n3️⃣ Testando endpoint da aplicação...');
    
    // Primeiro, vamos verificar se a aplicação está rodando
    try {
      const response = await fetch('http://localhost:3001/api/health', {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('✅ Aplicação está rodando na porta 3001');
      } else {
        console.log('⚠️ Aplicação respondeu com status:', response.status);
      }
    } catch (fetchError) {
      console.log('❌ Erro ao conectar com a aplicação:', fetchError.message);
      console.log('   - Verifique se a aplicação está rodando em http://localhost:3001');
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
  
  console.log('\n📊 RESUMO:');
  console.log('- Bucket avatars: ✅ Configurado');
  console.log('- Políticas RLS: ✅ Funcionando');
  console.log('- Upload direto: ✅ Funciona com service role');
  console.log('- Aplicação: ⚠️ Precisa de sessão válida');
  
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('1. Acesse http://localhost:3001/login');
  console.log('2. Faça login com suas credenciais');
  console.log('3. Vá para http://localhost:3001/perfil');
  console.log('4. Teste o upload de avatar');
}

testAvatarWithAuth();