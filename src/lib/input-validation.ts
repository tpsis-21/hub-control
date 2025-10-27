import { z } from 'zod';
import DOMPurify from 'dompurify';
import { sanitizeHtml, sanitizeText } from './sanitize';

/**
 * Sistema de validação de entrada robusto para prevenir ataques de injeção
 * Implementa validação, sanitização e filtragem de dados de entrada
 */

// Padrões de segurança para validação
const SECURITY_PATTERNS = {
  // Detecta tentativas de SQL injection
  SQL_INJECTION: /('|(\-\-)|(;)|(\||\|)|(\*|\*)|(%)|(\+)|(\=)|(\<)|(\>)|(\^)|(\[)|(\])|(\{)|(\})|(\\)|(\/)|(\?)|(\!)|(\@)|(\#)|(\$)|(\&)|(\()|(\))|(\`)|(\~)|(\:)|(\,)|(\.)|(\s))*('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
  
  // Detecta tentativas de XSS
  XSS_PATTERNS: [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<form[^>]*>.*?<\/form>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,
    /<\s*\w+\s+[^>]*on\w+\s*=/gi
  ],
  
  // Detecta tentativas de command injection
  COMMAND_INJECTION: /[;&|`$(){}\[\]<>]/,
  
  // Detecta tentativas de path traversal
  PATH_TRAVERSAL: /(\.\.\/|\.\.\\\/|%2e%2e%2f|%2e%2e%5c)/i,
  
  // Detecta tentativas de LDAP injection
  LDAP_INJECTION: /[()&|!*]/,
  
  // Detecta caracteres de controle suspeitos
  CONTROL_CHARS: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/,
  
  // Detecta encoding suspeito
  SUSPICIOUS_ENCODING: /%[0-9a-f]{2}/gi
};

// Tipos de validação disponíveis
export type ValidationType = 
  | 'email'
  | 'url'
  | 'phone'
  | 'text'
  | 'html'
  | 'number'
  | 'uuid'
  | 'slug'
  | 'filename'
  | 'sql_safe'
  | 'json'
  | 'base64';

// Configurações de validação
interface ValidationConfig {
  type: ValidationType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  sanitize?: boolean;
  customPattern?: RegExp;
  customValidator?: (value: string) => boolean;
}

// Resultado da validação
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

/**
 * Classe principal para validação de entrada
 */
export class InputValidator {
  private static instance: InputValidator;
  
  public static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }
  
  /**
   * Valida uma entrada de acordo com a configuração especificada
   */
  public validate(input: string, config: ValidationConfig): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      sanitizedValue: input,
      errors: [],
      warnings: [],
      securityIssues: []
    };
    
    // Verificar se é obrigatório
    if (config.required && (!input || input.trim().length === 0)) {
      result.isValid = false;
      result.errors.push('Campo obrigatório');
      return result;
    }
    
    // Permitir vazio se configurado
    if (config.allowEmpty && (!input || input.trim().length === 0)) {
      result.sanitizedValue = '';
      return result;
    }
    
    // Verificar comprimento
    if (config.minLength && input.length < config.minLength) {
      result.isValid = false;
      result.errors.push(`Mínimo de ${config.minLength} caracteres`);
    }
    
    if (config.maxLength && input.length > config.maxLength) {
      result.isValid = false;
      result.errors.push(`Máximo de ${config.maxLength} caracteres`);
    }
    
    // Verificar segurança
    this.checkSecurity(input, result);
    
    // Validar por tipo
    this.validateByType(input, config, result);
    
    // Aplicar sanitização se configurado
    if (config.sanitize && result.isValid) {
      result.sanitizedValue = this.sanitizeByType(input, config.type);
    }
    
    // Validador customizado
    if (config.customValidator && !config.customValidator(result.sanitizedValue)) {
      result.isValid = false;
      result.errors.push('Validação customizada falhou');
    }
    
    return result;
  }
  
  /**
   * Verifica questões de segurança na entrada
   */
  private checkSecurity(input: string, result: ValidationResult): void {
    // Verificar SQL injection
    if (SECURITY_PATTERNS.SQL_INJECTION.test(input)) {
      result.securityIssues.push('Possível tentativa de SQL injection detectada');
      result.isValid = false;
    }
    
    // Verificar XSS
    for (const pattern of SECURITY_PATTERNS.XSS_PATTERNS) {
      if (pattern.test(input)) {
        result.securityIssues.push('Possível tentativa de XSS detectada');
        result.isValid = false;
        break;
      }
    }
    
    // Verificar command injection
    if (SECURITY_PATTERNS.COMMAND_INJECTION.test(input)) {
      result.securityIssues.push('Possível tentativa de command injection detectada');
      result.isValid = false;
    }
    
    // Verificar path traversal
    if (SECURITY_PATTERNS.PATH_TRAVERSAL.test(input)) {
      result.securityIssues.push('Possível tentativa de path traversal detectada');
      result.isValid = false;
    }
    
    // Verificar LDAP injection
    if (SECURITY_PATTERNS.LDAP_INJECTION.test(input)) {
      result.securityIssues.push('Possível tentativa de LDAP injection detectada');
      result.isValid = false;
    }
    
    // Verificar caracteres de controle
    if (SECURITY_PATTERNS.CONTROL_CHARS.test(input)) {
      result.securityIssues.push('Caracteres de controle suspeitos detectados');
      result.warnings.push('Entrada contém caracteres não imprimíveis');
    }
    
    // Verificar encoding suspeito
    const encodingMatches = input.match(SECURITY_PATTERNS.SUSPICIOUS_ENCODING);
    if (encodingMatches && encodingMatches.length > 5) {
      result.warnings.push('Alto nível de encoding detectado - verificar se é legítimo');
    }
  }
  
  /**
   * Valida entrada por tipo específico
   */
  private validateByType(input: string, config: ValidationConfig, result: ValidationResult): void {
    switch (config.type) {
      case 'email':
        if (!z.string().email().safeParse(input).success) {
          result.isValid = false;
          result.errors.push('Email inválido');
        }
        break;
        
      case 'url':
        if (!z.string().url().safeParse(input).success) {
          result.isValid = false;
          result.errors.push('URL inválida');
        }
        break;
        
      case 'phone':
        const phonePattern = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
        if (!phonePattern.test(input.replace(/\s/g, ''))) {
          result.isValid = false;
          result.errors.push('Telefone inválido');
        }
        break;
        
      case 'number':
        if (isNaN(Number(input))) {
          result.isValid = false;
          result.errors.push('Número inválido');
        }
        break;
        
      case 'uuid':
        if (!z.string().uuid().safeParse(input).success) {
          result.isValid = false;
          result.errors.push('UUID inválido');
        }
        break;
        
      case 'slug':
        const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugPattern.test(input)) {
          result.isValid = false;
          result.errors.push('Slug inválido (apenas letras minúsculas, números e hífens)');
        }
        break;
        
      case 'filename':
        const filenamePattern = /^[a-zA-Z0-9._-]+$/;
        if (!filenamePattern.test(input)) {
          result.isValid = false;
          result.errors.push('Nome de arquivo inválido');
        }
        break;
        
      case 'sql_safe':
        // Verificação extra rigorosa para campos que serão usados em SQL
        const sqlUnsafeChars = /['"`;\\]/;
        if (sqlUnsafeChars.test(input)) {
          result.isValid = false;
          result.errors.push('Caracteres não permitidos para consulta SQL');
        }
        break;
        
      case 'json':
        try {
          JSON.parse(input);
        } catch {
          result.isValid = false;
          result.errors.push('JSON inválido');
        }
        break;
        
      case 'base64':
        const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Pattern.test(input)) {
          result.isValid = false;
          result.errors.push('Base64 inválido');
        }
        break;
    }
    
    // Padrão customizado
    if (config.customPattern && !config.customPattern.test(input)) {
      result.isValid = false;
      result.errors.push('Formato inválido');
    }
  }
  
  /**
   * Sanitiza entrada por tipo
   */
  private sanitizeByType(input: string, type: ValidationType): string {
    switch (type) {
      case 'html':
        return sanitizeHtml(input, 'html');
        
      case 'text':
        return sanitizeText(input);
        
      case 'email':
        return input.toLowerCase().trim();
        
      case 'url':
        return input.trim();
        
      case 'phone':
        return input.replace(/[^\d\+\-\(\)\s]/g, '');
        
      case 'number':
        return input.replace(/[^\d\.\-]/g, '');
        
      case 'slug':
        return input.toLowerCase().replace(/[^a-z0-9-]/g, '');
        
      case 'filename':
        return input.replace(/[^a-zA-Z0-9._-]/g, '');
        
      case 'sql_safe':
        return input.replace(/['"`;\\]/g, '');
        
      default:
        return input.trim();
    }
  }
  
  /**
   * Valida múltiplos campos de uma vez
   */
  public validateFields(fields: Record<string, { value: string; config: ValidationConfig }>): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};
    
    for (const [fieldName, { value, config }] of Object.entries(fields)) {
      results[fieldName] = this.validate(value, config);
    }
    
    return results;
  }
  
  /**
   * Verifica se todos os resultados são válidos
   */
  public areAllValid(results: Record<string, ValidationResult>): boolean {
    return Object.values(results).every(result => result.isValid);
  }
  
  /**
   * Obtém todos os erros de validação
   */
  public getAllErrors(results: Record<string, ValidationResult>): string[] {
    const errors: string[] = [];
    
    for (const [fieldName, result] of Object.entries(results)) {
      if (!result.isValid) {
        errors.push(...result.errors.map(error => `${fieldName}: ${error}`));
        errors.push(...result.securityIssues.map(issue => `${fieldName}: ${issue}`));
      }
    }
    
    return errors;
  }
  
  /**
   * Obtém valores sanitizados
   */
  public getSanitizedValues(results: Record<string, ValidationResult>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [fieldName, result] of Object.entries(results)) {
      if (result.isValid) {
        sanitized[fieldName] = result.sanitizedValue;
      }
    }
    
    return sanitized;
  }
}

// Instância singleton
export const inputValidator = InputValidator.getInstance();

// Funções de conveniência
export function validateEmail(email: string): ValidationResult {
  return inputValidator.validate(email, { type: 'email', required: true, sanitize: true });
}

export function validateUrl(url: string): ValidationResult {
  return inputValidator.validate(url, { type: 'url', required: true, sanitize: true });
}

export function validateText(text: string, maxLength = 1000): ValidationResult {
  return inputValidator.validate(text, { 
    type: 'text', 
    required: true, 
    maxLength, 
    sanitize: true 
  });
}

export function validateHtml(html: string, maxLength = 10000): ValidationResult {
  return inputValidator.validate(html, { 
    type: 'html', 
    required: true, 
    maxLength, 
    sanitize: true 
  });
}

export function validateSqlSafe(input: string): ValidationResult {
  return inputValidator.validate(input, { 
    type: 'sql_safe', 
    required: true, 
    sanitize: true 
  });
}

export default inputValidator;
