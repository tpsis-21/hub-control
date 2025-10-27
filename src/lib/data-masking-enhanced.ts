/**
 * Sistema de Mascaramento de Dados Aprimorado
 * 
 * Implementa mascaramento dinâmico e inteligente de dados sensíveis
 * com diferentes níveis de proteção baseados no contexto e permissões.
 */

import { z } from 'zod';
import { useMemo } from 'react';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface MaskingRule {
  field: string;
  type: MaskingType;
  level: MaskingLevel;
  condition?: (value: any, context: MaskingContext) => boolean;
  customMask?: (value: any) => string;
}

export interface MaskingContext {
  userRole: string;
  userPermissions: string[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  purpose: 'display' | 'export' | 'log' | 'audit';
  environment: 'development' | 'staging' | 'production';
}

export type MaskingType = 
  | 'email'
  | 'phone'
  | 'cpf'
  | 'cnpj'
  | 'credit_card'
  | 'bank_account'
  | 'password'
  | 'name'
  | 'address'
  | 'ip_address'
  | 'custom';

export type MaskingLevel = 'none' | 'partial' | 'full' | 'hash';

// ============================================
// CONFIGURAÇÕES DE MASCARAMENTO
// ============================================

type MaskingPattern = {
  partial: (value: string) => string;
  full: () => string;
  hash: (value: string) => string;
};

const MASKING_PATTERNS: Record<MaskingType, MaskingPattern> = {
  email: {
    partial: (email: string) => {
      const [local, domain] = email.split('@');
      if (local.length <= 2) return `${local[0]}***@${domain}`;
      return `${local.substring(0, 2)}***@${domain}`;
    },
    full: () => '***@***.***',
    hash: (email: string) => `hash_${btoa(email).substring(0, 8)}`,
  },
  
  phone: {
    partial: (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 3)}****-${cleaned.substring(7)}`;
      }
      return `${cleaned.substring(0, 2)}****${cleaned.substring(cleaned.length - 2)}`;
    },
    full: () => '(XX) X****-****',
    hash: (phone: string) => `hash_${btoa(phone).substring(0, 8)}`,
  },
  
  cpf: {
    partial: (cpf: string) => {
      const cleaned = cpf.replace(/\D/g, '');
      return `${cleaned.substring(0, 3)}.***.**${cleaned.substring(9)}`;
    },
    full: () => '***.***.***-**',
    hash: (cpf: string) => `hash_${btoa(cpf).substring(0, 8)}`,
  },
  
  cnpj: {
    partial: (cnpj: string) => {
      const cleaned = cnpj.replace(/\D/g, '');
      return `${cleaned.substring(0, 2)}.***.***/****-${cleaned.substring(12)}`;
    },
    full: () => '**.***.***/****-**',
    hash: (cnpj: string) => `hash_${btoa(cnpj).substring(0, 8)}`,
  },
  
  credit_card: {
    partial: (card: string) => {
      const cleaned = card.replace(/\D/g, '');
      return `****-****-****-${cleaned.substring(12)}`;
    },
    full: () => '****-****-****-****',
    hash: (card: string) => `hash_${btoa(card).substring(0, 8)}`,
  },
  
  bank_account: {
    partial: (account: string) => {
      const cleaned = account.replace(/\D/g, '');
      if (cleaned.length <= 4) return '****';
      return `****${cleaned.substring(cleaned.length - 2)}`;
    },
    full: () => '********',
    hash: (account: string) => `hash_${btoa(account).substring(0, 8)}`,
  },
  
  password: {
    partial: () => '********',
    full: () => '********',
    hash: () => '[REDACTED]',
  },
  
  name: {
    partial: (name: string) => {
      const parts = name.trim().split(' ');
      if (parts.length === 1) {
        return parts[0].length > 2 ? `${parts[0].substring(0, 2)}***` : '***';
      }
      return `${parts[0]} ${parts[parts.length - 1].substring(0, 1)}***`;
    },
    full: () => '*** ***',
    hash: (name: string) => `hash_${btoa(name).substring(0, 8)}`,
  },
  
  address: {
    partial: (address: string) => {
      const parts = address.split(',');
      if (parts.length > 1) {
        return `*** ${parts[parts.length - 1].trim()}`;
      }
      return '*** ***';
    },
    full: () => '*** *** ***',
    hash: (address: string) => `hash_${btoa(address).substring(0, 8)}`,
  },
  
