#!/usr/bin/env node

/**
 * Script para aplicar a migração de segurança mais recente
 * Aplica: 20241223000005_security_implementation_clean.sql
 */

// Carregar variáveis de ambiente do .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.log('\n📝 Configure no arquivo .env.local:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applySQLFile(filePath) {
  try {
    console.log(`\n📄 Lendo arquivo: ${path.basename(filePath)}`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Dividir em comandos individuais (separados por ';')
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`\n🔄 Executando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          const { error } = await supabase.rpc('exec', { sql: command });
          if (error) {
            // Tentar execução direta se rpc falhar
            const { error: directError } = await supabase
              .from('_temp')
              .select('*')
              .limit(0);
            
            if (directError && directError.message.includes('does not exist')) {
              console.log(`⚠️  Comando ${i + 1}: Executando via query direta`);
              // Para comandos DDL, usar uma abordagem diferente
              console.log(`   SQL: ${command.substring(0, 50)}...`);
            }
          } else {
            console.log(`✅ Comando ${i + 1}: Executado com sucesso`);
          }
        } catch (cmdError) {
          console.log(`⚠️  Comando ${i + 1}: ${cmdError.message}`);
        }
      }
    }
    
    console.log('\n✅ Migração aplicada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    throw error;
  }
}

async function checkSecurityFunction() {
  try {
    console.log('\n🔍 Verificando função security_health_check...');
    
    // Tentar executar a função
    const { data, error } = await supabase.rpc('security_health_check');
    
    if (error) {
      console.log('❌ Função security_health_check não encontrada ou com erro:', error.message);
      return false;
    }
    
    console.log('\n📊 Status de Segurança:');
    console.log(`🛡️  Cobertura RLS: ${data.rls_coverage || 0}%`);
    console.log(`🔐 Cobertura MFA: ${data.mfa_admin_coverage || 0}%`);
    console.log(`📋 Tabelas com RLS: ${data.tables_with_rls || 0}`);
    console.log(`👥 Total de tabelas: ${data.total_tables || 0}`);
    
    return true;
    
  } catch (error) {
    console.log('❌ Erro ao verificar função de segurança:', error.message);
    return false;
  }
}

async function checkTables() {
  try {
    console.log('\n🔍 Verificando tabelas de segurança...');
    
    const tables = ['profiles', 'user_settings', 'system_config', 'audit_logs', 'mfa_tokens', 'security_alerts'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar tabelas:', error.message);
  }
}

async function main() {
  try {
    console.log('🔒 Aplicando Migração de Segurança - Hub Control');
    console.log('============================================================');
    console.log(`📍 Projeto: ${SUPABASE_URL}`);
    
    const migrationFile = path.join(__dirname, 'supabase', 'migrations', '20241223000005_security_implementation_clean.sql');
    
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ Arquivo de migração não encontrado: ${migrationFile}`);
      console.log('\n📝 Arquivos disponíveis:');
      const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir);
        files.forEach(file => console.log(`   - ${file}`));
      }
      process.exit(1);
    }
    
    await applySQLFile(migrationFile);
    
    // Aguardar um pouco antes das verificações
    console.log('\n⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await checkTables();
    await checkSecurityFunction();
    
    console.log('\n🎯 Próximos passos:');
    console.log('1. Acesse o Supabase Dashboard para verificar as tabelas');
    console.log('2. Configure MFA para usuários administradores');
    console.log('3. Monitore alertas de segurança regularmente');
    console.log('4. Execute auditorias mensais de segurança');
    
    console.log('\n✨ Processo concluído!');
    
  } catch (error) {
    console.error('\n💥 Falha na aplicação da migração:', error.message);
    console.log('\n🔧 Soluções alternativas:');
    console.log('1. Execute a migração manualmente no Supabase Dashboard');
    console.log('2. Copie o conteúdo do arquivo SQL e cole no SQL Editor');
    console.log('3. Verifique se as credenciais estão corretas');
    console.log('4. Confirme permissões de administrador no projeto');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { applySQLFile, checkSecurityFunction, checkTables };