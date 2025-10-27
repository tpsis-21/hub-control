// Script para verificar configuração do Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verificarSupabase() {
  console.log('🔍 VERIFICANDO CONFIGURAÇÃO DO SUPABASE\n');
  
  // Verificar variáveis de ambiente
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 VARIÁVEIS DE AMBIENTE:');
  console.log(`URL: ${url ? '✅ Configurada' : '❌ Não encontrada'}`);
  console.log(`ANON_KEY: ${anonKey ? '✅ Configurada' : '❌ Não encontrada'}`);
  console.log(`SERVICE_KEY: ${serviceKey ? '✅ Configurada' : '❌ Não encontrada'}`);
  console.log('');
  
  if (!url || !anonKey) {
    console.log('❌ ERRO: Variáveis de ambiente não configuradas!');
    return;
  }
  
  // Criar cliente Supabase
  const supabase = createClient(url, anonKey);
  
  try {
    // Testar conexão
    console.log('🔗 TESTANDO CONEXÃO...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log(`❌ Erro de conexão: ${error.message}`);
    } else {
      console.log('✅ Conexão com banco estabelecida');
    }
    
    // Verificar buckets do Storage
    console.log('\n📦 VERIFICANDO BUCKETS DO STORAGE...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log(`❌ Erro ao listar buckets: ${bucketsError.message}`);
    } else {
      console.log(`✅ Encontrados ${buckets.length} buckets:`);
      
      const requiredBuckets = ['avatars', 'user-uploads', 'documents'];
      const existingBuckets = buckets.map(b => b.name);
      
      requiredBuckets.forEach(bucket => {
        if (existingBuckets.includes(bucket)) {
          console.log(`  ✅ ${bucket}`);
        } else {
          console.log(`  ❌ ${bucket} (não encontrado)`);
        }
      });
    }
    
    // Verificar políticas RLS da tabela servers
    console.log('\n🔒 VERIFICANDO POLÍTICAS RLS DA TABELA SERVERS...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'servers' })
      .catch(() => {
        // Se a função não existir, usar consulta direta
        return supabase
          .from('pg_policies')
          .select('policyname, cmd, qual')
          .eq('tablename', 'servers');
      });
    
    if (policiesError) {
      console.log(`❌ Erro ao verificar políticas: ${policiesError.message}`);
    } else if (policies && policies.length > 0) {
      console.log('✅ Políticas RLS encontradas:');
      policies.forEach(policy => {
        const status = policy.qual === null && policy.cmd === 'INSERT' ? '⚠️' : '✅';
        console.log(`  ${status} ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('❌ Nenhuma política RLS encontrada para a tabela servers');
    }
    
  } catch (error) {
    console.log(`❌ Erro geral: ${error.message}`);
  }
  
  console.log('\n🎯 RESUMO:');
  console.log('1. Se buckets estão faltando: crie-os manualmente no painel do Supabase');
  console.log('2. Se política INSERT está com problema: execute a migração SQL');
  console.log('3. Acesse: https://supabase.com/dashboard');
}

verificarSupabase().catch(console.error);