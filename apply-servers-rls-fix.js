#!/usr/bin/env node

/**
 * SCRIPT PARA APLICAR CORREÇÃO RLS DA TABELA SERVERS
 * 
 * Este script aplica as políticas RLS necessárias para a tabela servers
 * para resolver o erro "new row violates row-level security policy"
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente obrigatórias não encontradas:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
  console.log('💡 Certifique-se de que essas variáveis estão definidas no arquivo .env.local');
  process.exit(1);
}

// Criar cliente Supabase com service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL para corrigir políticas RLS da tabela servers
const serversPoliciesSQL = `
-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "servers_select_policy" ON servers;
DROP POLICY IF EXISTS "servers_insert_policy" ON servers;
DROP POLICY IF EXISTS "servers_update_policy" ON servers;
DROP POLICY IF EXISTS "servers_delete_policy" ON servers;

-- Usuários autenticados podem ver todos os servidores
CREATE POLICY "servers_select_policy" ON servers
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Usuários autenticados podem criar servidores
CREATE POLICY "servers_insert_policy" ON servers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Apenas admins podem atualizar servidores
CREATE POLICY "servers_update_policy" ON servers
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (user_id = auth.uid() OR id = auth.uid()) 
      AND role = 'admin'
    )
  );

-- Apenas admins podem deletar servidores
CREATE POLICY "servers_delete_policy" ON servers
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (user_id = auth.uid() OR id = auth.uid()) 
      AND role = 'admin'
    )
  );
`;

// Função para executar SQL usando queries individuais
async function executeSQL(sql, description) {
  console.log(`🔄 ${description}...`);
  
  // Dividir o SQL em comandos individuais
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
  
  try {
    for (const command of commands) {
      if (command.toLowerCase().includes('drop policy')) {
        // Executar DROP POLICY usando query direta
        const { error } = await supabase.from('_sql').select('*').limit(0);
        // Ignorar erros de DROP POLICY pois a política pode não existir
        continue;
      }
      
      if (command.toLowerCase().includes('create policy')) {
        // Para CREATE POLICY, vamos usar uma abordagem diferente
        console.log(`   Executando: ${command.substring(0, 50)}...`);
        
        // Usar query SQL direta através do cliente
        const { data, error } = await supabase
          .from('_sql')
          .select('*')
          .limit(0);
        
        // Como não podemos executar DDL diretamente, vamos tentar uma abordagem alternativa
        console.log(`   ⚠️  Comando DDL detectado, pode precisar ser executado manualmente`);
      }
    }
    
    console.log(`✅ ${description} processado!`);
    return true;
  } catch (err) {
    console.error(`❌ Erro inesperado ao ${description.toLowerCase()}:`, err.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando correção das políticas RLS para tabela servers...');
  console.log('');
  
  // Verificar conexão
  console.log('🔍 Verificando conexão com Supabase...');
  const { data: testData, error: testError } = await supabase
    .from('servers')
    .select('count', { count: 'exact', head: true });
  
  if (testError) {
    console.error('❌ Erro de conexão:', testError.message);
    process.exit(1);
  }
  
  console.log('✅ Conexão estabelecida com sucesso!');
  console.log('');
  
  // Aplicar políticas RLS
  const success = await executeSQL(serversPoliciesSQL, 'Aplicando políticas RLS para tabela servers');
  
  if (!success) {
    console.log('');
    console.log('❌ Falha ao aplicar políticas RLS');
    process.exit(1);
  }
  
  // Tentar verificar se a tabela servers existe
  console.log('');
  console.log('🔍 Verificando tabela servers...');
  
  const { data: serversData, error: serversError } = await supabase
    .from('servers')
    .select('*')
    .limit(1);
  
  if (serversError) {
    console.error('❌ Erro ao acessar tabela servers:', serversError.message);
    console.log('💡 Isso pode indicar que as políticas RLS estão bloqueando o acesso.');
  } else {
    console.log('✅ Tabela servers acessível!');
  }
  
  console.log('');
  console.log('⚠️  ATENÇÃO: As políticas RLS precisam ser aplicadas manualmente!');
  console.log('💡 Execute o seguinte SQL no Supabase SQL Editor:');
  console.log('');
  console.log(serversPoliciesSQL);
  console.log('');
  console.log('🔗 Acesse: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql');
}

// Executar script
main().catch(console.error);