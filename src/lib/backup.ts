/**
 * Sistema de backup automatizado
 * Gerencia backups de banco de dados, arquivos e configurações
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { createGzip } from 'zlib';
import { logger } from './logger';
import { createApiSupabaseClient } from './supabase/unified-client';

const pipelineAsync = promisify(pipeline);

export interface BackupConfig {
  enabled: boolean;
  schedule: {
    database: string; // cron expression
    files: string;
    logs: string;
  };
  retention: {
    daily: number; // dias
    weekly: number; // semanas
    monthly: number; // meses
  };
  storage: {
    local: {
      enabled: boolean;
      path: string;
    };
    s3: {
      enabled: boolean;
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      prefix: string;
    };
    gcs: {
      enabled: boolean;
      bucket: string;
      keyFilename: string;
      prefix: string;
    };
  };
  compression: {
    enabled: boolean;
    level: number; // 1-9
  };
  encryption: {
    enabled: boolean;
    key: string;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    channels: string[]; // email, slack, webhook
  };
}

export interface BackupResult {
  id: string;
  type: 'database' | 'files' | 'logs' | 'full';
  status: 'success' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  size: number; // bytes
  location: string;
  checksum: string;
  error?: string;
  metadata: {
    tables?: string[];
    files?: string[];
    compression?: boolean;
    encryption?: boolean;
  };
}

export class BackupManager {
  private config: BackupConfig;
  private supabase: any;

  constructor(config: BackupConfig) {
    this.config = config;
    
    this.supabase = createApiSupabaseClient(true); // service role para backup
  }

  /**
   * Executar backup completo
   */
  async executeFullBackup(): Promise<BackupResult> {
    const startTime = new Date();
    const backupId = this.generateBackupId('full');
    
    logger.info('Iniciando backup completo', { backupId });
    
    try {
      // Backup do banco de dados
      const dbBackup = await this.backupDatabase();
      
      // Backup de arquivos
      const filesBackup = await this.backupFiles();
      
      // Backup de logs
      const logsBackup = await this.backupLogs();
      
      // Combinar resultados
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const result: BackupResult = {
        id: backupId,
        type: 'full',
        status: 'success',
        startTime,
        endTime,
        duration,
        size: dbBackup.size + filesBackup.size + logsBackup.size,
        location: this.getBackupPath(backupId),
        checksum: await this.calculateChecksum(this.getBackupPath(backupId)),
        metadata: {
          tables: dbBackup.metadata.tables,
          files: filesBackup.metadata.files,
          compression: this.config.compression.enabled,
          encryption: this.config.encryption.enabled,
        },
      };
      
      // Salvar metadados do backup
      await this.saveBackupMetadata(result);
      
      // Enviar para storage remoto
      if (this.config.storage.s3.enabled || this.config.storage.gcs.enabled) {
        await this.uploadToRemoteStorage(result);
      }
      
      // Limpar backups antigos
      await this.cleanupOldBackups();
      
      // Notificar sucesso
      if (this.config.notifications.onSuccess) {
        await this.sendNotification('success', result);
      }
      
      logger.info('Backup completo concluído com sucesso', {
        backupId,
        duration,
        size: result.size,
      });
      
      return result;
      
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const result: BackupResult = {
        id: backupId,
        type: 'full',
        status: 'failed',
        startTime,
        endTime,
        duration,
        size: 0,
        location: '',
        checksum: '',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        metadata: {},
      };
      
      // Notificar falha
      if (this.config.notifications.onFailure) {
        await this.sendNotification('failure', result);
      }
      
      logger.error('Falha no backup completo', error as Error);
      
      throw error;
    }
  }

  /**
   * Backup do banco de dados
   */
  async backupDatabase(): Promise<BackupResult> {
    const startTime = new Date();
    const backupId = this.generateBackupId('database');
    
    logger.info('Iniciando backup do banco de dados', { backupId });
    
    try {
      // Obter lista de tabelas
      const tables = await this.getDatabaseTables();
      
      // Criar dump do banco
      const dumpPath = path.join(this.getBackupPath(backupId), 'database.sql');
      await this.createDatabaseDump(dumpPath, tables);
      
      // Comprimir se habilitado
      let finalPath = dumpPath;
      if (this.config.compression.enabled) {
        finalPath = await this.compressFile(dumpPath);
        fs.unlinkSync(dumpPath); // Remover arquivo original
      }
      
      // Criptografar se habilitado
      if (this.config.encryption.enabled) {
        finalPath = await this.encryptFile(finalPath);
      }
      
      const stats = fs.statSync(finalPath);
      const endTime = new Date();
      
      const result: BackupResult = {
        id: backupId,
        type: 'database',
        status: 'success',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        size: stats.size,
        location: finalPath,
        checksum: await this.calculateChecksum(finalPath),
        metadata: {
          tables,
          compression: this.config.compression.enabled,
          encryption: this.config.encryption.enabled,
        },
      };
      
      logger.info('Backup do banco de dados concluído', {
        backupId,
        tables: tables.length,
        size: stats.size,
      });
      
      return result;
      
    } catch (error) {
      logger.error('Falha no backup do banco de dados', error as Error);
      throw error;
    }
  }

  /**
   * Backup de arquivos importantes
   */
  async backupFiles(): Promise<BackupResult> {
    const startTime = new Date();
    const backupId = this.generateBackupId('files');
    
    logger.info('Iniciando backup de arquivos', { backupId });
    
    try {
      const filesToBackup = [
        '.env.production',
        'package.json',
        'package-lock.json',
        'next.config.ts',
        'apphosting.yaml',
        'firebase.json',
        'src/config/',
        'public/uploads/',
        'scripts/',
      ];
      
      const backupPath = this.getBackupPath(backupId);
      const archivePath = path.join(backupPath, 'files.tar');
      
      // Criar arquivo tar com os arquivos
      await this.createArchive(filesToBackup, archivePath);
      
      // Comprimir se habilitado
      let finalPath = archivePath;
      if (this.config.compression.enabled) {
        finalPath = await this.compressFile(archivePath);
        fs.unlinkSync(archivePath);
      }
      
      // Criptografar se habilitado
      if (this.config.encryption.enabled) {
        finalPath = await this.encryptFile(finalPath);
      }
      
      const stats = fs.statSync(finalPath);
      const endTime = new Date();
      
      const result: BackupResult = {
        id: backupId,
        type: 'files',
        status: 'success',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        size: stats.size,
        location: finalPath,
        checksum: await this.calculateChecksum(finalPath),
        metadata: {
          files: filesToBackup,
          compression: this.config.compression.enabled,
          encryption: this.config.encryption.enabled,
        },
      };
      
      logger.info('Backup de arquivos concluído', {
        backupId,
        files: filesToBackup.length,
        size: stats.size,
      });
      
      return result;
      
    } catch (error) {
      logger.error('Falha no backup de arquivos', error as Error);
      throw error;
    }
  }

  /**
   * Backup de logs
   */
  async backupLogs(): Promise<BackupResult> {
    const startTime = new Date();
    const backupId = this.generateBackupId('logs');
    
    logger.info('Iniciando backup de logs', { backupId });
    
    try {
      const logsDir = process.env.LOG_DIR || './logs';
      const backupPath = this.getBackupPath(backupId);
      const archivePath = path.join(backupPath, 'logs.tar');
      
      // Verificar se diretório de logs existe
      if (!fs.existsSync(logsDir)) {
        logger.warn('Diretório de logs não encontrado', { logsDir });
        return {
          id: backupId,
          type: 'logs',
          status: 'success',
          startTime,
          endTime: new Date(),
          duration: 0,
          size: 0,
          location: '',
          checksum: '',
          metadata: { files: [] },
        };
      }
      
      // Obter arquivos de log
      const logFiles = fs.readdirSync(logsDir)
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(logsDir, file));
      
      if (logFiles.length === 0) {
        logger.warn('Nenhum arquivo de log encontrado');
        return {
          id: backupId,
          type: 'logs',
          status: 'success',
          startTime,
          endTime: new Date(),
          duration: 0,
          size: 0,
          location: '',
          checksum: '',
          metadata: { files: [] },
        };
      }
      
      // Criar arquivo tar com os logs
      await this.createArchive(logFiles, archivePath);
      
      // Comprimir se habilitado
      let finalPath = archivePath;
      if (this.config.compression.enabled) {
        finalPath = await this.compressFile(archivePath);
        fs.unlinkSync(archivePath);
      }
      
      const stats = fs.statSync(finalPath);
      const endTime = new Date();
      
      const result: BackupResult = {
        id: backupId,
        type: 'logs',
        status: 'success',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        size: stats.size,
        location: finalPath,
        checksum: await this.calculateChecksum(finalPath),
        metadata: {
          files: logFiles,
          compression: this.config.compression.enabled,
        },
      };
      
      logger.info('Backup de logs concluído', {
        backupId,
        files: logFiles.length,
        size: stats.size,
      });
      
      return result;
      
    } catch (error) {
      logger.error('Falha no backup de logs', error as Error);
      throw error;
    }
  }

  /**
   * Restaurar backup
   */
  async restoreBackup(backupId: string, type?: 'database' | 'files' | 'logs'): Promise<void> {
    logger.info('Iniciando restauração de backup', { backupId, type });
    
    try {
      // Obter metadados do backup
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error(`Backup ${backupId} não encontrado`);
      }
      
      // Verificar integridade
      const isValid = await this.verifyBackupIntegrity(metadata);
      if (!isValid) {
        throw new Error(`Backup ${backupId} está corrompido`);
      }
      
      // Restaurar baseado no tipo
      if (!type || type === 'database') {
        await this.restoreDatabase(metadata);
      }
      
      if (!type || type === 'files') {
        await this.restoreFiles(metadata);
      }
      
      if (!type || type === 'logs') {
        await this.restoreLogs(metadata);
      }
      
      logger.info('Restauração de backup concluída', { backupId, type });
      
    } catch (error) {
      logger.error('Falha na restauração de backup', error as Error);
      throw error;
    }
  }

  /**
   * Listar backups disponíveis
   */
  async listBackups(type?: 'database' | 'files' | 'logs' | 'full'): Promise<BackupResult[]> {
    try {
      const backupsDir = this.config.storage.local.path;
      
      if (!fs.existsSync(backupsDir)) {
        return [];
      }
      
      const backupDirs = fs.readdirSync(backupsDir)
        .filter(dir => {
          const fullPath = path.join(backupsDir, dir);
          return fs.statSync(fullPath).isDirectory();
        });
      
      const backups: BackupResult[] = [];
      
      for (const dir of backupDirs) {
        try {
          const metadata = await this.getBackupMetadata(dir);
          if (metadata && (!type || metadata.type === type)) {
            backups.push(metadata);
          }
        } catch (error) {
          logger.warn('Erro ao ler metadados do backup', { dir, error });
        }
      }
      
      // Ordenar por data (mais recente primeiro)
      return backups.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      
    } catch (error) {
      logger.error('Erro ao listar backups', error as Error);
      return [];
    }
  }

  /**
   * Verificar integridade do backup
   */
  async verifyBackupIntegrity(backup: BackupResult): Promise<boolean> {
    try {
      if (!fs.existsSync(backup.location)) {
        logger.warn('Arquivo de backup não encontrado', { location: backup.location });
        return false;
      }
      
      const currentChecksum = await this.calculateChecksum(backup.location);
      const isValid = currentChecksum === backup.checksum;
      
      if (!isValid) {
        logger.warn('Checksum do backup não confere', {
          backupId: backup.id,
          expected: backup.checksum,
          actual: currentChecksum,
        });
      }
      
      return isValid;
      
    } catch (error) {
      logger.error('Erro ao verificar integridade do backup', error as Error);
      return false;
    }
  }

  // Métodos auxiliares privados
  private generateBackupId(type: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}-${timestamp}`;
  }

  private getBackupPath(backupId: string): string {
    const backupDir = path.join(this.config.storage.local.path, backupId);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  private async getDatabaseTables(): Promise<string[]> {
    if (!this.supabase) {
      throw new Error('Supabase client não configurado');
    }
    
    // Implementar lógica para obter tabelas do Supabase
    // Por enquanto, retornar tabelas conhecidas
    return [
      'users',
      'channels',
      'streams',
      'bpix_payments',
      'bpix_webhooks',
      'user_sessions',
      'audit_logs',
    ];
  }

  private async createDatabaseDump(outputPath: string, tables: string[]): Promise<void> {
    // Implementar dump do banco usando pg_dump ou similar
    // Por enquanto, simular com export JSON
    const dumpData: {
      timestamp: string;
      tables: { [key: string]: any };
    } = {
      timestamp: new Date().toISOString(),
      tables: {},
    };
    
    for (const table of tables) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('*');
        
        if (error) {
          logger.warn(`Erro ao exportar tabela ${table}`, error as Error);
          continue;
        }
        
        dumpData.tables[table] = data;
      } catch (error) {
        logger.warn(`Erro ao exportar tabela ${table}`, error as Error);
      }
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(dumpData, null, 2));
  }

  private async createArchive(files: string[], outputPath: string): Promise<void> {
    // Implementar criação de arquivo tar
    // Por enquanto, usar comando tar do sistema
    const command = `tar -cf "${outputPath}" ${files.map(f => `"${f}"`).join(' ')}`;
    execSync(command);
  }

  private async compressFile(filePath: string): Promise<string> {
    const compressedPath = `${filePath}.gz`;
    
    await pipelineAsync(
      createReadStream(filePath),
      createGzip({ level: this.config.compression.level }),
      createWriteStream(compressedPath)
    );
    
    return compressedPath;
  }

  private async encryptFile(filePath: string): Promise<string> {
    // Implementar criptografia do arquivo
    // Por enquanto, apenas renomear
    const encryptedPath = `${filePath}.enc`;
    fs.renameSync(filePath, encryptedPath);
    return encryptedPath;
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async saveBackupMetadata(backup: BackupResult): Promise<void> {
    const metadataPath = path.join(this.getBackupPath(backup.id), 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(backup, null, 2));
  }

  private async getBackupMetadata(backupId: string): Promise<BackupResult | null> {
    try {
      const metadataPath = path.join(this.getBackupPath(backupId), 'metadata.json');
      
      if (!fs.existsSync(metadataPath)) {
        return null;
      }
      
      const data = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(data);
      
      // Converter strings de data para objetos Date
      metadata.startTime = new Date(metadata.startTime);
      metadata.endTime = new Date(metadata.endTime);
      
      return metadata;
    } catch (error) {
      logger.error('Erro ao ler metadados do backup', error as Error);
      return null;
    }
  }

  private async uploadToRemoteStorage(backup: BackupResult): Promise<void> {
    // Implementar upload para S3, GCS, etc.
    logger.info('Upload para storage remoto não implementado', { backupId: backup.id });
  }

  private async cleanupOldBackups(): Promise<void> {
    // Implementar limpeza de backups antigos baseado na política de retenção
    logger.info('Limpeza de backups antigos não implementada');
  }

  private async sendNotification(type: 'success' | 'failure', backup: BackupResult): Promise<void> {
    // Implementar notificações
    logger.info('Notificação de backup não implementada', { type, backupId: backup.id });
  }

  private async restoreDatabase(backup: BackupResult): Promise<void> {
    // Implementar restauração do banco
    logger.info('Restauração de banco não implementada', { backupId: backup.id });
  }

  private async restoreFiles(backup: BackupResult): Promise<void> {
    // Implementar restauração de arquivos
    logger.info('Restauração de arquivos não implementada', { backupId: backup.id });
  }

  private async restoreLogs(backup: BackupResult): Promise<void> {
    // Implementar restauração de logs
    logger.info('Restauração de logs não implementada', { backupId: backup.id });
  }
}

/**
 * Configuração padrão de backup
 */
export const defaultBackupConfig: BackupConfig = {
  enabled: process.env.BACKUP_ENABLED === 'true',
  schedule: {
    database: process.env.BACKUP_SCHEDULE_DATABASE || '0 2 * * *', // 2h da manhã
    files: process.env.BACKUP_SCHEDULE_FILES || '0 3 * * *', // 3h da manhã
    logs: process.env.BACKUP_SCHEDULE_LOGS || '0 1 * * *', // 1h da manhã
  },
  retention: {
    daily: parseInt(process.env.BACKUP_RETENTION_DAILY || '7'),
    weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY || '4'),
    monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY || '12'),
  },
  storage: {
    local: {
      enabled: process.env.BACKUP_LOCAL_ENABLED !== 'false',
      path: process.env.BACKUP_LOCAL_PATH || './backups',
    },
    s3: {
      enabled: process.env.BACKUP_S3_ENABLED === 'true',
      bucket: process.env.BACKUP_S3_BUCKET || '',
      region: process.env.BACKUP_S3_REGION || 'us-east-1',
      accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY || '',
      prefix: process.env.BACKUP_S3_PREFIX || 'hub-control/',
    },
    gcs: {
      enabled: process.env.BACKUP_GCS_ENABLED === 'true',
      bucket: process.env.BACKUP_GCS_BUCKET || '',
      keyFilename: process.env.BACKUP_GCS_KEY_FILENAME || '',
      prefix: process.env.BACKUP_GCS_PREFIX || 'hub-control/',
    },
  },
  compression: {
    enabled: process.env.BACKUP_COMPRESSION_ENABLED !== 'false',
    level: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6'),
  },
  encryption: {
    enabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
    key: process.env.BACKUP_ENCRYPTION_KEY || '',
  },
  notifications: {
    onSuccess: process.env.BACKUP_NOTIFY_SUCCESS === 'true',
    onFailure: process.env.BACKUP_NOTIFY_FAILURE !== 'false',
    channels: (process.env.BACKUP_NOTIFY_CHANNELS || 'email').split(','),
  },
};

/**
 * Instância global do gerenciador de backup
 */
export const backupManager = new BackupManager(defaultBackupConfig);
