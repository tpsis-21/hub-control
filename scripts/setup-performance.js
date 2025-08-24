const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuração do sistema de testes de performance
class PerformanceSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.performanceDir = path.join(this.projectRoot, 'performance');
    this.supabase = null;
  }

  async setup() {
    console.log('🚀 Configurando sistema de testes de performance...');
    
    try {
      // 1. Verificar variáveis de ambiente
      await this.checkEnvironmentVariables();
      
      // 2. Criar estrutura de diretórios
      await this.createDirectoryStructure();
      
      // 3. Configurar banco de dados
      await this.setupDatabase();
      
      // 4. Criar arquivo de configuração
      await this.createConfigFile();
      
      // 5. Criar scripts de performance
      await this.createPerformanceScripts();
      
      // 6. Configurar agendamento (Windows)
      await this.setupScheduling();
      
      // 7. Testar configuração
      await this.testConfiguration();
      
      console.log('✅ Sistema de testes de performance configurado com sucesso!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Erro durante configuração:', error.message);
      process.exit(1);
    }
  }

  async checkEnvironmentVariables() {
    console.log('📋 Verificando variáveis de ambiente...');
    
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missing = [];
    
    for (const variable of required) {
      if (!process.env[variable]) {
        missing.push(variable);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missing.join(', ')}`);
    }
    
    // Inicializar cliente Supabase
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('✅ Variáveis de ambiente verificadas');
  }

  async createDirectoryStructure() {
    console.log('📁 Criando estrutura de diretórios...');
    
    const directories = [
      'performance',
      'performance/results',
      'performance/reports',
      'performance/logs',
      'performance/configs',
      'performance/scripts',
      'performance/templates'
    ];
    
    for (const dir of directories) {
      const fullPath = path.join(this.projectRoot, dir);
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`  ✅ ${dir}/`);
    }
  }

  async setupDatabase() {
    console.log('🗄️ Configurando tabelas do banco de dados...');
    
    try {
      // Criar tabela para resultados de testes de performance
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS performance_test_results (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          test_id TEXT UNIQUE NOT NULL,
          config JSONB NOT NULL,
          results JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Índices para performance
        CREATE INDEX IF NOT EXISTS idx_performance_test_results_test_id ON performance_test_results(test_id);
        CREATE INDEX IF NOT EXISTS idx_performance_test_results_created_at ON performance_test_results(created_at);
        
        -- RLS (Row Level Security)
        ALTER TABLE performance_test_results ENABLE ROW LEVEL SECURITY;
        
        -- Política para administradores
        DROP POLICY IF EXISTS "Administradores podem gerenciar testes de performance" ON performance_test_results;
        CREATE POLICY "Administradores podem gerenciar testes de performance" ON performance_test_results
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE profiles.id = auth.uid() 
              AND profiles.role = 'admin'
            )
          );
        
        -- Função para limpeza automática
        CREATE OR REPLACE FUNCTION cleanup_old_performance_results(days_old INTEGER DEFAULT 30)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM performance_test_results 
          WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error } = await this.supabase.rpc('exec_sql', { sql: createTableQuery });
      
      if (error) {
        console.log('⚠️ Erro ao criar tabelas (pode já existir):', error.message);
      } else {
        console.log('✅ Tabelas configuradas');
      }
      
    } catch (error) {
      console.log('⚠️ Aviso: Não foi possível configurar tabelas automaticamente');
      console.log('   Execute manualmente no Supabase SQL Editor:');
      console.log('   - Criar tabela performance_test_results');
      console.log('   - Configurar políticas RLS');
    }
  }

  async createConfigFile() {
    console.log('⚙️ Criando arquivo de configuração...');
    
    const config = {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      
      // Configurações de teste
      testing: {
        concurrentUsers: 10,
        testDuration: 60, // segundos
        rampUpTime: 10, // segundos
        
        // Endpoints para testar
        endpoints: [
          {
            name: 'home',
            path: '/',
            method: 'GET',
            weight: 3,
            expectedStatusCode: 200
          },
          {
            name: 'api_health',
            path: '/api/health',
            method: 'GET',
            weight: 2,
            expectedStatusCode: 200
          },
          {
            name: 'dashboard',
            path: '/dashboard',
            method: 'GET',
            weight: 5,
            expectedStatusCode: 200
          },
          {
            name: 'api_clients',
            path: '/api/clients',
            method: 'GET',
            weight: 4,
            expectedStatusCode: 200,
            headers: {
              'Authorization': 'Bearer ${AUTH_TOKEN}'
            }
          }
        ],
        
        // Configurações de banco de dados
        database: {
          enabled: true,
          connectionPoolSize: 20,
          queries: [
            {
              name: 'list_clients',
              query: 'SELECT id, name, email FROM clients LIMIT 100',
              expectedRows: 100
            },
            {
              name: 'count_payments',
              query: 'SELECT COUNT(*) as total FROM payments'
            },
            {
              name: 'recent_notifications',
              query: 'SELECT * FROM notifications WHERE created_at > NOW() - INTERVAL \'7 days\' LIMIT 50'
            }
          ]
        }
      },
      
      // Thresholds de performance
      thresholds: {
        responseTime: {
          p50: 500,   // 50º percentil em ms
          p95: 2000,  // 95º percentil em ms
          p99: 5000   // 99º percentil em ms
        },
        throughput: {
          minRps: 10  // requisições por segundo mínimas
        },
        errorRate: {
          maxPercent: 5  // taxa de erro máxima em %
        },
        database: {
          maxQueryTime: 1000,    // tempo máximo de query em ms
          maxConnections: 50     // máximo de conexões simultâneas
        }
      },
      
      // Configurações de notificação
      notifications: {
        email: {
          enabled: process.env.PERF_EMAIL_ENABLED === 'true',
          to: process.env.PERF_EMAIL_TO || '',
          from: process.env.PERF_EMAIL_FROM || 'noreply@hubcontrol.com',
          threshold: 'medium' // low, medium, high, critical
        },
        webhook: {
          enabled: process.env.PERF_WEBHOOK_ENABLED === 'true',
          url: process.env.PERF_WEBHOOK_URL || '',
          threshold: 'high'
        },
        slack: {
          enabled: process.env.PERF_SLACK_ENABLED === 'true',
          webhook: process.env.PERF_SLACK_WEBHOOK || '',
          channel: process.env.PERF_SLACK_CHANNEL || '#performance',
          threshold: 'high'
        }
      },
      
      // Configurações de agendamento
      schedule: {
        fullTest: '0 2 * * 0',      // Domingo às 2h
        quickTest: '0 */6 * * *',   // A cada 6 horas
        cleanup: '0 3 1 * *'        // 1º dia do mês às 3h
      },
      
      // Retenção de dados
      retention: {
        results: 90,  // dias
        logs: 30,     // dias
        reports: 60   // dias
      }
    };
    
    const configPath = path.join(this.performanceDir, 'configs', 'performance-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    console.log('✅ Arquivo de configuração criado');
  }

  async createPerformanceScripts() {
    console.log('📜 Criando scripts de performance...');
    
    // Script de teste manual
    const manualTestScript = `@echo off
echo Executando teste de performance manual...
cd /d "%~dp0.."
npm run performance:test
echo.
echo Teste concluido. Pressione qualquer tecla para continuar...
pause > nul`;
    
    await fs.writeFile(
      path.join(this.performanceDir, 'scripts', 'manual-test.bat'),
      manualTestScript
    );
    
    // Script de teste rápido
    const quickTestScript = `@echo off
echo Executando verificacao rapida de performance...
cd /d "%~dp0.."
npm run performance:quick
echo.
echo Verificacao concluida.`;
    
    await fs.writeFile(
      path.join(this.performanceDir, 'scripts', 'quick-test.bat'),
      quickTestScript
    );
    
    // Script Node.js para testes
    const nodeTestScript = `const { PerformanceTester, defaultPerformanceConfig } = require('../../src/lib/performance-testing');
const path = require('path');
const fs = require('fs').promises;

async function runTest() {
  try {
    console.log('🚀 Iniciando teste de performance...');
    
    // Carregar configuração personalizada se existir
    const configPath = path.join(__dirname, '..', 'configs', 'performance-config.json');
    let config = defaultPerformanceConfig;
    
    try {
      const configFile = await fs.readFile(configPath, 'utf8');
      const customConfig = JSON.parse(configFile);
      config = { ...defaultPerformanceConfig, ...customConfig.testing };
    } catch (error) {
      console.log('⚠️ Usando configuração padrão');
    }
    
    const tester = new PerformanceTester(config);
    const result = await tester.runPerformanceTest();
    
    console.log('✅ Teste concluído!');
    console.log('📊 Resultados:');
    console.log(\`   - Total de requisições: \${result.totalRequests}\`);
    console.log(\`   - Taxa de sucesso: \${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%\`);
    console.log(\`   - Tempo médio de resposta: \${result.averageResponseTime.toFixed(2)}ms\`);
    console.log(\`   - Throughput: \${result.throughput.toFixed(2)} RPS\`);
    console.log(\`   - Violações de threshold: \${result.thresholdViolations.length}\`);
    
    if (result.recommendations.length > 0) {
      console.log('💡 Recomendações:');
      result.recommendations.forEach(rec => console.log(\`   - \${rec}\`));
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTest();
}

module.exports = { runTest };`;
    
    await fs.writeFile(
      path.join(this.performanceDir, 'scripts', 'run-test.js'),
      nodeTestScript
    );
    
    console.log('✅ Scripts criados');
  }

  async setupScheduling() {
    console.log('⏰ Configurando agendamento de tarefas...');
    
    const schedulingScript = `@echo off
echo Configurando agendamento de testes de performance...

REM Teste completo (semanal - Domingo às 2h)
schtasks /create /tn "Hub Control Performance Test" /tr "cd /d C:\\Users\\%USERNAME%\\Documents\\hub-control && npm run performance:test" /sc weekly /d SUN /st 02:00 /f

REM Teste rápido (a cada 6 horas)
schtasks /create /tn "Hub Control Performance Quick Check" /tr "cd /d C:\\Users\\%USERNAME%\\Documents\\hub-control && npm run performance:quick" /sc hourly /mo 6 /f

REM Limpeza de resultados antigos (mensal)
schtasks /create /tn "Hub Control Performance Cleanup" /tr "cd /d C:\\Users\\%USERNAME%\\Documents\\hub-control && npm run performance:cleanup" /sc monthly /d 1 /st 03:00 /f

echo.
echo Agendamento configurado com sucesso!
echo.
echo Tarefas criadas:
echo - Hub Control Performance Test (semanal)
echo - Hub Control Performance Quick Check (a cada 6 horas)
echo - Hub Control Performance Cleanup (mensal)
echo.
pause`;
    
    await fs.writeFile(
      path.join(this.performanceDir, 'scripts', 'setup-scheduling.bat'),
      schedulingScript
    );
    
    console.log('✅ Script de agendamento criado');
    console.log('   Execute: performance/scripts/setup-scheduling.bat (como administrador)');
  }

  async testConfiguration() {
    console.log('🧪 Testando configuração...');
    
    try {
      // Testar conectividade com Supabase
      const { data, error } = await this.supabase
        .from('performance_test_results')
        .select('count')
        .limit(1);
      
      if (error && !error.message.includes('relation "performance_test_results" does not exist')) {
        throw new Error(`Erro de conectividade: ${error.message}`);
      }
      
      console.log('✅ Conectividade com Supabase OK');
      
      // Verificar estrutura de diretórios
      const requiredDirs = ['results', 'reports', 'logs', 'configs', 'scripts'];
      for (const dir of requiredDirs) {
        const dirPath = path.join(this.performanceDir, dir);
        await fs.access(dirPath);
      }
      
      console.log('✅ Estrutura de diretórios OK');
      
      // Verificar arquivo de configuração
      const configPath = path.join(this.performanceDir, 'configs', 'performance-config.json');
      await fs.access(configPath);
      
      console.log('✅ Arquivo de configuração OK');
      
    } catch (error) {
      console.log(`⚠️ Aviso durante teste: ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n📋 RESUMO DA CONFIGURAÇÃO');
    console.log('=' .repeat(50));
    console.log('✅ Sistema de testes de performance configurado');
    console.log('');
    console.log('📁 Estrutura criada:');
    console.log('   performance/');
    console.log('   ├── results/     (resultados dos testes)');
    console.log('   ├── reports/     (relatórios gerados)');
    console.log('   ├── logs/        (logs do sistema)');
    console.log('   ├── configs/     (arquivos de configuração)');
    console.log('   ├── scripts/     (scripts auxiliares)');
    console.log('   └── templates/   (templates de relatórios)');
    console.log('');
    console.log('🛠️ Scripts disponíveis:');
    console.log('   npm run performance:setup    - Configurar sistema');
    console.log('   npm run performance:test     - Executar teste completo');
    console.log('   npm run performance:quick    - Verificação rápida');
    console.log('   npm run performance:list     - Listar resultados');
    console.log('   npm run performance:cleanup  - Limpar resultados antigos');
    console.log('');
    console.log('⏰ Agendamento:');
    console.log('   Execute: performance/scripts/setup-scheduling.bat');
    console.log('   (como administrador para configurar tarefas automáticas)');
    console.log('');
    console.log('📊 Configuração:');
    console.log('   Edite: performance/configs/performance-config.json');
    console.log('');
    console.log('🔧 Próximos passos:');
    console.log('   1. Configure variáveis de ambiente opcionais (.env.production)');
    console.log('   2. Execute: npm run performance:test');
    console.log('   3. Configure agendamento automático');
    console.log('   4. Configure notificações (email, Slack, webhook)');
    console.log('');
    console.log('📞 Suporte:');
    console.log('   - Logs: performance/logs/');
    console.log('   - Configuração: performance/configs/performance-config.json');
    console.log('   - Scripts: performance/scripts/');
  }
}

// Executar configuração
if (require.main === module) {
  const setup = new PerformanceSetup();
  setup.setup().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = PerformanceSetup;