require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura da tabela profiles...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Tentar fazer uma consulta simples para ver quais campos existem
    console.log('📋 Consultando dados da tabela para identificar colunas...');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao consultar tabela:', error.message);
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
      
      // Verificar se a coluna role existe
      const hasRoleColumn = columns.includes('role');
      
      if (!hasRoleColumn) {
        console.log('\n❌ Coluna "role" não encontrada!');
        console.log('\n💡 Você precisa executar este SQL no Supabase SQL Editor:');
        console.log(`\n-- Adicionar coluna role\nALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));\n\n-- Atualizar o admin principal\nUPDATE profiles SET role = 'admin' WHERE id = '2f67bed8-9448-446f-8f38-9306f773620d';\n\n-- Atualizar todos os outros usuários para 'user' se role for NULL\nUPDATE profiles SET role = 'user' WHERE role IS NULL;`);
      } else {
        console.log('\n✅ Coluna "role" encontrada!');
        
        // Verificar o valor do role para o admin
        const adminRecord = profiles.find(p => p.id === '2f67bed8-9448-446f-8f38-9306f773620d');
        if (adminRecord) {
          console.log(`Admin role atual: ${adminRecord.role}`);
          if (adminRecord.role !== 'admin') {
            console.log('\n⚠️ Admin não tem role "admin"!');
            console.log('SQL para corrigir:');
            console.log(`UPDATE profiles SET role = 'admin' WHERE id = '2f67bed8-9448-446f-8f38-9306f773620d';`);
          }
        }
      }
    } else {
      console.log('❌ Nenhum registro encontrado na tabela');
      
      // Tentar uma consulta vazia para ver a estrutura
      console.log('\n🔍 Tentando consulta vazia para ver estrutura...');
      const { data: emptyData, error: emptyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000'); // ID que não existe
      
      if (emptyError) {
        console.log('Erro na consulta vazia:', emptyError.message);
      } else {
        console.log('Consulta vazia bem-sucedida, mas sem dados para analisar estrutura');
      }
    }
    
    // Tentar consultar todos os registros
    console.log('\n📊 Todos os registros da tabela:');
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('*');
    
    if (allError) {
      console.error('❌ Erro ao consultar todos os registros:', allError.message);
    } else {
      console.log(`Total de registros: ${allProfiles?.length || 0}`);
      if (allProfiles && allProfiles.length > 0) {
        allProfiles.forEach((profile, index) => {
          console.log(`\nRegistro ${index + 1}:`);
          Object.keys(profile).forEach(key => {
            console.log(`  ${key}: ${profile[key]}`);
          });
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

checkTableStructure();