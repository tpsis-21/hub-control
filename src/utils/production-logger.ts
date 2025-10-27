/**
 * Sistema de Logging para Produção
 * 
 * Remove logs de debug desnecessários em produção mantendo apenas
 * logs essenciais para auditoria e monitoramento de erros.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  context?: string
}

class ProductionLogger {
  private isProduction = process.env.NODE_ENV === 'production'
  private allowedLevels: LogLevel[] = this.isProduction 
    ? ['error', 'warn'] // Apenas erros e avisos em produção
    : ['error', 'warn', 'info', 'debug'] // Todos os níveis em desenvolvimento

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date().toISOString()
    const context = entry.context ? `[${entry.context}]` : ''
    return `${timestamp} ${context} [${entry.level.toUpperCase()}] ${entry.message}`
  }

  private shouldLog(level: LogLevel): boolean {
    return this.allowedLevels.includes(level)
  }

  error(message: string, data?: any, context?: string): void {
    if (this.shouldLog('error')) {
      const entry: LogEntry = {
        level: 'error',
        message,
        data,
        timestamp: new Date().toISOString(),
        context
      }
      console.error(this.formatMessage(entry), data || '')
    }
  }

  warn(message: string, data?: any, context?: string): void {
    if (this.shouldLog('warn')) {
      const entry: LogEntry = {
        level: 'warn',
        message,
        data,
        timestamp: new Date().toISOString(),
        context
      }
      console.warn(this.formatMessage(entry), data || '')
    }
  }

  info(message: string, data?: any, context?: string): void {
    if (this.shouldLog('info')) {
      const entry: LogEntry = {
        level: 'info',
        message,
        data,
        timestamp: new Date().toISOString(),
        context
      }
      console.info(this.formatMessage(entry), data || '')
    }
  }

  debug(message: string, data?: any, context?: string): void {
    if (this.shouldLog('debug')) {
      const entry: LogEntry = {
        level: 'debug',
        message,
        data,
        timestamp: new Date().toISOString(),
        context
      }
      console.debug(this.formatMessage(entry), data || '')
    }
  }

  // Métodos específicos para casos de uso comuns
  auditLog(action: string, userId?: string, data?: any): void {
    this.info(`AUDIT: ${action}`, { userId, ...data }, 'AUDIT')
  }

  securityLog(event: string, ip?: string, data?: any): void {
    this.warn(`SECURITY: ${event}`, { ip, ...data }, 'SECURITY')
  }

  performanceLog(metric: string, value: number, threshold?: number): void {
    if (threshold && value > threshold) {
      this.warn(`PERFORMANCE: ${metric} exceeded threshold`, { value, threshold }, 'PERFORMANCE')
    } else {
      this.debug(`PERFORMANCE: ${metric}`, { value }, 'PERFORMANCE')
    }
  }
}

// Instância singleton
export const logger = new ProductionLogger()

// Funções de conveniência para compatibilidade
export const logError = (message: string, data?: any, context?: string) => 
  logger.error(message, data, context)

export const logWarn = (message: string, data?: any, context?: string) => 
  logger.warn(message, data, context)

export const logInfo = (message: string, data?: any, context?: string) => 
  logger.info(message, data, context)

export const logDebug = (message: string, data?: any, context?: string) => 
  logger.debug(message, data, context)

export const logAudit = (action: string, userId?: string, data?: any) => 
  logger.auditLog(action, userId, data)

export const logSecurity = (event: string, ip?: string, data?: any) => 
  logger.securityLog(event, ip, data)

export const logPerformance = (metric: string, value: number, threshold?: number) => 
  logger.performanceLog(metric, value, threshold)

// Wrapper para substituir console.log em produção
export const safeLog = {
  log: (message: string, data?: any) => logger.debug(message, data),
  error: (message: string, data?: any) => logger.error(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  debug: (message: string, data?: any) => logger.debug(message, data)
}

export default logger
