// src/hooks/useErrorHandler.ts
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ErrorService, type AppError, ErrorType } from "@/services/error.service";

/**
 * Hook personalizado para tratamento de erros
 * Fornece uma interface consistente para tratar erros em componentes React
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Trata um erro e exibe uma notificação apropriada
   */
  const handleError = useCallback((error: Error | AppError | any, context?: string) => {
    const appError = error instanceof Error ? ErrorService.fromNativeError(error) : error;
    
    // Log do erro
    ErrorService.logError(appError, context);
    
    // Exibe toast baseado no tipo de erro
    const getToastVariant = (type: ErrorType) => {
      switch (type) {
        case ErrorType.VALIDATION:
          return "destructive" as const;
        case ErrorType.AUTHENTICATION:
        case ErrorType.AUTHORIZATION:
          return "destructive" as const;
        case ErrorType.NOT_FOUND:
          return "default" as const;
        case ErrorType.NETWORK:
          return "destructive" as const;
        default:
          return "destructive" as const;
      }
    };

    toast({
      title: "Erro",
      description: appError.message,
      variant: getToastVariant(appError.type),
    });
  }, [toast]);

  /**
   * Trata erros de validação especificamente
   */
  const handleValidationError = useCallback((errors: string[] | string) => {
    const errorMessage = Array.isArray(errors) ? errors.join(", ") : errors;
    const validationError = ErrorService.createValidationError(errorMessage);
    handleError(validationError, "Validation");
  }, [handleError]);

  /**
   * Trata erros de autenticação
   */
  const handleAuthError = useCallback((message?: string) => {
    const authError = ErrorService.createAuthenticationError(message);
    handleError(authError, "Authentication");
  }, [handleError]);

  /**
   * Trata erros de autorização
   */
  const handleAuthzError = useCallback((message?: string) => {
    const authzError = ErrorService.createAuthorizationError(message);
    handleError(authzError, "Authorization");
  }, [handleError]);

  /**
   * Trata erros de "não encontrado"
   */
  const handleNotFoundError = useCallback((resource: string) => {
    const notFoundError = ErrorService.createNotFoundError(resource);
    handleError(notFoundError, "Not Found");
  }, [handleError]);

  /**
   * Wrapper para executar funções async com tratamento de erro automático
   */
  const withErrorHandling = useCallback(
    <T extends any[], R>(
      fn: (...args: T) => Promise<R>,
      context?: string
    ) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          return await fn(...args);
        } catch (error) {
          handleError(error, context);
          return undefined;
        }
      };
    },
    [handleError]
  );

  /**
   * Wrapper para executar funções síncronas com tratamento de erro automático
   */
  const withSyncErrorHandling = useCallback(
    <T extends any[], R>(
      fn: (...args: T) => R,
      context?: string
    ) => {
      return (...args: T): R | undefined => {
        try {
          return fn(...args);
        } catch (error) {
          handleError(error, context);
          return undefined;
        }
      };
    },
    [handleError]
  );

  return {
    handleError,
    handleValidationError,
    handleAuthError,
    handleAuthzError,
    handleNotFoundError,
    withErrorHandling,
    withSyncErrorHandling,
  };
}
