// 🔒 Sistema de Backup Automatizado e Criptografado
// Realiza backups seguros dos dados críticos da aplicação

import { createClient } from '@/lib/supabase/server';
// import { logSecurityEvent } from './security-config';
import { SecuritySeverity } from './security';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import { Database } from '@/lib/database.types';

// Configurações do sistema de backup
interface BackupConfig {
  encryptionKey: string;
  backupPath: string;
  retentionDays: number;
  compressionLevel: number;
  maxBackupSize: number; // em bytes
  enableEncryption: boolean;
  enableCompression: boolean;
  scheduleInterval: number; // em milissegundos
}

const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
  backupPath: process.env.BACKUP_PATH || './backups',
  retentionDays: 30,
  compressionLevel: 6,
  maxBackupSize: 1024 * 1024 * 1024, // 1GB
  enableEncryption: true,
  enableCompression: true,
  scheduleInterval: 24 * 60 * 60 * 1000 // 24 horas
};

// Tipos de backup
export type BackupType = 
  | 'full'
  | 'incremental'
  | 'differential'
  | 'schema_only'
  | 'data_only';

// Status do backup
export type BackupStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Interface para metadados do backup
export interface BackupMetadata {
  id: string;
  type: BackupType;
  status: BackupStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  tables: string[];
  recordCount: number;
  errorMessage?: string;
  version: string;
}

// Interface para configuração de tabela
interface TableBackupConfig {
  tableName: string;
  includeData: boolean;
  whereClause?: string;
  orderBy?: string;
  limit?: number;
  excludeColumns?: string[];
}

// Classe principal do sistema de backup
export class BackupSystem {
  private config: BackupConfig;
  private isRunning = false;
  private currentBackup?: BackupMetadata;
  private scheduleTimer?: NodeJS.Timeout;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = { ...DEFAULT_BACKUP_CONFIG, ...config };
    this.ensureBackupDirectory();
  }

  // Garantir que o diretório de backup existe
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.backupPath, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório de backup:', error);
      throw new Error('Falha ao criar diretório de backup');
    }
  }

  // Gerar ID único para backup
  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomBytes(4).toString('hex');
    return `backup-${timestamp}-${random}`;
  }

  // Calcular checksum de arquivo
  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    
    return hash.digest('hex');
  }

  // Criptografar dados
  // Criptografar dados
  private encrypt(data: Buffer): Buffer {
    if (!this.config.enableEncryption) return data;
    
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // Descriptografar dados
  private decrypt(encryptedData: Buffer): Buffer {
    if (!this.config.enableEncryption) return encryptedData;
    
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  // Obter dados de uma tabela
  private async getTableData(
    supabase: any,
    config: TableBackupConfig
  ): Promise<{ data: any[]; count: number }> {
    let query = supabase.from(config.tableName).select('*', { count: 'exact' });
    
    if (config.whereClause) {
      query = query.filter(config.whereClause);
    }
    
    if (config.orderBy) {
      query = query.order(config.orderBy);
    }
    
    if (config.limit) {
      query = query.limit(config.limit);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Erro ao obter dados da tabela ${config.tableName}: ${error.message}`);
    }
    
    // Remover colunas excluídas
    if (config.excludeColumns && data) {
      return {
        data: data.map((row: any) => {
          const filteredRow = { ...row };
          config.excludeColumns!.forEach(col => delete filteredRow[col]);
          return filteredRow;
        }),
        count: count || 0
      };
    }
    
    return { data: data || [], count: count || 0 };
  }

  // Realizar backup completo
  public async createFullBackup(
    tableConfigs: TableBackupConfig[]
  ): Promise<BackupMetadata> {
    if (this.isRunning) {
      throw new Error('Backup já está em execução');
    }

    this.isRunning = true;
    const backupId = this.generateBackupId();
    const startTime = new Date();
    
    const metadata: BackupMetadata = {
      id: backupId,
      type: 'full',
      status: 'running',
      startTime,
      size: 0,
      compressed: this.config.enableCompression,
      encrypted: this.config.enableEncryption,
      checksum: '',
      tables: tableConfigs.map(t => t.tableName),
      recordCount: 0,
      version: '1.0.0'
    };

    this.currentBackup = metadata;

    try {
      // await logSecurityEvent({
      //   action: 'BACKUP_STARTED',
      //   details: `Backup completo iniciado: ${backupId}`,
      //   severity: SecuritySeverity.LOW,
      //   metadata: { backupId, tables: metadata.tables }
      // });

      const supabase = await createClient();
      const backupData: any = {
        metadata,
        tables: {},
        schema: {},
        timestamp: startTime.toISOString()
      };

      let totalRecords = 0;

      // Backup de cada tabela
      for (const tableConfig of tableConfigs) {
        try {
          const { data, count } = await this.getTableData(supabase, tableConfig);
          
          backupData.tables[tableConfig.tableName] = {
            config: tableConfig,
            data: tableConfig.includeData ? data : [],
            recordCount: count
          };
          
          totalRecords += count;
          
          // Verificar tamanho máximo
          const currentSize = JSON.stringify(backupData).length;
          if (currentSize > this.config.maxBackupSize) {
            throw new Error('Backup excede o tamanho máximo permitido');
          }
          
        } catch (error) {
          console.error(`Erro ao fazer backup da tabela ${tableConfig.tableName}:`, error);
          throw error;
        }
      }

      // Converter para JSON
      const jsonData = JSON.stringify(backupData, null, 2);
      let finalData: Uint8Array = Buffer.from(jsonData, 'utf8');

      // Comprimir se habilitado
      if (this.config.enableCompression) {
        const gzip = createGzip({ level: this.config.compressionLevel });
        const chunks: Uint8Array[] = [];
        
        gzip.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        gzip.on('end', () => {
          finalData = Buffer.concat(chunks);
        });
        
        gzip.write(finalData);
        gzip.end();
        
        await new Promise(resolve => gzip.on('end', resolve));
      }

      // Criptografar se habilitado
      if (this.config.enableEncryption) {
        finalData = this.encrypt(Buffer.from(finalData));
      }

      // Salvar arquivo
      const fileName = `${backupId}.backup`;
      const filePath = path.join(this.config.backupPath, fileName);
      await fs.writeFile(filePath, finalData);

      // Calcular checksum
      const checksum = await this.calculateChecksum(filePath);
      
      // Atualizar metadados
      const endTime = new Date();
      metadata.status = 'completed';
      metadata.endTime = endTime;
      metadata.duration = endTime.getTime() - startTime.getTime();
      metadata.size = finalData.length;
      metadata.checksum = checksum;
      metadata.recordCount = totalRecords;

      // Salvar metadados
      const metadataPath = path.join(this.config.backupPath, `${backupId}.metadata.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // await logSecurityEvent({
      //   action: 'BACKUP_COMPLETED',
      //   details: `Backup completo concluído: ${backupId}`,
      //   severity: SecuritySeverity.LOW,
      //   metadata: {
      //     backupId,
      //     duration: metadata.duration,
      //     size: metadata.size,
      //     recordCount: totalRecords
      //   }
      // });

      return metadata;

    } catch (error) {
      metadata.status = 'failed';
      metadata.errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      metadata.endTime = new Date();
      metadata.duration = metadata.endTime.getTime() - startTime.getTime();

      // await logSecurityEvent({
      //   action: 'BACKUP_FAILED',
      //   details: `Backup falhou: ${backupId} - ${metadata.errorMessage}`,
      //   severity: SecuritySeverity.MEDIUM,
      //   metadata: { backupId, error: metadata.errorMessage }
      // });

      throw error;
    } finally {
      this.isRunning = false;
      this.currentBackup = undefined;
    }
  }

  // Restaurar backup
  public async restoreBackup(backupId: string): Promise<void> {
    const filePath = path.join(this.config.backupPath, `${backupId}.backup`);
    const metadataPath = path.join(this.config.backupPath, `${backupId}.metadata.json`);

    try {
      // Verificar se arquivos existem
      await fs.access(filePath);
      await fs.access(metadataPath);

      // Carregar metadados
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata: BackupMetadata = JSON.parse(metadataContent);

      // Verificar integridade
      const currentChecksum = await this.calculateChecksum(filePath);
      if (currentChecksum !== metadata.checksum) {
        throw new Error('Checksum do backup não confere - arquivo pode estar corrompido');
      }

      // Ler arquivo de backup
      let backupData = await fs.readFile(filePath);

      // Descriptografar se necessário
      if (metadata.encrypted) {
        backupData = this.decrypt(Buffer.from(backupData));
      }

      // Descomprimir se necessário
      if (metadata.compressed) {
        const gunzip = createGunzip();
        const chunks: Uint8Array[] = [];
        
        gunzip.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        gunzip.on('end', () => {
          backupData = Buffer.concat(chunks);
        });
        
        gunzip.write(backupData);
        gunzip.end();
        
        await new Promise(resolve => gunzip.on('end', resolve));
      }

      // Parsear dados
      const backup = JSON.parse((backupData as Buffer).toString('utf8'));
      const supabase = await createClient();

      // await logSecurityEvent({
      //   action: 'BACKUP_RESTORE_STARTED',
      //   details: `Restauração de backup iniciada: ${backupId}`,
      //   severity: SecuritySeverity.MEDIUM,
      //   metadata: { backupId }
      // });

      // Restaurar cada tabela
      for (const [tableName, tableData] of Object.entries(backup.tables) as [string, any][]) {
        if (tableData.data && tableData.data.length > 0) {
          // Limpar tabela existente (cuidado!)
          const { error: deleteError } = await (supabase as any)
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
          
          if (deleteError) {
            console.warn(`Aviso ao limpar tabela ${tableName}:`, deleteError);
          }
          
          // Inserir dados do backup
          const { error: insertError } = await (supabase as any)
            .from(tableName)
            .insert(tableData.data);
          
          if (insertError) {
            throw new Error(`Erro ao restaurar tabela ${tableName}: ${insertError.message}`);
          }
        }
      }

      // await logSecurityEvent({
      //   action: 'BACKUP_RESTORE_COMPLETED',
      //   details: `Restauração de backup concluída: ${backupId}`,
      //   severity: SecuritySeverity.MEDIUM,
      //   metadata: { backupId }
      // });

    } catch (error) {
      // await logSecurityEvent({
      //   action: 'BACKUP_RESTORE_FAILED',
      //   details: `Restauração de backup falhou: ${backupId} - ${error}`,
      //   severity: SecuritySeverity.HIGH,
      //   metadata: { backupId, error: error instanceof Error ? error.message : 'Erro desconhecido' }
      // });

      throw error;
    }
  }

  // Listar backups disponíveis
  public async listBackups(): Promise<BackupMetadata[]> {
    try {
      const files = await fs.readdir(this.config.backupPath);
      const metadataFiles = files.filter(file => file.endsWith('.metadata.json'));
      
      const backups: BackupMetadata[] = [];
      
      for (const file of metadataFiles) {
        try {
          const content = await fs.readFile(
            path.join(this.config.backupPath, file),
            'utf8'
          );
          const metadata: BackupMetadata = JSON.parse(content);
          backups.push(metadata);
        } catch (error) {
          console.warn(`Erro ao ler metadados do backup ${file}:`, error);
        }
      }
      
      return backups.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    } catch (error) {
      console.error('Erro ao listar backups:', error);
      return [];
    }
  }

  // Limpar backups antigos
  public async cleanupOldBackups(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    const backups = await this.listBackups();
    const oldBackups = backups.filter(backup => backup.startTime < cutoffDate);
    
    let deletedCount = 0;
    
    for (const backup of oldBackups) {
      try {
        const backupFile = path.join(this.config.backupPath, `${backup.id}.backup`);
        const metadataFile = path.join(this.config.backupPath, `${backup.id}.metadata.json`);
        
        await fs.unlink(backupFile);
        await fs.unlink(metadataFile);
        
        deletedCount++;
        
        // await logSecurityEvent({
        //   action: 'BACKUP_DELETED',
        //   details: `Backup antigo removido: ${backup.id}`,
        //   severity: SecuritySeverity.LOW,
        //   metadata: { backupId: backup.id, age: cutoffDate.getTime() - backup.startTime.getTime() }
        // });
        
      } catch (error) {
        console.error(`Erro ao deletar backup ${backup.id}:`, error);
      }
    }
    
    return deletedCount;
  }

  // Agendar backups automáticos
  public scheduleAutomaticBackups(
    tableConfigs: TableBackupConfig[]
  ): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }
    
    this.scheduleTimer = setInterval(async () => {
      try {
        await this.createFullBackup(tableConfigs);
        await this.cleanupOldBackups();
      } catch (error) {
        console.error('Erro no backup automático:', error);
      }
    }, this.config.scheduleInterval);
    
    // logSecurityEvent({
    //   action: 'BACKUP_SCHEDULE_ENABLED',
    //   details: `Backup automático agendado a cada ${this.config.scheduleInterval / 1000 / 60 / 60} horas`,
    //   severity: SecuritySeverity.LOW
    // });
  }

  // Parar agendamento
  public stopScheduledBackups(): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
      this.scheduleTimer = undefined;
      
      // logSecurityEvent({
      //   action: 'BACKUP_SCHEDULE_DISABLED',
      //   details: 'Backup automático desabilitado',
      //   severity: SecuritySeverity.LOW
      // });
    }
  }

  // Obter status atual
  public getStatus(): {
    isRunning: boolean;
    currentBackup?: BackupMetadata;
    config: BackupConfig;
  } {
    return {
      isRunning: this.isRunning,
      currentBackup: this.currentBackup,
      config: this.config
    };
  }
}

// Configurações padrão para tabelas principais
export const DEFAULT_TABLE_CONFIGS: TableBackupConfig[] = [
  {
    tableName: 'profiles',
    includeData: true,
    excludeColumns: ['avatar_url'] // URLs podem ser regeneradas
  },
  {
    tableName: 'companies',
    includeData: true
  },
  {
    tableName: 'security_events',
    includeData: true,
    whereClause: 'created_at > now() - interval \'30 days\'', // Apenas últimos 30 dias
    orderBy: 'created_at desc'
  },
  {
    tableName: 'file_uploads',
    includeData: true,
    excludeColumns: ['file_path'] // Caminhos podem mudar
  },
  {
    tableName: 'user_sessions',
    includeData: false // Não fazer backup de sessões ativas
  }
];

// Instância singleton
let backupSystemInstance: BackupSystem | null = null;

export function getBackupSystem(config?: Partial<BackupConfig>): BackupSystem {
  if (!backupSystemInstance) {
    backupSystemInstance = new BackupSystem(config);
  }
  return backupSystemInstance;
}

// Função de conveniência para backup rápido
export async function createQuickBackup(): Promise<BackupMetadata> {
  const backupSystem = getBackupSystem();
  return backupSystem.createFullBackup(DEFAULT_TABLE_CONFIGS);
}