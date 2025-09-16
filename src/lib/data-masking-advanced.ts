/**
 * Sistema Avançado de Mascaramento de Dados
 * 
 * Expansão do sistema de mascaramento com:
 * - Novos tipos de dados (endereços, dados bancários)
 * - Configuração dinâmica por usuário
 * - Logs de acesso a dados sensíveis
 * - Mascaramento baseado em contexto avançado
 */

import { z } from 'zod';
import { useMemo } from 'react';

// ============================================
// NOVOS TIPOS E INTERFACES
// ============================================

export type AdvancedMaskingType = 
  | 'email'
  | 'phone'
  | 'cpf'
  | 'cnpj'
  | 'credit_card'
  | 'bank_account'
  | 'bank_agency'
  | 'pix_key'
  | 'password'
  | 'name'
  | 'full_address'
  | 'street_address'
  | 'postal_code'
  | 'ip_address'
  | 'mac_address'
  | 'license_plate'
  | 'passport'
  | 'rg'
  | 'social_security'
  | 'iban'
  | 'swift_code'
  | 'custom';

export type MaskingLevel = 'none' | 'minimal' | 'partial' | 'substantial' | 'full' | 'hash';

export interface AdvancedMaskingRule {
  field: string;
  type: AdvancedMaskingType;
  level: MaskingLevel;
  condition?: (value: any, context: AdvancedMaskingContext) => boolean;
  customMask?: (value: any) => string;
  logAccess?: boolean;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  timeBasedAccess?: {
    startTime?: string; // HH:mm
    endTime?: string;   // HH:mm
    allowedDays?: number[]; // 0-6 (Sunday-Saturday)
  };
}

export interface AdvancedMaskingContext {
  userRole: string;
  userPermissions: string[];
  userId?: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
  purpose: 'display' | 'export' | 'log' | 'audit' | 'report' | 'api';
  environment: 'development' | 'staging' | 'production';
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  dataOwner?: string;
  complianceLevel?: 'basic' | 'gdpr' | 'lgpd' | 'hipaa' | 'pci_dss';
}

export interface MaskingAccessLog {
  id: string;
  userId: string;
  userRole: string;
  dataType: AdvancedMaskingType;
  fieldName: string;
  originalValue?: string; // Hash do valor original
  maskedValue: string;
  maskingLevel: MaskingLevel;
  context: AdvancedMaskingContext;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  justification?: string;
}

export interface UserMaskingPreferences {
  userId: string;
  customRules: AdvancedMaskingRule[];
  defaultLevel: MaskingLevel;
  enableLogging: boolean;
  allowedDataTypes: AdvancedMaskingType[];
  restrictedDataTypes: AdvancedMaskingType[];
}

// ============================================
// PADRÕES AVANÇADOS DE MASCARAMENTO
// ============================================

type AdvancedMaskingPattern = {
  minimal: (value: string) => string;
  partial: (value: string) => string;
  substantial: (value: string) => string;
  full: () => string;
  hash: (value: string) => string;
};

