/**
 * Sistema de Loading Aprimorado
 * Componentes de carregamento modernos com animações suaves e estados inteligentes
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

// ============================================
// INTERFACES E TIPOS
// ============================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';

export interface LoadingProps {
  state?: LoadingState;
  size?: LoadingSize;
  variant?: LoadingVariant;
  text?: string;
  className?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  progress?: number;
  duration?: number;
  onComplete?: () => void;
}

export interface LoadingStateHookOptions {
  initialState?: LoadingState;
  autoReset?: boolean;
  resetDelay?: number;
  onStateChange?: (state: LoadingState) => void;
}

// ============================================
// HOOK PARA GERENCIAR ESTADO DE LOADING
// ============================================

export function useLoadingState(options: LoadingStateHookOptions = {}) {
  const {
    initialState = 'idle',
    autoReset = false,
    resetDelay = 2000,
    onStateChange
  } = options;

  const [state, setState] = useState<LoadingState>(initialState);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>('');

  // Função para atualizar o estado
  const updateState = useCallback((newState: LoadingState, newMessage?: string) => {
    setState(newState);
    if (newMessage !== undefined) {
      setMessage(newMessage);
    }
    onStateChange?.(newState);

    // Auto reset para success/error
    if (autoReset && (newState === 'success' || newState === 'error')) {
      setTimeout(() => {
        setState('idle');
        setMessage('');
        setProgress(0);
      }, resetDelay);
    }
  }, [autoReset, resetDelay, onStateChange]);

  // Funções de conveniência
  const startLoading = useCallback((message?: string) => {
    updateState('loading', message);
    setProgress(0);
  }, [updateState]);

  const setSuccess = useCallback((message?: string) => {
    updateState('success', message);
    setProgress(100);
  }, [updateState]);

  const setError = useCallback((message?: string) => {
    updateState('error', message);
    setProgress(0);
  }, [updateState]);

  const reset = useCallback(() => {
    setState('idle');
    setMessage('');
    setProgress(0);
  }, []);

  // Simular progresso automático
  const simulateProgress = useCallback((duration: number = 3000) => {
    if (state !== 'loading') return;

    const interval = 50;
    const increment = 100 / (duration / interval);
    let currentProgress = 0;

    const timer = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 95) {
        clearInterval(timer);
        setProgress(95); // Parar em 95% até completar manualmente
      } else {
        setProgress(currentProgress);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [state]);

  return {
    state,
    progress,
    message,
    startLoading,
    setSuccess,
    setError,
    reset,
    updateState,
    setProgress,
    setMessage,
    simulateProgress,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle'
  };
}

// ============================================
// COMPONENTES DE LOADING
// ============================================

// Spinner animado
export function LoadingSpinner({ 
  size = 'md', 
  className,
  ...props 
}: { size?: LoadingSize; className?: string }) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <Loader2 
      className={cn('animate-spin', sizeClasses[size], className)} 
      {...props}
    />
  );
}

// Dots animados
export function LoadingDots({ 
  size = 'md', 
  className 
}: { size?: LoadingSize; className?: string }) {
  const sizeClasses = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  };

  const dotClass = cn('rounded-full bg-current animate-pulse', sizeClasses[size]);

  return (
    <div className={cn('flex space-x-1', className)}>
      <div className={cn(dotClass, 'animation-delay-0')} />
      <div className={cn(dotClass, 'animation-delay-150')} />
      <div className={cn(dotClass, 'animation-delay-300')} />
    </div>
  );
}

// Pulse animado
export function LoadingPulse({ 
  size = 'md', 
  className 
}: { size?: LoadingSize; className?: string }) {
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'rounded-full bg-blue-400 opacity-75 animate-ping absolute',
        sizeClasses[size]
      )} />
      <div className={cn(
        'rounded-full bg-blue-500',
        sizeClasses[size]
      )} />
    </div>
  );
}

// Skeleton loader
export function LoadingSkeleton({ 
  className,
  lines = 3,
  ...props 
}: { 
  className?: string; 
  lines?: number;
}) {
  return (
    <div className={cn('animate-pulse space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-gray-200 rounded',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

// Barra de progresso
export function LoadingProgress({ 
  progress = 0, 
  className,
  showPercentage = false,
  animated = true
}: { 
  progress?: number; 
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn(
            'bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out',
            animated && 'animate-pulse'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL ENHANCED LOADING
// ============================================

export function EnhancedLoading({
  state = 'loading',
  size = 'md',
  variant = 'spinner',
  text,
  className,
  fullScreen = false,
  overlay = false,
  progress = 0,
  duration = 0,
  onComplete
}: LoadingProps) {
  const [currentProgress, setCurrentProgress] = useState(progress);

  // Simular progresso se duration for fornecido
  useEffect(() => {
    if (duration > 0 && state === 'loading') {
      const interval = 50;
      const increment = 100 / (duration / interval);
      let prog = 0;

      const timer = setInterval(() => {
        prog += increment;
        if (prog >= 100) {
          clearInterval(timer);
          setCurrentProgress(100);
          onComplete?.();
        } else {
          setCurrentProgress(prog);
        }
      }, interval);

      return () => clearInterval(timer);
    } else {
      setCurrentProgress(progress);
    }
  }, [duration, state, progress, onComplete]);

  // Renderizar componente baseado na variante
  const renderLoadingComponent = () => {
    switch (variant) {
      case 'dots':
        return <LoadingDots size={size} />;
      case 'pulse':
        return <LoadingPulse size={size} />;
      case 'skeleton':
        return <LoadingSkeleton />;
      case 'progress':
        return <LoadingProgress progress={currentProgress} showPercentage />;
      default:
        return <LoadingSpinner size={size} />;
    }
  };

  // Renderizar ícone baseado no estado
  const renderStateIcon = () => {
    switch (state) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'loading':
        return renderLoadingComponent();
      default:
        return null;
    }
  };

  // Classes do container
  const containerClasses = cn(
    'flex flex-col items-center justify-center space-y-2',
    {
      'fixed inset-0 z-50': fullScreen,
      'absolute inset-0': overlay && !fullScreen,
      'bg-white/80 backdrop-blur-sm': overlay || fullScreen,
    },
    className
  );

  // Classes do texto
  const textClasses = cn(
    'text-sm font-medium',
    {
      'text-gray-600': state === 'loading',
      'text-green-600': state === 'success',
      'text-red-600': state === 'error',
    }
  );

  return (
    <div className={containerClasses}>
      {renderStateIcon()}
      {text && (
        <p className={textClasses}>
          {text}
        </p>
      )}
      {variant === 'progress' && state === 'loading' && (
        <div className="w-full max-w-xs">
          <LoadingProgress 
            progress={currentProgress} 
            showPercentage 
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE DE LOADING PARA BOTÕES
// ============================================

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LoadingButton({
  children,
  loading = false,
  loadingText,
  disabled,
  className,
  variant = 'default',
  size = 'default',
  ...props
}: LoadingButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'underline-offset-4 hover:underline text-primary'
  };

  const sizeClasses = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
    lg: 'h-11 px-8 rounded-md',
    icon: 'h-10 w-10'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <LoadingSpinner 
          size="sm" 
          className="mr-2" 
        />
      )}
      {loading ? (loadingText || 'Carregando...') : children}
    </button>
  );
}

// ============================================
// COMPONENTE DE LOADING PARA PÁGINAS
// ============================================

export function LoadingPage({ 
  message = 'Carregando página...',
  showProgress = false,
  progress = 0
}: {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <LoadingSpinner size="xl" className="mx-auto text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">{message}</h2>
        {showProgress && (
          <div className="w-64 mx-auto">
            <LoadingProgress 
              progress={progress} 
              showPercentage 
              animated 
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EXPORTAÇÕES
// ============================================

export default EnhancedLoading;
