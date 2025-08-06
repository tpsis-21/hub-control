#!/usr/bin/env node

/**
 * Script para aplicar a migração de segurança corrigida
 * Este script executa a migração 20241223000004_security_implementation_fixed.sql
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
  console.error('❌ Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  console.log('\n📝 Configure as variáveis no arquivo .env.local:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applySQLFile(filePath) {
  try {
    console.log(`📄 Lendo arquivo: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log('🚀 Executando migração de segurança...');
    
    // Dividir o SQL em comandos individuais
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log(`📋 Total de comandos a executar: ${commands.length}`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const commandPreview = command.substring(0, 80).replace(/\n/g, ' ') + (command.length > 80 ? '...' : '');
      
      try {
        console.log(`⏳ [${i + 1}/${commands.length}] ${commandPreview}`);
        
        // Usar o cliente Supabase para executar SQL diretamente
        const { data, error } = await supabase.rpc('exec', {
          sql: command
        });
        
        if (error) {
          console.error(`❌ Erro: ${error.message}`);
          errors.push({ command: commandPreview, error: error.message });
          errorCount++;
        } else {
          console.log(`✅ Sucesso`);
          successCount++;
        }
        
        // Pequena pausa entre comandos
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (cmdError) {
        console.error(`❌ Erro de execução: ${cmdError.message}`);
        errors.push({ command: commandPreview, error: cmdError.message });
        errorCount++;
      }
    }
    
    console.log(`\n📊 Resultado da execução:`);
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n🔍 Detalhes dos erros:');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.command}`);
        console.log(`   Erro: ${err.error}\n`);
      });
    }
    
    if (errorCount === 0) {
      console.log('\n🎉 Migração de segurança aplicada com sucesso!');
    } else if (successCount > errorCount) {
      console.log('\n⚠️  Migração aplicada com alguns erros. A maioria dos comandos foi executada com sucesso.');
    } else {
      console.log('\n❌ Migração falhou. Muitos comandos apresentaram erros.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);
    throw error;
  }
}

async function checkSecurityHealth() {
  try {
    console.log('\n🔍 Verificando saúde da segurança...');
    const { data, error } = await supabase.rpc('security_health_check');
    
    if (error) {
      console.error('❌ Erro ao verificar saúde da segurança:', error.message);
      return;
    }
    
    console.log('\n📊 Status de Segurança:');
    console.log(`🛡️  Cobertura RLS: ${data.rls_coverage.toFixed(1)}%`);
    console.log(`🔐 Cobertura MFA (Admins): ${data.mfa_admin_coverage.toFixed(1)}%`);
    console.log(`📋 Tabelas com RLS: ${data.tables_with_rls}/${data.total_tables}`);
    console.log(`👥 Admins com MFA: ${data.admins_with_mfa}/${data.total_admins}`);
    
    if (data.rls_coverage >= 95) {
      console.log('\n🎉 Excelente! Cobertura RLS está ótima.');
    } else if (data.rls_coverage >= 80) {
      console.log('\n⚠️  Boa cobertura RLS, mas pode ser melhorada.');
    } else {
      console.log('\n❌ Cobertura RLS baixa. Verifique as políticas.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar saúde da segurança:', error.message);
  }
}

async function main() {
  try {
    console.log('🔒 Iniciando aplicação da migração de segurança...');
    console.log('📍 Projeto:', SUPABASE_URL);
    
    const migrationFile = path.join(__dirname, 'supabase', 'migrations', '20241223000004_security_implementation_fixed.sql');
    
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ Arquivo de migração não encontrado: ${migrationFile}`);
      process.exit(1);
    }
    
    await applySQLFile(migrationFile);
    
    // Aguardar um pouco antes de verificar
    console.log('\n⏳ Aguardando 3 segundos antes da verificação...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await checkSecurityHealth();
    
    console.log('\n🎯 Próximos passos:');
    console.log('1. Configure MFA para usuários administradores');
    console.log('2. Monitore alertas de segurança regularmente');
    console.log('3. Execute auditorias mensais de segurança');
    console.log('4. Verifique logs de auditoria periodicamente');
    
    console.log('\n✨ Migração de segurança concluída!');
    
  } catch (error) {
    console.error('\n💥 Falha na aplicação da migração:', error.message);
    console.log('\n🔧 Soluções possíveis:');
    console.log('1. Verifique se as credenciais do Supabase estão corretas');
    console.log('2. Confirme se você tem permissões de administrador');
    console.log('3. Execute a migração manualmente no Supabase Dashboard');
    console.log('4. Verifique se não há conflitos com migrações anteriores');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { applySQLFile, checkSecurityHealth };