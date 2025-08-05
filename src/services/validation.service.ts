// src/services/validation.service.ts
import { z } from "zod";

/**
 * Serviço centralizado de validação
 * Fornece validações comuns e reutilizáveis para toda a aplicação
 */
export class ValidationService {
  /**
   * Valida se um email é válido
   */
  static validateEmail(email: string): boolean {
    const emailSchema = z.string().email();
    return emailSchema.safeParse(email).success;
  }

  /**
   * Valida se uma URL é válida
   */
  static validateUrl(url: string): boolean {
    const urlSchema = z.string().url();
    return urlSchema.safeParse(url).success;
  }

  /**
   * Valida se um ID é um UUID válido
   */
  static validateUUID(id: string): boolean {
    const uuidSchema = z.string().uuid();
    return uuidSchema.safeParse(id).success;
  }

  /**
   * Sanitiza uma string removendo caracteres perigosos
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]*>/g, '') // Remove tags HTML
      .trim();
  }

  /**
   * Valida se uma data está no formato correto
   */
  static validateDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  }

  /**
   * Valida se um valor numérico está dentro de um range
   */
  static validateNumberRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * Valida se uma string tem o comprimento adequado
   */
  static validateStringLength(str: string, minLength: number, maxLength: number): boolean {
    return str.length >= minLength && str.length <= maxLength;
  }

  /**
   * Valida se um preço é válido (positivo e com até 2 casas decimais)
   */
  static validatePrice(price: number): boolean {
    return price > 0 && Number.isFinite(price) && (price * 100) % 1 === 0;
  }

  /**
   * Valida se um telefone brasileiro é válido
   */
  static validateBrazilianPhone(phone: string): boolean {
    const phoneRegex = /^\(?[1-9]{2}\)?\s?9?[0-9]{4}-?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Valida se um CPF é válido
   */
  static validateCPF(cpf: string): boolean {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    
    if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cleanCPF.charAt(10));
  }

  /**
   * Valida entrada de dados usando schema Zod
   */
  static validateWithSchema<T>(data: unknown, schema: z.ZodSchema<T>): {
    success: boolean;
    data?: T;
    errors?: string[];
  } {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
    
    return { success: false, errors };
  }

  /**
   * Valida se uma senha atende aos critérios de segurança
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('A senha deve ter pelo menos 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra maiúscula');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra minúscula');
    }
    
    if (!/\d/.test(password)) {
      errors.push('A senha deve conter pelo menos um número');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('A senha deve conter pelo menos um caractere especial');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida se um objeto contém apenas propriedades permitidas
   */
  static validateAllowedProperties(
    obj: Record<string, any>,
    allowedProperties: string[]
  ): boolean {
    const objKeys = Object.keys(obj);
    return objKeys.every(key => allowedProperties.includes(key));
  }
}