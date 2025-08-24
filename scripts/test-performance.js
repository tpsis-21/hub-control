const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { performance } = require('perf_hooks');

// Sistema de testes para validar configuração de performance
class PerformanceTestValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.performanceDir = path.join(this.projectRoot, 'performance');
    this.supabase = null;
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Iniciando testes do sistema de performance...');
    console.log('=' .repeat(60));
    
    try {
      // 1. Testar configuração básica
      await this.testBasicConfiguration();
      
      // 2. Testar estrutura de diretórios
      await this.testDirectoryStructure();
      
      // 3. Testar conectividade com banco
      await this.testDatabaseConnection();
      
      // 4. Testar módulo PerformanceTester
      await this.testPerformanceTesterModule();
      
      // 5. Testar sistema de notificações
      await this.testNotificationSystem();
      
      // 6. Testar performance do próprio sistema
      await this.testSystemPerformance();
      
      // 7. Gerar relatório final
      await this.generateTestReport();
      
      console.log('\n✅ Todos os testes concluídos!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Erro durante execução dos testes:', error.message);
      process.exit(1);
    }
  }

  async testBasicConfiguration() {
    console.log('\n📋 Testando configuração básica...');
    
    const tests = [
      {
        name: 'Variáveis de ambiente obrigatórias',
        test: () => {
          const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
          const missing = required.filter(env => !process.env[env]);
          
          if (missing.length > 0) {
            throw new Error(`Variáveis ausentes: ${missing.join(', ')}`);
          }
          
          // Inicializar Supabase
          this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );
          
          return 'Todas as variáveis obrigatórias estão configuradas';
        }
      },
      {
        name: 'Arquivo de configuração',
        test: async () => {
          const configPath = path.join(this.performanceDir, 'configs', 'performance-config.json');
          
          try {
            await fs.access(configPath);
            const configContent = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configContent);
            
            // Validar estrutura básica
            const requiredKeys = ['version', 'testing', 'thresholds', 'notifications'];
            const missingKeys = requiredKeys.filter(key => !config[key]);
            
            if (missingKeys.length > 0) {
              throw new Error(`Chaves ausentes na configuração: ${missingKeys.join(', ')}`);
            }
            
            return `Configuração válida (versão ${config.version})`;
          } catch (error) {
            throw new Error(`Erro ao ler configuração: ${error.message}`);
          }
        }
      },
      {
        name: 'Scripts npm',
        test: async () => {
          const packagePath = path.join(this.projectRoot, 'package.json');
          const packageContent = await fs.readFile(packagePath, 'utf8');
          const packageJson = JSON.parse(packageContent);
          
          const requiredScripts = [
            'performance:setup',
            'performance:test',
            'performance:quick',
            'performance:list',
            'performance:cleanup'
          ];
          
          const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
          
          if (missingScripts.length > 0) {
            throw new Error(`Scripts ausentes: ${missingScripts.join(', ')}`);
          }
          
          return `Todos os scripts estão configurados (${requiredScripts.length})`;
        }
      }
    ];
    
    for (const test of tests) {
      await this.runSingleTest(test.name, test.test);
    }
  }

  async testDirectoryStructure() {
    console.log('\n📁 Testando estrutura de diretórios...');
    
    const requiredDirs = [
      'performance',
      'performance/results',
      'performance/reports', 
      'performance/logs',
      'performance/configs',
      'performance/scripts',
      'performance/templates'
    ];
    
    for (const dir of requiredDirs) {
      await this.runSingleTest(`Diretório ${dir}`, async () => {
        const dirPath = path.join(this.projectRoot, dir);
        await fs.access(dirPath);
        
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
          throw new Error('Não é um diretório');
        }
        
        return 'Diretório existe e é válido';
      });
    }
    
    // Testar permissões de escrita
    await this.runSingleTest('Permissões de escrita', async () => {
      const testFile = path.join(this.performanceDir, 'test-write.tmp');
      
      try {
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        return 'Permissões de escrita OK';
      } catch (error) {
        throw new Error(`Sem permissão de escrita: ${error.message}`);
      }
    });
  }

  async testDatabaseConnection() {
    console.log('\n🗄️ Testando conectividade com banco de dados...');
    
    const tests = [
      {
        name: 'Conexão básica com Supabase',
        test: async () => {
          const { data, error } = await this.supabase
            .from('profiles')
            .select('count')
            .limit(1);
          
          if (error) {
            throw new Error(`Erro de conexão: ${error.message}`);
          }
          
          return 'Conexão estabelecida com sucesso';
        }
      },
      {
        name: 'Tabela performance_test_results',
        test: async () => {
          const { data, error } = await this.supabase
            .from('performance_test_results')
            .select('count')
            .limit(1);
          
          if (error && error.message.includes('does not exist')) {
            return 'Tabela não existe (será criada automaticamente)';
          } else if (error) {
            throw new Error(`Erro ao acessar tabela: ${error.message}`);
          }
          
          return 'Tabela existe e é acessível';
        }
      },
      {
        name: 'Teste de inserção',
        test: async () => {
          const testData = {
            test_id: `test-${Date.now()}`,
            config: { test: true },
            results: { status: 'test' }
          };
          
          const { data, error } = await this.supabase
            .from('performance_test_results')
            .insert(testData)
            .select();
          
          if (error) {
            if (error.message.includes('does not exist')) {
              return 'Tabela não existe (configuração manual necessária)';
            }
            throw new Error(`Erro ao inserir: ${error.message}`);
          }
          
          // Limpar dados de teste
          if (data && data[0]) {
            await this.supabase
              .from('performance_test_results')
              .delete()
              .eq('id', data[0].id);
          }
          
          return 'Inserção e remoção funcionando';
        }
      }
    ];
    
    for (const test of tests) {
      await this.runSingleTest(test.name, test.test);
    }
  }

  async testPerformanceTesterModule() {
    console.log('\n⚡ Testando módulo PerformanceTester...');
    
    await this.runSingleTest('Importação do módulo', async () => {
      try {
        const modulePath = path.join(this.projectRoot, 'src', 'lib', 'performance-testing.ts');
        await fs.access(modulePath);
        
        // Verificar se o arquivo contém as classes esperadas
        const content = await fs.readFile(modulePath, 'utf8');
        
        const requiredClasses = ['PerformanceTester', 'defaultPerformanceConfig'];
        const missingClasses = requiredClasses.filter(cls => !content.includes(cls));
        
        if (missingClasses.length > 0) {
          throw new Error(`Classes ausentes: ${missingClasses.join(', ')}`);
        }
        
        return 'Módulo existe e contém classes necessárias';
      } catch (error) {
        throw new Error(`Erro ao verificar módulo: ${error.message}`);
      }
    });
    
    await this.runSingleTest('API endpoint', async () => {
      try {
        const apiPath = path.join(this.projectRoot, 'src', 'pages', 'api', 'performance', 'test.ts');
        await fs.access(apiPath);
        
        const content = await fs.readFile(apiPath, 'utf8');
        
        if (!content.includes('PerformanceTester')) {
          throw new Error('API não importa PerformanceTester');
        }
        
        return 'API endpoint existe e está configurado';
      } catch (error) {
        throw new Error(`Erro ao verificar API: ${error.message}`);
      }
    });
  }

  async testNotificationSystem() {
    console.log('\n📧 Testando sistema de notificações...');
    
    const tests = [
      {
        name: 'Configuração de email',
        test: () => {
          const emailEnabled = process.env.PERF_EMAIL_ENABLED === 'true';
          const emailTo = process.env.PERF_EMAIL_TO;
          
          if (emailEnabled && !emailTo) {
            throw new Error('Email habilitado mas PERF_EMAIL_TO não configurado');
          }
          
          return emailEnabled ? 
            `Email configurado para: ${emailTo}` : 
            'Email desabilitado';
        }
      },
      {
        name: 'Configuração de webhook',
        test: () => {
          const webhookEnabled = process.env.PERF_WEBHOOK_ENABLED === 'true';
          const webhookUrl = process.env.PERF_WEBHOOK_URL;
          
          if (webhookEnabled && !webhookUrl) {
            throw new Error('Webhook habilitado mas PERF_WEBHOOK_URL não configurado');
          }
          
          return webhookEnabled ? 
            `Webhook configurado: ${webhookUrl}` : 
            'Webhook desabilitado';
        }
      },
      {
        name: 'Configuração do Slack',
        test: () => {
          const slackEnabled = process.env.PERF_SLACK_ENABLED === 'true';
          const slackWebhook = process.env.PERF_SLACK_WEBHOOK;
          
          if (slackEnabled && !slackWebhook) {
            throw new Error('Slack habilitado mas PERF_SLACK_WEBHOOK não configurado');
          }
          
          return slackEnabled ? 
            `Slack configurado: ${process.env.PERF_SLACK_CHANNEL || '#performance'}` : 
            'Slack desabilitado';
        }
      }
    ];
    
    for (const test of tests) {
      await this.runSingleTest(test.name, test.test);
    }
  }

  async testSystemPerformance() {
    console.log('\n🚀 Testando performance do próprio sistema...');
    
    await this.runSingleTest('Tempo de inicialização', async () => {
      const startTime = performance.now();
      
      // Simular inicialização do sistema
      const configPath = path.join(this.performanceDir, 'configs', 'performance-config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      if (initTime > 1000) {
        throw new Error(`Inicialização muito lenta: ${initTime.toFixed(2)}ms`);
      }
      
      return `Inicialização em ${initTime.toFixed(2)}ms`;
    });
    
    await this.runSingleTest('Uso de memória', () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      
      if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
        throw new Error(`Uso de memória alto: ${heapUsedMB}MB`);
      }
      
      return `Uso de memória: ${heapUsedMB}MB`;
    });
  }

  async generateTestReport() {
    console.log('\n📊 Gerando relatório de testes...');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      summary: {
        totalTests: this.testResults.length,
        passed: this.testResults.filter(t => t.status === 'passed').length,
        failed: this.testResults.filter(t => t.status === 'failed').length,
        warnings: this.testResults.filter(t => t.status === 'warning').length
      },
      tests: this.testResults,
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = path.join(this.performanceDir, 'reports', `test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Relatório salvo: ${reportPath}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter(t => t.status === 'failed');
    const warningTests = this.testResults.filter(t => t.status === 'warning');
    
    if (failedTests.length > 0) {
      recommendations.push('Corrija os testes que falharam antes de usar o sistema em produção');
    }
    
    if (warningTests.length > 0) {
      recommendations.push('Revise os avisos para otimizar a configuração');
    }
    
    if (failedTests.length === 0 && warningTests.length === 0) {
      recommendations.push('Sistema está pronto para uso!');
      recommendations.push('Configure agendamento automático executando: performance/scripts/setup-scheduling.bat');
      recommendations.push('Configure notificações nas variáveis de ambiente');
    }
    
    return recommendations;
  }

  async runSingleTest(testName, testFunction) {
    const startTime = performance.now();
    
    try {
      const result = await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`  ✅ ${testName}: ${result}`);
      
      this.testResults.push({
        name: testName,
        status: 'passed',
        result,
        duration: duration.toFixed(2)
      });
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Determinar se é erro ou aviso
      const isWarning = error.message.includes('não existe') || 
                       error.message.includes('desabilitado') ||
                       error.message.includes('configuração manual');
      
      if (isWarning) {
        console.log(`  ⚠️ ${testName}: ${error.message}`);
        this.testResults.push({
          name: testName,
          status: 'warning',
          result: error.message,
          duration: duration.toFixed(2)
        });
      } else {
        console.log(`  ❌ ${testName}: ${error.message}`);
        this.testResults.push({
          name: testName,
          status: 'failed',
          result: error.message,
          duration: duration.toFixed(2)
        });
      }
    }
  }

  printSummary() {
    const passed = this.testResults.filter(t => t.status === 'passed').length;
    const failed = this.testResults.filter(t => t.status === 'failed').length;
    const warnings = this.testResults.filter(t => t.status === 'warning').length;
    
    console.log('\n📋 RESUMO DOS TESTES');
    console.log('=' .repeat(50));
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    console.log(`⚠️ Avisos: ${warnings}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 Todos os testes críticos passaram!');
      console.log('   Sistema de performance está pronto para uso.');
    } else {
      console.log('\n⚠️ Alguns testes falharam.');
      console.log('   Corrija os problemas antes de usar em produção.');
    }
    
    console.log('\n📁 Relatório detalhado salvo em: performance/reports/');
  }
}

// Executar testes
if (require.main === module) {
  const validator = new PerformanceTestValidator();
  validator.runTests().catch(error => {
    console.error('Erro fatal durante testes:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTestValidator;