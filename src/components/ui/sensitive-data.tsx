"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  maskSensitiveData, 
  maskEmail, 
  maskPhone, 
  maskCPF, 
  maskCNPJ, 
  maskApiKey,
  maskPixKey,
  maskCreditCard,
  type SensitiveDataType 
} from '@/lib/data-masking';
import { cn } from '@/lib/utils';

interface SensitiveDataProps {
  value: string | null | undefined;
  type: SensitiveDataType;
  label?: string;
  className?: string;
  showCopyButton?: boolean;
  showToggleButton?: boolean;
  readOnly?: boolean;
  variant?: 'input' | 'text' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  onChange?: (value: string) => void;
}

/**
 * Componente para exibir dados sensíveis com mascaramento automático
 */
export function SensitiveData({
  value,
  type,
  label,
  className,
  showCopyButton = true,
  showToggleButton = true,
  readOnly = true,
  variant = 'input',
  size = 'md',
  placeholder,
  onChange
}: SensitiveDataProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Função para mascarar baseada no tipo
  const getMaskedValue = (val: string | null | undefined): string => {
    if (!val) return '';
    
    switch (type) {
      case 'email':
        return maskEmail(val);
      case 'phone':
        return maskPhone(val);
      case 'cpf':
        return maskCPF(val);
      case 'cnpj':
        return maskCNPJ(val);
      case 'pix_key':
        return maskPixKey(val);
      case 'credit_card':
        return maskCreditCard(val);
      case 'api_key':
      case 'token':
        return maskApiKey(val, type);
      default:
        return maskSensitiveData(val, type);
    }
  };

  const displayValue = isVisible ? (value || '') : getMaskedValue(value);
  const hasValue = Boolean(value);

  // Função para copiar
  const handleCopy = async () => {
    if (!value) {
      toast.error('Nenhum valor para copiar');
      return;
    }

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label || 'Valor'} copiado para a área de transferência`);
    } catch (error) {
      toast.error('Erro ao copiar para a área de transferência');
    } finally {
      setIsCopying(false);
    }
  };

  // Função para alternar visibilidade
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Função para lidar com mudanças
  const handleChange = (newValue: string) => {
    onChange?.(newValue);
  };

  // Renderizar como badge
  if (variant === 'badge') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge 
          variant={hasValue ? 'default' : 'secondary'}
          className={cn(
            'font-mono',
            size === 'sm' && 'text-xs px-2 py-1',
            size === 'lg' && 'text-sm px-3 py-2'
          )}
        >
          {hasValue ? (
            <>
              <Shield className="w-3 h-3 mr-1" />
              {displayValue}
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 mr-1" />
              Não configurado
            </>
          )}
        </Badge>
        
        {hasValue && showToggleButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVisibility}
            className="h-6 w-6 p-0"
          >
            {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        
        {hasValue && showCopyButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={isCopying}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Renderizar como texto
  if (variant === 'text') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span 
          className={cn(
            'font-mono',
            size === 'sm' && 'text-sm',
            size === 'lg' && 'text-lg',
            !hasValue && 'text-muted-foreground italic'
          )}
        >
          {hasValue ? displayValue : 'Não configurado'}
        </span>
        
        {hasValue && showToggleButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVisibility}
            className="h-6 w-6 p-0"
          >
            {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        
        {hasValue && showCopyButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={isCopying}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Renderizar como input (padrão)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <Input
          type={isVisible ? 'text' : 'password'}
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className={cn(
            'font-mono pr-20',
            size === 'sm' && 'h-8 text-sm',
            size === 'lg' && 'h-12 text-lg'
          )}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showToggleButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleVisibility}
              className="h-6 w-6 p-0"
            >
              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          )}
          
          {showCopyButton && hasValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={isCopying}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Componentes específicos para tipos comuns
export function ApiKeyDisplay({ value, label = 'API Key', ...props }: Omit<SensitiveDataProps, 'type'>) {
  return <SensitiveData value={value} type="api_key" label={label} {...props} />;
}

export function TokenDisplay({ value, label = 'Token', ...props }: Omit<SensitiveDataProps, 'type'>) {
  return <SensitiveData value={value} type="token" label={label} {...props} />;
}

export function EmailDisplay({ value, label = 'Email', ...props }: Omit<SensitiveDataProps, 'type'>) {
  return <SensitiveData value={value} type="email" label={label} {...props} />;
}

export function PhoneDisplay({ value, label = 'Telefone', ...props }: Omit<SensitiveDataProps, 'type'>) {
  return <SensitiveData value={value} type="phone" label={label} {...props} />;
}

export function CPFDisplay({ value, label = 'CPF', ...props }: Omit<SensitiveDataProps, 'type'>) {
  return <SensitiveData value={value} type="cpf" label={label} {...props} />;
}

export function CNPJDisplay({ value, label = 'CNPJ', ...props }: Omit<SensitiveDataProps, 'type'>) {
  return <SensitiveData value={value} type="cnpj" label={label} {...props} />;
}

export function PixKeyDisplay({ value, label = 'Chave PIX', ...props }: Omit<SensitiveDataProps, 'type'>) {
  return <SensitiveData value={value} type="pix_key" label={label} {...props} />;
}

export function CreditCardDisplay({ value, label = 'Cartão', ...props }: Omit<SensitiveDataProps, 'type'>) {
  return <SensitiveData value={value} type="credit_card" label={label} {...props} />;
}

// Hook para gerenciar estado de dados sensíveis
export function useSensitiveData(initialValue: string = '') {
  const [value, setValue] = useState(initialValue);
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);
  const hide = () => setIsVisible(false);
  const show = () => setIsVisible(true);

  return {
    value,
    setValue,
    isVisible,
    toggleVisibility,
    hide,
    show
  };
}