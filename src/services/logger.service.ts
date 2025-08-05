// src/services/logger.service.ts

/**
 * Níveis de log disponíveis
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Interface para entradas de log
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

/**
 * Configuração do logger
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxLocalEntries: number;
}

/**
 * Serviço centralizado de logging
 * Fornece funcionalidades de log estruturado com diferentes níveis e destinos
 */
export class LoggerService {
  private static config: LoggerConfig = {
    level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
    enableConsole: true,
    enableRemote: process.env.NODE_ENV === 'production',
    maxLocalEntries: 1000
  };

  private static localEntries: LogEntry[] = [];
  private static sessionId = this.generateSessionId();

  /**
   * Configura o logger
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gera um ID único para a sessão
   */
  private static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verifica se o nível de log deve ser registrado
   */
  private static shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Cria uma entrada de log
   */
  private static createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    userId?: string
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      data,
      userId,
      sessionId: this.sessionId
    };
  }

  /**
   * Formata uma entrada de log para exibição
   */
  private static formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? `[${entry.context}]` : '';
    const data = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
    
    return `${timestamp} ${levelName} ${context} ${entry.message}${data}`;
  }

  /**
   * Registra uma entrada de log
   */
  private static log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    userId?: string
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, context, data, userId);

    // Log no console se habilitado
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Armazena localmente
    this.storeLocally(entry);

    // Envia para servidor remoto se habilitado
    if (this.config.enableRemote) {
      this.logToRemote(entry);
    }
  }

  /**
   * Registra no console com cores apropriadas
   */
  private static logToConsole(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  /**
   * Armazena a entrada localmente
   */
  private static storeLocally(entry: LogEntry): void {
    this.localEntries.push(entry);
    
    // Remove entradas antigas se exceder o limite
    if (this.localEntries.length > this.config.maxLocalEntries) {
      this.localEntries = this.localEntries.slice(-this.config.maxLocalEntries);
    }
  }

  /**
   * Envia log para servidor remoto
   */
  private static async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Falha silenciosa para evitar loops de log
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  /**
   * Métodos públicos de logging
   */
  static debug(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.DEBUG, message, context, data, userId);
  }

  static info(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.INFO, message, context, data, userId);
  }

  static warn(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.WARN, message, context, data, userId);
  }

  static error(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.ERROR, message, context, data, userId);
  }

  /**
   * Logs específicos para diferentes contextos
   */
  static logUserAction(action: string, userId: string, data?: any): void {
    this.info(`User action: ${action}`, 'UserAction', data, userId);
  }

  static logApiCall(endpoint: string, method: string, duration?: number, userId?: string): void {
    this.info(`API call: ${method} ${endpoint}`, 'ApiCall', { duration }, userId);
  }

  static logDatabaseQuery(query: string, duration?: number, userId?: string): void {
    this.debug(`Database query executed`, 'Database', { query, duration }, userId);
  }

  static logAuthentication(event: string, userId?: string, success: boolean = true): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, `Authentication event: ${event}`, 'Auth', { success }, userId);
  }

  static logPerformance(metric: string, value: number, context?: string): void {
    this.info(`Performance metric: ${metric} = ${value}ms`, context || 'Performance', { metric, value });
  }

  /**
   * Utilitários
   */
  static getLocalEntries(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.localEntries.filter(entry => entry.level === level);
    }
    return [...this.localEntries];
  }

  static clearLocalEntries(): void {
    this.localEntries = [];
  }

  static exportLogs(): string {
    return JSON.stringify(this.localEntries, null, 2);
  }

  /**
   * Wrapper para medir tempo de execução
   */
  static async measureTime<T>(
    fn: () => Promise<T>,
    label: string,
    context?: string,
    userId?: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.logPerformance(label, duration, context);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed after ${duration}ms`, context, { error }, userId);
      throw error;
    }
  }

  /**
   * Wrapper para medir tempo de execução síncrona
   */
  static measureTimeSync<T>(
    fn: () => T,
    label: string,
    context?: string,
    userId?: string
  ): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.logPerformance(label, duration, context);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed after ${duration}ms`, context, { error }, userId);
      throw error;
    }
  }
}