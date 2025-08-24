// Script para testar a tabela audit_logs no Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testAuditLogsTable() {
  console.log('🔍 Testando conectividade com tabela audit_logs...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não encontradas');
    console.log('SUPABASE_URL:', !!supabaseUrl);
    console.log('SUPABASE_KEY:', !!supabaseKey);
    return;
  }
  
  console.log('🔑 Usando chave:', supabaseKey.includes('service_role') ? 'Service Role' : 'Anon Key');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('\n1. Testando conexão básica...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('audit_logs')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('❌ Erro de conexão:', connectionError.message);
      console.error('Detalhes:', connectionError);
      
      // Verificar se a tabela existe tentando uma query simples
      console.log('\n2. Verificando se a tabela audit_logs existe...');
      try {
        const { data: testQuery, error: testError } = await supabase
          .from('audit_logs')
          .select('id')
          .limit(1);
        
        if (testError) {
          console.error('❌ Tabela audit_logs não existe ou não é acessível:', testError.message);
          console.error('Código do erro:', testError.code);
        } else {
          console.log('✅ Tabela audit_logs existe e é acessível');
        }
      } catch (err) {
        console.error('❌ Erro ao verificar tabela:', err.message);
      }
      
      return;
    }
    
    console.log('✅ Conexão com audit_logs bem-sucedida');
    console.log('📊 Total de registros:', connectionTest);
    
    console.log('\n2. Testando estrutura da tabela...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Erro ao buscar dados de exemplo:', sampleError.message);
    } else {
      console.log('✅ Estrutura da tabela OK');
      if (sampleData && sampleData.length > 0) {
        console.log('📝 Exemplo de registro:', JSON.stringify(sampleData[0], null, 2));
      } else {
        console.log('📝 Tabela vazia (sem registros)');
      }
    }
    
    console.log('\n3. Testando inserção de log de teste...');
    const { data: insertData, error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'TEST',
        table_name: 'test',
        description: 'Teste de conectividade',
        severity: 'INFO',
        metadata: { test: true, timestamp: new Date().toISOString() }
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir log de teste:', insertError.message);
      console.error('Detalhes:', insertError);
    } else {
      console.log('✅ Inserção de log de teste bem-sucedida');
      console.log('📝 Log inserido:', insertData);
      
      // Limpar o log de teste
      const { error: deleteError } = await supabase
        .from('audit_logs')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.warn('⚠️ Não foi possível deletar o log de teste:', deleteError.message);
      } else {
        console.log('🧹 Log de teste removido com sucesso');
      }
    }
    
    console.log('\n4. Testando query similar ao hook useRecentActivities...');
    const { data: recentLogs, error: recentError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        created_at,
        action,
        table_name,
        user_email,
        description,
        severity,
        metadata
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('❌ Erro ao buscar logs recentes:', recentError.message);
      console.error('Detalhes:', recentError);
    } else {
      console.log('✅ Busca de logs recentes bem-sucedida');
      console.log(`📊 ${recentLogs.length} logs encontrados`);
      if (recentLogs.length > 0) {
        console.log('📝 Primeiro log:', JSON.stringify(recentLogs[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
testAuditLogsTable()
  .then(() => {
    console.log('\n🏁 Teste concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });