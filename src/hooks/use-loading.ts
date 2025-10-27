import { useState, useCallback } from "react";

interface UseLoadingOptions {
  initialLoading?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseLoadingReturn {
  isLoading: boolean;
  error: Error | null;
  data: any;
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: Error | null) => void;
  clearError: () => void;
  execute: <T>(asyncFn: () => Promise<T>) => Promise<T>;
  executeAsync: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export function useLoading(options: UseLoadingOptions = {}): UseLoadingReturn {
  const { initialLoading = false, onStart, onEnd, onError } = options;
  
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
    onStart?.();
  }, [onStart]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    onEnd?.();
  }, [onEnd]);

  const handleError = useCallback((err: Error | null) => {
    setError(err);
    if (err) {
      onError?.(err);
    }
  }, [onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Método execute que re-joga erros (para testes)
  const execute = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    try {
      startLoading();
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      handleError(error);
      throw error; // Re-joga o erro para compatibilidade com testes
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, handleError]);

  // Método executeAsync que não re-joga erros (para uso na aplicação)
  const executeAsync = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      startLoading();
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      handleError(error);
      return null;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, handleError]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    startLoading,
    stopLoading,
    setError: handleError,
    clearError,
    execute,
    executeAsync,
    reset
  };
}

// Hook específico para operações CRUD
interface CrudLoadingReturn {
  creating: boolean;
  reading: boolean;
  updating: boolean;
  deleting: boolean;
  isLoading: boolean;
  error: Error | null;
  executeCreate: <T>(asyncFn: () => Promise<T>) => Promise<T>;
  executeRead: <T>(asyncFn: () => Promise<T>) => Promise<T>;
  executeUpdate: <T>(asyncFn: () => Promise<T>) => Promise<T>;
  executeDelete: <T>(asyncFn: () => Promise<T>) => Promise<T>;
  create: UseLoadingReturn;
  read: UseLoadingReturn;
  update: UseLoadingReturn;
  delete: UseLoadingReturn;
  isAnyLoading: boolean;
  hasAnyError: boolean | Error | null;
  resetAll: () => void;
}

export function useCrudLoading(): CrudLoadingReturn {
  const create = useLoading();
  const read = useLoading();
  const update = useLoading();
  const remove = useLoading();

  const isAnyLoading = create.isLoading || read.isLoading || update.isLoading || remove.isLoading;
  const hasAnyError = create.error || read.error || update.error || remove.error;

  const resetAll = () => {
    create.reset();
    read.reset();
    update.reset();
    remove.reset();
  };

  return {
    creating: create.isLoading,
    reading: read.isLoading,
    updating: update.isLoading,
    deleting: remove.isLoading,
    isLoading: isAnyLoading,
    error: hasAnyError,
    executeCreate: create.execute,
    executeRead: read.execute,
    executeUpdate: update.execute,
    executeDelete: remove.execute,
    create,
    read,
    update,
    delete: remove,
    isAnyLoading,
    hasAnyError,
    resetAll
  };
}

// Hook para múltiplas operações simultâneas
interface MultipleLoadingReturn {
  loadingStates: Record<string, boolean>;
  isAnyLoading: boolean;
  errors: Record<string, Error | null>;
  execute: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T>;
  isLoading: (key: string) => boolean;
  getError: (key: string) => Error | null;
  clearError: (key: string) => void;
}

export function useMultipleLoading(): MultipleLoadingReturn {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});

  const execute = useCallback(async <T>(key: string, asyncFn: () => Promise<T>): Promise<T> => {
    try {
      setLoadingStates(prev => ({ ...prev, [key]: true }));
      setErrors(prev => ({ ...prev, [key]: null }));
      
      const result = await asyncFn();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      setErrors(prev => ({ ...prev, [key]: error }));
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const getError = useCallback((key: string) => {
    return errors[key] || null;
  }, [errors]);

  const clearError = useCallback((key: string) => {
    setErrors(prev => ({ ...prev, [key]: null }));
  }, []);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  return {
    loadingStates,
    isAnyLoading,
    errors,
    execute,
    isLoading,
    getError,
    clearError
  };
}
