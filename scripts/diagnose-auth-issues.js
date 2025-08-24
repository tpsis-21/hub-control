/**
 * Script de Diagnóstico de Problemas de Autenticação
 * 
 * Este script executa uma série de testes para identificar problemas
 * comuns de autenticação e conectividade com o Supabase.
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

class AuthDiagnostics {
  constructor() {
    this.results = {
      environment: { passed: 0, failed: 0, warnings: 0, details: [] },
      connectivity: { passed: 0, failed: 0, warnings: 0, details: [] },
      authentication: { passed: 0, failed: 0, warnings: 0, details: [] },
      middleware: { passed: 0, failed: 0, warnings: 0, details: [] },
      cors: { passed: 0, failed: 0, warnings: 0, details: [] }
    };
  }

  async runDiagnostics() {
    logSection('DIAGNÓSTICO DE PROBLEMAS DE AUTENTICAÇÃO');
    
    await this.checkEnvironmentVariables();
    await this.checkSupabaseConnectivity();
    await this.checkAuthEndpoints();
    await this.checkCORSConfiguration();
    await this.checkMiddlewareConfiguration();
    
    this.generateReport();
  }

  async checkEnvironmentVariables() {
    logSection('1. VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE');
    
    const requiredVars = {
      'NEXT_PUBLIC_SUPABASE_URL': supabaseUrl,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': supabaseAnonKey,
      'SUPABASE_SERVICE_ROLE_KEY': supabaseServiceKey
    };

    for (const [varName, value] of Object.entries(requiredVars)) {
      if (!value) {
        this.results.environment.failed++;
        this.results.environment.details.push(`❌ ${varName}: Não configurada`);
        log(`❌ ${varName}: Não configurada`, 'red');
      } else if (value.length < 20) {
        this.results.environment.warnings++;
        this.results.environment.details.push(`⚠️ ${varName}: Valor suspeito (muito curto)`);
        log(`⚠️ ${varName}: Valor suspeito (muito curto)`, 'yellow');
      } else {
        this.results.environment.passed++;
        this.results.environment.details.push(`✅ ${varName}: Configurada`);
        log(`✅ ${varName}: Configurada`, 'green');
      }
    }

    // Verificar formato da URL
    if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
      this.results.environment.warnings++;
      this.results.environment.details.push(`⚠️ URL do Supabase não parece válida: ${supabaseUrl}`);
      log(`⚠️ URL do Supabase não parece válida`, 'yellow');
    }
  }

  async checkSupabaseConnectivity() {
    logSection('2. TESTE DE CONECTIVIDADE COM SUPABASE');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      this.results.connectivity.failed++;
      this.results.connectivity.details.push('❌ Não é possível testar conectividade sem variáveis de ambiente');
      log('❌ Não é possível testar conectividade sem variáveis de ambiente', 'red');
      return;
    }

    // Teste 1: Endpoint de configurações (público)
    try {
      log('🔍 Testando endpoint de configurações...', 'blue');
      const settingsUrl = `${supabaseUrl}/auth/v1/settings`;
      const response = await fetch(settingsUrl, {
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.results.connectivity.passed++;
        this.results.connectivity.details.push('✅ Endpoint de configurações: Acessível');
        log('✅ Endpoint de configurações: Acessível', 'green');
        
        const settings = await response.json();
        log(`   Provedores habilitados: ${settings.external?.email ? 'Email' : 'Nenhum'}`, 'blue');
      } else {
        this.results.connectivity.failed++;
        this.results.connectivity.details.push(`❌ Endpoint de configurações: HTTP ${response.status}`);
        log(`❌ Endpoint de configurações: HTTP ${response.status}`, 'red');
      }
    } catch (error) {
      this.results.connectivity.failed++;
      this.results.connectivity.details.push(`❌ Erro de conectividade: ${error.message}`);
      log(`❌ Erro de conectividade: ${error.message}`, 'red');
    }

    // Teste 2: Cliente Supabase
    try {
      log('🔍 Testando cliente Supabase...', 'blue');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Teste simples de consulta
      const { data, error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('relation "profiles" does not exist')) {
          this.results.connectivity.warnings++;
          this.results.connectivity.details.push('⚠️ Tabela profiles não existe (normal em projetos novos)');
          log('⚠️ Tabela profiles não existe (normal em projetos novos)', 'yellow');
        } else {
          this.results.connectivity.failed++;
          this.results.connectivity.details.push(`❌ Erro na consulta: ${error.message}`);
          log(`❌ Erro na consulta: ${error.message}`, 'red');
        }
      } else {
        this.results.connectivity.passed++;
        this.results.connectivity.details.push('✅ Cliente Supabase: Funcionando');
        log('✅ Cliente Supabase: Funcionando', 'green');
      }
    } catch (error) {
      this.results.connectivity.failed++;
      this.results.connectivity.details.push(`❌ Erro no cliente: ${error.message}`);
      log(`❌ Erro no cliente: ${error.message}`, 'red');
    }
  }

  async checkAuthEndpoints() {
    logSection('3. TESTE DE ENDPOINTS DE AUTENTICAÇÃO');
    
    const endpoints = [
      { path: '/api/auth/login', method: 'POST', description: 'Login' },
      { path: '/api/auth/register', method: 'POST', description: 'Registro' },
      { path: '/api/auth/logout', method: 'POST', description: 'Logout' }
    ];

    for (const endpoint of endpoints) {
      try {
        log(`🔍 Testando ${endpoint.description} (${endpoint.method} ${endpoint.path})...`, 'blue');
        
        const response = await fetch(`http://localhost:9010${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'testpassword123'
          })
        });

        if (response.status === 400 || response.status === 401) {
          // Esperado para credenciais inválidas
          this.results.authentication.passed++;
          this.results.authentication.details.push(`✅ ${endpoint.description}: Endpoint respondendo`);
          log(`✅ ${endpoint.description}: Endpoint respondendo (${response.status})`, 'green');
        } else if (response.status === 500) {
          this.results.authentication.failed++;
          this.results.authentication.details.push(`❌ ${endpoint.description}: Erro interno do servidor`);
          log(`❌ ${endpoint.description}: Erro interno do servidor`, 'red');
        } else {
          this.results.authentication.warnings++;
          this.results.authentication.details.push(`⚠️ ${endpoint.description}: Status inesperado ${response.status}`);
          log(`⚠️ ${endpoint.description}: Status inesperado ${response.status}`, 'yellow');
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          this.results.authentication.failed++;
          this.results.authentication.details.push(`❌ ${endpoint.description}: Servidor não está rodando`);
          log(`❌ ${endpoint.description}: Servidor não está rodando`, 'red');
        } else {
          this.results.authentication.failed++;
          this.results.authentication.details.push(`❌ ${endpoint.description}: ${error.message}`);
          log(`❌ ${endpoint.description}: ${error.message}`, 'red');
        }
      }
    }
  }

  async checkCORSConfiguration() {
    logSection('4. VERIFICAÇÃO DE CONFIGURAÇÕES CORS');
    
    try {
      log('🔍 Testando configurações CORS...', 'blue');
      
      const response = await fetch('http://localhost:9010/api/auth/login', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:9010',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };

      if (corsHeaders['Access-Control-Allow-Origin']) {
        this.results.cors.passed++;
        this.results.cors.details.push('✅ CORS: Headers configurados');
        log('✅ CORS: Headers configurados', 'green');
        
        for (const [header, value] of Object.entries(corsHeaders)) {
          if (value) {
            log(`   ${header}: ${value}`, 'blue');
          }
        }
      } else {
        this.results.cors.warnings++;
        this.results.cors.details.push('⚠️ CORS: Headers não encontrados');
        log('⚠️ CORS: Headers não encontrados', 'yellow');
      }
    } catch (error) {
      this.results.cors.failed++;
      this.results.cors.details.push(`❌ Erro ao testar CORS: ${error.message}`);
      log(`❌ Erro ao testar CORS: ${error.message}`, 'red');
    }
  }

  async checkMiddlewareConfiguration() {
    logSection('5. VERIFICAÇÃO DE CONFIGURAÇÃO DO MIDDLEWARE');
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Verificar se o middleware existe
      const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts');
      if (fs.existsSync(middlewarePath)) {
        this.results.middleware.passed++;
        this.results.middleware.details.push('✅ Arquivo middleware.ts encontrado');
        log('✅ Arquivo middleware.ts encontrado', 'green');
        
        // Ler conteúdo do middleware
        const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
        
        // Verificar configurações importantes
        const checks = [
          { pattern: /createServerClient/, description: 'Cliente Supabase SSR' },
          { pattern: /PUBLIC_ROUTES/, description: 'Rotas públicas definidas' },
          { pattern: /PROTECTED_ROUTES/, description: 'Rotas protegidas definidas' },
          { pattern: /getUser\(\)/, description: 'Verificação de usuário' },
          { pattern: /NextResponse\.redirect/, description: 'Redirecionamentos configurados' }
        ];
        
        for (const check of checks) {
          if (check.pattern.test(middlewareContent)) {
            this.results.middleware.passed++;
            this.results.middleware.details.push(`✅ ${check.description}: Configurado`);
            log(`✅ ${check.description}: Configurado`, 'green');
          } else {
            this.results.middleware.warnings++;
            this.results.middleware.details.push(`⚠️ ${check.description}: Não encontrado`);
            log(`⚠️ ${check.description}: Não encontrado`, 'yellow');
          }
        }
      } else {
        this.results.middleware.failed++;
        this.results.middleware.details.push('❌ Arquivo middleware.ts não encontrado');
        log('❌ Arquivo middleware.ts não encontrado', 'red');
      }
    } catch (error) {
      this.results.middleware.failed++;
      this.results.middleware.details.push(`❌ Erro ao verificar middleware: ${error.message}`);
      log(`❌ Erro ao verificar middleware: ${error.message}`, 'red');
    }
  }

  generateReport() {
    logSection('RELATÓRIO FINAL DE DIAGNÓSTICO');
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;
    
    for (const [category, results] of Object.entries(this.results)) {
      totalPassed += results.passed;
      totalFailed += results.failed;
      totalWarnings += results.warnings;
      
      const total = results.passed + results.failed + results.warnings;
      const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      
      log(`\n📊 ${category.toUpperCase()}:`, 'magenta');
      log(`   ✅ Passou: ${results.passed}`, 'green');
      log(`   ❌ Falhou: ${results.failed}`, 'red');
      log(`   ⚠️ Avisos: ${results.warnings}`, 'yellow');
      log(`   📈 Taxa de sucesso: ${percentage}%`, percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');
    }
    
    const overallTotal = totalPassed + totalFailed + totalWarnings;
    const overallPercentage = overallTotal > 0 ? Math.round((totalPassed / overallTotal) * 100) : 0;
    
    log(`\n🎯 RESUMO GERAL:`, 'cyan');
    log(`   ✅ Total passou: ${totalPassed}`, 'green');
    log(`   ❌ Total falhou: ${totalFailed}`, 'red');
    log(`   ⚠️ Total avisos: ${totalWarnings}`, 'yellow');
    log(`   📈 Taxa geral de sucesso: ${overallPercentage}%`, overallPercentage >= 80 ? 'green' : overallPercentage >= 60 ? 'yellow' : 'red');
    
    // Recomendações
    log(`\n💡 RECOMENDAÇÕES:`, 'cyan');
    
    if (totalFailed > 0) {
      log('   🔧 Corrija os problemas críticos (❌) primeiro', 'red');
    }
    
    if (totalWarnings > 0) {
      log('   ⚠️ Revise os avisos para melhorar a estabilidade', 'yellow');
    }
    
    if (overallPercentage >= 80) {
      log('   🎉 Sistema em bom estado! Continue monitorando', 'green');
    } else if (overallPercentage >= 60) {
      log('   🔄 Sistema funcional, mas precisa de melhorias', 'yellow');
    } else {
      log('   🚨 Sistema com problemas críticos - ação imediata necessária', 'red');
    }
    
    log(`\n📝 Para mais detalhes, execute: npm run dev e verifique os logs do console`, 'blue');
  }
}

// Executar diagnóstico
if (require.main === module) {
  const diagnostics = new AuthDiagnostics();
  diagnostics.runDiagnostics().catch(console.error);
}

module.exports = AuthDiagnostics;