// src/lib/supabase/utils/logger.ts
// Sistema de logs centralizado para operações Supabase

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  client?: string;
  operation?: string;
  userId?: string;
  email?: string;
  [key: string]: any;
}

class SupabaseLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugEnabled = process.env.SUPABASE_DEBUG === 'true';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = this.getPrefix(level);
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `${timestamp} ${prefix} ${message}${contextStr}`;
  }

  private getPrefix(level: LogLevel): string {
    const prefixes = {
      info: '🔵 [SUPABASE]',
      warn: '🟡 [SUPABASE]',
      error: '🔴 [SUPABASE]',
      debug: '🔍 [SUPABASE]'
    };
    return prefixes[level];
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'error') return true;
    if (level === 'debug') return this.isDebugEnabled;
    return this.isDevelopment;
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: any, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = error ? { ...context, error: error.message || error } : context;
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  // Métodos específicos para operações comuns
  authSuccess(operation: string, email?: string): void {
    this.info(`Autenticação bem-sucedida: ${operation}`, { operation, email });
  }

  authError(operation: string, error: any, email?: string): void {
    this.error(`Erro de autenticação: ${operation}`, error, { operation, email });
  }

  userOperation(operation: string, userId?: string, email?: string): void {
    this.info(`Operação de usuário: ${operation}`, { operation, userId, email });
  }

  cookieOperation(operation: string, cookieName: string, client: string): void {
    this.debug(`Cookie ${operation}: ${cookieName}`, { operation, cookieName, client });
  }

  clientCreated(clientType: string): void {
    this.debug(`Cliente Supabase criado: ${clientType}`, { client: clientType });
  }
}

// Instância singleton do logger
export const supabaseLogger = new SupabaseLogger();

// Exports para compatibilidade
export default supabaseLogger;