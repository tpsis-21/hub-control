// src/services/error.service.ts

/**
 * Tipos de erro da aplicação
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Interface para erros customizados da aplicação
 */
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

/**
 * Serviço centralizado para tratamento de erros
 * Fornece métodos para criar, categorizar e tratar erros de forma consistente
 */
export class ErrorService {
  /**
   * Cria um erro customizado da aplicação
   */
  static createError(
    type: ErrorType,
    message: string,
    code?: string,
    details?: any
  ): AppError {
    return {
      type,
      message,
      code,
      details,
      timestamp: new Date()
    };
  }

  /**
   * Categoriza um erro baseado na sua natureza
   */
  static categorizeError(error: Error | any): ErrorType {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || '';

    // Erros de autenticação
    if (errorMessage.includes('unauthorized') || 
        errorMessage.includes('authentication') ||
        errorCode === 'UNAUTHORIZED') {
      return ErrorType.AUTHENTICATION;
    }

    // Erros de autorização
    if (errorMessage.includes('forbidden') || 
        errorMessage.includes('permission') ||
        errorCode === 'FORBIDDEN') {
      return ErrorType.AUTHORIZATION;
    }

    // Erros de validação
    if (errorMessage.includes('validation') || 
        errorMessage.includes('invalid') ||
        errorMessage.includes('required')) {
      return ErrorType.VALIDATION;
    }

    // Erros de não encontrado
    if (errorMessage.includes('not found') || 
        errorCode === 'NOT_FOUND') {
      return ErrorType.NOT_FOUND;
    }

    // Erros de rede
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection')) {
      return ErrorType.NETWORK;
    }

    // Erros de banco de dados
    if (errorMessage.includes('database') || 
        errorMessage.includes('sql') ||
        errorMessage.includes('constraint')) {
      return ErrorType.DATABASE;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Converte um erro nativo em AppError
   */
  static fromNativeError(error: Error | any): AppError {
    const type = this.categorizeError(error);
    const message = this.getUserFriendlyMessage(type, error.message);
    
    return this.createError(
      type,
      message,
      error.code,
      {
        originalMessage: error.message,
        stack: error.stack
      }
    );
  }

  /**
   * Retorna uma mensagem amigável para o usuário baseada no tipo de erro
   */
  static getUserFriendlyMessage(type: ErrorType, originalMessage?: string): string {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return 'Erro de autenticação. Por favor, faça login novamente.';
      
      case ErrorType.AUTHORIZATION:
        return 'Você não tem permissão para realizar esta ação.';
      
      case ErrorType.VALIDATION:
        return originalMessage || 'Os dados fornecidos são inválidos.';
      
      case ErrorType.NOT_FOUND:
        return 'O recurso solicitado não foi encontrado.';
      
      case ErrorType.NETWORK:
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      
      case ErrorType.DATABASE:
        return 'Erro interno do sistema. Tente novamente em alguns instantes.';
      
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }

  /**
   * Registra um erro (pode ser integrado com serviços como Sentry)
   */
  static logError(error: AppError | Error, context?: string): void {
    const errorToLog = error instanceof Error ? this.fromNativeError(error) : error;
    
    // Log básico no console (em produção, integrar com Sentry ou similar)
    console.error('Error logged:', {
      ...errorToLog,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    });

    // TODO: Integrar com Sentry ou outro serviço de monitoramento
    // Sentry.captureException(error, { extra: { context, ...errorToLog } });
  }

  /**
   * Trata erros de forma padronizada em Server Actions
   */
  static handleServerActionError(error: Error | any, action: string): {
    success: false;
    error: string;
    code?: string;
  } {
    const appError = this.fromNativeError(error);
    this.logError(appError, `Server Action: ${action}`);
    
    return {
      success: false,
      error: appError.message,
      code: appError.code
    };
  }

  /**
   * Trata erros de forma padronizada em componentes React
   */
  static handleComponentError(error: Error | any, component: string): void {
    const appError = this.fromNativeError(error);
    this.logError(appError, `Component: ${component}`);
  }

  /**
   * Verifica se um erro é de um tipo específico
   */
  static isErrorOfType(error: AppError | Error, type: ErrorType): boolean {
    if (error instanceof Error) {
      return this.categorizeError(error) === type;
    }
    return error.type === type;
  }

  /**
   * Cria erros específicos para casos comuns
   */
  static createValidationError(message: string, details?: any): AppError {
    return this.createError(ErrorType.VALIDATION, message, 'VALIDATION_ERROR', details);
  }

  static createAuthenticationError(message?: string): AppError {
    return this.createError(
      ErrorType.AUTHENTICATION, 
      message || 'Usuário não autenticado', 
      'AUTH_ERROR'
    );
  }

  static createAuthorizationError(message?: string): AppError {
    return this.createError(
      ErrorType.AUTHORIZATION, 
      message || 'Usuário não autorizado', 
      'AUTHZ_ERROR'
    );
  }

  static createNotFoundError(resource: string): AppError {
    return this.createError(
      ErrorType.NOT_FOUND, 
      `${resource} não encontrado`, 
      'NOT_FOUND_ERROR'
    );
  }
}
