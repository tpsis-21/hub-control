// Script para redefinir senha do admin
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function resetAdminPassword() {
  console.log('🔑 Redefinindo senha do admin...');
  
  try {
    // Buscar o usuário admin
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }
    
    const adminUser = users.users.find(user => user.email === 'topplaytv7@gmail.com');
    
    if (!adminUser) {
      console.error('❌ Usuário admin não encontrado');
      return;
    }
    
    console.log('👤 Usuário admin encontrado:', adminUser.email);
    
    // Redefinir senha
    const { data, error } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { password: 'admin123456' }
    );
    
    if (error) {
      console.error('❌ Erro ao redefinir senha:', error);
    } else {
      console.log('✅ Senha redefinida com sucesso!');
      console.log('📧 Email:', data.user.email);
      console.log('🔑 Nova senha: admin123456');
      
      // Testar login
      console.log('\n🔍 Testando login...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'topplaytv7@gmail.com',
        password: 'admin123456'
      });
      
      if (loginError) {
        console.error('❌ Erro no teste de login:', loginError.message);
      } else {
        console.log('✅ Login teste realizado com sucesso!');
        console.log('- Email:', loginData.user.email);
        console.log('- ID:', loginData.user.id);
        
        // Fazer logout para não interferir
        await supabase.auth.signOut();
        console.log('🚪 Logout realizado');
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

resetAdminPassword();