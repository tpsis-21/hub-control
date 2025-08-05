require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function addRoleColumn() {
  console.log('🔧 Configurando coluna role na tabela profiles...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    console.log('\n❌ IMPORTANTE: O Supabase não permite alterações de schema via cliente JavaScript.');
    console.log('\n💡 Você precisa executar este SQL manualmente no Supabase SQL Editor:');
    console.log('\n🔗 Acesse: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql/new');
    console.log('\n📝 Cole e execute este código SQL:');
    console.log('\n' + '='.repeat(60));
    console.log(`-- Adicionar coluna role à tabela profiles
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- Definir o admin principal
UPDATE profiles SET role = 'admin' WHERE id = '2f67bed8-9448-446f-8f38-9306f773620d';

-- Garantir que outros usuários tenham role 'user'
UPDATE profiles SET role = 'user' WHERE role IS NULL;`);
    console.log('='.repeat(60));
    
    console.log('\n✅ Após executar o SQL acima, o erro de "usuário não autenticado" será resolvido.');
    console.log('\n🔍 Verificando estado atual da tabela...');
    
    // Verificar dados atuais
    const { data: profiles, error: checkError } = await supabase
      .from('profiles')
      .select('*');
    
    if (checkError) {
      console.error('❌ Erro ao verificar tabela:', checkError.message);
    } else {
      console.log(`\n📊 Registros atuais na tabela profiles: ${profiles?.length || 0}`);
      if (profiles && profiles.length > 0) {
        profiles.forEach(profile => {
          const hasRole = Object.keys(profile).includes('role');
          console.log(`  - ${profile.full_name || 'Sem nome'} (${profile.id})`);
          console.log(`    Role: ${hasRole ? profile.role : 'COLUNA NÃO EXISTE'}`);
        });
      }
    }
    
    console.log('\n🎯 Próximos passos:');
    console.log('1. Execute o SQL acima no Supabase SQL Editor');
    console.log('2. Tente editar um plano novamente');
    console.log('3. O erro "usuário não autenticado" deve ser resolvido');
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

addRoleColumn();