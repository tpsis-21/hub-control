"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Tipos de loading
export type LoadingType = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'default' | 'auth' | 'data' | 'upload' | 'processing';

// Interface para props do loading
interface EnhancedLoadingProps {
  type?: LoadingType;
  size?: LoadingSize;
  variant?: LoadingVariant;
  message?: string;
  progress?: number;
  className?: string;
  overlay?: boolean;
}

// Interface para props do loading com estados
interface LoadingWithStatesProps {
  state: 'loading' | 'success' | 'error' | 'warning';
  message: string;
  progress?: number;
  className?: string;
}

// Interface para props do skeleton loading
interface SkeletonLoadingProps {
  lines?: number;
  avatar?: boolean;
  className?: string;
}

// Componente principal de loading melhorado
export function EnhancedLoading({
  type = 'spinner',
  size = 'md',
  variant = 'default',
  message,
  progress,
  className,
  overlay = false
}: EnhancedLoadingProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4';
      case 'md':
        return 'h-6 w-6';
      case 'lg':
        return 'h-8 w-8';
      case 'xl':
        return 'h-12 w-12';
      default:
        return 'h-6 w-6';
    }
  };

  const getVariantIcon = () => {
    switch (variant) {
      case 'auth':
        return <Shield className={cn('animate-pulse', getSizeClasses())} />;
      case 'data':
        return <Loader2 className={cn('animate-spin', getSizeClasses())} />;
      case 'upload':
        return <Loader2 className={cn('animate-spin', getSizeClasses())} />;
      case 'processing':
        return <Loader2 className={cn('animate-spin', getSizeClasses())} />;
      default:
        return <Loader2 className={cn('animate-spin', getSizeClasses())} />;
    }
  };

  const renderLoading = () => {
    switch (type) {
      case 'spinner':
        return (
          <div className="flex flex-col items-center space-y-3">
            {getVariantIcon()}
            {message && (
              <p className="text-sm text-gray-600 text-center">{message}</p>
            )}
            {progress !== undefined && (
              <div className="w-full max-w-xs">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>
        );

      case 'dots':
        return (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-full bg-blue-500',
                    size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'
                  )}
                  style={{
                    animation: `pulse 1.4s ease-in-out ${i * 0.16}s infinite both`
                  }}
                />
              ))}
            </div>
            {message && (
              <p className="text-sm text-gray-600 text-center">{message}</p>
            )}
          </div>
        );

      case 'pulse':
        return (
          <div className="flex flex-col items-center space-y-3">
            <div className={cn(
              'rounded-full bg-blue-500 animate-pulse',
              getSizeClasses()
            )} />
            {message && (
              <p className="text-sm text-gray-600 text-center">{message}</p>
            )}
          </div>
        );

      case 'progress':
        return (
          <div className="w-full max-w-md space-y-3">
            {message && (
              <p className="text-sm text-gray-600 text-center">{message}</p>
            )}
            <Progress value={progress || 0} className="h-3" />
            <p className="text-xs text-gray-500 text-center">
              {Math.round(progress || 0)}%
            </p>
          </div>
        );

      case 'skeleton':
        return <SkeletonLoading />;

      default:
        return (
          <div className="flex items-center space-x-2">
            <Loader2 className={cn('animate-spin', getSizeClasses())} />
            {message && (
              <p className="text-sm text-gray-600">{message}</p>
            )}
          </div>
        );
    }
  };

  const content = (
    <div className={cn('flex items-center justify-center', className)}>
      {renderLoading()}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

// Componente de loading com estados (loading, success, error, warning)
export function LoadingWithStates({
  state,
  message,
  progress,
  className
}: LoadingWithStatesProps) {
  const getStateIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className={cn('flex flex-col items-center space-y-3', className)}>
      {getStateIcon()}
      <p className={cn('text-sm font-medium text-center', getStateColor())}>
        {message}
      </p>
      {state === 'loading' && progress !== undefined && (
        <div className="w-full max-w-xs">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1 text-center">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}

// Componente de skeleton loading
export function SkeletonLoading({
  lines = 3,
  avatar = false,
  className
}: SkeletonLoadingProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {avatar && (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 bg-gray-200 rounded animate-pulse',
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  );
}

// Componente de loading para botões
export function ButtonLoading({ size = 'sm' }: { size?: LoadingSize }) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'md':
        return 'h-4 w-4';
      case 'lg':
        return 'h-5 w-5';
      case 'xl':
        return 'h-6 w-6';
      default:
        return 'h-4 w-4';
    }
  };

  return (
    <Loader2 className={cn('animate-spin', getSizeClasses())} />
  );
}

// Componente de loading para páginas inteiras
export function PageLoading({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mx-auto" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Hub Control</h2>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

// Hook para gerenciar estados de loading
export function useLoadingState() {
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [message, setMessage] = React.useState('');

  const startLoading = (initialMessage = 'Carregando...') => {
    setLoading(true);
    setProgress(0);
    setMessage(initialMessage);
  };

  const updateProgress = (newProgress: number, newMessage?: string) => {
    setProgress(newProgress);
    if (newMessage) setMessage(newMessage);
  };

  const stopLoading = () => {
    setLoading(false);
    setProgress(0);
    setMessage('');
  };

  return {
    loading,
    progress,
    message,
    startLoading,
    updateProgress,
    stopLoading
  };
}

// Estilos CSS para animações personalizadas
export const loadingStyles = `
  @keyframes pulse {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translate3d(0,0,0);
    }
    40%, 43% {
      transform: translate3d(0, -30px, 0);
    }
    70% {
      transform: translate3d(0, -15px, 0);
    }
    90% {
      transform: translate3d(0, -4px, 0);
    }
  }
`;