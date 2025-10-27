"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Tipos de feedback visual
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// Interface para props do componente de feedback
interface EnhancedFeedbackProps {
  type: FeedbackType;
  title: string;
  message: string;
  duration?: number;
  showProgress?: boolean;
  onClose?: () => void;
  className?: string;
}

// Interface para props do indicador de força de senha
interface PasswordStrengthProps {
  password: string;
  className?: string;
}

// Interface para props do campo de senha com visibilidade
interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showStrength?: boolean;
}

// Componente principal de feedback visual melhorado
export function EnhancedFeedback({
  type,
  title,
  message,
  duration = 5000,
  showProgress = false,
  onClose,
  className
}: EnhancedFeedbackProps) {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0 && showProgress) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            setIsVisible(false);
            onClose?.();
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [duration, showProgress, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
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
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-all duration-300 ease-in-out',
      getBackgroundColor(),
      className
    )}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-700 mt-1">{message}</p>
          {showProgress && (
            <Progress value={progress} className="mt-2 h-1" />
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisible(false);
              onClose();
            }}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
}

// Componente para indicador de força de senha
export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const getStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const getStrengthText = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return { text: 'Muito fraca', color: 'text-red-500' };
      case 2:
        return { text: 'Fraca', color: 'text-orange-500' };
      case 3:
        return { text: 'Média', color: 'text-yellow-500' };
      case 4:
        return { text: 'Forte', color: 'text-green-500' };
      case 5:
        return { text: 'Muito forte', color: 'text-green-600' };
      default:
        return { text: '', color: '' };
    }
  };

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-green-500';
      case 5:
        return 'bg-green-600';
      default:
        return 'bg-gray-200';
    }
  };

  if (!password) return null;

  const strength = getStrength(password);
  const strengthInfo = getStrengthText(strength);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              level <= strength ? getStrengthColor(strength) : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs', strengthInfo.color)}>
        Força da senha: {strengthInfo.text}
      </p>
    </div>
  );
}

// Componente de input de senha com visibilidade e indicador de força
export function PasswordInput({
  value,
  onChange,
  placeholder = 'Digite sua senha',
  className,
  showStrength = false
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
        </Button>
      </div>
      {showStrength && <PasswordStrength password={value} />}
    </div>
  );
}

// Hook para gerenciar feedback visual
export function useFeedback() {
  const [feedbacks, setFeedbacks] = useState<Array<{
    id: string;
    type: FeedbackType;
    title: string;
    message: string;
    duration?: number;
  }>>([]);

  const addFeedback = (feedback: Omit<typeof feedbacks[0], 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setFeedbacks(prev => [...prev, { ...feedback, id }]);

    if (feedback.duration !== 0) {
      setTimeout(() => {
        removeFeedback(id);
      }, feedback.duration || 5000);
    }
  };

  const removeFeedback = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFeedbacks([]);
  };

  return {
    feedbacks,
    addFeedback,
    removeFeedback,
    clearAll
  };
}

// Componente container para exibir múltiplos feedbacks
export function FeedbackContainer() {
  const { feedbacks, removeFeedback } = useFeedback();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {feedbacks.map((feedback) => (
        <EnhancedFeedback
          key={feedback.id}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          duration={feedback.duration}
          showProgress={true}
          onClose={() => removeFeedback(feedback.id)}
        />
      ))}
    </div>
  );
}
