#!/usr/bin/env node

/**
 * SCRIPT PARA APLICAR POLÍTICAS RLS NO SUPABASE
 * 
 * Este script aplica todas as políticas de Row Level Security (RLS)
 * definidas no arquivo rls-policies.sql ao banco de dados Supabase.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Lê o arquivo SQL com as políticas RLS
 */
function readRLSPolicies() {
  const sqlFilePath = path.join(__dirname, 'src', 'lib', 'rls-policies.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ Arquivo não encontrado: ${sqlFilePath}`);
    process.exit(1);
  }
  
  return fs.readFileSync(sqlFilePath, 'utf8');
}

/**
 * Divide o SQL em comandos individuais
 */
function splitSQLCommands(sql) {
  // Remove comentários
  const cleanSQL = sql
    .replace(/--.*$/gm, '') // Remove comentários de linha
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários de bloco
    .trim();
  
  // Divide por ponto e vírgula, mas mantém comandos que podem ter ; internos
  const commands = [];
  let currentCommand = '';
  let inFunction = false;
  
  const lines = cleanSQL.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') continue;
    
    // Detectar início de função
    if (trimmedLine.includes('CREATE OR REPLACE FUNCTION') || 
        trimmedLine.includes('CREATE FUNCTION')) {
      inFunction = true;
    }
    
    currentCommand += line + '\n';
    
    // Detectar fim de comando
    if (trimmedLine.endsWith(';')) {
      if (inFunction && trimmedLine.includes('LANGUAGE')) {
        inFunction = false;
      }
      
      if (!inFunction) {
        commands.push(currentCommand.trim());
        currentCommand = '';
      }
    }
  }
  
  // Adicionar último comando se não terminar com ;
  if (currentCommand.trim()) {
    commands.push(currentCommand.trim());
  }
  
  return commands.filter(cmd => cmd.length > 0);
}

/**
 * Executa um comando SQL
 */
async function executeSQL(command, description = '') {
  try {
    console.log(`🔄 Executando: ${description || command.substring(0, 50)}...`);
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: command
    });
    
    if (error) {
      // Alguns erros são esperados (ex: política já existe)
      if (error.message.includes('already exists') || 
          error.message.includes('já existe')) {
        console.log(`⚠️  Aviso: ${description || 'Comando'} já existe, pulando...`);
        return true;
      }
      throw error;
    }
    
    console.log(`✅ Sucesso: ${description || 'Comando executado'}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao executar: ${description || 'comando'}`);
    console.error(`   Comando: ${command.substring(0, 100)}...`);
    console.error(`   Erro: ${error.message}`);
    return false;
  }
}

/**
 * Cria a função exec_sql se não existir
 */
async function createExecSQLFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  await executeSQL(functionSQL, 'Criando função exec_sql');
}

/**
 * Verifica se as tabelas existem
 */
async function checkTables() {
  const tables = [
    'profiles', 'clients', 'plans', 'plan_groups', 
    'transactions', 'settings', 'marketing_campaigns', 'marketing_leads'
  ];
  
  console.log('🔍 Verificando existência das tabelas...');
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`⚠️  Tabela '${table}' não encontrada ou inacessível`);
    } else {
      console.log(`✅ Tabela '${table}' encontrada`);
    }
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando aplicação das políticas RLS...');
  console.log('');
  
  try {
    // Verificar conexão
    console.log('🔗 Testando conexão com Supabase...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && !authError.message.includes('session')) {
      console.log('⚠️  Aviso: Não foi possível verificar autenticação, mas continuando...');
    } else {
      console.log('✅ Conexão com Supabase estabelecida');
    }
    
    // Verificar tabelas
    await checkTables();
    console.log('');
    
    // Criar função auxiliar
    await createExecSQLFunction();
    console.log('');
    
    // Ler políticas RLS
    console.log('📖 Lendo políticas RLS...');
    const rlsSQL = readRLSPolicies();
    
    // Dividir em comandos
    const commands = splitSQLCommands(rlsSQL);
    console.log(`📝 Encontrados ${commands.length} comandos para executar`);
    console.log('');
    
    // Executar comandos
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const commandType = command.split(' ')[0].toUpperCase();
      
      console.log(`[${i + 1}/${commands.length}] ${commandType}...`);
      
      const success = await executeSQL(command, `Comando ${i + 1}`);
      
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('');
    console.log('📊 Resumo da execução:');
    console.log(`   ✅ Sucessos: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📝 Total: ${commands.length}`);
    
    if (errorCount === 0) {
      console.log('');
      console.log('🎉 Todas as políticas RLS foram aplicadas com sucesso!');
      console.log('🔒 Seu banco de dados agora está protegido com Row Level Security.');
    } else {
      console.log('');
      console.log('⚠️  Algumas políticas falharam. Verifique os erros acima.');
      console.log('💡 Isso pode ser normal se algumas políticas já existiam.');
    }
    
  } catch (error) {
    console.error('❌ Erro fatal durante a execução:');
    console.error(error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };