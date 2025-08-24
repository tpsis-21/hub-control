/**
 * UTILITÁRIOS PARA MASCARAMENTO DE DADOS SENSÍVEIS
 * 
 * Este arquivo contém funções para mascarar dados sensíveis
 * que podem ser exibidos no frontend, garantindo que informações
 * críticas não sejam expostas desnecessariamente.
 */

// Tipos de dados sensíveis
export type SensitiveDataType = 
  | 'api_key'
  | 'token'
  | 'password'
  | 'email'
  | 'phone'
  | 'cpf'
  | 'cnpj'
  | 'credit_card'
  | 'bank_account'
  | 'pix_key';

// Configurações de mascaramento por tipo
const MASKING_CONFIG: Record<SensitiveDataType, {
  showStart: number;
  showEnd: number;
  maskChar: string;
  minLength: number;
}> = {
  api_key: { showStart: 4, showEnd: 4, maskChar: '*', minLength: 8 },
  token: { showStart: 6, showEnd: 6, maskChar: '*', minLength: 12 },
  password: { showStart: 0, showEnd: 0, maskChar: '*', minLength: 6 },
  email: { showStart: 2, showEnd: 0, maskChar: '*', minLength: 5 },
  phone: { showStart: 2, showEnd: 4, maskChar: '*', minLength: 8 },
  cpf: { showStart: 3, showEnd: 2, maskChar: '*', minLength: 11 },
  cnpj: { showStart: 2, showEnd: 2, maskChar: '*', minLength: 14 },
  credit_card: { showStart: 4, showEnd: 4, maskChar: '*', minLength: 12 },
  bank_account: { showStart: 0, showEnd: 4, maskChar: '*', minLength: 6 },
  pix_key: { showStart: 4, showEnd: 4, maskChar: '*', minLength: 8 }
};

/**
 * Mascara uma string sensível baseada no tipo especificado
 * 
 * @param value - Valor a ser mascarado
 * @param type - Tipo de dado sensível
 * @param customConfig - Configuração personalizada (opcional)
 * @returns String mascarada
 */
export function maskSensitiveData(
  value: string | null | undefined,
  type: SensitiveDataType,
  customConfig?: Partial<typeof MASKING_CONFIG[SensitiveDataType]>
): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const config = { ...MASKING_CONFIG[type], ...customConfig };
  
  // Se o valor é muito curto, mascarar completamente
  if (value.length < config.minLength) {
    return config.maskChar.repeat(Math.max(config.minLength, value.length));
  }

  const { showStart, showEnd, maskChar } = config;
  const totalVisible = showStart + showEnd;
  
  // Se o valor é muito curto para mostrar início e fim
  if (value.length <= totalVisible) {
    const visibleChars = Math.floor(value.length / 3);
    return value.substring(0, visibleChars) + 
           maskChar.repeat(value.length - visibleChars);
  }

  const start = value.substring(0, showStart);
  const end = showEnd > 0 ? value.substring(value.length - showEnd) : '';
  const maskLength = value.length - showStart - showEnd;
  const mask = maskChar.repeat(maskLength);

  return start + mask + end;
}

/**
 * Mascara um email preservando o domínio
 * 
 * @param email - Email a ser mascarado
 * @returns Email mascarado
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) {
    return maskSensitiveData(email, 'email');
  }

  const [localPart, domain] = email.split('@');
  const maskedLocal = maskSensitiveData(localPart, 'email', {
    showStart: Math.min(2, localPart.length - 1),
    showEnd: 0
  });
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Mascara um telefone preservando o DDD
 * 
 * @param phone - Telefone a ser mascarado
 * @returns Telefone mascarado
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 11) {
    // Celular: (XX) 9XXXX-XXXX -> (XX) 9****-XXXX
    return `(${cleanPhone.substring(0, 2)}) ${cleanPhone[2]}****-${cleanPhone.substring(7)}`;
  } else if (cleanPhone.length === 10) {
    // Fixo: (XX) XXXX-XXXX -> (XX) ****-XXXX
    return `(${cleanPhone.substring(0, 2)}) ****-${cleanPhone.substring(6)}`;
  }
  
  return maskSensitiveData(phone, 'phone');
}

/**
 * Mascara um CPF
 * 
 * @param cpf - CPF a ser mascarado
 * @returns CPF mascarado
 */
export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length === 11) {
    return `${cleanCPF.substring(0, 3)}.***.**${cleanCPF.substring(9)}`;
  }
  
  return maskSensitiveData(cpf, 'cpf');
}

/**
 * Mascara um CNPJ
 * 
 * @param cnpj - CNPJ a ser mascarado
 * @returns CNPJ mascarado
 */
export function maskCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length === 14) {
    return `${cleanCNPJ.substring(0, 2)}.***.***/****-${cleanCNPJ.substring(12)}`;
  }
  
  return maskSensitiveData(cnpj, 'cnpj');
}

/**
 * Mascara uma chave PIX baseada no tipo
 * 
 * @param pixKey - Chave PIX a ser mascarada
 * @returns Chave PIX mascarada
 */
export function maskPixKey(pixKey: string | null | undefined): string {
  if (!pixKey) return '';
  
  // Detectar tipo de chave PIX
  if (pixKey.includes('@')) {
    return maskEmail(pixKey);
  } else if (/^\d{11}$/.test(pixKey.replace(/\D/g, ''))) {
    return maskCPF(pixKey);
  } else if (/^\d{14}$/.test(pixKey.replace(/\D/g, ''))) {
    return maskCNPJ(pixKey);
  } else if (/^\+?\d{10,15}$/.test(pixKey.replace(/\D/g, ''))) {
    return maskPhone(pixKey);
  }
  
  // Chave aleatória
  return maskSensitiveData(pixKey, 'pix_key');
}

/**
 * Mascara dados de cartão de crédito
 * 
 * @param cardNumber - Número do cartão
 * @returns Número mascarado
 */
export function maskCreditCard(cardNumber: string | null | undefined): string {
  if (!cardNumber) return '';
  
  const cleanCard = cardNumber.replace(/\D/g, '');
  
  if (cleanCard.length >= 12) {
    const masked = maskSensitiveData(cleanCard, 'credit_card');
    // Formatar com espaços a cada 4 dígitos
    return masked.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  
  return maskSensitiveData(cardNumber, 'credit_card');
}

/**
 * Mascara uma API key ou token
 * 
 * @param apiKey - API key a ser mascarada
 * @param type - Tipo (api_key ou token)
 * @returns API key mascarada
 */
export function maskApiKey(
  apiKey: string | null | undefined,
  type: 'api_key' | 'token' = 'api_key'
): string {
  return maskSensitiveData(apiKey, type);
}

/**
 * Mascara múltiplos campos de um objeto
 * 
 * @param data - Objeto com dados
 * @param fieldMappings - Mapeamento de campos para tipos de mascaramento
 * @returns Objeto com dados mascarados
 */
export function maskObjectFields<T extends Record<string, any>>(
  data: T,
  fieldMappings: Record<keyof T, SensitiveDataType>
): T {
  const maskedData: any = { ...data };
  
  Object.entries(fieldMappings).forEach(([field, type]) => {
    if (maskedData[field]) {
      maskedData[field] = maskSensitiveData(
        maskedData[field],
        type as SensitiveDataType
      );
    }
  });
  
  return maskedData;
}

/**
 * Verifica se um valor parece ser sensível
 * 
 * @param value - Valor a ser verificado
 * @returns true se parecer sensível
 */
export function isSensitiveValue(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const sensitivePatterns = [
    /^[a-zA-Z0-9]{20,}$/, // Tokens longos
    /^sk_[a-zA-Z0-9]+$/, // Stripe keys
    /^pk_[a-zA-Z0-9]+$/, // Public keys
    /^eyJ[a-zA-Z0-9]+/, // JWT tokens
    /password/i,
    /secret/i,
    /token/i,
    /key/i
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(value));
}

/**
 * Mascara automaticamente valores que parecem sensíveis
 * 
 * @param value - Valor a ser verificado e mascarado
 * @returns Valor original ou mascarado
 */
export function autoMaskSensitive(value: string): string {
  if (isSensitiveValue(value)) {
    return maskSensitiveData(value, 'token');
  }
  return value;
}

/**
 * Utilitário para logs seguros - remove dados sensíveis
 * 
 * @param obj - Objeto a ser logado
 * @returns Objeto com dados sensíveis mascarados
 */
export function sanitizeForLogging(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }
  
  const sanitized: any = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    
    // Campos que devem ser mascarados
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('key') ||
      lowerKey.includes('auth')
    ) {
      sanitized[key] = typeof value === 'string' ? maskApiKey(value) : '[MASKED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

// Exportar configurações para uso externo
export { MASKING_CONFIG };

// Tipos para TypeScript
export interface MaskingOptions {
  showStart?: number;
  showEnd?: number;
  maskChar?: string;
  minLength?: number;
}

export interface FieldMasking {
  [fieldName: string]: SensitiveDataType;
}