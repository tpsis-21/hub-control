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

async function checkProfilesStructure() {
  console.log('🔍 Verificando estrutura da tabela profiles...');
  
  try {
    // Tentar fazer uma consulta simples para ver quais campos existem
    console.log('📋 Consultando dados da tabela para identificar colunas...');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao consultar tabela:', error.message);
      
      // Se a tabela não existir, mostrar como criar
      if (error.message.includes('relation "profiles" does not exist')) {
        console.log('\n💡 A tabela profiles não existe. Você precisa criá-la primeiro.');
        console.log('Execute este SQL no Supabase SQL Editor:');
        console.log(`
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  avatar_url text,
  phone text,
  company text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_key UNIQUE (email)
);`);
      }
      return;
    }
    
    console.log('\n📊 Estrutura identificada:');
    if (profiles && profiles.length > 0) {
      const firstRecord = profiles[0];
      const columns = Object.keys(firstRecord);
      
      console.log('Colunas encontradas:');
      columns.forEach(col => {
        console.log(`  - ${col}: ${typeof firstRecord[col]} (valor: ${firstRecord[col]})`);
      });
      
      // Verificar colunas importantes
      const hasRoleColumn = columns.includes('role');
      const hasIsApprovedColumn = columns.includes('is_approved');
      const hasEmailColumn = columns.includes('email');
      
      console.log('\n✅ Verificação de colunas importantes:');
      console.log(`  - role: ${hasRoleColumn ? '✅' : '❌'}`);
      console.log(`  - is_approved: ${hasIsApprovedColumn ? '✅' : '❌'}`);
      console.log(`  - email: ${hasEmailColumn ? '✅' : '❌'}`);
      
      if (!hasRoleColumn) {
        console.log('\n💡 Coluna "role" não encontrada. Execute este SQL:');
        console.log('ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT \'user\' CHECK (role IN (\'admin\', \'user\'));');
      }
      
      if (!hasIsApprovedColumn) {
        console.log('\n💡 Coluna "is_approved" não encontrada. Execute este SQL:');
        console.log('ALTER TABLE profiles ADD COLUMN is_approved boolean NOT NULL DEFAULT false;');
      }
      
      if (!hasEmailColumn) {
        console.log('\n💡 Coluna "email" não encontrada. Execute este SQL:');
        console.log('ALTER TABLE profiles ADD COLUMN email text NOT NULL;');
      }
      
    } else {
      console.log('\n📋 Tabela existe mas está vazia. Tentando consultar estrutura via RPC...');
      
      // Tentar uma inserção de teste para ver quais campos são aceitos
      const testData = {
        id: '00000000-0000-0000-0000-000000000000', // UUID de teste
        email: 'test@test.com',
        role: 'user'
      };
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(testData);
      
      if (insertError) {
        console.log('\n📋 Analisando erro de inserção para identificar estrutura:');
        console.log('Erro:', insertError.message);
        
        if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
          const missingColumn = insertError.message.match(/column "([^"]+)" of relation "profiles" does not exist/);
          if (missingColumn) {
            console.log(`❌ Coluna "${missingColumn[1]}" não existe na tabela.`);
          }
        }
      } else {
        console.log('✅ Inserção de teste bem-sucedida. Removendo registro de teste...');
        await supabase
          .from('profiles')
          .delete()
          .eq('id', testData.id);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

// Executar script
if (require.main === module) {
  checkProfilesStructure()
    .then(() => {
      console.log('\n✅ Verificação concluída');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { checkProfilesStructure };