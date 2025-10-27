"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Tipos de toast
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// Interface para configuração do toast
export interface ToastConfig {
  id?: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

// Interface para o contexto do toast
interface ToastContextType {
  toasts: ToastConfig[];
  addToast: (config: Omit<ToastConfig, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// Contexto do toast
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook para usar o toast
export function useEnhancedToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useEnhancedToast deve ser usado dentro de um ToastProvider');
  }
  
  // Retorna o contexto com helpers adicionais
  return {
    ...context,
    success: (title: string, options?: { description?: string; duration?: number }) => 
      context.addToast({ type: 'success', title, ...options }),
    
    error: (title: string, options?: { description?: string; duration?: number }) => 
      context.addToast({ type: 'error', title, ...options }),
    
    warning: (title: string, options?: { description?: string; duration?: number }) => 
      context.addToast({ type: 'warning', title, ...options }),
    
    info: (title: string, options?: { description?: string; duration?: number }) => 
      context.addToast({ type: 'info', title, ...options }),
    
    loading: (title: string, options?: { description?: string; duration?: number }) => 
      context.addToast({ type: 'loading', title, duration: 0, ...options }),
    
    promise: async <T,>(
      p: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      },
      options?: { description?: string; duration?: number }
    ): Promise<T> => {
      const loadingId = context.addToast({ 
        type: 'loading', 
        title: messages.loading, 
        duration: 0, 
        ...options 
      });
      
      try {
        const result = await p;
        context.removeToast(loadingId);
        context.addToast({ 
          type: 'success', 
          title: messages.success, 
          duration: 5000, 
          ...options 
        });
        return result;
      } catch (error) {
        context.removeToast(loadingId);
        context.addToast({ 
          type: 'error', 
          title: messages.error, 
          duration: 5000, 
          ...options 
        });
        throw error;
      }
    }
  };
}

// Componente individual do toast
function Toast({ toast, onRemove }: { toast: ToastConfig; onRemove: (id: string) => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 shadow-green-100';
      case 'error':
        return 'bg-red-50 border-red-200 shadow-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 shadow-yellow-100';
      case 'info':
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
      case 'loading':
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
      default:
        return 'bg-white border-gray-200 shadow-gray-100';
    }
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg transition-all duration-300 ease-in-out transform',
        'animate-in slide-in-from-top-full',
        getBackgroundColor()
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {toast.title}
            </p>
            {toast.description && (
              <p className="mt-1 text-sm text-gray-700">
                {toast.description}
              </p>
            )}
            {toast.action && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toast.action.onClick}
                  className="text-xs"
                >
                  {toast.action.label}
                </Button>
              </div>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(toast.id!)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Container dos toasts
function ToastContainer({ toasts, onRemove }: { toasts: ToastConfig[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Provider do toast
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const addToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...config, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast após duração especificada (exceto se for persistente)
    if (!config.persistent && config.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, config.duration || 5000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Alias para compatibilidade
export const EnhancedToastProvider = ToastProvider;

// Hook para helpers de toast
export function useToastHelpers() {
  const { addToast } = useEnhancedToast();

  return {
    success: (title: string, description?: string, options?: Partial<ToastConfig>) =>
      addToast({ type: 'success', title, description, ...options }),
    
    error: (title: string, description?: string, options?: Partial<ToastConfig>) =>
      addToast({ type: 'error', title, description, ...options }),
    
    warning: (title: string, description?: string, options?: Partial<ToastConfig>) =>
      addToast({ type: 'warning', title, description, ...options }),
    
    info: (title: string, description?: string, options?: Partial<ToastConfig>) =>
      addToast({ type: 'info', title, description, ...options }),
    
    loading: (title: string, description?: string, options?: Partial<ToastConfig>) =>
      addToast({ type: 'loading', title, description, persistent: true, ...options })
  };
}

// Componente de exemplo de uso
export function ToastExample() {
  const toast = useToastHelpers();

  return (
    <div className="space-y-2">
      <Button onClick={() => toast.success('Sucesso!', 'Operação realizada com sucesso')}>
        Toast de Sucesso
      </Button>
      <Button onClick={() => toast.error('Erro!', 'Algo deu errado')}>
        Toast de Erro
      </Button>
      <Button onClick={() => toast.warning('Atenção!', 'Verifique os dados')}>
        Toast de Aviso
      </Button>
      <Button onClick={() => toast.info('Informação', 'Dados atualizados')}>
        Toast de Info
      </Button>
      <Button onClick={() => toast.loading('Carregando...', 'Processando dados')}>
        Toast de Loading
      </Button>
    </div>
  );
}
