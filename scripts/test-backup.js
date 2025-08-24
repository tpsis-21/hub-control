#!/usr/bin/env node

/**
 * Script para testar o sistema de backup
 * Executa testes de funcionalidade, integridade e performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BackupTester {
  constructor() {
    this.projectRoot = process.cwd();
    this.configDir = path.join(this.projectRoot, 'config');
    this.backupDir = path.join(this.projectRoot, 'backups');
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  async runTests() {
    console.log('🧪 Iniciando testes do sistema de backup...');
    console.log('=' .repeat(60));
    
    try {
      // 1. Testes de configuração
      await this.testConfiguration();
      
      // 2. Testes de estrutura de diretórios
      await this.testDirectoryStructure();
      
      // 3. Testes de criptografia
      await this.testEncryption();
      
      // 4. Testes de backup
      await this.testBackupFunctionality();
      
      // 5. Testes de restauração
      await this.testRestoreFunctionality();
      
      // 6. Testes de limpeza
      await this.testCleanupFunctionality();
      
      // 7. Testes de notificação
      await this.testNotifications();
      
      // 8. Testes de performance
      await this.testPerformance();
      
      // Gerar relatório
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Erro durante os testes:', error.message);
      process.exit(1);
    }
  }

  async testConfiguration() {
    console.log('\n📋 Testando configuração...');
    
    // Teste 1: Arquivo de configuração existe
    const configPath = path.join(this.configDir, 'backup.json');
    this.runTest('Arquivo de configuração existe', () => {
      return fs.existsSync(configPath);
    });
    
    // Teste 2: Configuração é válida
    this.runTest('Configuração é válida JSON', () => {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config && typeof config === 'object';
    });
    
    // Teste 3: Chave de criptografia existe
    const keyPath = path.join(this.configDir, 'backup.key');
    this.runTest('Chave de criptografia existe', () => {
      return fs.existsSync(keyPath);
    });
    
    // Teste 4: Chave tem tamanho correto
    this.runTest('Chave de criptografia válida', () => {
      const key = fs.readFileSync(keyPath, 'utf8');
      return key.length === 64; // 32 bytes em hex
    });
    
    // Teste 5: Variáveis de ambiente
    this.runTest('Variáveis de ambiente obrigatórias', () => {
      const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'];
      return required.every(v => process.env[v]);
    });
  }

  async testDirectoryStructure() {
    console.log('\n📁 Testando estrutura de diretórios...');
    
    const requiredDirs = [
      'backups',
      'backups/full',
      'backups/incremental',
      'backups/logs',
      'backups/temp',
      'backups/metadata'
    ];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      this.runTest(`Diretório ${dir} existe`, () => {
        return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
      });
    }
    
    // Teste de permissões de escrita
    this.runTest('Permissões de escrita no diretório de backup', () => {
      try {
        const testFile = path.join(this.backupDir, 'test-write.tmp');
        fs.writeFileSync(testFile, 'teste');
        fs.unlinkSync(testFile);
        return true;
      } catch {
        return false;
      }
    });
  }

  async testEncryption() {
    console.log('\n🔐 Testando criptografia...');
    
    try {
      const crypto = require('crypto');
      const keyPath = path.join(this.configDir, 'backup.key');
      const key = fs.readFileSync(keyPath, 'utf8');
      
      // Teste de criptografia/descriptografia
      this.runTest('Criptografia/descriptografia funcional', () => {
        const testData = 'dados de teste para criptografia';
        const algorithm = 'aes-256-gcm';
        const keyBuffer = Buffer.from(key, 'hex');
        const iv = crypto.randomBytes(16);
        
        // Criptografar
        const cipher = crypto.createCipher(algorithm, keyBuffer);
        let encrypted = cipher.update(testData, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Descriptografar
        const decipher = crypto.createDecipher(algorithm, keyBuffer);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted === testData;
      });
      
    } catch (error) {
      this.addTestResult('Teste de criptografia', false, `Erro: ${error.message}`);
    }
  }

  async testBackupFunctionality() {
    console.log('\n💾 Testando funcionalidade de backup...');
    
    try {
      const { BackupManager } = require('../src/lib/backup');
      const configPath = path.join(this.configDir, 'backup.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const backupManager = new BackupManager(config);
      
      // Teste 1: Backup de logs
      this.runTest('Backup de logs', async () => {
        const result = await backupManager.createLogsBackup();
        if (result.success && fs.existsSync(result.filePath)) {
          // Limpar arquivo de teste
          fs.unlinkSync(result.filePath);
          return true;
        }
        return false;
      });
      
      // Teste 2: Backup incremental
      this.runTest('Backup incremental', async () => {
        const result = await backupManager.createIncrementalBackup();
        if (result.success && fs.existsSync(result.filePath)) {
          // Limpar arquivo de teste
          fs.unlinkSync(result.filePath);
          return true;
        }
        return false;
      });
      
      // Teste 3: Listagem de backups
      this.runTest('Listagem de backups', async () => {
        const backups = await backupManager.listBackups();
        return Array.isArray(backups);
      });
      
    } catch (error) {
      this.addTestResult('Funcionalidade de backup', false, `Erro: ${error.message}`);
    }
  }

  async testRestoreFunctionality() {
    console.log('\n🔄 Testando funcionalidade de restauração...');
    
    try {
      const { BackupManager } = require('../src/lib/backup');
      const configPath = path.join(this.configDir, 'backup.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const backupManager = new BackupManager(config);
      
      // Criar backup de teste para restaurar
      const backupResult = await backupManager.createLogsBackup();
      
      if (backupResult.success) {
        // Teste de restauração
        this.runTest('Restauração de backup', async () => {
          const restoreResult = await backupManager.restoreBackup(backupResult.backupId);
          
          // Limpar arquivos de teste
          if (fs.existsSync(backupResult.filePath)) {
            fs.unlinkSync(backupResult.filePath);
          }
          
          return restoreResult.success;
        });
      } else {
        this.addTestResult('Restauração de backup', false, 'Não foi possível criar backup para teste');
      }
      
    } catch (error) {
      this.addTestResult('Funcionalidade de restauração', false, `Erro: ${error.message}`);
    }
  }

  async testCleanupFunctionality() {
    console.log('\n🗑️ Testando funcionalidade de limpeza...');
    
    try {
      const { BackupManager } = require('../src/lib/backup');
      const configPath = path.join(this.configDir, 'backup.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const backupManager = new BackupManager(config);
      
      // Teste de limpeza de backups antigos
      this.runTest('Limpeza de backups antigos', async () => {
        const cleanupResult = await backupManager.cleanupOldBackups();
        return cleanupResult.success;
      });
      
    } catch (error) {
      this.addTestResult('Funcionalidade de limpeza', false, `Erro: ${error.message}`);
    }
  }

  async testNotifications() {
    console.log('\n📧 Testando notificações...');
    
    const configPath = path.join(this.configDir, 'backup.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Teste de configuração de email
    this.runTest('Configuração de email', () => {
      if (config.notifications.email.enabled) {
        return config.notifications.email.smtp.host && 
               config.notifications.email.smtp.user &&
               config.notifications.email.to.length > 0;
      }
      return true; // Se não habilitado, considera válido
    });
    
    // Teste de configuração de webhook
    this.runTest('Configuração de webhook', () => {
      if (config.notifications.webhook.enabled) {
        return config.notifications.webhook.url && 
               config.notifications.webhook.url.startsWith('http');
      }
      return true; // Se não habilitado, considera válido
    });
  }

  async testPerformance() {
    console.log('\n⚡ Testando performance...');
    
    try {
      const { BackupManager } = require('../src/lib/backup');
      const configPath = path.join(this.configDir, 'backup.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const backupManager = new BackupManager(config);
      
      // Teste de tempo de backup
      this.runTest('Tempo de backup aceitável', async () => {
        const startTime = Date.now();
        const result = await backupManager.createLogsBackup();
        const duration = Date.now() - startTime;
        
        if (result.success && fs.existsSync(result.filePath)) {
          fs.unlinkSync(result.filePath);
        }
        
        // Backup de logs deve ser rápido (< 30 segundos)
        return duration < 30000;
      });
      
    } catch (error) {
      this.addTestResult('Performance de backup', false, `Erro: ${error.message}`);
    }
  }

  runTest(name, testFunction) {
    try {
      const result = testFunction();
      
      if (result instanceof Promise) {
        return result.then(success => {
          this.addTestResult(name, success);
          return success;
        }).catch(error => {
          this.addTestResult(name, false, error.message);
          return false;
        });
      } else {
        this.addTestResult(name, result);
        return result;
      }
    } catch (error) {
      this.addTestResult(name, false, error.message);
      return false;
    }
  }

  addTestResult(name, success, error = null) {
    const result = {
      name,
      success,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.tests.push(result);
    
    if (success) {
      this.testResults.passed++;
      console.log(`  ✅ ${name}`);
    } else {
      this.testResults.failed++;
      console.log(`  ❌ ${name}${error ? `: ${error}` : ''}`);
    }
  }

  generateReport() {
    console.log('\n📊 RELATÓRIO DE TESTES');
    console.log('=' .repeat(60));
    console.log(`✅ Testes aprovados: ${this.testResults.passed}`);
    console.log(`❌ Testes falharam: ${this.testResults.failed}`);
    console.log(`⚠️ Avisos: ${this.testResults.warnings}`);
    console.log(`📊 Total: ${this.testResults.tests.length}`);
    
    const successRate = (this.testResults.passed / this.testResults.tests.length * 100).toFixed(1);
    console.log(`📈 Taxa de sucesso: ${successRate}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ TESTES FALHARAM:');
      this.testResults.tests
        .filter(t => !t.success)
        .forEach(test => {
          console.log(`  - ${test.name}${test.error ? `: ${test.error}` : ''}`);
        });
    }
    
    // Salvar relatório em arquivo
    const reportPath = path.join(this.projectRoot, 'reports', 'backup-test-report.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.tests.length,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        warnings: this.testResults.warnings,
        successRate: parseFloat(successRate)
      },
      tests: this.testResults.tests
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo: ${reportPath}`);
    
    // Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    
    if (this.testResults.failed === 0) {
      console.log('✅ Sistema de backup está funcionando corretamente!');
      console.log('🔧 Próximos passos:');
      console.log('  - Configure as tarefas agendadas (scripts/setup-backup-tasks.bat)');
      console.log('  - Configure notificações se necessário');
      console.log('  - Execute backups de teste regularmente');
    } else {
      console.log('⚠️ Corrija os problemas identificados antes de usar em produção');
      console.log('🔧 Ações recomendadas:');
      console.log('  - Verifique as configurações');
      console.log('  - Confirme as variáveis de ambiente');
      console.log('  - Execute novamente após as correções');
    }
    
    // Exit code baseado nos resultados
    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const tester = new BackupTester();
  tester.runTests().catch(console.error);
}

module.exports = { BackupTester };