/**
 * Script para Adicionar Logs Detalhados no Sistema de Autenticação
 * 
 * Este script adiciona logs detalhados em pontos críticos do processo de autenticação
 * para identificar onde estão ocorrendo os erros net::ERR_ABORTED.
 */

const fs = require('fs');
const path = require('path');

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
  log(`🔧 ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

class AuthLoggingEnhancer {
  constructor() {
    this.modifications = [];
    this.backupDir = path.join(process.cwd(), 'backups', 'auth-logging');
  }

  async enhanceLogging() {
    logSection('ADICIONANDO LOGS DETALHADOS NO SISTEMA DE AUTENTICAÇÃO');
    
    // Criar diretório de backup
    this.createBackupDirectory();
    
    // Adicionar logs no middleware
    await this.enhanceMiddlewareLogging();
    
    // Adicionar logs na API de login
    await this.enhanceLoginApiLogging();
    
    // Adicionar logs no componente de login
    await this.enhanceLoginFormLogging();
    
    // Adicionar logs no cliente Supabase
    await this.enhanceSupabaseClientLogging();
    
    this.generateReport();
  }

  createBackupDirectory() {
    log('📁 Criando diretório de backup...', 'blue');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      log('✅ Diretório de backup criado', 'green');
    } else {
      log('ℹ️ Diretório de backup já existe', 'yellow');
    }
  }

  backupFile(filePath) {
    const fileName = path.basename(filePath);
    const backupPath = path.join(this.backupDir, `${fileName}.backup`);
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      log(`💾 Backup criado: ${backupPath}`, 'blue');
      return true;
    }
    
    log(`⚠️ Arquivo não encontrado: ${filePath}`, 'yellow');
    return false;
  }

  async enhanceMiddlewareLogging() {
    logSection('1. ADICIONANDO LOGS NO MIDDLEWARE');
    
    const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts');
    
    if (!this.backupFile(middlewarePath)) {
      return;
    }

    try {
      let content = fs.readFileSync(middlewarePath, 'utf8');
      
      // Adicionar imports para logging
      const loggingImports = `
// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    console.log(\`[MIDDLEWARE DEBUG] \${new Date().toISOString()} - \${message}\`, data || '');
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG_AUTH) {
    console.error(\`[MIDDLEWARE ERROR] \${new Date().toISOString()} - \${message}\`, error || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===\n`;

      // Inserir após os imports existentes
      const importRegex = /(import.*from.*['"];?\s*)+/;
      content = content.replace(importRegex, (match) => match + loggingImports);

      // Adicionar logs em pontos críticos
      const logPoints = [
        {
          search: 'export async function middleware(request: NextRequest)',
          replace: `export async function middleware(request: NextRequest) {
  debugLog('Middleware iniciado', { 
    url: request.url, 
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin')
  });`
        },
        {
          search: 'const { user, error } = await getUser(supabase);',
          replace: `debugLog('Tentando obter usuário do Supabase');
  const { user, error } = await getUser(supabase);
  debugLog('Resultado da obtenção do usuário', { 
    hasUser: !!user, 
    userId: user?.id, 
    error: error?.message 
  });`
        },
        {
          search: 'return NextResponse.json(',
          replace: `debugLog('Retornando resposta de erro', { status: 401, pathname });
  return NextResponse.json(`
        }
      ];

      for (const point of logPoints) {
        if (content.includes(point.search)) {
          content = content.replace(point.search, point.replace);
          log(`✅ Log adicionado: ${point.search.substring(0, 50)}...`, 'green');
        } else {
          log(`⚠️ Ponto de log não encontrado: ${point.search.substring(0, 50)}...`, 'yellow');
        }
      }

      fs.writeFileSync(middlewarePath, content);
      this.modifications.push('Middleware - Logs de debug adicionados');
      log('✅ Logs adicionados no middleware', 'green');
      
    } catch (error) {
      log(`❌ Erro ao modificar middleware: ${error.message}`, 'red');
    }
  }

  async enhanceLoginApiLogging() {
    logSection('2. ADICIONANDO LOGS NA API DE LOGIN');
    
    const apiPath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'login', 'route.ts');
    
    if (!this.backupFile(apiPath)) {
      return;
    }

    try {
      let content = fs.readFileSync(apiPath, 'utf8');
      
      // Adicionar função de debug logging
      const debugFunction = `
// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    console.log(\`[LOGIN API DEBUG] \${new Date().toISOString()} - \${message}\`, data || '');
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG_AUTH) {
    console.error(\`[LOGIN API ERROR] \${new Date().toISOString()} - \${message}\`, error || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===\n`;

      // Inserir após os imports
      const importRegex = /(import.*from.*['"];?\s*)+/;
      content = content.replace(importRegex, (match) => match + debugFunction);

      // Adicionar logs em pontos críticos
      const logPoints = [
        {
          search: 'export async function POST(request: Request)',
          replace: `export async function POST(request: Request) {
  debugLog('Requisição de login recebida', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });`
        },
        {
          search: 'const body = await request.json();',
          replace: `const body = await request.json();
  debugLog('Body da requisição recebido', { 
    hasEmail: !!body.email, 
    emailDomain: body.email?.split('@')[1],
    hasPassword: !!body.password 
  });`
        },
        {
          search: 'const { data, error } = await supabase.auth.signInWithPassword({',
          replace: `debugLog('Tentando autenticação com Supabase');
  const { data, error } = await supabase.auth.signInWithPassword({`
        },
        {
          search: 'if (error) {',
          replace: `debugLog('Resultado da autenticação', { 
    hasData: !!data, 
    hasUser: !!data?.user, 
    hasSession: !!data?.session,
    error: error?.message 
  });
  
  if (error) {
    debugError('Erro na autenticação Supabase', error);`
        }
      ];

      for (const point of logPoints) {
        if (content.includes(point.search)) {
          content = content.replace(point.search, point.replace);
          log(`✅ Log adicionado: ${point.search.substring(0, 50)}...`, 'green');
        } else {
          log(`⚠️ Ponto de log não encontrado: ${point.search.substring(0, 50)}...`, 'yellow');
        }
      }

      fs.writeFileSync(apiPath, content);
      this.modifications.push('API Login - Logs de debug adicionados');
      log('✅ Logs adicionados na API de login', 'green');
      
    } catch (error) {
      log(`❌ Erro ao modificar API de login: ${error.message}`, 'red');
    }
  }

  async enhanceLoginFormLogging() {
    logSection('3. ADICIONANDO LOGS NO COMPONENTE DE LOGIN');
    
    const formPath = path.join(process.cwd(), 'src', 'components', 'auth', 'login-form.tsx');
    
    if (!this.backupFile(formPath)) {
      return;
    }

    try {
      let content = fs.readFileSync(formPath, 'utf8');
      
      // Adicionar função de debug logging
      const debugFunction = `
// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    console.log(\`[LOGIN FORM DEBUG] \${new Date().toISOString()} - \${message}\`, data || '');
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG_AUTH) {
    console.error(\`[LOGIN FORM ERROR] \${new Date().toISOString()} - \${message}\`, error || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===\n`;

      // Inserir após os imports
      const importRegex = /(import.*from.*['"];?\s*)+/;
      content = content.replace(importRegex, (match) => match + debugFunction);

      // Adicionar logs no handleLogin
      const logPoints = [
        {
          search: 'const handleLogin = async (e: React.FormEvent) => {',
          replace: `const handleLogin = async (e: React.FormEvent) => {
    debugLog('Iniciando processo de login', { 
      email: email?.substring(0, 3) + '***',
      hasPassword: !!password,
      timestamp: new Date().toISOString()
    });`
        },
        {
          search: 'const response = await fetch(\'/api/auth/login\', {',
          replace: `debugLog('Enviando requisição para API', {
      url: '/api/auth/login',
      method: 'POST',
      hasBody: true
    });
    
    const response = await fetch('/api/auth/login', {`
        },
        {
          search: 'const data = await response.json();',
          replace: `debugLog('Resposta recebida', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    const data = await response.json();
    debugLog('Dados da resposta', { data });`
        },
        {
          search: '} catch (error) {',
          replace: `} catch (error) {
      debugError('Erro capturado no handleLogin', {
        error: error,
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });`
        }
      ];

      for (const point of logPoints) {
        if (content.includes(point.search)) {
          content = content.replace(point.search, point.replace);
          log(`✅ Log adicionado: ${point.search.substring(0, 50)}...`, 'green');
        } else {
          log(`⚠️ Ponto de log não encontrado: ${point.search.substring(0, 50)}...`, 'yellow');
        }
      }

      fs.writeFileSync(formPath, content);
      this.modifications.push('Login Form - Logs de debug adicionados');
      log('✅ Logs adicionados no componente de login', 'green');
      
    } catch (error) {
      log(`❌ Erro ao modificar componente de login: ${error.message}`, 'red');
    }
  }

  async enhanceSupabaseClientLogging() {
    logSection('4. ADICIONANDO LOGS NO CLIENTE SUPABASE');
    
    const clientPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'clients', 'browser.ts');
    
    if (!this.backupFile(clientPath)) {
      return;
    }

    try {
      let content = fs.readFileSync(clientPath, 'utf8');
      
      // Adicionar função de debug logging
      const debugFunction = `
// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    console.log(\`[SUPABASE CLIENT DEBUG] \${new Date().toISOString()} - \${message}\`, data || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===\n`;

      // Inserir após os imports
      const importRegex = /(import.*from.*['"];?\s*)+/;
      content = content.replace(importRegex, (match) => match + debugFunction);

      // Adicionar logs na criação do cliente
      const logPoints = [
        {
          search: 'export function createBrowserSupabaseClient() {',
          replace: `export function createBrowserSupabaseClient() {
  debugLog('Criando cliente Supabase do navegador', {
    url: supabaseConfig.url,
    hasAnonKey: !!supabaseConfig.anonKey
  });`
        }
      ];

      for (const point of logPoints) {
        if (content.includes(point.search)) {
          content = content.replace(point.search, point.replace);
          log(`✅ Log adicionado: ${point.search.substring(0, 50)}...`, 'green');
        } else {
          log(`⚠️ Ponto de log não encontrado: ${point.search.substring(0, 50)}...`, 'yellow');
        }
      }

      fs.writeFileSync(clientPath, content);
      this.modifications.push('Supabase Client - Logs de debug adicionados');
      log('✅ Logs adicionados no cliente Supabase', 'green');
      
    } catch (error) {
      log(`❌ Erro ao modificar cliente Supabase: ${error.message}`, 'red');
    }
  }

  generateReport() {
    logSection('RELATÓRIO DE MODIFICAÇÕES');
    
    log(`\n📊 RESUMO:`, 'magenta');
    log(`   ✅ Modificações realizadas: ${this.modifications.length}`, 'green');
    
    log(`\n📋 DETALHES:`, 'cyan');
    for (const modification of this.modifications) {
      log(`   ✅ ${modification}`, 'green');
    }
    
    log(`\n💾 BACKUPS:`, 'cyan');
    log(`   📁 Diretório: ${this.backupDir}`, 'blue');
    log(`   ℹ️ Para restaurar: copie os arquivos .backup de volta`, 'blue');
    
    log(`\n🔧 PRÓXIMOS PASSOS:`, 'cyan');
    log('   1. Reinicie o servidor de desenvolvimento', 'blue');
    log('   2. Abra o console do navegador (F12)', 'blue');
    log('   3. Tente fazer login e observe os logs detalhados', 'blue');
    log('   4. Procure por mensagens [LOGIN FORM DEBUG], [LOGIN API DEBUG], etc.', 'blue');
    log('   5. Use o arquivo test-browser-login.html para testes adicionais', 'blue');
    
    log(`\n⚠️ IMPORTANTE:`, 'yellow');
    log('   - Os logs só aparecem em modo de desenvolvimento', 'yellow');
    log('   - Remova os logs antes de fazer deploy para produção', 'yellow');
    log('   - Use o script remove-auth-logging.js para limpar os logs', 'yellow');
  }
}

// Executar melhorias
if (require.main === module) {
  const enhancer = new AuthLoggingEnhancer();
  enhancer.enhanceLogging().catch(console.error);
}

module.exports = AuthLoggingEnhancer;