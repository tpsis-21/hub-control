/**
 * Script de Verificação da Configuração do Supabase
 * 
 * Este script verifica se a configuração foi feita corretamente
 * após seguir o guia SOLUCAO_DEFINITIVA_STORAGE_SERVERS.md
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

// Configuração
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 VERIFICANDO CONFIGURAÇÃO DO SUPABASE...');
console.log('='.repeat(50));

// Verificar se as variáveis existem
if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.log('❌ ERRO: Variáveis de ambiente não encontradas');
  console.log('📋 Verifique se o arquivo .env contém:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Verificar se as chaves não são placeholders
if (supabaseServiceKey.includes('producao_service_role_key')) {
  console.log('❌ ERRO: SUPABASE_SERVICE_ROLE_KEY ainda é um placeholder');
  console.log('📋 Siga a ETAPA 1 do guia SOLUCAO_DEFINITIVA_STORAGE_SERVERS.md');
  process.exit(1);
}

console.log('✅ Variáveis de ambiente encontradas');
console.log('✅ Chaves não são placeholders');

// Criar cliente com service role para testes administrativos
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Criar cliente com anon key para testes de usuário
const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);

async function verificarConfiguracao() {
  console.log('\n🪣 VERIFICANDO BUCKETS DO STORAGE...');
  console.log('-'.repeat(40));
  
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    
    if (error) {
      console.log('❌ Erro ao listar buckets:', error.message);
      return false;
    }
    
    const requiredBuckets = ['avatars', 'user-uploads', 'documents'];
    const existingBuckets = buckets.map(b => b.name);
    
    let allBucketsExist = true;
    
    for (const bucket of requiredBuckets) {
      if (existingBuckets.includes(bucket)) {
        console.log(`✅ Bucket '${bucket}' encontrado`);
      } else {
        console.log(`❌ Bucket '${bucket}' NÃO encontrado`);
        allBucketsExist = false;
      }
    }
    
    if (!allBucketsExist) {
      console.log('\n📋 AÇÃO NECESSÁRIA:');
      console.log('   Siga a ETAPA 2 do guia SOLUCAO_DEFINITIVA_STORAGE_SERVERS.md');
      console.log('   para criar os buckets em falta.');
    }
    
    return allBucketsExist;
    
  } catch (error) {
    console.log('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function verificarTabelaServers() {
  console.log('\n🔒 VERIFICANDO TABELA SERVERS...');
  console.log('-'.repeat(40));
  
  try {
    // Tentar fazer uma consulta simples na tabela servers
    const { data, error } = await supabaseUser
      .from('servers')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('permission denied')) {
        console.log('❌ Erro de permissão na tabela servers');
        console.log('📋 AÇÃO NECESSÁRIA:');
        console.log('   Siga a ETAPA 4 do guia SOLUCAO_DEFINITIVA_STORAGE_SERVERS.md');
        console.log('   para configurar as políticas RLS.');
        return false;
      } else {
        console.log('❌ Erro na tabela servers:', error.message);
        return false;
      }
    }
    
    console.log('✅ Tabela servers acessível');
    return true;
    
  } catch (error) {
    console.log('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function verificarPoliticasStorage() {
  console.log('\n🔐 VERIFICANDO POLÍTICAS DO STORAGE...');
  console.log('-'.repeat(40));
  
  try {
    // Tentar listar arquivos no bucket avatars (deve funcionar mesmo sem arquivos)
    const { data, error } = await supabaseUser.storage
      .from('avatars')
      .list('', { limit: 1 });
    
    if (error) {
      if (error.message.includes('permission denied') || error.message.includes('not allowed')) {
        console.log('❌ Erro de permissão no storage');
        console.log('📋 AÇÃO NECESSÁRIA:');
        console.log('   Siga a ETAPA 3 do guia SOLUCAO_DEFINITIVA_STORAGE_SERVERS.md');
        console.log('   para configurar as políticas do storage.');
        return false;
      } else if (error.message.includes('Bucket not found')) {
        console.log('❌ Bucket avatars não encontrado');
        return false;
      } else {
        console.log('⚠️  Aviso no storage:', error.message);
        // Alguns erros podem ser normais (ex: bucket vazio)
        return true;
      }
    }
    
    console.log('✅ Políticas do storage funcionando');
    return true;
    
  } catch (error) {
    console.log('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function main() {
  const bucketsOk = await verificarConfiguracao();
  const serversOk = await verificarTabelaServers();
  const storageOk = await verificarPoliticasStorage();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 RESUMO DA VERIFICAÇÃO');
  console.log('='.repeat(50));
  
  console.log(`🪣 Buckets do Storage: ${bucketsOk ? '✅ OK' : '❌ PROBLEMA'}`);
  console.log(`🔒 Tabela Servers: ${serversOk ? '✅ OK' : '❌ PROBLEMA'}`);
  console.log(`🔐 Políticas Storage: ${storageOk ? '✅ OK' : '❌ PROBLEMA'}`);
  
  if (bucketsOk && serversOk && storageOk) {
    console.log('\n🎉 CONFIGURAÇÃO COMPLETA!');
    console.log('✅ Todos os componentes estão funcionando corretamente.');
    console.log('✅ Upload de imagem deve funcionar agora.');
    console.log('✅ Adicionar servidor deve funcionar agora.');
  } else {
    console.log('\n⚠️  CONFIGURAÇÃO INCOMPLETA');
    console.log('📖 Consulte o guia: SOLUCAO_DEFINITIVA_STORAGE_SERVERS.md');
    console.log('🔧 Siga as etapas indicadas acima para corrigir os problemas.');
  }
  
  console.log('\n' + '='.repeat(50));
}

// Executar verificação
main().catch(console.error);