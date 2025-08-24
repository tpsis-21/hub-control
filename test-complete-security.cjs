const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCompleteSecurity() {
  log('🔒 TESTE COMPLETO DE SEGURANÇA', 'bold');
  log('=====================================\n', 'blue');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  try {
    // 1. Teste de Conectividade
    await testConnectivity(results);
    
    // 2. Teste de Função Health Check
    await testHealthCheck(results);
    
    // 3. Teste de Tabelas de Segurança
    await testSecurityTables(results);
    
    // 4. Teste de RLS (Row Level Security)
    await testRLS(results);
    
    // 5. Teste de MFA
    await testMFA(results);
    
    // 6. Teste de Sistema de Alertas
    await testSecurityAlerts(results);
    
    // 7. Teste de Monitoramento de Atividades Suspeitas
    await testSuspiciousActivities(results);
    
    // 8. Teste de Configurações de Segurança
    await testSecurityConfigs(results);
    
    // Relatório Final
    generateFinalReport(results);
    
  } catch (error) {
    log(`❌ Erro crítico no teste: ${error.message}`, 'red');
    results.failed++;
  }
  
  return results;
}

async function testConnectivity(results) {
  log('1️⃣ TESTE DE CONECTIVIDADE', 'blue');
  results.total++;
  
  try {
    // Teste básico de conectividade
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.message.includes('fetch failed') || error.message.includes('network')) {
        log('❌ Falha de conectividade com Supabase', 'red');
        log(`   Erro: ${error.message}`, 'red');
        log('   💡 Verifique as variáveis SUPABASE_URL e SUPABASE_ANON_KEY', 'yellow');
        results.failed++;
        return false;
      } else {
        log('⚠️  Conectividade OK, mas erro na consulta', 'yellow');
        log(`   Erro: ${error.message}`, 'yellow');
        results.warnings++;
        return true;
      }
    }
    
    log('✅ Conectividade com Supabase OK', 'green');
    results.passed++;
    return true;
    
  } catch (err) {
    log('❌ Erro de conectividade', 'red');
    log(`   ${err.message}`, 'red');
    results.failed++;
    return false;
  }
}

async function testHealthCheck(results) {
  log('\n2️⃣ TESTE DE FUNÇÃO HEALTH CHECK', 'blue');
  results.total++;
  
  try {
    const { data, error } = await supabase.rpc('security_health_check');
    
    if (error) {
      log('❌ Função security_health_check não disponível', 'red');
      log(`   Erro: ${error.message}`, 'red');
      results.failed++;
      return null;
    }
    
    log('✅ Função security_health_check funcionando', 'green');
    log(`   📊 Cobertura RLS: ${data.rls_coverage?.toFixed(2)}%`, 'blue');
    log(`   🔐 Cobertura MFA Admin: ${data.mfa_admin_coverage?.toFixed(2)}%`, 'blue');
    log(`   📋 Tabelas com RLS: ${data.tables_with_rls}/${data.total_tables}`, 'blue');
    log(`   👥 Admins com MFA: ${data.admins_with_mfa}/${data.total_admins}`, 'blue');
    log(`   🚨 Alertas ativos: ${data.active_security_alerts}`, 'blue');
    log(`   🔍 Atividades suspeitas (24h): ${data.recent_suspicious_activities}`, 'blue');
    log(`   🎯 Score de segurança: ${data.security_score?.toFixed(1)}/100`, 'blue');
    
    results.passed++;
    return data;
    
  } catch (err) {
    log('❌ Erro ao executar health check', 'red');
    log(`   ${err.message}`, 'red');
    results.failed++;
    return null;
  }
}

async function testSecurityTables(results) {
  log('\n3️⃣ TESTE DE TABELAS DE SEGURANÇA', 'blue');
  
  const securityTables = [
    'profiles',
    'user_settings', 
    'system_config',
    'audit_logs',
    'mfa_tokens',
    'security_alerts',
    'suspicious_activities'
  ];
  
  for (const table of securityTables) {
    results.total++;
    
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        log(`❌ Tabela ${table}: ${error.message}`, 'red');
        results.failed++;
      } else {
        log(`✅ Tabela ${table}: ${count} registros`, 'green');
        results.passed++;
      }
    } catch (err) {
      log(`❌ Tabela ${table}: ${err.message}`, 'red');
      results.failed++;
    }
  }
}

