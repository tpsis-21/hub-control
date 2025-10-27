/**
 * Sistema de logs estruturados para produção
 * Suporte a diferentes níveis, formatação JSON e integração com serviços de monitoramento
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  version: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  environment: string;
  version: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  logDir: string;
  maxFileSize: number;
  maxFiles: number;
  sensitiveFields: string[];
  remoteEndpoint?: string;
  remoteApiKey?: string;
}

class Logger {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };
  private fileStreams: Map<string, NodeJS.WritableStream> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      service: 'hub-control',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      enableRemote: process.env.NODE_ENV === 'production',
      logDir: './logs',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      sensitiveFields: [
        'password',
        'token',
        'apiKey',
        'secret',
        'authorization',
        'cookie',
        'session',
        'credit_card',
        'ssn',
        'cpf',
      ],
      remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
      remoteApiKey: process.env.LOG_REMOTE_API_KEY,
      ...config,
    };

    this.initializeFileLogging();
  }

  private initializeFileLogging() {
    if (!this.config.enableFile) return;

    // Criar diretório de logs se não existir
    if (!existsSync(this.config.logDir)) {
      mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level];
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.config.sensitiveFields.some(field => 
        lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private formatLogEntry(entry: LogEntry): string {
    const sanitizedEntry = this.sanitizeData(entry);
    return JSON.stringify(sanitizedEntry);
  }

  private getFileStream(level: LogLevel): NodeJS.WritableStream | null {
    if (!this.config.enableFile) return null;

    const fileName = `${level}.log`;
    const filePath = join(this.config.logDir, fileName);

    if (!this.fileStreams.has(level)) {
      const stream = createWriteStream(filePath, { flags: 'a' });
      this.fileStreams.set(level, stream);
    }

    return this.fileStreams.get(level) || null;
  }

  private async writeToFile(entry: LogEntry) {
    const stream = this.getFileStream(entry.level);
    if (stream) {
      const logLine = this.formatLogEntry(entry) + '\n';
      stream.write(logLine);
    }
  }

  private writeToConsole(entry: LogEntry) {
    if (!this.config.enableConsole) return;

    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      fatal: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level] || reset;

    if (this.config.environment === 'development') {
      // Formato legível para desenvolvimento
      console.log(
        `${color}[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.service}:${reset} ${entry.message}`
      );
      if (entry.metadata) {
        console.log('  Metadata:', entry.metadata);
      }
      if (entry.error) {
        console.log('  Error:', entry.error);
      }
    } else {
      // Formato JSON para produção
      console.log(this.formatLogEntry(entry));
    }
  }

  private async sendToRemote(entry: LogEntry) {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.remoteApiKey && {
            'Authorization': `Bearer ${this.config.remoteApiKey}`,
          }),
        },
        body: this.formatLogEntry(entry),
      });

      if (!response.ok) {
        console.error('Falha ao enviar log para serviço remoto:', response.statusText);
      }
    } catch (error) {
      console.error('Erro ao enviar log para serviço remoto:', error);
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.config.service,
      environment: this.config.environment,
      version: this.config.version,
      metadata: metadata ? this.sanitizeData(metadata) : undefined,
    };
  }

  private async log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, metadata);

    // Escrever em paralelo para diferentes destinos
    await Promise.all([
      this.writeToConsole(entry),
      this.writeToFile(entry),
      this.sendToRemote(entry),
    ]);
  }

  // Métodos públicos
  debug(message: string, metadata?: Record<string, any>) {
    return this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    return this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    return this.log('warn', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>) {
    const entry = this.createLogEntry('error', message, metadata);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    if (!this.shouldLog('error')) return;

    Promise.all([
      this.writeToConsole(entry),
      this.writeToFile(entry),
      this.sendToRemote(entry),
    ]);
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>) {
    const entry = this.createLogEntry('fatal', message, metadata);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    if (!this.shouldLog('fatal')) return;

    Promise.all([
      this.writeToConsole(entry),
      this.writeToFile(entry),
      this.sendToRemote(entry),
    ]);
  }

  // Métodos para contexto de requisição
  withContext(context: Partial<LogEntry>) {
    return {
      debug: (message: string, metadata?: Record<string, any>) => {
        const entry = this.createLogEntry('debug', message, metadata);
        Object.assign(entry, context);
        if (this.shouldLog('debug')) {
          Promise.all([
            this.writeToConsole(entry),
            this.writeToFile(entry),
            this.sendToRemote(entry),
          ]);
        }
      },
      info: (message: string, metadata?: Record<string, any>) => {
        const entry = this.createLogEntry('info', message, metadata);
        Object.assign(entry, context);
        if (this.shouldLog('info')) {
          Promise.all([
            this.writeToConsole(entry),
            this.writeToFile(entry),
            this.sendToRemote(entry),
          ]);
        }
      },
      warn: (message: string, metadata?: Record<string, any>) => {
        const entry = this.createLogEntry('warn', message, metadata);
        Object.assign(entry, context);
        if (this.shouldLog('warn')) {
          Promise.all([
            this.writeToConsole(entry),
            this.writeToFile(entry),
            this.sendToRemote(entry),
          ]);
        }
      },
      error: (message: string, error?: Error, metadata?: Record<string, any>) => {
        const entry = this.createLogEntry('error', message, metadata);
        Object.assign(entry, context);
        if (error) {
          entry.error = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          };
        }
        if (this.shouldLog('error')) {
          Promise.all([
            this.writeToConsole(entry),
            this.writeToFile(entry),
            this.sendToRemote(entry),
          ]);
        }
      },
    };
  }

  // Cleanup
  close() {
    for (const stream of this.fileStreams.values()) {
      if (stream && typeof stream.end === 'function') {
        stream.end();
      }
    }
    this.fileStreams.clear();
  }
}

// Instância global do logger
export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE === 'true',
  enableRemote: process.env.LOG_ENABLE_REMOTE === 'true',
  logDir: process.env.LOG_DIR || './logs',
  remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
  remoteApiKey: process.env.LOG_REMOTE_API_KEY,
});

// Middleware para Next.js
export function createLoggerMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    // Adicionar logger ao contexto da requisição
    req.logger = logger.withContext({
      requestId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
    });

    // Log da requisição
    req.logger.info('Requisição recebida', {
      headers: req.headers,
      query: req.query,
      body: req.body,
    });

    // Interceptar resposta
    const originalSend = res.send;
    res.send = function(data: any) {
      const responseTime = Date.now() - startTime;
      req.logger.info('Resposta enviada', {
        statusCode: res.statusCode,
        responseTime,
        contentLength: data ? data.length : 0,
      });
      return originalSend.call(this, data);
    };

    if (next) next();
  };
}

export default logger;
