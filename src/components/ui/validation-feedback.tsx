'use client';

import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { LocalValidationResult, CredentialsValidationResult } from '@/lib/local-validation';

interface ValidationFeedbackProps {
  result: LocalValidationResult | CredentialsValidationResult;
  className?: string;
}

export function ValidationFeedback({ result, className = '' }: ValidationFeedbackProps) {
  if (!result || (result.errors.length === 0 && result.warnings.length === 0)) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Configuração válida
          {result && 'strength' in result && (
            <Badge 
              variant={result.strength === 'strong' ? 'default' : result.strength === 'medium' ? 'secondary' : 'destructive'}
              className="ml-2"
            >
              Senha {result.strength === 'strong' ? 'forte' : result.strength === 'medium' ? 'média' : 'fraca'}
            </Badge>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Erros */}
      {result?.errors?.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {result.errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Avisos */}
      {result?.warnings?.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="space-y-1">
              {result.warnings.map((warning, index) => (
                <div key={index}>• {warning}</div>
              ))}
            </div>
            {result && 'strength' in result && (
              <Badge 
                variant={result.strength === 'strong' ? 'default' : result.strength === 'medium' ? 'secondary' : 'destructive'}
                className="mt-2"
              >
                Senha {result.strength === 'strong' ? 'forte' : result.strength === 'medium' ? 'média' : 'fraca'}
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Componente para validação inline de campos
 */
interface InlineValidationProps {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  showSuccess?: boolean;
}

export function InlineValidation({ isValid, errors, warnings, showSuccess = true }: InlineValidationProps) {
  if (errors.length === 0 && warnings.length === 0) {
    if (showSuccess && isValid) {
      return (
        <div className="flex items-center text-sm text-green-600 mt-1">
          <CheckCircle className="h-3 w-3 mr-1" />
          Válido
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mt-1 space-y-1">
      {errors.map((error, index) => (
        <div key={`error-${index}`} className="flex items-center text-sm text-red-600">
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          {error}
        </div>
      ))}
      {warnings.map((warning, index) => (
        <div key={`warning-${index}`} className="flex items-center text-sm text-yellow-600">
          <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
          {warning}
        </div>
      ))}
    </div>
  );
}

/**
 * Hook para validação em tempo real
 */
import { useState, useEffect } from 'react';

export function useRealtimeValidation<T>(
  value: T,
  validator: (value: T) => LocalValidationResult,
  debounceMs: number = 300
) {
  const [result, setResult] = useState<LocalValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setIsValidating(true);
    const timer = setTimeout(() => {
      const validationResult = validator(value);
      setResult(validationResult);
      setIsValidating(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, validator, debounceMs]);

  return { result, isValidating };
}