const ADVANCED_MASKING_PATTERNS: Record<AdvancedMaskingType, AdvancedMaskingPattern> = {
  email: {
    minimal: (email: string) => {
      const [local, domain] = email.split('@');
      return `${local[0]}*@${domain}`;
    },
    partial: (email: string) => {
      const [local, domain] = email.split('@');
      const maskedLocal = local.length > 2 ? 
        local.substring(0, 2) + '*'.repeat(local.length - 2) : 
        '*'.repeat(local.length);
      return `${maskedLocal}@${domain}`;
    },
    substantial: (email: string) => {
      const [, domain] = email.split('@');
      return `***@${domain}`;
    },
    full: () => '***@***.***',
    hash: (email: string) => `email_${btoa(email).substring(0, 8)}`
  },

  phone: {
    minimal: (phone: string) => {
      const clean = phone.replace(/\D/g, '');
      if (clean.length === 11) {
        return `(${clean.substring(0, 2)}) ${clean[2]}${clean.substring(3, 7)}-***${clean.substring(10)}`;
      }
      return phone.substring(0, phone.length - 3) + '***';
    },
    partial: (phone: string) => {
      const clean = phone.replace(/\D/g, '');
      if (clean.length === 11) {
        return `(${clean.substring(0, 2)}) ${clean[2]}****-${clean.substring(7)}`;
      }
      return phone.substring(0, 4) + '****' + phone.substring(phone.length - 2);
    },
    substantial: (phone: string) => {
      const clean = phone.replace(/\D/g, '');
      if (clean.length === 11) {
        return `(${clean.substring(0, 2)}) *****-****`;
      }
      return '(***) ****-****';
    },
    full: () => '(***) *****-****',
    hash: (phone: string) => `phone_${btoa(phone).substring(0, 8)}`
  },

  cpf: {
    minimal: (cpf: string) => {
      const clean = cpf.replace(/\D/g, '');
      return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.***-${clean.substring(9)}`;
    },
    partial: (cpf: string) => {
      const clean = cpf.replace(/\D/g, '');
      return `${clean.substring(0, 3)}.***.**${clean.substring(9)}`;
    },
    substantial: (cpf: string) => {
      const clean = cpf.replace(/\D/g, '');
      return `***.***.**${clean.substring(9)}`;
    },
    full: () => '***.***.**-**',
    hash: (cpf: string) => `cpf_${btoa(cpf).substring(0, 8)}`
  },

  cnpj: {
    minimal: (cnpj: string) => {
      const clean = cnpj.replace(/\D/g, '');
      return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.***/**${clean.substring(10)}`;
    },
    partial: (cnpj: string) => {
      const clean = cnpj.replace(/\D/g, '');
      return `${clean.substring(0, 2)}.***.***/***${clean.substring(11)}`;
    },
    substantial: (cnpj: string) => {
      const clean = cnpj.replace(/\D/g, '');
      return `**.***.***/****-${clean.substring(12)}`;
    },
    full: () => '**.***.***/****-**',
    hash: (cnpj: string) => `cnpj_${btoa(cnpj).substring(0, 8)}`
  },

  credit_card: {
    minimal: (card: string) => {
      const clean = card.replace(/\D/g, '');
      return `${clean.substring(0, 4)} **** **** ${clean.substring(12)}`;
    },
    partial: (card: string) => {
      const clean = card.replace(/\D/g, '');
      return `${clean.substring(0, 4)} **** **** ****`;
    },
    substantial: (card: string) => {
      return '**** **** **** ****';
    },
    full: () => '**** **** **** ****',
    hash: (card: string) => `card_${btoa(card).substring(0, 8)}`
  },

  bank_account: {
    minimal: (account: string) => {
      const clean = account.replace(/\D/g, '');
      return clean.length > 4 ? 
        `${clean.substring(0, 2)}***${clean.substring(clean.length - 2)}` :
        '***' + clean.substring(clean.length - 1);
    },
    partial: (account: string) => {
      const clean = account.replace(/\D/g, '');
      return clean.length > 2 ? 
        clean.substring(0, 1) + '*'.repeat(clean.length - 2) + clean.substring(clean.length - 1) :
        '*'.repeat(clean.length);
    },
    substantial: (account: string) => {
      return '*'.repeat(Math.max(6, account.length));
    },
    full: () => '******',
    hash: (account: string) => `acc_${btoa(account).substring(0, 8)}`
  },

  bank_agency: {
    minimal: (agency: string) => {
      const clean = agency.replace(/\D/g, '');
      return clean.length > 2 ? `${clean.substring(0, 1)}**${clean.substring(clean.length - 1)}` : '***';
    },
    partial: (agency: string) => {
      return '*'.repeat(Math.max(4, agency.length));
    },
    substantial: (agency: string) => {
      return '****';
    },
    full: () => '****',
    hash: (agency: string) => `ag_${btoa(agency).substring(0, 6)}`
  },

  pix_key: {
    minimal: (pix: string) => {
      if (pix.includes('@')) {
        return ADVANCED_MASKING_PATTERNS.email.minimal(pix);
      } else if (/^\d{11}$/.test(pix.replace(/\D/g, ''))) {
        return ADVANCED_MASKING_PATTERNS.cpf.minimal(pix);
      } else if (/^\d{14}$/.test(pix.replace(/\D/g, ''))) {
        return ADVANCED_MASKING_PATTERNS.cnpj.minimal(pix);
      }
      return pix.substring(0, 4) + '*'.repeat(Math.max(4, pix.length - 8)) + pix.substring(pix.length - 4);
    },
    partial: (pix: string) => {
      if (pix.includes('@')) {
        return ADVANCED_MASKING_PATTERNS.email.partial(pix);
      } else if (/^\d{11}$/.test(pix.replace(/\D/g, ''))) {
        return ADVANCED_MASKING_PATTERNS.cpf.partial(pix);
      } else if (/^\d{14}$/.test(pix.replace(/\D/g, ''))) {
        return ADVANCED_MASKING_PATTERNS.cnpj.partial(pix);
      }
      return pix.substring(0, 2) + '*'.repeat(Math.max(6, pix.length - 4)) + pix.substring(pix.length - 2);
    },
    substantial: (pix: string) => {
      return '*'.repeat(Math.max(8, pix.length));
    },
    full: () => '********',
    hash: (pix: string) => `pix_${btoa(pix).substring(0, 8)}`
  },

  password: {
    minimal: () => '******',
    partial: () => '******',
    substantial: () => '******',
    full: () => '******',
    hash: (password: string) => `pwd_${btoa(password).substring(0, 8)}`
  },

  name: {
    minimal: (name: string) => {
      const parts = name.split(' ');
      if (parts.length === 1) {
        return name.substring(0, 2) + '*'.repeat(Math.max(1, name.length - 2));
      }
      return `${parts[0]} ${parts[parts.length - 1].substring(0, 1)}***`;
    },
    partial: (name: string) => {
      const parts = name.split(' ');
      return `${parts[0]} ${'*'.repeat(Math.max(3, parts.slice(1).join(' ').length))}`;
    },
    substantial: (name: string) => {
      const parts = name.split(' ');
      return `${parts[0].substring(0, 1)}*** ***`;
    },
    full: () => '*** ***',
    hash: (name: string) => `name_${btoa(name).substring(0, 8)}`
  },

  full_address: {
    minimal: (address: string) => {
      const parts = address.split(',');
      if (parts.length > 1) {
        return `${parts[0].substring(0, 10)}***, ${parts[parts.length - 1].trim()}`;
      }
      return address.substring(0, 10) + '***';
    },
    partial: (address: string) => {
      const parts = address.split(',');
      if (parts.length > 2) {
        return `***${parts[0].substring(parts[0].length - 3)}, ***, ${parts[parts.length - 1].trim()}`;
      }
      return '*** ***, ***';
    },
    substantial: (address: string) => {
      return '*** ***, *** - ***';
    },
    full: () => '*** ***, *** - ***',
    hash: (address: string) => `addr_${btoa(address).substring(0, 8)}`
  },

  street_address: {
    minimal: (street: string) => {
      const parts = street.split(' ');
      return `${parts[0]} ${parts[1] || ''}*** ${parts[parts.length - 1] || ''}`;
    },
    partial: (street: string) => {
      const parts = street.split(' ');
      return `${parts[0]} ***`;
    },
    substantial: (street: string) => {
      return '*** ***';
    },
    full: () => '*** ***',
    hash: (street: string) => `street_${btoa(street).substring(0, 8)}`
  },

  postal_code: {
    minimal: (postal: string) => {
      const clean = postal.replace(/\D/g, '');
      return clean.length === 8 ? 
        `${clean.substring(0, 2)}***-${clean.substring(5)}` :
        postal.substring(0, 2) + '***';
    },
    partial: (postal: string) => {
      return '***-***';
    },
    substantial: (postal: string) => {
      return '*****-***';
    },
    full: () => '*****-***',
    hash: (postal: string) => `postal_${btoa(postal).substring(0, 6)}`
  },

  ip_address: {
    minimal: (ip: string) => {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.***.***.***`;
    },
    partial: (ip: string) => {
      const parts = ip.split('.');
      return `${parts[0]}.***.***.***`;
    },
    substantial: (ip: string) => {
      return '***.***.***.***';
    },
    full: () => '***.***.***.***',
    hash: (ip: string) => `ip_${btoa(ip).substring(0, 8)}`
  },

  mac_address: {
    minimal: (mac: string) => {
      const parts = mac.split(':');
      return `${parts[0]}:${parts[1]}:***:***:***:${parts[5] || '***'}`;
    },
    partial: (mac: string) => {
      return '**:**:**:**:**:**';
    },
    substantial: (mac: string) => {
      return '**:**:**:**:**:**';
    },
    full: () => '**:**:**:**:**:**',
    hash: (mac: string) => `mac_${btoa(mac).substring(0, 8)}`
  },

  license_plate: {
    minimal: (plate: string) => {
      return plate.length > 4 ? 
        `${plate.substring(0, 3)}****` :
        '***-****';
    },
    partial: (plate: string) => {
      return '***-****';
    },
    substantial: (plate: string) => {
      return '***-****';
    },
    full: () => '***-****',
    hash: (plate: string) => `plate_${btoa(plate).substring(0, 6)}`
  },

  passport: {
    minimal: (passport: string) => {
      return passport.length > 4 ? 
        `${passport.substring(0, 2)}***${passport.substring(passport.length - 2)}` :
        '***';
    },
    partial: (passport: string) => {
      return '*'.repeat(Math.max(6, passport.length));
    },
    substantial: (passport: string) => {
      return '********';
    },
    full: () => '********',
    hash: (passport: string) => `passport_${btoa(passport).substring(0, 8)}`
  },

  rg: {
    minimal: (rg: string) => {
      const clean = rg.replace(/\D/g, '');
      return clean.length > 4 ? 
        `${clean.substring(0, 2)}.***.**${clean.substring(clean.length - 2)}` :
        '**.***.**';
    },
    partial: (rg: string) => {
      return '**.***.**';
    },
    substantial: (rg: string) => {
      return '**.***.**';
    },
    full: () => '**.***.**',
    hash: (rg: string) => `rg_${btoa(rg).substring(0, 8)}`
  },

  social_security: {
    minimal: (ssn: string) => {
      const clean = ssn.replace(/\D/g, '');
      return clean.length === 9 ? 
        `***-**-${clean.substring(5)}` :
        '***-**-****';
    },
    partial: (ssn: string) => {
      return '***-**-****';
    },
    substantial: (ssn: string) => {
      return '***-**-****';
    },
    full: () => '***-**-****',
    hash: (ssn: string) => `ssn_${btoa(ssn).substring(0, 8)}`
  },

  iban: {
    minimal: (iban: string) => {
      return iban.length > 8 ? 
        `${iban.substring(0, 4)}***${iban.substring(iban.length - 4)}` :
        '****';
    },
    partial: (iban: string) => {
      return iban.length > 4 ? 
        `${iban.substring(0, 2)}${'*'.repeat(iban.length - 4)}${iban.substring(iban.length - 2)}` :
        '****';
    },
    substantial: (iban: string) => {
      return '*'.repeat(Math.max(8, iban.length));
    },
    full: () => '********',
    hash: (iban: string) => `iban_${btoa(iban).substring(0, 8)}`
  },

  swift_code: {
    minimal: (swift: string) => {
      return swift.length > 4 ? 
        `${swift.substring(0, 4)}***` :
        '****';
    },
    partial: (swift: string) => {
      return swift.length > 2 ? 
        `${swift.substring(0, 2)}***` :
        '****';
    },
    substantial: (swift: string) => {
      return '********';
    },
    full: () => '********',
    hash: (swift: string) => `swift_${btoa(swift).substring(0, 8)}`
  },

  custom: {
    minimal: (value: string) => '***',
    partial: (value: string) => '***',
    substantial: (value: string) => '***',
    full: () => '***',
    hash: (value: string) => `custom_${btoa(value).substring(0, 8)}`
  }
};

// ============================================
// CLASSE PRINCIPAL AVANÇADA
// ============================================

class AdvancedDataMasking {
  private rules: Map<string, AdvancedMaskingRule[]> = new Map();
  private userPreferences: Map<string, UserMaskingPreferences> = new Map();
  private accessLogs: MaskingAccessLog[] = [];
  private customPatterns: Map<string, any> = new Map();

  constructor() {
    this.loadDefaultRules();
  }

  private loadDefaultRules() {
    // Regras para diferentes níveis de usuário
    const adminRules: AdvancedMaskingRule[] = [
      { field: 'password', type: 'password', level: 'full', logAccess: true },
      { field: 'credit_card', type: 'credit_card', level: 'minimal', logAccess: true },
      { field: 'bank_account', type: 'bank_account', level: 'minimal', logAccess: true },
      { field: 'cpf', type: 'cpf', level: 'minimal', logAccess: true },
      { field: 'cnpj', type: 'cnpj', level: 'minimal', logAccess: true },
    ];

    const managerRules: AdvancedMaskingRule[] = [
      { field: 'password', type: 'password', level: 'full', logAccess: true },
      { field: 'credit_card', type: 'credit_card', level: 'partial', logAccess: true },
      { field: 'bank_account', type: 'bank_account', level: 'partial', logAccess: true },
      { field: 'cpf', type: 'cpf', level: 'partial', logAccess: true },
      { field: 'cnpj', type: 'cnpj', level: 'partial', logAccess: true },
      { field: 'full_address', type: 'full_address', level: 'minimal', logAccess: true },
    ];

    const userRules: AdvancedMaskingRule[] = [
      { field: 'password', type: 'password', level: 'full', logAccess: true },
      { field: 'email', type: 'email', level: 'partial', logAccess: false },
      { field: 'phone', type: 'phone', level: 'partial', logAccess: false },
      { field: 'cpf', type: 'cpf', level: 'substantial', logAccess: true },
      { field: 'cnpj', type: 'cnpj', level: 'substantial', logAccess: true },
      { field: 'credit_card', type: 'credit_card', level: 'full', logAccess: true },
      { field: 'bank_account', type: 'bank_account', level: 'full', logAccess: true },
      { field: 'full_address', type: 'full_address', level: 'partial', logAccess: true },
      { field: 'name', type: 'name', level: 'minimal', logAccess: false },
    ];

    const guestRules: AdvancedMaskingRule[] = [
      { field: 'password', type: 'password', level: 'full', logAccess: true },
      { field: 'email', type: 'email', level: 'substantial', logAccess: true },
      { field: 'phone', type: 'phone', level: 'substantial', logAccess: true },
      { field: 'cpf', type: 'cpf', level: 'full', logAccess: true },
      { field: 'cnpj', type: 'cnpj', level: 'full', logAccess: true },
      { field: 'credit_card', type: 'credit_card', level: 'full', logAccess: true },
      { field: 'bank_account', type: 'bank_account', level: 'full', logAccess: true },
      { field: 'full_address', type: 'full_address', level: 'full', logAccess: true },
      { field: 'name', type: 'name', level: 'substantial', logAccess: true },
      { field: 'ip_address', type: 'ip_address', level: 'full', logAccess: true },
    ];

    this.rules.set('admin', adminRules);
    this.rules.set('manager', managerRules);
    this.rules.set('user', userRules);
    this.rules.set('guest', guestRules);
  }

  // ============================================
  // MÉTODOS PÚBLICOS AVANÇADOS
  // ============================================

  // Mascarar valor com contexto avançado
  maskValue(
    value: any,
    type: AdvancedMaskingType,
    level: MaskingLevel = 'partial',
    context?: AdvancedMaskingContext,
    fieldName?: string,
    customMask?: (value: any) => string
  ): string {
    if (!value || value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Verificar acesso baseado em tempo
    if (context && !this.isTimeBasedAccessAllowed(context)) {
      level = 'full';
    }

    // Usar máscara customizada se fornecida
    if (customMask) {
      const maskedValue = customMask(stringValue);
      this.logAccess(value, maskedValue, type, level, context, fieldName);
      return maskedValue;
    }

    // Sem mascaramento
    if (level === 'none') {
      this.logAccess(value, stringValue, type, level, context, fieldName);
      return stringValue;
    }

    // Obter padrão de mascaramento
    const pattern = ADVANCED_MASKING_PATTERNS[type];
    if (!pattern) {
      const defaultMasked = this.defaultMask(stringValue, level);
      this.logAccess(value, defaultMasked, type, level, context, fieldName);
      return defaultMasked;
    }

    // Aplicar mascaramento baseado no nível
    let maskedValue: string;
    switch (level) {
      case 'minimal':
        maskedValue = pattern.minimal(stringValue);
        break;
      case 'partial':
        maskedValue = pattern.partial(stringValue);
        break;
      case 'substantial':
        maskedValue = pattern.substantial(stringValue);
        break;
      case 'full':
        maskedValue = pattern.full();
        break;
      case 'hash':
        maskedValue = pattern.hash(stringValue);
        break;
      default:
        maskedValue = stringValue;
    }

    // Log de acesso
    this.logAccess(value, maskedValue, type, level, context, fieldName);

    return maskedValue;
  }

  // Mascarar objeto com contexto avançado
  maskObject(data: any, context: AdvancedMaskingContext): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Obter regras para o contexto
    const rules = this.getRulesForContext(context);
    
    // Aplicar preferências do usuário se disponíveis
    const userPrefs = context.userId ? this.userPreferences.get(context.userId) : null;
    if (userPrefs) {
      rules.push(...userPrefs.customRules);
    }
    
    // Clonar objeto para não modificar o original
    const maskedData = this.deepClone(data);
    
    // Aplicar mascaramento recursivamente
    return this.applyAdvancedMaskingRules(maskedData, rules, context);
  }

  // Configurar preferências do usuário
  setUserPreferences(userId: string, preferences: UserMaskingPreferences) {
    this.userPreferences.set(userId, preferences);
  }

  // Obter logs de acesso
  getAccessLogs(filters?: {
    userId?: string;
    dataType?: AdvancedMaskingType;
    startDate?: Date;
    endDate?: Date;
    minLevel?: MaskingLevel;
  }): MaskingAccessLog[] {
    let logs = [...this.accessLogs];

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.dataType) {
        logs = logs.filter(log => log.dataType === filters.dataType);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Limpar logs antigos
  clearOldLogs(olderThanDays: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    this.accessLogs = this.accessLogs.filter(log => log.timestamp >= cutoffDate);
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  private isTimeBasedAccessAllowed(context: AdvancedMaskingContext): boolean {
    // Implementar lógica de acesso baseado em tempo
    // Por enquanto, sempre permitir
    return true;
  }

  private logAccess(
    originalValue: any,
    maskedValue: string,
    type: AdvancedMaskingType,
    level: MaskingLevel,
    context?: AdvancedMaskingContext,
    fieldName?: string
  ) {
    if (!context || !context.userId) return;

    // Verificar se deve logar baseado nas regras
    const rules = this.getRulesForContext(context);
    const rule = rules.find(r => r.type === type && (!fieldName || r.field === fieldName));
    
    if (!rule?.logAccess) return;

    const log: MaskingAccessLog = {
      id: this.generateLogId(),
      userId: context.userId,
      userRole: context.userRole,
      dataType: type,
      fieldName: fieldName || 'unknown',
      originalValue: this.hashValue(String(originalValue)),
      maskedValue,
      maskingLevel: level,
      context,
      timestamp: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    };

    this.accessLogs.push(log);

    // Manter apenas os últimos 10000 logs para evitar uso excessivo de memória
    if (this.accessLogs.length > 10000) {
      this.accessLogs = this.accessLogs.slice(-5000);
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private hashValue(value: string): string {
    // Implementação simples de hash - em produção, usar crypto
    return btoa(value).substring(0, 12);
  }

  private getRulesForContext(context: AdvancedMaskingContext): AdvancedMaskingRule[] {
    const baseRules = this.rules.get(context.userRole) || this.rules.get('guest') || [];
    
    // Aplicar regras baseadas na classificação de dados
    const classificationMultiplier = {
      'public': 0,
      'internal': 1,
      'confidential': 2,
      'restricted': 3,
      'top_secret': 4
    };

    const multiplier = classificationMultiplier[context.dataClassification] || 1;
    
    return baseRules.map(rule => ({
      ...rule,
      level: this.adjustLevelForClassification(rule.level, multiplier)
    }));
  }

  private adjustLevelForClassification(level: MaskingLevel, multiplier: number): MaskingLevel {
    const levels: MaskingLevel[] = ['none', 'minimal', 'partial', 'substantial', 'full', 'hash'];
    const currentIndex = levels.indexOf(level);
    const newIndex = Math.min(levels.length - 1, currentIndex + multiplier);
    return levels[newIndex];
  }

  private applyAdvancedMaskingRules(
    data: any,
    rules: AdvancedMaskingRule[],
    context: AdvancedMaskingContext
  ): any {
    if (Array.isArray(data)) {
      return data.map(item => this.applyAdvancedMaskingRules(item, rules, context));
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
          // Verificar permissões
          if (this.hasPermissionForField(rule, context)) {
            result[key] = this.maskValue(
              value, 
              rule.type, 
              rule.level, 
              context, 
              key, 
              rule.customMask
            );
          } else {
            result[key] = this.maskValue(value, rule.type, 'full', context, key);
          }
        } else if (typeof value === 'object') {
          // Recursão para objetos aninhados
          result[key] = this.applyAdvancedMaskingRules(value, rules, context);
        } else {
          // Manter valor original
          result[key] = value;
        }
      }
      
      return result;
    }

    return data;
  }

  private hasPermissionForField(rule: AdvancedMaskingRule, context: AdvancedMaskingContext): boolean {
    if (rule.allowedRoles && !rule.allowedRoles.includes(context.userRole)) {
      return false;
    }

    if (rule.allowedPermissions) {
      const hasPermission = rule.allowedPermissions.some(permission => 
        context.userPermissions.includes(permission)
      );
      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  private fieldMatches(fieldName: string, pattern: string): boolean {
    // Suporte para wildcards simples
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      return regex.test(fieldName);
    }
    
    return fieldName.toLowerCase() === pattern.toLowerCase();
  }

  private defaultMask(value: string, level: MaskingLevel): string {
    switch (level) {
      case 'minimal':
        return value.length > 2 ? value.substring(0, 2) + '*'.repeat(value.length - 2) : '***';
      case 'partial':
        return value.length > 4 ? value.substring(0, 1) + '*'.repeat(value.length - 2) + value.substring(value.length - 1) : '***';
      case 'substantial':
        return '*'.repeat(Math.max(3, value.length));
      case 'full':
        return '***';
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
    Object.keys(obj).forEach(key => {
      cloned[key] = this.deepClone(obj[key]);
    });
    
    return cloned;
  }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================

const advancedDataMasking = new AdvancedDataMasking();

// ============================================
// FUNÇÕES UTILITÁRIAS AVANÇADAS
// ============================================

// Função principal para mascaramento avançado
export function maskDataAdvanced(
  data: any,
  userRole: string,
  userPermissions: string[] = [],
  options: {
    userId?: string;
    purpose?: 'display' | 'export' | 'log' | 'audit' | 'report' | 'api';
    dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
    complianceLevel?: 'basic' | 'gdpr' | 'lgpd' | 'hipaa' | 'pci_dss';
    ipAddress?: string;
    userAgent?: string;
  } = {}
) {
  const context: AdvancedMaskingContext = {
    userRole,
    userPermissions,
    userId: options.userId,
    dataClassification: options.dataClassification || 'internal',
    purpose: options.purpose || 'display',
    environment: process.env.NODE_ENV as any || 'development',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    timestamp: new Date(),
    complianceLevel: options.complianceLevel || 'basic'
  };
  
  return advancedDataMasking.maskObject(data, context);
}

// Hook React para mascaramento avançado
export function useAdvancedMaskedData<T>(
  data: T,
  userRole: string,
  userPermissions: string[] = [],
  options: Parameters<typeof maskDataAdvanced>[3] = {}
): T {
  return useMemo(() => {
    return maskDataAdvanced(data, userRole, userPermissions, options);
  }, [data, userRole, userPermissions, options]);
}

// Configurar preferências de usuário
export function setUserMaskingPreferences(
  userId: string,
  preferences: UserMaskingPreferences
) {
  advancedDataMasking.setUserPreferences(userId, preferences);
}

// Obter logs de acesso
export function getMaskingAccessLogs(
  filters?: Parameters<typeof advancedDataMasking.getAccessLogs>[0]
) {
  return advancedDataMasking.getAccessLogs(filters);
}

// Limpar logs antigos
export function clearOldMaskingLogs(olderThanDays: number = 90) {
  advancedDataMasking.clearOldLogs(olderThanDays);
}

// Middleware para APIs com mascaramento avançado
export function createAdvancedMaskingMiddleware(
  defaultRole: string = 'user',
  options: {
    enableLogging?: boolean;
    complianceLevel?: 'basic' | 'gdpr' | 'lgpd' | 'hipaa' | 'pci_dss';
  } = {}
) {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      const userRole = req.user?.role || defaultRole;
      const userPermissions = req.user?.permissions || [];
      const userId = req.user?.id;
      
      const maskedData = maskDataAdvanced(data, userRole, userPermissions, {
        userId,
        purpose: 'api',
        complianceLevel: options.complianceLevel || 'basic',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
      
      return originalJson.call(this, maskedData);
    };
    
    next();
  };
}

// Exportar instância para uso direto
export { advancedDataMasking };