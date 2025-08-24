/**
 * Script de Teste do Login Frontend
 * 
 * Este script simula o processo de login do frontend para identificar
 * onde estão ocorrendo os erros net::ERR_ABORTED.
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseUrl = 'http://localhost:9010';

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🔍 ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

class FrontendLoginTester {
  constructor() {
    this.results = [];
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  async runTests() {
    logSection('TESTE COMPLETO DO PROCESSO DE LOGIN FRONTEND');
    
    await this.testServerAvailability();
    await this.testSupabaseDirectAuth();
    await this.testApiLoginEndpoint();
    await this.testLoginFlow();
    await this.testPasswordReset();
    
    this.generateReport();
  }

  async testServerAvailability() {
    logSection('1. VERIFICAÇÃO DE DISPONIBILIDADE DO SERVIDOR');
    
    try {
      log('🔍 Testando se o servidor Next.js está rodando...', 'blue');
      
      const response = await fetch(`${baseUrl}/login`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        this.results.push({ test: 'Servidor Next.js', status: 'PASS', message: 'Servidor respondendo' });
        log('✅ Servidor Next.js: Respondendo', 'green');
        log(`   Status: ${response.status}`, 'blue');
        log(`   Content-Type: ${response.headers.get('content-type')}`, 'blue');
      } else {
        this.results.push({ test: 'Servidor Next.js', status: 'FAIL', message: `HTTP ${response.status}` });
        log(`❌ Servidor Next.js: HTTP ${response.status}`, 'red');
      }
    } catch (error) {
      this.results.push({ test: 'Servidor Next.js', status: 'FAIL', message: error.message });
      log(`❌ Servidor Next.js: ${error.message}`, 'red');
    }
  }

  async testSupabaseDirectAuth() {
    logSection('2. TESTE DE AUTENTICAÇÃO DIRETA COM SUPABASE');
    
    try {
      log('🔍 Testando autenticação direta com Supabase...', 'blue');
      
      // Teste com credenciais inválidas (esperado falhar)
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          this.results.push({ test: 'Supabase Auth Direto', status: 'PASS', message: 'Erro esperado para credenciais inválidas' });
          log('✅ Supabase Auth Direto: Funcionando (erro esperado)', 'green');
          log(`   Erro: ${error.message}`, 'blue');
        } else {
          this.results.push({ test: 'Supabase Auth Direto', status: 'WARN', message: error.message });
          log(`⚠️ Supabase Auth Direto: ${error.message}`, 'yellow');
        }
      } else {
        this.results.push({ test: 'Supabase Auth Direto', status: 'WARN', message: 'Login inesperadamente bem-sucedido' });
        log('⚠️ Supabase Auth Direto: Login inesperadamente bem-sucedido', 'yellow');
      }
    } catch (error) {
      this.results.push({ test: 'Supabase Auth Direto', status: 'FAIL', message: error.message });
      log(`❌ Supabase Auth Direto: ${error.message}`, 'red');
    }
  }

  async testApiLoginEndpoint() {
    logSection('3. TESTE DO ENDPOINT DE LOGIN DA API');
    
    const testCases = [
      {
        name: 'Dados inválidos',
        payload: { email: 'invalid-email', password: '123' },
        expectedStatus: 400
      },
      {
        name: 'Credenciais inválidas',
        payload: { email: 'test@example.com', password: 'wrongpassword' },
        expectedStatus: 401
      },
      {
        name: 'Payload vazio',
        payload: {},
        expectedStatus: 400
      }
    ];

    for (const testCase of testCases) {
      try {
        log(`🔍 Testando ${testCase.name}...`, 'blue');
        
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify(testCase.payload)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }

        if (response.status === testCase.expectedStatus) {
          this.results.push({ test: `API Login - ${testCase.name}`, status: 'PASS', message: `Status correto: ${response.status}` });
          log(`✅ ${testCase.name}: Status correto (${response.status})`, 'green');
          
          if (responseData.error || responseData.message) {
            log(`   Resposta: ${responseData.error || responseData.message}`, 'blue');
          }
        } else {
          this.results.push({ test: `API Login - ${testCase.name}`, status: 'WARN', message: `Status inesperado: ${response.status}` });
          log(`⚠️ ${testCase.name}: Status inesperado (${response.status})`, 'yellow');
          log(`   Resposta: ${JSON.stringify(responseData, null, 2)}`, 'yellow');
        }
      } catch (error) {
        this.results.push({ test: `API Login - ${testCase.name}`, status: 'FAIL', message: error.message });
        log(`❌ ${testCase.name}: ${error.message}`, 'red');
      }
    }
  }

  async testLoginFlow() {
    logSection('4. TESTE DO FLUXO COMPLETO DE LOGIN');
    
    try {
      log('🔍 Simulando fluxo completo de login...', 'blue');
      
      // Passo 1: Acessar página de login
      log('   📄 Passo 1: Acessando página de login...', 'blue');
      const loginPageResponse = await fetch(`${baseUrl}/login`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!loginPageResponse.ok) {
        throw new Error(`Falha ao acessar página de login: ${loginPageResponse.status}`);
      }
      
      log('   ✅ Página de login acessível', 'green');

      // Passo 2: Simular envio do formulário
      log('   📝 Passo 2: Simulando envio do formulário...', 'blue');
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': baseUrl,
          'Referer': `${baseUrl}/login`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });

      const loginData = await loginResponse.json();
      
      if (loginResponse.status === 401 && loginData.error) {
        this.results.push({ test: 'Fluxo Completo de Login', status: 'PASS', message: 'Fluxo funcionando (credenciais inválidas)' });
        log('   ✅ Fluxo funcionando (erro esperado para credenciais inválidas)', 'green');
        log(`   Resposta: ${loginData.message}`, 'blue');
      } else {
        this.results.push({ test: 'Fluxo Completo de Login', status: 'WARN', message: `Status inesperado: ${loginResponse.status}` });
        log(`   ⚠️ Status inesperado: ${loginResponse.status}`, 'yellow');
        log(`   Resposta: ${JSON.stringify(loginData, null, 2)}`, 'yellow');
      }
    } catch (error) {
      this.results.push({ test: 'Fluxo Completo de Login', status: 'FAIL', message: error.message });
      log(`❌ Fluxo Completo de Login: ${error.message}`, 'red');
    }
  }

  async testPasswordReset() {
    logSection('5. TESTE DE RECUPERAÇÃO DE SENHA');
    
    try {
      log('🔍 Testando funcionalidade de recuperação de senha...', 'blue');
      
      // Teste direto com Supabase
      const { data, error } = await this.supabase.auth.resetPasswordForEmail(
        'test@example.com',
        {
          redirectTo: `${baseUrl}/reset-password`
        }
      );

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          this.results.push({ test: 'Recuperação de Senha', status: 'PASS', message: 'Rate limit ativo (segurança funcionando)' });
          log('✅ Recuperação de Senha: Rate limit ativo (segurança funcionando)', 'green');
        } else {
          this.results.push({ test: 'Recuperação de Senha', status: 'WARN', message: error.message });
          log(`⚠️ Recuperação de Senha: ${error.message}`, 'yellow');
        }
      } else {
        this.results.push({ test: 'Recuperação de Senha', status: 'PASS', message: 'Email de recuperação enviado' });
        log('✅ Recuperação de Senha: Email de recuperação enviado', 'green');
      }
    } catch (error) {
      this.results.push({ test: 'Recuperação de Senha', status: 'FAIL', message: error.message });
      log(`❌ Recuperação de Senha: ${error.message}`, 'red');
    }
  }

  generateReport() {
    logSection('RELATÓRIO DE TESTES DO FRONTEND');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    const total = this.results.length;
    
    log(`\n📊 RESUMO DOS TESTES:`, 'magenta');
    log(`   ✅ Passou: ${passed}/${total}`, 'green');
    log(`   ❌ Falhou: ${failed}/${total}`, 'red');
    log(`   ⚠️ Avisos: ${warnings}/${total}`, 'yellow');
    
    const successRate = Math.round((passed / total) * 100);
    log(`   📈 Taxa de sucesso: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
    
    log(`\n📋 DETALHES DOS TESTES:`, 'cyan');
    for (const result of this.results) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      const color = result.status === 'PASS' ? 'green' : result.status === 'FAIL' ? 'red' : 'yellow';
      log(`   ${icon} ${result.test}: ${result.message}`, color);
    }
    
    log(`\n💡 ANÁLISE:`, 'cyan');
    
    if (failed === 0) {
      log('   🎉 Nenhum teste crítico falhou!', 'green');
      log('   🔍 Os erros net::ERR_ABORTED podem estar relacionados a:', 'blue');
      log('     - Cancelamento de requisições pelo usuário', 'blue');
      log('     - Problemas de rede temporários', 'blue');
      log('     - Timeouts de requisição', 'blue');
      log('     - Problemas no navegador/cache', 'blue');
    } else {
      log('   🚨 Problemas críticos encontrados!', 'red');
      log('   🔧 Corrija os testes que falharam primeiro', 'red');
    }
    
    if (warnings > 0) {
      log('   ⚠️ Alguns comportamentos inesperados foram detectados', 'yellow');
      log('   📝 Revise os avisos para melhorar a estabilidade', 'yellow');
    }
    
    log(`\n🔧 PRÓXIMOS PASSOS:`, 'cyan');
    log('   1. Se os testes passaram, o problema pode estar no frontend', 'blue');
    log('   2. Verifique o console do navegador durante o login', 'blue');
    log('   3. Use as ferramentas de desenvolvedor para monitorar requisições', 'blue');
    log('   4. Teste com diferentes navegadores', 'blue');
    log('   5. Limpe o cache do navegador', 'blue');
  }
}

// Executar testes
if (require.main === module) {
  const tester = new FrontendLoginTester();
  tester.runTests().catch(console.error);
}

module.exports = FrontendLoginTester;