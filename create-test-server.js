// Script para criar um servidor de teste para o usuário
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestServer() {
  console.log('🚀 Criando servidor de teste...');
  
  const testUserId = 'f3caf91d-cbd7-49e4-8ec2-b22c1b52d11a';
  
  const serverData = {
    name: 'Servidor de Teste',
    url: 'https://test-server.example.com',
    api_key: 'test-api-key-123',
    status: 'Online',
    integration_type: 'natv',
    test_automation: true,
    renewal_automation: false,
    payment_gateway: false,
    send_expiration_reminder: true,
    send_usage_instructions: true,
    test_config: null,
    user_id: testUserId
  };
  
  try {
    console.log('📝 Inserindo servidor na tabela...');
    const { data: inserted, error } = await supabase
      .from('servers')
      .insert([serverData])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar servidor:', error);
      return;
    }
    
    console.log('✅ Servidor criado com sucesso!');
    console.log('📋 Dados do servidor:');
    console.log(`  ID: ${inserted.id}`);
    console.log(`  Nome: ${inserted.name}`);
    console.log(`  Status: ${inserted.status}`);
    console.log(`  Tipo: ${inserted.integration_type}`);
    console.log(`  Usuário: ${inserted.user_id}`);
    
    // Verificar se o servidor foi criado corretamente
    console.log('\n🔍 Verificando servidor criado...');
    const { data: verification, error: verifyError } = await supabase
      .from('servers')
      .select('*')
      .eq('user_id', testUserId);
    
    if (verifyError) {
      console.error('❌ Erro na verificação:', verifyError);
      return;
    }
    
    console.log('✅ Verificação concluída!');
    console.log(`📊 Total de servidores do usuário: ${verification?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

createTestServer().then(() => {
  console.log('\n🏁 Criação de servidor de teste concluída!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});