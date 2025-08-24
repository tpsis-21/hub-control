const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Script para monitorar logs do servidor Next.js em tempo real
 * e identificar problemas relacionados ao erro net::ERR_ABORTED
 */

class DashboardLogMonitor {
    constructor() {
        this.logFile = path.join(__dirname, '..', 'logs', 'dashboard-monitor.log');
        this.errorPatterns = [
            /ERR_ABORTED/i,
            /ECONNRESET/i,
            /ECONNREFUSED/i,
            /timeout/i,
            /cancelled/i,
            /aborted/i,
            /dashboard.*error/i,
            /middleware.*error/i,
            /auth.*error/i,
            /redirect.*loop/i,
            /infinite.*redirect/i
        ];
        this.warningPatterns = [
            /warning/i,
            /deprecated/i,
            /slow.*query/i,
            /performance/i
        ];
        this.dashboardPatterns = [
            /\/dashboard/i,
            /dashboard.*request/i,
            /dashboard.*response/i,
            /dashboard.*redirect/i
        ];
        this.stats = {
            totalRequests: 0,
            dashboardRequests: 0,
            errors: 0,
            warnings: 0,
            startTime: new Date()
        };
        this.recentLogs = [];
        this.maxRecentLogs = 100;
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}`;
        
        console.log(logEntry);
        
        // Salvar no arquivo
        this.ensureLogDirectory();
        fs.appendFileSync(this.logFile, logEntry + '\n');
        
        // Manter logs recentes em memória
        this.recentLogs.push({ timestamp, level, message });
        if (this.recentLogs.length > this.maxRecentLogs) {
            this.recentLogs.shift();
        }
    }

    analyzeLogLine(line) {
        const analysis = {
            isError: false,
            isWarning: false,
            isDashboardRelated: false,
            patterns: []
        };

        // Verificar padrões de erro
        for (const pattern of this.errorPatterns) {
            if (pattern.test(line)) {
                analysis.isError = true;
                analysis.patterns.push(`ERROR: ${pattern.source}`);
            }
        }

        // Verificar padrões de warning
        for (const pattern of this.warningPatterns) {
            if (pattern.test(line)) {
                analysis.isWarning = true;
                analysis.patterns.push(`WARNING: ${pattern.source}`);
            }
        }

        // Verificar padrões relacionados ao dashboard
        for (const pattern of this.dashboardPatterns) {
            if (pattern.test(line)) {
                analysis.isDashboardRelated = true;
                analysis.patterns.push(`DASHBOARD: ${pattern.source}`);
            }
        }

        return analysis;
    }

    processLogLine(line) {
        if (!line.trim()) return;

        const analysis = this.analyzeLogLine(line);
        
        // Atualizar estatísticas
        this.stats.totalRequests++;
        
        if (analysis.isDashboardRelated) {
            this.stats.dashboardRequests++;
        }
        
        if (analysis.isError) {
            this.stats.errors++;
            this.log(`🚨 ERRO DETECTADO: ${line}`, 'ERROR');
            
            // Se for relacionado ao dashboard, dar atenção especial
            if (analysis.isDashboardRelated) {
                this.log(`🎯 ERRO NO DASHBOARD: ${line}`, 'CRITICAL');
                this.generateErrorReport(line, analysis);
            }
        } else if (analysis.isWarning) {
            this.stats.warnings++;
            this.log(`⚠️ WARNING: ${line}`, 'WARNING');
        } else if (analysis.isDashboardRelated) {
            this.log(`📊 DASHBOARD: ${line}`, 'DASHBOARD');
        } else {
            this.log(`📝 LOG: ${line}`, 'INFO');
        }
    }

    generateErrorReport(errorLine, analysis) {
        const report = {
            timestamp: new Date().toISOString(),
            error: errorLine,
            analysis: analysis,
            recentContext: this.recentLogs.slice(-10),
            stats: { ...this.stats }
        };

        const reportFile = path.join(__dirname, '..', 'logs', `error-report-${Date.now()}.json`);
        this.ensureLogDirectory();
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        this.log(`📋 Relatório de erro gerado: ${reportFile}`, 'INFO');
    }

    generateSummaryReport() {
        const duration = (new Date() - this.stats.startTime) / 1000;
        const report = {
            monitoringDuration: `${duration.toFixed(2)} segundos`,
            statistics: this.stats,
            errorRate: this.stats.totalRequests > 0 ? (this.stats.errors / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
            dashboardRequestRate: this.stats.totalRequests > 0 ? (this.stats.dashboardRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
            recentLogs: this.recentLogs.slice(-20)
        };

        console.log('\n' + '='.repeat(80));
        console.log('📊 RELATÓRIO FINAL DO MONITORAMENTO');
        console.log('='.repeat(80));
        console.log(`⏱️ Duração: ${report.monitoringDuration}`);
        console.log(`📈 Total de Logs: ${this.stats.totalRequests}`);
        console.log(`📊 Logs do Dashboard: ${this.stats.dashboardRequests}`);
        console.log(`🚨 Erros: ${this.stats.errors}`);
        console.log(`⚠️ Warnings: ${this.stats.warnings}`);
        console.log(`📉 Taxa de Erro: ${report.errorRate}`);
        console.log(`🎯 Taxa Dashboard: ${report.dashboardRequestRate}`);
        console.log('='.repeat(80));

        // Salvar relatório final
        const reportFile = path.join(__dirname, '..', 'logs', `summary-report-${Date.now()}.json`);
        this.ensureLogDirectory();
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log(`💾 Relatório salvo em: ${reportFile}`);
        return report;
    }

    startMonitoring() {
        this.log('🚀 Iniciando monitoramento de logs do dashboard...', 'INFO');
        this.log('🎯 Procurando por padrões relacionados a net::ERR_ABORTED', 'INFO');
        
        // Monitorar entrada padrão (stdin) para logs
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => this.processLogLine(line));
        });

        // Configurar handlers para encerramento
        process.on('SIGINT', () => {
            this.log('🛑 Monitoramento interrompido pelo usuário', 'INFO');
            this.generateSummaryReport();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            this.log('🛑 Monitoramento encerrado', 'INFO');
            this.generateSummaryReport();
            process.exit(0);
        });

        // Relatório periódico a cada 30 segundos
        setInterval(() => {
            const duration = (new Date() - this.stats.startTime) / 1000;
            this.log(`📊 Status: ${this.stats.totalRequests} logs, ${this.stats.errors} erros, ${this.stats.dashboardRequests} dashboard (${duration.toFixed(0)}s)`, 'STATUS');
        }, 30000);

        this.log('✅ Monitoramento ativo. Pressione Ctrl+C para parar e gerar relatório final.', 'INFO');
    }
}

// Função principal
function main() {
    console.log('🔍 Monitor de Logs do Dashboard - Diagnóstico net::ERR_ABORTED');
    console.log('=' .repeat(80));
    console.log('Este script monitora logs do servidor Next.js em tempo real');
    console.log('para identificar problemas relacionados ao erro net::ERR_ABORTED');
    console.log('\nUso:');
    console.log('1. Execute este script: node scripts/monitor-dashboard-logs.js');
    console.log('2. Em outro terminal, execute: npx next dev -p 9010 | node scripts/monitor-dashboard-logs.js');
    console.log('3. Ou pipe os logs diretamente: npx next dev -p 9010 2>&1 | node scripts/monitor-dashboard-logs.js');
    console.log('=' .repeat(80));
    console.log('');

    const monitor = new DashboardLogMonitor();
    monitor.startMonitoring();
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = DashboardLogMonitor;