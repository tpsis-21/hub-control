/**
 * Script para Remover Logs de Debug do Sistema de Autenticação
 * 
 * Este script remove os logs de debug adicionados pelo script add-auth-logging.js
 * e restaura os arquivos originais a partir dos backups.
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
  log(`🧹 ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

class AuthLoggingRemover {
  constructor() {
    this.restorations = [];
    this.backupDir = path.join(process.cwd(), 'backups', 'auth-logging');
  }

  async removeLogging() {
    logSection('REMOVENDO LOGS DE DEBUG DO SISTEMA DE AUTENTICAÇÃO');
    
    // Verificar se existem backups
    if (!this.checkBackupsExist()) {
      log('❌ Nenhum backup encontrado. Não é possível restaurar os arquivos.', 'red');
      return;
    }
    
    // Restaurar arquivos dos backups
    await this.restoreFromBackups();
    
    // Limpar diretório de backups
    await this.cleanupBackups();
    
    this.generateReport();
  }

  checkBackupsExist() {
    log('🔍 Verificando backups existentes...', 'blue');
    
    if (!fs.existsSync(this.backupDir)) {
      log('❌ Diretório de backup não encontrado', 'red');
      return false;
    }
    
    const backupFiles = fs.readdirSync(this.backupDir).filter(file => file.endsWith('.backup'));
    
    if (backupFiles.length === 0) {
      log('❌ Nenhum arquivo de backup encontrado', 'red');
      return false;
    }
    
    log(`✅ Encontrados ${backupFiles.length} arquivos de backup`, 'green');
    for (const file of backupFiles) {
      log(`   📄 ${file}`, 'blue');
    }
    
    return true;
  }

  async restoreFromBackups() {
    logSection('RESTAURANDO ARQUIVOS DOS BACKUPS');
    
    const backupMappings = [
      {
        backup: 'middleware.ts.backup',
        target: path.join(process.cwd(), 'src', 'middleware.ts'),
        name: 'Middleware'
      },
      {
        backup: 'route.ts.backup',
        target: path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'login', 'route.ts'),
        name: 'API Login'
      },
      {
        backup: 'login-form.tsx.backup',
        target: path.join(process.cwd(), 'src', 'components', 'auth', 'login-form.tsx'),
        name: 'Login Form'
      },
      {
        backup: 'browser.ts.backup',
        target: path.join(process.cwd(), 'src', 'lib', 'supabase', 'clients', 'browser.ts'),
        name: 'Supabase Client'
      }
    ];

    for (const mapping of backupMappings) {
      const backupPath = path.join(this.backupDir, mapping.backup);
      
      if (fs.existsSync(backupPath)) {
        try {
          log(`🔄 Restaurando ${mapping.name}...`, 'blue');
          
          // Verificar se o arquivo de destino existe
          if (fs.existsSync(mapping.target)) {
            // Fazer backup do arquivo modificado antes de restaurar
            const modifiedBackup = `${mapping.target}.modified.backup`;
            fs.copyFileSync(mapping.target, modifiedBackup);
            log(`   💾 Backup do arquivo modificado: ${modifiedBackup}`, 'yellow');
          }
          
          // Restaurar do backup
          fs.copyFileSync(backupPath, mapping.target);
          
          this.restorations.push(mapping.name);
          log(`   ✅ ${mapping.name} restaurado`, 'green');
          
        } catch (error) {
          log(`   ❌ Erro ao restaurar ${mapping.name}: ${error.message}`, 'red');
        }
      } else {
        log(`   ⚠️ Backup não encontrado: ${mapping.backup}`, 'yellow');
      }
    }
  }

  async cleanupBackups() {
    logSection('LIMPEZA DE BACKUPS');
    
    log('🗑️ Removendo arquivos de backup...', 'blue');
    
    try {
      const backupFiles = fs.readdirSync(this.backupDir);
      
      for (const file of backupFiles) {
        if (file.endsWith('.backup')) {
          const filePath = path.join(this.backupDir, file);
          fs.unlinkSync(filePath);
          log(`   🗑️ Removido: ${file}`, 'blue');
        }
      }
      
      // Remover diretório se estiver vazio
      const remainingFiles = fs.readdirSync(this.backupDir);
      if (remainingFiles.length === 0) {
        fs.rmdirSync(this.backupDir);
        log('   📁 Diretório de backup removido', 'blue');
      }
      
      log('✅ Limpeza concluída', 'green');
      
    } catch (error) {
      log(`❌ Erro na limpeza: ${error.message}`, 'red');
    }
  }

  generateReport() {
    logSection('RELATÓRIO DE REMOÇÃO');
    
    log(`\n📊 RESUMO:`, 'magenta');
    log(`   ✅ Arquivos restaurados: ${this.restorations.length}`, 'green');
    
    if (this.restorations.length > 0) {
      log(`\n📋 DETALHES:`, 'cyan');
      for (const restoration of this.restorations) {
        log(`   ✅ ${restoration} - Logs de debug removidos`, 'green');
      }
    }
    
    log(`\n🔧 PRÓXIMOS PASSOS:`, 'cyan');
    log('   1. Reinicie o servidor de desenvolvimento', 'blue');
    log('   2. Os logs de debug não aparecerão mais no console', 'blue');
    log('   3. Os arquivos estão limpos para produção', 'blue');
    
    log(`\n💡 DICA:`, 'yellow');
    log('   - Para adicionar logs novamente, execute: node scripts/add-auth-logging.js', 'yellow');
    log('   - Arquivos .modified.backup contêm as versões com logs (se necessário)', 'yellow');
  }
}

// Executar remoção
if (require.main === module) {
  const remover = new AuthLoggingRemover();
  remover.removeLogging().catch(console.error);
}

module.exports = AuthLoggingRemover;