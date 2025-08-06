/**
 * Script para verificar o status de segurança do Hub Control
 * Executa a função security_health_check() e gera relatório
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE não configuradas');
  console.log('Certifique-se de que .env.local contém:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSecurityHealthFunction() {
  try {
    console.log('📋 1. Verificando função security_health_check...');
    
    // Tentar executar a função diretamente
    const { data: healthData, error: healthError } = await supabase
      .rpc('security_health_check');
    
    if (healthError) {
      console.log('❌ Erro ao executar função:', healthError.message);
      console.log('💡 A função pode não estar disponível ou ter erro de sintaxe');
      return false;
    }
    
    console.log('✅ Função security_health_check executada com sucesso');
    
    console.log('\n📊 Resultado da verificação de segurança:');
    console.log(`🛡️  Cobertura RLS: ${healthData.rls_coverage || 0}%`);
    console.log(`🔐 Cobertura MFA: ${healthData.mfa_admin_coverage || 0}%`);
    console.log(`📋 Tabelas com RLS: ${healthData.tables_with_rls || 0}`);
    console.log(`👥 Total de tabelas: ${healthData.total_tables || 0}`);
    
    // Avaliar o nível de segurança
    const rlsCoverage = parseFloat(healthData.rls_coverage) || 0;
    const mfaCoverage = parseFloat(healthData.mfa_admin_coverage) || 0;
    
    console.log('\n🎯 Avaliação de Segurança:');
    if (rlsCoverage >= 80 && mfaCoverage >= 50) {
      console.log('🟢 Nível de segurança: ALTO');
    } else if (rlsCoverage >= 60 && mfaCoverage >= 25) {
      console.log('🟡 Nível de segurança: MÉDIO');
    } else {
      console.log('🔴 Nível de segurança: BAIXO');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function checkSecurityStatus() {
  console.log('🔍 Verificando status de segurança do Hub Control...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar função de health check
    const healthCheckSuccess = await checkSecurityHealthFunction();
    
    if (!healthCheckSuccess) {
      console.log('⚠️  Continuando com outras verificações...');
    }
    
    // 2. Verificar alertas de segurança ativos
    console.log('\n🚨 2. Verificando alertas de segurança ativos...');
    
    const { data: alerts, error: alertsError } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('timestamp', { ascending: false })
      .limit(10);
    
    if (alertsError) {
      console.log('⚠️  Não foi possível verificar alertas:', alertsError.message);
    } else if (alerts && alerts.length > 0) {
      console.log(`\n⚠️  ${alerts.length} alertas não resolvidos encontrados:`);
      
      alerts.forEach((alert, index) => {
        const severityEmoji = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡',
          'low': '🟢'
        }[alert.severity] || '⚪';
        
        console.log(`${severityEmoji} [${alert.severity.toUpperCase()}] ${alert.message}`);
        console.log(`   📅 ${new Date(alert.timestamp).toLocaleString('pt-BR')}`);
      });
    } else {
      console.log('✅ Nenhum alerta ativo encontrado');
    }
    
    // 3. Verificar atividades suspeitas recentes
    console.log('\n🔍 3. Verificando atividades suspeitas (últimas 24h)...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: suspicious, error: suspiciousError } = await supabase
      .from('suspicious_activities')
      .select('*')
      .gte('timestamp', yesterday.toISOString())
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (suspiciousError) {
      console.log('⚠️  Não foi possível verificar atividades suspeitas:', suspiciousError.message);
    } else if (suspicious && suspicious.length > 0) {
      console.log(`\n⚠️  ${suspicious.length} atividades suspeitas nas últimas 24h:`);
      
      suspicious.forEach((activity, index) => {
        console.log(`🔍 ${activity.activity_type}: ${activity.description}`);
        console.log(`   👤 Usuário: ${activity.user_id || 'N/A'}`);
        console.log(`   📅 ${new Date(activity.timestamp).toLocaleString('pt-BR')}`);
      });
    } else {
      console.log('✅ Nenhuma atividade suspeita detectada');
    }
    
    // 4. Verificar configurações de segurança
    console.log('\n⚙️  4. Verificando configurações de segurança...');
    
    const { data: configs, error: configsError } = await supabase
      .from('security_config')
      .select('*');
    
    if (configsError) {
      console.log('⚠️  Não foi possível verificar configurações:', configsError.message);
    } else if (configs && configs.length > 0) {
      console.log('\n📋 Configurações ativas:');
      
      const configMap = configs.reduce((acc, config) => {
        acc[config.key] = config.value;
        return acc;
      }, {});
      
      // Verificar configurações críticas
      const criticalConfigs = [
        { key: 'mfa_enabled', expected: true, name: 'MFA Habilitado' },
        { key: 'password_min_length', expected: 8, name: 'Tamanho Mínimo de Senha', operator: '>=' },
        { key: 'session_timeout', expected: 3600, name: 'Timeout de Sessão (seg)', operator: '<=' },
        { key: 'max_login_attempts', expected: 5, name: 'Máx. Tentativas de Login', operator: '<=' }
      ];
      
      criticalConfigs.forEach(config => {
        const value = configMap[config.key];
        let status = '❓';
        
        if (value !== undefined) {
          if (config.operator === '>=') {
            status = value >= config.expected ? '✅' : '❌';
          } else if (config.operator === '<=') {
            status = value <= config.expected ? '✅' : '❌';
          } else {
            status = value === config.expected ? '✅' : '❌';
          }
        }
        
        console.log(`${status} ${config.name}: ${value || 'Não configurado'}`);
      });
    } else {
      console.log('⚠️  Nenhuma configuração de segurança encontrada');
    }
    
    // 5. Resumo final
    console.log('\n' + '=' .repeat(60));
    console.log('📋 RESUMO EXECUTIVO');
    console.log('=' .repeat(60));
    
    const alertCount = alerts ? alerts.length : 0;
    const suspiciousCount = suspicious ? suspicious.length : 0;
    
    console.log(`🚨 Alertas Ativos: ${alertCount}`);
    console.log(`🔍 Atividades Suspeitas (24h): ${suspiciousCount}`);
    
    // Próximos passos recomendados
    console.log('\n🎯 PRÓXIMOS PASSOS RECOMENDADOS:');
    console.log('-' .repeat(40));
    
    if (alertCount > 0) {
      console.log('1. 🚨 Resolver alertas de segurança pendentes');
    }
    
    if (suspiciousCount > 0) {
      console.log('2. 🔍 Investigar atividades suspeitas detectadas');
    }
    
    console.log('3. 📚 Executar programa de treinamento da equipe');
    console.log('4. 🧪 Implementar testes de segurança automatizados');
    console.log('5. 📋 Revisar e atualizar políticas de segurança');
    
    console.log('\n✅ Verificação de segurança concluída!');
    console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
    
  } catch (error) {
    console.error('❌ Erro durante verificação de segurança:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar verificação
checkSecurityStatus()
  .then(() => {
    console.log('\n🏁 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });