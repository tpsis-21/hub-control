// 🔐 Sistema de Criptografia e Gestão de Chaves
// Fornece criptografia de dados em repouso e em trânsito, rotação de chaves e auditoria

import { randomBytes, createCipher, createDecipher, createCipheriv, createDecipheriv, createHash, pbkdf2, pbkdf2Sync, scrypt, scryptSync } from 'crypto';
import { SecuritySeverity } from './security';
// import { logSecurityEvent } from './security-config';

// Tipos de algoritmos de criptografia suportados
export type EncryptionAlgorithm = 
  | 'aes-256-gcm'     // Recomendado para dados gerais
  | 'aes-256-cbc'     // Para compatibilidade
  | 'chacha20-poly1305' // Para alta performance
  | 'aes-192-gcm'     // Para casos específicos
  | 'aes-128-gcm';    // Para dispositivos com recursos limitados

// Tipos de hash suportados
export type HashAlgorithm = 
  | 'sha256'
  | 'sha512'
  | 'sha3-256'
  | 'sha3-512'
  | 'blake2b512';

// Tipos de derivação de chave
export type KeyDerivationFunction = 
  | 'pbkdf2'
  | 'scrypt'
  | 'argon2'; // Requer biblioteca externa

// Classificação de dados para determinar nível de criptografia
export type DataClassification = 
  | 'public'        // Sem criptografia
  | 'internal'      // Criptografia básica
  | 'confidential'  // Criptografia forte
  | 'restricted';   // Criptografia máxima + auditoria

// Interface para resultado de criptografia
interface EncryptionResult {
  encryptedData: string;      // Dados criptografados (base64)
  iv: string;                 // Vetor de inicialização (base64)
  authTag?: string;           // Tag de autenticação para GCM (base64)
  salt: string;               // Salt usado na derivação (base64)
  algorithm: EncryptionAlgorithm;
  keyDerivation: KeyDerivationFunction;
  iterations?: number;        // Para PBKDF2
  memoryFactor?: number;      // Para Scrypt
  parallelization?: number;   // Para Scrypt
  metadata: {
    timestamp: string;
    classification: DataClassification;
    version: string;
    checksum: string;
  };
}

// Interface para configuração de criptografia
interface EncryptionConfig {
  algorithm: EncryptionAlgorithm;
  keyDerivation: KeyDerivationFunction;
  iterations: number;
  memoryFactor: number;
  parallelization: number;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
}

// Configurações por classificação de dados
const ENCRYPTION_CONFIGS: Record<DataClassification, EncryptionConfig> = {
  public: {
    algorithm: 'aes-128-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 10000,
    memoryFactor: 8,
    parallelization: 1,
    keyLength: 16,
    ivLength: 12,
    saltLength: 16,
    tagLength: 16
  },
  internal: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,
    memoryFactor: 16,
    parallelization: 1,
    keyLength: 32,
    ivLength: 12,
    saltLength: 32,
    tagLength: 16
  },
  confidential: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'scrypt',
    iterations: 100000,
    memoryFactor: 16384, // 16MB
    parallelization: 1,
    keyLength: 32,
    ivLength: 12,
    saltLength: 32,
    tagLength: 16
  },
  restricted: {
    algorithm: 'chacha20-poly1305',
    keyDerivation: 'scrypt',
    iterations: 1000000,
    memoryFactor: 32768, // 32MB
    parallelization: 2,
    keyLength: 32,
    ivLength: 12,
    saltLength: 64,
    tagLength: 16
  }
};

// Chaves mestras (devem ser armazenadas de forma segura em produção)
const MASTER_KEYS = {
  current: process.env.ENCRYPTION_MASTER_KEY || 'default-master-key-change-in-production',
  previous: process.env.ENCRYPTION_MASTER_KEY_PREVIOUS || null, // Para rotação de chaves
  version: process.env.ENCRYPTION_KEY_VERSION || '1.0'
};

// Cache de chaves derivadas (com TTL)
const keyCache = new Map<string, { key: Buffer; expires: number }>();
const KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Classe principal do sistema de criptografia
export class EncryptionSystem {
  private static instance: EncryptionSystem;
  private isEnabled = true;
  private auditEnabled = true;

  private constructor() {
    // Limpeza periódica do cache
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of keyCache.entries()) {
        if (value.expires <= now) {
          keyCache.delete(key);
        }
      }
    }, 60 * 1000); // A cada minuto
  }

  public static getInstance(): EncryptionSystem {
    if (!EncryptionSystem.instance) {
      EncryptionSystem.instance = new EncryptionSystem();
    }
    return EncryptionSystem.instance;
  }

  // Criptografar dados
  public async encrypt(
    data: string | Buffer,
    classification: DataClassification,
    password?: string,
    context?: string
  ): Promise<EncryptionResult> {
    if (!this.isEnabled) {
      throw new Error('Sistema de criptografia está desabilitado');
    }

    try {
      const config = ENCRYPTION_CONFIGS[classification];
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      
      // Gerar salt aleatório
      const salt = randomBytes(config.saltLength);
      
      // Derivar chave
      const key = await this.deriveKey(
        password || MASTER_KEYS.current,
        salt,
        config
      );
      
      // Gerar IV aleatório
      const iv = randomBytes(config.ivLength);
      
      // Criptografar dados
      const cipher = createCipheriv(config.algorithm, key, iv);
      
      let encryptedData = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final()
      ]);
      
      // Obter tag de autenticação para algoritmos GCM/Poly1305
      let authTag: Buffer | undefined;
      if (config.algorithm.includes('gcm') || config.algorithm.includes('poly1305')) {
        authTag = (cipher as any).getAuthTag();
      }
      
      // Calcular checksum dos dados originais
      const checksum = createHash('sha256').update(dataBuffer).digest('hex');
      
      const result: EncryptionResult = {
        encryptedData: encryptedData.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag?.toString('base64'),
        salt: salt.toString('base64'),
        algorithm: config.algorithm,
        keyDerivation: config.keyDerivation,
        iterations: config.iterations,
        memoryFactor: config.memoryFactor,
        parallelization: config.parallelization,
        metadata: {
          timestamp: new Date().toISOString(),
          classification,
          version: MASTER_KEYS.version,
          checksum
        }
      };
      
      // Auditoria
      if (this.auditEnabled) {
        await this.auditEncryption('encrypt', classification, context);
      }
      
      return result;
    } catch (error) {
      await this.auditEncryption('encrypt_failed', classification, context, error);
      throw new Error(`Falha na criptografia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Descriptografar dados
  public async decrypt(
    encryptionResult: EncryptionResult,
    password?: string,
    context?: string
  ): Promise<Buffer> {
    if (!this.isEnabled) {
      throw new Error('Sistema de criptografia está desabilitado');
    }

    try {
      const {
        encryptedData,
        iv,
        authTag,
        salt,
        algorithm,
        keyDerivation,
        iterations,
        memoryFactor,
        parallelization,
        metadata
      } = encryptionResult;
      
      // Configuração baseada nos metadados
      const config: EncryptionConfig = {
        algorithm,
        keyDerivation,
        iterations: iterations || 100000,
        memoryFactor: memoryFactor || 16384,
        parallelization: parallelization || 1,
        keyLength: this.getKeyLength(algorithm),
        ivLength: Buffer.from(iv, 'base64').length,
        saltLength: Buffer.from(salt, 'base64').length,
        tagLength: authTag ? Buffer.from(authTag, 'base64').length : 0
      };
      
      // Derivar chave
      const key = await this.deriveKey(
        password || MASTER_KEYS.current,
        Buffer.from(salt, 'base64'),
        config
      );
      
      // Descriptografar
      const decipher = createDecipheriv(
        algorithm,
        key,
        Buffer.from(iv, 'base64')
      );
      
      // Configurar tag de autenticação se presente
      if (authTag && (algorithm.includes('gcm') || algorithm.includes('poly1305'))) {
        (decipher as any).setAuthTag(Buffer.from(authTag, 'base64'));
      }
      
      const decryptedData = Buffer.concat([
        decipher.update(Buffer.from(encryptedData, 'base64')),
        decipher.final()
      ]);
      
      // Verificar integridade
      const checksum = createHash('sha256').update(decryptedData).digest('hex');
      if (checksum !== metadata.checksum) {
        throw new Error('Falha na verificação de integridade dos dados');
      }
      
      // Auditoria
      if (this.auditEnabled) {
        await this.auditEncryption('decrypt', metadata.classification, context);
      }
      
      return decryptedData;
    } catch (error) {
      await this.auditEncryption(
        'decrypt_failed',
        encryptionResult.metadata.classification,
        context,
        error
      );
      throw new Error(`Falha na descriptografia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Derivar chave usando função especificada
  private async deriveKey(
    password: string,
    salt: Buffer,
    config: EncryptionConfig
  ): Promise<Buffer> {
    const cacheKey = `${password}_${salt.toString('hex')}_${config.keyDerivation}_${config.iterations}`;
    
    // Verificar cache
    const cached = keyCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.key;
    }
    
    let key: Buffer;
    
    switch (config.keyDerivation) {
      case 'pbkdf2':
        key = pbkdf2Sync(
          password,
          salt,
          config.iterations,
          config.keyLength,
          'sha512'
        );
        break;
        
      case 'scrypt':
        key = scryptSync(
          password,
          salt,
          config.keyLength,
          {
            N: config.memoryFactor,
            r: 8,
            p: config.parallelization,
            maxmem: config.memoryFactor * 128 * 8 * 2 // Fórmula do scrypt
          }
        );
        break;
        
      case 'argon2':
        // Implementar Argon2 com biblioteca externa se necessário
        throw new Error('Argon2 não implementado ainda');
        
      default:
        throw new Error(`Função de derivação não suportada: ${config.keyDerivation}`);
    }
    
    // Armazenar no cache
    keyCache.set(cacheKey, {
      key,
      expires: Date.now() + KEY_CACHE_TTL
    });
    
    return key;
  }

  // Obter tamanho da chave baseado no algoritmo
  private getKeyLength(algorithm: EncryptionAlgorithm): number {
    switch (algorithm) {
      case 'aes-128-gcm':
        return 16;
      case 'aes-192-gcm':
        return 24;
      case 'aes-256-gcm':
      case 'aes-256-cbc':
      case 'chacha20-poly1305':
        return 32;
      default:
        return 32;
    }
  }

  // Gerar hash seguro
  public hash(
    data: string | Buffer,
    algorithm: HashAlgorithm = 'sha256',
    salt?: Buffer
  ): string {
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const hash = createHash(algorithm);
    
    if (salt) {
      hash.update(salt);
    }
    
    hash.update(dataBuffer);
    return hash.digest('hex');
  }

  // Gerar hash com salt
  public hashWithSalt(
    data: string | Buffer,
    algorithm: HashAlgorithm = 'sha256',
    saltLength: number = 32
  ): { hash: string; salt: string } {
    const salt = randomBytes(saltLength);
    const hash = this.hash(data, algorithm, salt);
    
    return {
      hash,
      salt: salt.toString('hex')
    };
  }

  // Verificar hash
  public verifyHash(
    data: string | Buffer,
    hash: string,
    salt?: string,
    algorithm: HashAlgorithm = 'sha256'
  ): boolean {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : undefined;
    const computedHash = this.hash(data, algorithm, saltBuffer);
    
    return this.constantTimeCompare(hash, computedHash);
  }

  // Comparação em tempo constante para prevenir ataques de timing
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  // Gerar chave aleatória
  public generateKey(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  // Gerar IV aleatório
  public generateIV(algorithm: EncryptionAlgorithm): string {
    const config = Object.values(ENCRYPTION_CONFIGS)
      .find(c => c.algorithm === algorithm) || ENCRYPTION_CONFIGS.confidential;
    
    return randomBytes(config.ivLength).toString('hex');
  }

  // Rotacionar chaves mestras
  public async rotateMasterKey(newKey: string): Promise<void> {
    try {
      // Validar nova chave
      if (newKey.length < 32) {
        throw new Error('Nova chave deve ter pelo menos 32 caracteres');
      }
      
      // Armazenar chave anterior
      const previousKey = MASTER_KEYS.current;
      
      // Atualizar chaves
      MASTER_KEYS.previous = previousKey;
      MASTER_KEYS.current = newKey;
      MASTER_KEYS.version = (parseFloat(MASTER_KEYS.version) + 0.1).toFixed(1);
      
      // Limpar cache de chaves
      keyCache.clear();
      
      // Auditoria
      // await logSecurityEvent({
      //   action: 'MASTER_KEY_ROTATION',
      //   details: 'Chave mestra rotacionada com sucesso',
      //   severity: SecuritySeverity.HIGH,
      //   metadata: {
      //     newVersion: MASTER_KEYS.version,
      //     timestamp: new Date().toISOString()
      //   }
      // });
      
    } catch (error) {
      // await logSecurityEvent({
      //   action: 'MASTER_KEY_ROTATION_FAILED',
      //   details: `Falha na rotação da chave mestra: ${error}`,
      //   severity: SecuritySeverity.CRITICAL,
      //   metadata: {
      //     error: error instanceof Error ? error.message : 'Erro desconhecido'
      //   }
      // });
      throw error;
    }
  }

  // Criptografia de campo específico (para bancos de dados)
  public async encryptField(
    value: string,
    fieldName: string,
    classification: DataClassification = 'confidential'
  ): Promise<string> {
    const result = await this.encrypt(value, classification, undefined, `field:${fieldName}`);
    return JSON.stringify(result);
  }

  // Descriptografia de campo específico
  public async decryptField(
    encryptedValue: string,
    fieldName: string
  ): Promise<string> {
    const result: EncryptionResult = JSON.parse(encryptedValue);
    const decrypted = await this.decrypt(result, undefined, `field:${fieldName}`);
    return decrypted.toString('utf8');
  }

  // Criptografia de arquivo
  public async encryptFile(
    fileBuffer: Buffer,
    fileName: string,
    classification: DataClassification = 'confidential'
  ): Promise<EncryptionResult> {
    return this.encrypt(fileBuffer, classification, undefined, `file:${fileName}`);
  }

  // Descriptografia de arquivo
  public async decryptFile(
    encryptionResult: EncryptionResult,
    fileName: string
  ): Promise<Buffer> {
    return this.decrypt(encryptionResult, undefined, `file:${fileName}`);
  }

  // Auditoria de operações de criptografia
  private async auditEncryption(
    operation: string,
    classification: DataClassification,
    context?: string,
    error?: any
  ): Promise<void> {
    try {
      // await logSecurityEvent({
      //   action: `ENCRYPTION_${operation.toUpperCase()}`,
      //   details: `Operação de criptografia: ${operation}`,
      //   severity: error ? 'high' : 'low',
      //   metadata: {
      //     classification,
      //     context,
      //     error: error instanceof Error ? error.message : error,
      //     timestamp: new Date().toISOString()
      //   }
      // });
    } catch (auditError) {
      console.error('Erro ao auditar operação de criptografia:', auditError);
    }
  }

  // Limpeza do cache de chaves
  private cleanupKeyCache(): void {
    const now = Date.now();
    for (const [key, value] of keyCache.entries()) {
      if (value.expires <= now) {
        keyCache.delete(key);
      }
    }
  }

  // Validar integridade do sistema
  public async validateSystemIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // Verificar chaves mestras
    if (!MASTER_KEYS.current || MASTER_KEYS.current === 'default-master-key-change-in-production') {
      issues.push('Chave mestra padrão em uso - alterar em produção');
    }
    
    if (MASTER_KEYS.current.length < 32) {
      issues.push('Chave mestra muito curta');
    }
    
    // Verificar algoritmos disponíveis
    try {
      const testData = Buffer.from('test');
      const testSalt = randomBytes(32);
      
      for (const config of Object.values(ENCRYPTION_CONFIGS)) {
        try {
          const key = await this.deriveKey('test', testSalt, config);
          const iv = randomBytes(config.ivLength);
          const cipher = createCipheriv(config.algorithm, key, iv);
          cipher.update(testData);
          cipher.final();
        } catch (error) {
          issues.push(`Algoritmo ${config.algorithm} não disponível`);
        }
      }
    } catch (error) {
      issues.push('Erro ao validar algoritmos de criptografia');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Estatísticas do sistema
  public getStatistics(): {
    cacheSize: number;
    keyVersion: string;
    algorithmsSupported: EncryptionAlgorithm[];
    isEnabled: boolean;
    auditEnabled: boolean;
  } {
    const stats = {
      cacheSize: keyCache.size,
      keyVersion: MASTER_KEYS.version,
      algorithmsSupported: Object.keys(ENCRYPTION_CONFIGS).map(k => ENCRYPTION_CONFIGS[k as DataClassification].algorithm) as EncryptionAlgorithm[],
      isEnabled: this.isEnabled,
      auditEnabled: this.auditEnabled
    };

    // logSecurityEvent({
    //   action: 'ENCRYPTION_STATS_GENERATED',
    //   details: 'Estatísticas do sistema de criptografia geradas',
    //   severity: SecuritySeverity.MEDIUM
    // });

    return stats;
  }

  // Configurações
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    // logSecurityEvent({
    //   action: 'ENCRYPTION_SYSTEM_TOGGLED',
    //   details: `Sistema de criptografia ${enabled ? 'habilitado' : 'desabilitado'}`,
    //   severity: SecuritySeverity.LOW
    // });
  }

  public setAuditEnabled(enabled: boolean): void {
    this.auditEnabled = enabled;
  }

  // Limpar cache manualmente
  public clearCache(): void {
    keyCache.clear();
    // logSecurityEvent({
    //   action: 'ENCRYPTION_CACHE_CLEARED',
    //   details: 'Cache de chaves de criptografia limpo',
    //   severity: SecuritySeverity.LOW
    // });
  }
}

// Instância singleton
export const encryptionSystem = EncryptionSystem.getInstance();

// Funções de conveniência
export const CryptoUtils = {
  // Criptografar string simples
  encryptString: async (data: string, classification: DataClassification = 'confidential') => {
    return encryptionSystem.encrypt(data, classification);
  },
  
  // Descriptografar string simples
  decryptString: async (encryptionResult: EncryptionResult) => {
    const buffer = await encryptionSystem.decrypt(encryptionResult);
    return buffer.toString('utf8');
  },
  
  // Hash de senha
  hashPassword: (password: string) => {
    return encryptionSystem.hashWithSalt(password, 'sha512', 32);
  },
  
  // Verificar senha
  verifyPassword: (password: string, hash: string, salt: string) => {
    return encryptionSystem.verifyHash(password, hash, salt, 'sha512');
  },
  
  // Gerar token seguro
  generateSecureToken: (length: number = 32) => {
    return encryptionSystem.generateKey(length);
  },
  
  // Hash de arquivo
  hashFile: (fileBuffer: Buffer) => {
    return encryptionSystem.hash(fileBuffer, 'sha256');
  },
  
  // Criptografar dados JSON
  encryptJSON: async (data: any, classification: DataClassification = 'confidential') => {
    const jsonString = JSON.stringify(data);
    return encryptionSystem.encrypt(jsonString, classification);
  },
  
  // Descriptografar dados JSON
  decryptJSON: async (encryptionResult: EncryptionResult) => {
    const buffer = await encryptionSystem.decrypt(encryptionResult);
    return JSON.parse(buffer.toString('utf8'));
  }
};

// Middleware para criptografia automática de campos
export const EncryptionMiddleware = {
  // Criptografar campos antes de salvar no banco
  encryptFields: async (data: Record<string, any>, fieldsToEncrypt: string[]) => {
    const encrypted = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        encrypted[field] = await encryptionSystem.encryptField(
          String(encrypted[field]),
          field
        );
      }
    }
    
    return encrypted;
  },
  
  // Descriptografar campos após buscar do banco
  decryptFields: async (data: Record<string, any>, fieldsToDecrypt: string[]) => {
    const decrypted = { ...data };
    
    for (const field of fieldsToDecrypt) {
      if (decrypted[field] !== undefined && decrypted[field] !== null) {
        try {
          decrypted[field] = await encryptionSystem.decryptField(
            decrypted[field],
            field
          );
        } catch (error) {
          console.error(`Erro ao descriptografar campo ${field}:`, error);
          // Manter valor original em caso de erro
        }
      }
    }
    
    return decrypted;
  }
};

export interface EncryptionAuditLog {
  action: string;
  details: string;
  severity: SecuritySeverity;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export async function auditEncryption(action: string, details: string, error?: Error) {
  const severity = error ? SecuritySeverity.HIGH : SecuritySeverity.LOW;
  // await logSecurityEvent({
  //   action,
  //   details,
  //   severity,
  // });
}