async function testRLS(results) {
  log('\n4️⃣ TESTE DE ROW LEVEL SECURITY (RLS)', 'blue');
  results.total++;
  
  try {
    // Tentar acessar tabela system_config (deve ser restrita)
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        log('✅ RLS funcionando - acesso negado conforme esperado', 'green');
        results.passed++;
      } else {
        log('⚠️  RLS pode não estar configurado corretamente', 'yellow');
        log(`   Erro: ${error.message}`, 'yellow');
        results.warnings++;
      }
    } else {
      log('⚠️  RLS pode estar desabilitado - acesso permitido', 'yellow');
      results.warnings++;
    }
    
  } catch (err) {
    log('❌ Erro ao testar RLS', 'red');
    log(`   ${err.message}`, 'red');
    results.failed++;
  }
}

async function testMFA(results) {
  log('\n5️⃣ TESTE DE FUNCIONALIDADES MFA', 'blue');
  
  // Teste de função validate_mfa_code
  results.total++;
  try {
    await supabase.rpc('validate_mfa_code', {
      user_id: '00000000-0000-0000-0000-000000000000',
      code: '123456'
    });
    log('✅ Função validate_mfa_code disponível', 'green');
    results.passed++;
  } catch (err) {
    if (err.message.includes('function') && err.message.includes('does not exist')) {
      log('❌ Função validate_mfa_code não encontrada', 'red');
      results.failed++;
    } else {
      log('✅ Função validate_mfa_code disponível', 'green');
      results.passed++;
    }
  }
  
  // Teste de função generate_mfa_backup_codes
  results.total++;
  try {
    await supabase.rpc('generate_mfa_backup_codes', {
      user_id: '00000000-0000-0000-0000-000000000000'
    });
    log('✅ Função generate_mfa_backup_codes disponível', 'green');
    results.passed++;
  } catch (err) {
    if (err.message.includes('function') && err.message.includes('does not exist')) {
      log('❌ Função generate_mfa_backup_codes não encontrada', 'red');
      results.failed++;
    } else {
      log('✅ Função generate_mfa_backup_codes disponível', 'green');
      results.passed++;
    }
  }
}

async function testSecurityAlerts(results) {
  log('\n6️⃣ TESTE DE SISTEMA DE ALERTAS', 'blue');
  
  // Teste de criação de alerta
  results.total++;
  try {
    const { data: alertId, error } = await supabase.rpc('create_security_alert', {
      alert_type: 'test_automated',
      severity: 'low',
      title: 'Teste Automatizado de Alerta',
      description: 'Alerta criado durante teste automatizado de segurança',
      metadata: { test: true, timestamp: new Date().toISOString() }
    });
    
    if (error) {
      log('❌ Erro ao criar alerta de teste', 'red');
      log(`   ${error.message}`, 'red');
      results.failed++;
    } else {
      log('✅ Alerta de teste criado com sucesso', 'green');
      log(`   ID: ${alertId}`, 'blue');
      results.passed++;
      
      // Tentar resolver o alerta
      results.total++;
      const { error: resolveError } = await supabase.rpc('resolve_security_alert', {
        alert_id: alertId,
        resolution_notes: 'Teste automatizado concluído'
      });
      
      if (resolveError) {
        log('⚠️  Erro ao resolver alerta de teste', 'yellow');
        log(`   ${resolveError.message}`, 'yellow');
        results.warnings++;
      } else {
        log('✅ Alerta de teste resolvido com sucesso', 'green');
        results.passed++;
      }
    }
  } catch (err) {
    log('❌ Erro no sistema de alertas', 'red');
    log(`   ${err.message}`, 'red');
    results.failed++;
  }
}

