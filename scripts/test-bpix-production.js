/**
 * Script de teste para integração BPIX em produção
 * Valida todas as funcionalidades críticas da integração
 */

const https = require('https');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

// Configurações
const config = {
  apiUrl: process.env.GATES2B_API_URL || process.env.BPIX_API_URL || 'https://api.gates2b.com',
  apiKey: process.env.BPIX_API_KEY,
  webhookUrl: process.env.BPIX_WEBHOOK_URL,
  encryptionKey: process.env.BPIX_ENCRYPTION_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Utilitários
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Função para fazer requisições HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
            responseTime,
            rawData: data,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            responseTime,
            rawData: data,
            parseError: error.message,
          });
        }
      });
    });
    
    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      reject({ error: error.message, responseTime });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject({ error: 'Timeout', responseTime: 10000 });
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Testes
class BpixProductionTests {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
  }

  addResult(name, status, message, details = {}) {
    this.results.total++;
    this.results.tests.push({
      name,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
    });

    if (status === 'passed') {
      this.results.passed++;
      logSuccess(`${name}: ${message}`);
    } else if (status === 'failed') {
      this.results.failed++;
      logError(`${name}: ${message}`);
    } else if (status === 'warning') {
      this.results.warnings++;
      logWarning(`${name}: ${message}`);
    }

    if (details.responseTime) {
      logInfo(`  Tempo de resposta: ${details.responseTime}ms`);
    }
  }

  async testEnvironmentVariables() {
    logInfo('\n🔧 Testando variáveis de ambiente...');

    const requiredVars = [
      'BPIX_API_URL',
      'BPIX_API_KEY',
      'BPIX_WEBHOOK_URL',
      'BPIX_ENCRYPTION_KEY',
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        this.addResult(
          'Environment Variables',
          'failed',
          `${varName} não está definida`
        );
      } else if (varName === 'BPIX_ENCRYPTION_KEY' && value.length < 32) {
        this.addResult(
          'Environment Variables',
          'warning',
          `${varName} deve ter pelo menos 32 caracteres`
        );
      } else {
        this.addResult(
          'Environment Variables',
          'passed',
          `${varName} está configurada corretamente`
        );
      }
    }
  }

  async testBpixApiConnectivity() {
    logInfo('\n🌐 Testando conectividade com API BPIX...');

    try {
      const response = await makeRequest(`${config.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.statusCode === 200) {
        this.addResult(
          'BPIX API Connectivity',
          'passed',
          'API BPIX está acessível',
          { responseTime: response.responseTime }
        );
      } else {
        this.addResult(
          'BPIX API Connectivity',
          'failed',
          `API retornou status ${response.statusCode}`,
          { responseTime: response.responseTime, statusCode: response.statusCode }
        );
      }
    } catch (error) {
      this.addResult(
        'BPIX API Connectivity',
        'failed',
        `Erro ao conectar: ${error.error}`,
        { responseTime: error.responseTime }
      );
    }
  }

  async testWebhookEndpoint() {
    logInfo('\n🔗 Testando endpoint de webhook...');

    if (!config.webhookUrl) {
      this.addResult(
        'Webhook Endpoint',
        'failed',
        'BPIX_WEBHOOK_URL não está configurada'
      );
      return;
    }

    try {
      const response = await makeRequest(config.webhookUrl, {
        method: 'HEAD',
      });

      if (response.statusCode < 500) {
        this.addResult(
          'Webhook Endpoint',
          'passed',
          'Endpoint de webhook está acessível',
          { responseTime: response.responseTime, statusCode: response.statusCode }
        );
      } else {
        this.addResult(
          'Webhook Endpoint',
          'warning',
          `Endpoint retornou status ${response.statusCode}`,
          { responseTime: response.responseTime, statusCode: response.statusCode }
        );
      }
    } catch (error) {
      this.addResult(
        'Webhook Endpoint',
        'failed',
        `Erro ao acessar webhook: ${error.error}`,
        { responseTime: error.responseTime }
      );
    }
  }

  async testHealthCheckEndpoint() {
    logInfo('\n🏥 Testando endpoint de health check...');

    try {
      const response = await makeRequest(`${config.appUrl}/api/health/bpix`, {
        method: 'GET',
      });

      if (response.statusCode === 200 && response.data) {
        const healthData = response.data;
        if (healthData.status === 'healthy') {
          this.addResult(
            'Health Check Endpoint',
            'passed',
            'Health check está funcionando e sistema está saudável',
            { responseTime: response.responseTime, healthStatus: healthData.status }
          );
        } else {
          this.addResult(
            'Health Check Endpoint',
            'warning',
            `Health check funcionando mas status é: ${healthData.status}`,
            { responseTime: response.responseTime, healthStatus: healthData.status }
          );
        }
      } else {
        this.addResult(
          'Health Check Endpoint',
          'failed',
          `Health check retornou status ${response.statusCode}`,
          { responseTime: response.responseTime, statusCode: response.statusCode }
        );
      }
    } catch (error) {
      this.addResult(
        'Health Check Endpoint',
        'failed',
        `Erro ao acessar health check: ${error.error}`,
        { responseTime: error.responseTime }
      );
    }
  }

  async testPaymentCreation() {
    logInfo('\n💳 Testando criação de pagamento (simulação)...');

    const testPayment = {
      amount: 1000, // R$ 10,00
      description: 'Teste de integração BPIX',
      customer: {
        name: 'Teste Cliente',
        email: 'teste@exemplo.com',
        document: '12345678901',
      },
    };

    try {
      const response = await makeRequest(`${config.apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayment),
      });

      if (response.statusCode === 201 || response.statusCode === 200) {
        this.addResult(
          'Payment Creation',
          'passed',
          'Criação de pagamento está funcionando',
          { responseTime: response.responseTime, statusCode: response.statusCode }
        );
      } else {
        this.addResult(
          'Payment Creation',
          'warning',
          `API retornou status ${response.statusCode} para criação de pagamento`,
          { responseTime: response.responseTime, statusCode: response.statusCode }
        );
      }
    } catch (error) {
      this.addResult(
        'Payment Creation',
        'failed',
        `Erro ao criar pagamento: ${error.error}`,
        { responseTime: error.responseTime }
      );
    }
  }

  async testEncryption() {
    logInfo('\n🔐 Testando criptografia...');

    if (!config.encryptionKey) {
      this.addResult(
        'Encryption',
        'failed',
        'Chave de criptografia não está configurada'
      );
      return;
    }

    try {
      const testData = 'dados sensíveis de teste';
      const cipher = crypto.createCipher('aes-256-cbc', config.encryptionKey);
      let encrypted = cipher.update(testData, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const decipher = crypto.createDecipher('aes-256-cbc', config.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      if (decrypted === testData) {
        this.addResult(
          'Encryption',
          'passed',
          'Criptografia está funcionando corretamente'
        );
      } else {
        this.addResult(
          'Encryption',
          'failed',
          'Erro na criptografia: dados não coincidem'
        );
      }
    } catch (error) {
      this.addResult(
        'Encryption',
        'failed',
        `Erro na criptografia: ${error.message}`
      );
    }
  }

  async runAllTests() {
    log('\n🚀 Iniciando testes de produção BPIX...', 'cyan');
    log('=' .repeat(50), 'cyan');

    await this.testEnvironmentVariables();
    await this.testBpixApiConnectivity();
    await this.testWebhookEndpoint();
    await this.testHealthCheckEndpoint();
    await this.testPaymentCreation();
    await this.testEncryption();

    this.printSummary();
  }

  printSummary() {
    log('\n' + '=' .repeat(50), 'cyan');
    log('📊 RESUMO DOS TESTES', 'cyan');
    log('=' .repeat(50), 'cyan');

    log(`Total de testes: ${this.results.total}`);
    logSuccess(`Passou: ${this.results.passed}`);
    logError(`Falhou: ${this.results.failed}`);
    logWarning(`Avisos: ${this.results.warnings}`);

    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    log(`\nTaxa de sucesso: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

    if (this.results.failed > 0) {
      log('\n❌ TESTES QUE FALHARAM:', 'red');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          log(`  • ${test.name}: ${test.message}`, 'red');
        });
    }

    if (this.results.warnings > 0) {
      log('\n⚠️  AVISOS:', 'yellow');
      this.results.tests
        .filter(test => test.status === 'warning')
        .forEach(test => {
          log(`  • ${test.name}: ${test.message}`, 'yellow');
        });
    }

    log('\n🏁 Testes concluídos!', 'cyan');
    
    // Salva relatório em arquivo
    const fs = require('fs');
    const reportPath = `./bpix-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    logInfo(`Relatório salvo em: ${reportPath}`);
  }
}

// Executa os testes se o script for chamado diretamente
if (require.main === module) {
  const tests = new BpixProductionTests();
  tests.runAllTests().catch(error => {
    logError(`Erro fatal nos testes: ${error.message}`);
    process.exit(1);
  });
}

module.exports = BpixProductionTests;