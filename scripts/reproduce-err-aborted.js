const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Script para reproduzir e diagnosticar o erro net::ERR_ABORTED
 * usando automação de navegador com Puppeteer
 */

class ErrorAbortedReproducer {
    constructor() {
        this.baseUrl = 'http://localhost:9010';
        this.dashboardUrl = `${this.baseUrl}/dashboard`;
        this.loginUrl = `${this.baseUrl}/login`;
        this.results = {
            timestamp: new Date().toISOString(),
            tests: [],
            networkLogs: [],
            consoleLogs: [],
            errors: [],
            summary: {}
        };
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}`;
        console.log(logEntry);
        
        this.results.tests.push({
            timestamp,
            level,
            message
        });
    }

    async setupBrowser() {
        this.log('🚀 Iniciando navegador Puppeteer...', 'INFO');
        
        this.browser = await puppeteer.launch({
            headless: false, // Mostrar navegador para debug
            devtools: true,  // Abrir DevTools
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Configurar viewport
        await this.page.setViewport({ width: 1280, height: 720 });
        
        // Interceptar requisições de rede
        await this.page.setRequestInterception(true);
        
        this.page.on('request', (request) => {
            const logEntry = {
                timestamp: new Date().toISOString(),
                type: 'request',
                method: request.method(),
                url: request.url(),
                headers: request.headers()
            };
            
            this.results.networkLogs.push(logEntry);
            
            if (request.url().includes('/dashboard')) {
                this.log(`📡 Requisição Dashboard: ${request.method()} ${request.url()}`, 'NETWORK');
            }
            
            request.continue();
        });
        
        this.page.on('response', (response) => {
            const logEntry = {
                timestamp: new Date().toISOString(),
                type: 'response',
                status: response.status(),
                url: response.url(),
                headers: response.headers()
            };
            
            this.results.networkLogs.push(logEntry);
            
            if (response.url().includes('/dashboard')) {
                this.log(`📨 Resposta Dashboard: ${response.status()} ${response.url()}`, 'NETWORK');
            }
        });
        
        this.page.on('requestfailed', (request) => {
            const error = {
                timestamp: new Date().toISOString(),
                type: 'request_failed',
                url: request.url(),
                failure: request.failure(),
                method: request.method()
            };
            
            this.results.errors.push(error);
            
            this.log(`🚫 Requisição Falhou: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`, 'ERROR');
            
            // Verificar se é o erro que estamos procurando
            if (request.failure()?.errorText?.includes('net::ERR_ABORTED')) {
                this.log(`🎯 ERRO ENCONTRADO: net::ERR_ABORTED em ${request.url()}`, 'CRITICAL');
            }
        });
        
        // Capturar logs do console
        this.page.on('console', (msg) => {
            const logEntry = {
                timestamp: new Date().toISOString(),
                type: msg.type(),
                text: msg.text(),
                location: msg.location()
            };
            
            this.results.consoleLogs.push(logEntry);
            
            if (msg.type() === 'error') {
                this.log(`🔴 Console Error: ${msg.text()}`, 'ERROR');
            } else if (msg.type() === 'warning') {
                this.log(`🟡 Console Warning: ${msg.text()}`, 'WARNING');
            }
        });
        
        // Capturar erros de página
        this.page.on('pageerror', (error) => {
            const errorEntry = {
                timestamp: new Date().toISOString(),
                type: 'page_error',
                message: error.message,
                stack: error.stack
            };
            
            this.results.errors.push(errorEntry);
            this.log(`💥 Erro de Página: ${error.message}`, 'ERROR');
        });
        
        this.log('✅ Navegador configurado com sucesso', 'SUCCESS');
    }

    async testDirectDashboardAccess() {
        this.log('🎯 Teste 1: Acesso direto ao dashboard...', 'TEST');
        
        try {
            const startTime = Date.now();
            
            await this.page.goto(this.dashboardUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            const endTime = Date.now();
            const loadTime = endTime - startTime;
            
            const currentUrl = this.page.url();
            this.log(`✅ Dashboard carregado em ${loadTime}ms. URL atual: ${currentUrl}`, 'SUCCESS');
            
            // Verificar se foi redirecionado
            if (currentUrl !== this.dashboardUrl) {
                this.log(`🔄 Redirecionamento detectado: ${this.dashboardUrl} → ${currentUrl}`, 'INFO');
            }
            
            // Capturar screenshot
            await this.page.screenshot({
                path: path.join(__dirname, '..', 'logs', 'dashboard-direct-access.png'),
                fullPage: true
            });
            
            return { success: true, loadTime, finalUrl: currentUrl };
            
        } catch (error) {
            this.log(`❌ Erro no acesso direto: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }

    async testLoginFlow() {
        this.log('🔐 Teste 2: Fluxo de login completo...', 'TEST');
        
        try {
            // Ir para página de login
            await this.page.goto(this.loginUrl, {
                waitUntil: 'networkidle2',
                timeout: 15000
            });
            
            this.log('📝 Página de login carregada', 'INFO');
            
            // Aguardar formulário de login
            await this.page.waitForSelector('form', { timeout: 10000 });
            
            // Preencher credenciais (usar credenciais de teste)
            const emailSelector = 'input[type="email"], input[name="email"]';
            const passwordSelector = 'input[type="password"], input[name="password"]';
            
            await this.page.waitForSelector(emailSelector, { timeout: 5000 });
            await this.page.type(emailSelector, 'test@example.com');
            
            await this.page.waitForSelector(passwordSelector, { timeout: 5000 });
            await this.page.type(passwordSelector, 'testpassword');
            
            this.log('✏️ Credenciais preenchidas', 'INFO');
            
            // Capturar screenshot antes do submit
            await this.page.screenshot({
                path: path.join(__dirname, '..', 'logs', 'before-login-submit.png')
            });
            
            // Submeter formulário
            const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                this.log('🚀 Submetendo formulário de login...', 'INFO');
                
                // Aguardar navegação após submit
                const navigationPromise = this.page.waitForNavigation({
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                
                await submitButton.click();
                
                try {
                    await navigationPromise;
                    const finalUrl = this.page.url();
                    this.log(`✅ Login bem-sucedido. URL final: ${finalUrl}`, 'SUCCESS');
                    
                    // Capturar screenshot após login
                    await this.page.screenshot({
                        path: path.join(__dirname, '..', 'logs', 'after-login.png'),
                        fullPage: true
                    });
                    
                    return { success: true, finalUrl };
                    
                } catch (navError) {
                    this.log(`⏰ Timeout na navegação após login: ${navError.message}`, 'WARNING');
                    
                    // Verificar URL atual mesmo com timeout
                    const currentUrl = this.page.url();
                    this.log(`📍 URL atual após timeout: ${currentUrl}`, 'INFO');
                    
                    return { success: false, error: 'Navigation timeout', currentUrl };
                }
            } else {
                this.log('❌ Botão de submit não encontrado', 'ERROR');
                return { success: false, error: 'Submit button not found' };
            }
            
        } catch (error) {
            this.log(`❌ Erro no fluxo de login: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }

    async testMultipleNavigations() {
        this.log('🔄 Teste 3: Múltiplas navegações para o dashboard...', 'TEST');
        
        const results = [];
        
        for (let i = 1; i <= 5; i++) {
            this.log(`🔄 Tentativa ${i}/5 de navegação...`, 'INFO');
            
            try {
                const startTime = Date.now();
                
                await this.page.goto(this.dashboardUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 15000
                });
                
                const endTime = Date.now();
                const loadTime = endTime - startTime;
                
                results.push({ attempt: i, success: true, loadTime });
                this.log(`✅ Tentativa ${i} bem-sucedida em ${loadTime}ms`, 'SUCCESS');
                
                // Aguardar um pouco entre tentativas
                await this.page.waitForTimeout(2000);
                
            } catch (error) {
                results.push({ attempt: i, success: false, error: error.message });
                this.log(`❌ Tentativa ${i} falhou: ${error.message}`, 'ERROR');
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        this.log(`📊 Resultado: ${successCount}/5 navegações bem-sucedidas`, 'SUMMARY');
        
        return results;
    }

    async generateReport() {
        this.log('📋 Gerando relatório final...', 'INFO');
        
        // Calcular estatísticas
        const totalNetworkRequests = this.results.networkLogs.filter(log => log.type === 'request').length;
        const failedRequests = this.results.errors.filter(error => error.type === 'request_failed').length;
        const dashboardRequests = this.results.networkLogs.filter(log => 
            log.type === 'request' && log.url.includes('/dashboard')
        ).length;
        
        const errAbortedCount = this.results.errors.filter(error => 
            error.failure?.errorText?.includes('net::ERR_ABORTED')
        ).length;
        
        this.results.summary = {
            totalNetworkRequests,
            failedRequests,
            dashboardRequests,
            errAbortedCount,
            consoleErrors: this.results.consoleLogs.filter(log => log.type === 'error').length,
            consoleWarnings: this.results.consoleLogs.filter(log => log.type === 'warning').length,
            pageErrors: this.results.errors.filter(error => error.type === 'page_error').length
        };
        
        // Salvar relatório
        const reportPath = path.join(__dirname, '..', 'logs', `err-aborted-report-${Date.now()}.json`);
        
        // Criar diretório se não existir
        const logDir = path.dirname(reportPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // Exibir resumo
        console.log('\n' + '='.repeat(80));
        console.log('📊 RELATÓRIO FINAL - DIAGNÓSTICO net::ERR_ABORTED');
        console.log('='.repeat(80));
        console.log(`📡 Total de Requisições: ${totalNetworkRequests}`);
        console.log(`❌ Requisições Falhadas: ${failedRequests}`);
        console.log(`📊 Requisições Dashboard: ${dashboardRequests}`);
        console.log(`🎯 Erros net::ERR_ABORTED: ${errAbortedCount}`);
        console.log(`🔴 Erros de Console: ${this.results.summary.consoleErrors}`);
        console.log(`🟡 Warnings de Console: ${this.results.summary.consoleWarnings}`);
        console.log(`💥 Erros de Página: ${this.results.summary.pageErrors}`);
        console.log(`💾 Relatório salvo em: ${reportPath}`);
        console.log('='.repeat(80));
        
        if (errAbortedCount > 0) {
            console.log('\n🎯 ERROS net::ERR_ABORTED ENCONTRADOS!');
            this.results.errors.filter(error => 
                error.failure?.errorText?.includes('net::ERR_ABORTED')
            ).forEach((error, index) => {
                console.log(`${index + 1}. ${error.url} - ${error.failure.errorText}`);
            });
        } else {
            console.log('\n✅ Nenhum erro net::ERR_ABORTED detectado durante os testes.');
        }
        
        return this.results;
    }

    async run() {
        try {
            await this.setupBrowser();
            
            // Executar testes
            const test1 = await this.testDirectDashboardAccess();
            const test2 = await this.testLoginFlow();
            const test3 = await this.testMultipleNavigations();
            
            // Aguardar um pouco para capturar logs finais
            await this.page.waitForTimeout(3000);
            
            // Gerar relatório
            await this.generateReport();
            
        } catch (error) {
            this.log(`💥 Erro crítico: ${error.message}`, 'CRITICAL');
        } finally {
            if (this.browser) {
                await this.browser.close();
                this.log('🔒 Navegador fechado', 'INFO');
            }
        }
    }
}

// Função principal
async function main() {
    console.log('🔍 Reprodutor de Erro net::ERR_ABORTED');
    console.log('=' .repeat(80));
    console.log('Este script usa Puppeteer para reproduzir e diagnosticar');
    console.log('o erro net::ERR_ABORTED no dashboard.');
    console.log('\nPré-requisitos:');
    console.log('1. npm install puppeteer');
    console.log('2. Servidor Next.js rodando em http://localhost:9010');
    console.log('=' .repeat(80));
    console.log('');
    
    const reproducer = new ErrorAbortedReproducer();
    await reproducer.run();
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ErrorAbortedReproducer;