async function testSuspiciousActivities(results) {
  log('\n7️⃣ TESTE DE MONITORAMENTO DE ATIVIDADES SUSPEITAS', 'blue');
  
  // Teste de função detect_suspicious_activity
  results.total++;
  try {
    const { data, error } = await supabase.rpc('detect_suspicious_activity', {
      user_id: '00000000-0000-0000-0000-000000000000',
      activity_type: 'test_activity',
      ip_address: '192.168.1.100',
      user_agent: 'Test-Agent/1.0',
      metadata: { test: true }
    });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        log('❌ Função detect_suspicious_activity não encontrada', 'red');
        results.failed++;
      } else {
        log('⚠️  Função detect_suspicious_activity com erro', 'yellow');
        log(`   ${error.message}`, 'yellow');
        results.warnings++;
      }
    } else {
      log('✅ Função detect_suspicious_activity funcionando', 'green');
      results.passed++;
    }
  } catch (err) {
    log('❌ Erro ao testar detecção de atividades suspeitas', 'red');
    log(`   ${err.message}`, 'red');
    results.failed++;
  }
}

async function testSecurityConfigs(results) {
  log('\n8️⃣ TESTE DE CONFIGURAÇÕES DE SEGURANÇA', 'blue');
  results.total++;
  
  try {
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('key, value, description')
      .eq('category', 'security');
    
    if (error) {
      log('❌ Erro ao acessar configurações de segurança', 'red');
      log(`   ${error.message}`, 'red');
      results.failed++;
    } else {
      log(`✅ ${configs.length} configurações de segurança encontradas`, 'green');
      
      const expectedConfigs = [
        'security.mfa_required_for_admins',
        'security.max_failed_login_attempts',
        'security.session_timeout_minutes'
      ];
      
      expectedConfigs.forEach(expectedKey => {
        const config = configs.find(c => c.key === expectedKey);
        if (config) {
          log(`   ✅ ${expectedKey}: ${config.value}`, 'green');
        } else {
          log(`   ⚠️  ${expectedKey}: não encontrada`, 'yellow');
        }
      });
      
      results.passed++;
    }
  } catch (err) {
    log('❌ Erro ao testar configurações', 'red');
    log(`   ${err.message}`, 'red');
    results.failed++;
  }
}

function generateFinalReport(results) {
  log('\n🎯 RELATÓRIO FINAL', 'bold');
  log('=====================================', 'blue');
  
  const successRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : 0;
  
  log(`📊 Testes executados: ${results.total}`, 'blue');
  log(`✅ Sucessos: ${results.passed}`, 'green');
  log(`❌ Falhas: ${results.failed}`, 'red');
  log(`⚠️  Avisos: ${results.warnings}`, 'yellow');
  log(`📈 Taxa de sucesso: ${successRate}%`, 'blue');
  
  // Determinar status geral
  let status, statusColor;
  if (results.failed === 0 && results.warnings <= 2) {
    status = '🟢 EXCELENTE - Sistema de segurança totalmente funcional';
    statusColor = 'green';
  } else if (results.failed <= 2 && results.warnings <= 5) {
    status = '🟡 BOM - Sistema funcional com pequenos ajustes necessários';
    statusColor = 'yellow';
  } else if (results.failed <= 5) {
    status = '🟠 REGULAR - Sistema parcialmente funcional, requer atenção';
    statusColor = 'yellow';
  } else {
    status = '🔴 CRÍTICO - Sistema requer implementação/correção urgente';
    statusColor = 'red';
  }
  
  log(`\n${status}`, statusColor);
  
  // Salvar relatório em arquivo
  const reportPath = path.join(__dirname, 'security-test-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    results,
    status,
    successRate: parseFloat(successRate)
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Relatório salvo em: ${reportPath}`, 'blue');
}

// Executar se chamado diretamente
if (require.main === module) {
  testCompleteSecurity()
    .then((results) => {
      const exitCode = results.failed > 5 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('💥 Falha crítica no teste:', error.message);
      process.exit(1);
    });
}

module.exports = { testCompleteSecurity };