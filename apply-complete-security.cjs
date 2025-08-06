const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyCompleteSecurity() {
  console.log('🔒 Iniciando implementação completa de segurança...');
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241223000006_complete_security_implementation.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Arquivo de migração carregado');
    
    // Dividir em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 ${commands.length} comandos SQL para executar`);
    
    // Executar comandos em lotes
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Pular comentários e comandos vazios
      if (command.startsWith('--') || command.trim() === '') {
        continue;
      }
      
      try {
        console.log(`⚡ Executando comando ${i + 1}/${commands.length}...`);
        
        // Executar comando SQL
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        });
        
        if (error) {
          console.warn(`⚠️  Aviso no comando ${i + 1}: ${error.message}`);
          // Não contar como erro se for sobre objetos já existentes
          if (!error.message.includes('already exists') && 
              !error.message.includes('does not exist') &&
              !error.message.includes('duplicate key')) {
            errorCount++;
          }
        } else {
          successCount++;
        }
        
        // Pequena pausa entre comandos
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`❌ Erro no comando ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n✅ Migração concluída:`);
    console.log(`   - Comandos executados com sucesso: ${successCount}`);
    console.log(`   - Comandos com erro: ${errorCount}`);
    
    // Verificar implementações
    await verifySecurityImplementations();
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    process.exit(1);
  }
}

async function verifySecurityImplementations() {
  console.log('\n🔍 Verificando implementações de segurança...');
  
  try {
    // 1. Verificar função de health check atualizada
    console.log('\n1️⃣ Testando função security_health_check...');
    const { data: healthData, error: healthError } = await supabase.rpc('security_health_check');
    
    if (healthError) {
      console.error('❌ Erro na função security_health_check:', healthError.message);
    } else {
      console.log('✅ Função security_health_check funcionando');
      console.log(`   - Cobertura RLS: ${healthData.rls_coverage?.toFixed(2)}%`);
      console.log(`   - Cobertura MFA Admin: ${healthData.mfa_admin_coverage?.toFixed(2)}%`);
      console.log(`   - Tabelas com RLS: ${healthData.tables_with_rls}/${healthData.total_tables}`);
      console.log(`   - Admins com MFA: ${healthData.admins_with_mfa}/${healthData.total_admins}`);
      console.log(`   - Alertas ativos: ${healthData.active_security_alerts}`);
      console.log(`   - Atividades suspeitas (24h): ${healthData.recent_suspicious_activities}`);
      console.log(`   - Score de segurança: ${healthData.security_score?.toFixed(1)}/100`);
    }
    
    // 2. Verificar tabelas de segurança
    console.log('\n2️⃣ Verificando tabelas de segurança...');
    const securityTables = [
      'profiles', 'user_settings', 'system_config', 
      'audit_logs', 'mfa_tokens', 'security_alerts', 'suspicious_activities'
    ];
    
    for (const table of securityTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ Tabela ${table}: ${count} registros`);
        }
      } catch (err) {
        console.log(`   ❌ Tabela ${table}: ${err.message}`);
      }
    }
    
    // 3. Verificar funções de segurança
    console.log('\n3️⃣ Verificando funções de segurança...');
    const securityFunctions = [
      'validate_mfa_code',
      'generate_mfa_backup_codes', 
      'create_security_alert',
      'resolve_security_alert',
      'detect_suspicious_activity',
      'auto_security_monitoring'
    ];
    
    for (const func of securityFunctions) {
      try {
        // Tentar chamar função com parâmetros de teste (vai dar erro mas confirma que existe)
        await supabase.rpc(func);
      } catch (err) {
        if (err.message.includes('function') && err.message.includes('does not exist')) {
          console.log(`   ❌ Função ${func}: não encontrada`);
        } else {
          console.log(`   ✅ Função ${func}: disponível`);
        }
      }
    }
    
    // 4. Testar criação de alerta de segurança
    console.log('\n4️⃣ Testando sistema de alertas...');
    try {
      const { data: alertData, error: alertError } = await supabase.rpc('create_security_alert', {
        alert_type: 'test',
        severity: 'low',
        title: 'Teste de Sistema de Alertas',
        description: 'Teste automatizado do sistema de alertas de segurança',
        metadata: { test: true, timestamp: new Date().toISOString() }
      });
      
      if (alertError) {
        console.log(`   ❌ Criação de alerta: ${alertError.message}`);
      } else {
        console.log(`   ✅ Alerta criado com ID: ${alertData}`);
        
        // Tentar resolver o alerta de teste
        const { error: resolveError } = await supabase.rpc('resolve_security_alert', {
          alert_id: alertData,
          resolution_notes: 'Teste automatizado - resolvido'
        });
        
        if (resolveError) {
          console.log(`   ⚠️  Resolução de alerta: ${resolveError.message}`);
        } else {
          console.log(`   ✅ Alerta resolvido com sucesso`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Sistema de alertas: ${err.message}`);
    }
    
    // 5. Verificar configurações de segurança
    console.log('\n5️⃣ Verificando configurações de segurança...');
    try {
      const { data: configs, error: configError } = await supabase
        .from('system_config')
        .select('key, value, description')
        .eq('category', 'security');
      
      if (configError) {
        console.log(`   ❌ Configurações: ${configError.message}`);
      } else {
        console.log(`   ✅ ${configs.length} configurações de segurança encontradas:`);
        configs.forEach(config => {
          console.log(`      - ${config.key}: ${config.value}`);
        });
      }
    } catch (err) {
      console.log(`   ❌ Configurações: ${err.message}`);
    }
    
    console.log('\n🎯 Verificação de segurança concluída!');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyCompleteSecurity()
    .then(() => {
      console.log('\n🚀 Implementação completa de segurança finalizada!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha na implementação:', error.message);
      process.exit(1);
    });
}

module.exports = { applyCompleteSecurity, verifySecurityImplementations };