  ip_address: {
    partial: (ip: string) => {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.***.***.`;
      }
      return '***.***.***.***.***';
    },
    full: () => '***.***.***.***.***',
    hash: (ip: string) => `hash_${btoa(ip).substring(0, 8)}`,
  },
  
  // Adiciona o tipo 'custom' para satisfazer o Record<MaskingType, MaskingPattern>
  custom: {
    partial: (_value: string) => '***',
    full: () => '***',
    hash: (value: string) => `hash_${btoa(value).substring(0, 8)}`,
  },
};

// ============================================
// REGRAS DE MASCARAMENTO POR CONTEXTO
// ============================================

const CONTEXT_RULES: Record<string, MaskingRule[]> = {
  // Regras para usuários administradores
  admin: [
    { field: 'password', type: 'password', level: 'full' },
    { field: 'credit_card', type: 'credit_card', level: 'partial' },
    { field: 'bank_account', type: 'bank_account', level: 'partial' },
  ],
  
  // Regras para usuários regulares
  user: [
    { field: 'password', type: 'password', level: 'full' },
    { field: 'email', type: 'email', level: 'partial' },
    { field: 'phone', type: 'phone', level: 'partial' },
    { field: 'cpf', type: 'cpf', level: 'partial' },
    { field: 'cnpj', type: 'cnpj', level: 'partial' },
    { field: 'credit_card', type: 'credit_card', level: 'full' },
    { field: 'bank_account', type: 'bank_account', level: 'full' },
    { field: 'name', type: 'name', level: 'partial' },
    { field: 'address', type: 'address', level: 'partial' },
  ],
  
  // Regras para visitantes/público
  guest: [
    { field: 'password', type: 'password', level: 'full' },
    { field: 'email', type: 'email', level: 'full' },
    { field: 'phone', type: 'phone', level: 'full' },
    { field: 'cpf', type: 'cpf', level: 'full' },
    { field: 'cnpj', type: 'cnpj', level: 'full' },
    { field: 'credit_card', type: 'credit_card', level: 'full' },
    { field: 'bank_account', type: 'bank_account', level: 'full' },
    { field: 'name', type: 'name', level: 'full' },
    { field: 'address', type: 'address', level: 'full' },
    { field: 'ip_address', type: 'ip_address', level: 'full' },
  ],
  
  // Regras para logs
  logging: [
    { field: 'password', type: 'password', level: 'hash' },
    { field: 'email', type: 'email', level: 'hash' },
    { field: 'phone', type: 'phone', level: 'hash' },
    { field: 'cpf', type: 'cpf', level: 'hash' },
    { field: 'cnpj', type: 'cnpj', level: 'hash' },
    { field: 'credit_card', type: 'credit_card', level: 'hash' },
    { field: 'bank_account', type: 'bank_account', level: 'hash' },
    { field: 'ip_address', type: 'ip_address', level: 'partial' },
  ],
  
  // Regras para exportação
  export: [
    { field: 'password', type: 'password', level: 'full' },
    { field: 'credit_card', type: 'credit_card', level: 'full' },
    { field: 'bank_account', type: 'bank_account', level: 'full' },
    { 
      field: 'email', 
      type: 'email', 
      level: 'partial',
      condition: (value, context) => context.userRole !== 'admin'
    },
  ],
};

// ============================================
// CLASSE PRINCIPAL DE MASCARAMENTO
// ============================================

class DataMasking {
  private rules: Map<string, MaskingRule[]> = new Map();
  private customPatterns: Map<string, any> = new Map();

  constructor() {
    this.loadDefaultRules();
  }

  private loadDefaultRules() {
    for (const [context, rules] of Object.entries(CONTEXT_RULES)) {
      this.rules.set(context, rules);
    }
  }

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================

  // Mascarar um único valor
  maskValue(
    value: any, 
    type: MaskingType, 
    level: MaskingLevel = 'partial',
    customMask?: (value: any) => string
  ): string {
    if (!value || value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Usar máscara customizada se fornecida
    if (customMask) {
      return customMask(stringValue);
    }

    // Sem mascaramento
    if (level === 'none') {
      return stringValue;
    }

    // Obter padrão de mascaramento
    const pattern = MASKING_PATTERNS[type];
    if (!pattern) {
      return this.defaultMask(stringValue, level);
    }

    // Aplicar mascaramento baseado no nível
    switch (level) {
      case 'partial':
        return pattern.partial(stringValue);
      case 'full':
        return pattern.full();
      case 'hash':
        return pattern.hash(stringValue);
      default:
        return stringValue;
    }
  }

  // Mascarar objeto baseado no contexto
  maskObject(data: any, context: MaskingContext): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Obter regras para o contexto
    const rules = this.getRulesForContext(context);
    
    // Clonar objeto para não modificar o original
    const maskedData = this.deepClone(data);
    
    // Aplicar mascaramento recursivamente
    return this.applyMaskingRules(maskedData, rules, context);
  }

  // Mascarar array de objetos
  maskArray(data: any[], context: MaskingContext): any[] {
    return data.map(item => this.maskObject(item, context));
  }

  // Adicionar regra customizada
  addCustomRule(contextKey: string, rule: MaskingRule) {
    const existingRules = this.rules.get(contextKey) || [];
    existingRules.push(rule);
    this.rules.set(contextKey, existingRules);
  }

  // Adicionar padrão customizado
  addCustomPattern(type: string, pattern: any) {
    this.customPatterns.set(type, pattern);
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  private getRulesForContext(context: MaskingContext): MaskingRule[] {
    const baseRules = this.rules.get(context.userRole) || [];
    const purposeRules = this.rules.get(context.purpose) || [];
    const envRules = this.rules.get(context.environment) || [];
    
    // Combinar regras (purpose e environment têm prioridade)
    return [...baseRules, ...purposeRules, ...envRules];
  }

  private applyMaskingRules(data: any, rules: MaskingRule[], context: MaskingContext): any {
    if (Array.isArray(data)) {
      return data.map(item => this.applyMaskingRules(item, rules, context));
    }

    if (data && typeof data === 'object') {
      const result: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Encontrar regra aplicável
        const rule = rules.find(r => 
          this.fieldMatches(key, r.field) && 
          (!r.condition || r.condition(value, context))
        );

        if (rule) {
          // Aplicar mascaramento
          result[key] = this.maskValue(value, rule.type, rule.level, rule.customMask);
        } else if (typeof value === 'object') {
          // Recursão para objetos aninhados
          result[key] = this.applyMaskingRules(value, rules, context);
        } else {
          // Manter valor original
          result[key] = value;
        }
      }
      
      return result;
    }

    return data;
  }

  private fieldMatches(fieldName: string, pattern: string): boolean {
    // Suporte a wildcards simples
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      return regex.test(fieldName);
    }
    
    // Correspondência exata (case-insensitive)
    return fieldName.toLowerCase() === pattern.toLowerCase();
  }

  private defaultMask(value: string, level: MaskingLevel): string {
    switch (level) {
      case 'partial':
        if (value.length <= 2) return '*'.repeat(value.length);
        return `${value.substring(0, 2)}${'*'.repeat(value.length - 2)}`;
      case 'full':
        return '*'.repeat(Math.min(value.length, 8));
      case 'hash':
        return `hash_${btoa(value).substring(0, 8)}`;
      default:
        return value;
    }
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================

const dataMasking = new DataMasking();

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Função para mascarar dados baseado no usuário
export function maskDataForUser(
  data: any, 
  userRole: string, 
  userPermissions: string[] = [],
  purpose: 'display' | 'export' | 'log' | 'audit' = 'display'
) {
  const context: MaskingContext = {
    userRole,
    userPermissions,
    dataClassification: 'internal',
    purpose,
    environment: process.env.NODE_ENV as any || 'development',
  };
  
  return dataMasking.maskObject(data, context);
}

// Função para mascarar dados para logs
export function maskDataForLogging(data: any) {
  const context: MaskingContext = {
    userRole: 'system',
    userPermissions: [],
    dataClassification: 'internal',
    purpose: 'log',
    environment: process.env.NODE_ENV as any || 'development',
  };
  
  return dataMasking.maskObject(data, context);
}

// Função para mascarar dados para auditoria
export function maskDataForAudit(data: any) {
  const context: MaskingContext = {
    userRole: 'auditor',
    userPermissions: ['audit'],
    dataClassification: 'confidential',
    purpose: 'audit',
    environment: process.env.NODE_ENV as any || 'development',
  };
  
  return dataMasking.maskObject(data, context);
}

// Função para mascarar dados para exportação
export function maskDataForExport(
  data: any, 
  userRole: string, 
  userPermissions: string[] = []
) {
  const context: MaskingContext = {
    userRole,
    userPermissions,
    dataClassification: 'internal',
    purpose: 'export',
    environment: process.env.NODE_ENV as any || 'development',
  };
  
  return dataMasking.maskObject(data, context);
}

// Hook React para mascaramento
export function useMaskedData<T>(
  data: T, 
  userRole: string, 
  userPermissions: string[] = [],
  purpose: 'display' | 'export' | 'log' | 'audit' = 'display'
): T {
  return useMemo(() => {
    return maskDataForUser(data, userRole, userPermissions, purpose);
  }, [data, userRole, userPermissions, purpose]);
}

// Middleware para mascaramento automático em APIs
export function createMaskingMiddleware(defaultRole: string = 'user') {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      const userRole = req.user?.role || defaultRole;
      const userPermissions = req.user?.permissions || [];
      
      const maskedData = maskDataForUser(data, userRole, userPermissions);
      return originalJson.call(this, maskedData);
    };
    
    next();
  };
}

// ============================================
// EXPORTAÇÕES
// ============================================

export default dataMasking;

export {
  dataMasking,
  DataMasking
};

// Tipos já exportados acima: MaskingRule, MaskingContext, MaskingType, MaskingLevel
// Evitar re-export de types para não causar conflitos em alguns TS configs
