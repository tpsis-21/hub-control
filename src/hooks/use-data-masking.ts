/**
 * Hook personalizado para gerenciamento de mascaramento de dados
 * 
 * Fornece funcionalidades para:
 * - Aplicar mascaramento baseado em contexto
 * - Gerenciar preferências do usuário
 * - Registrar logs de acesso
 * - Cache de configurações
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AdvancedMaskingType,
  MaskingLevel,
  AdvancedMaskingRule,
  UserMaskingPreferences,
  AdvancedMaskingContext,
  MaskingAccessLog,
  maskDataAdvanced,
  setUserMaskingPreferences,
  getMaskingAccessLogs,
  clearOldMaskingLogs
} from '@/lib/data-masking-advanced';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface UseMaskingOptions {
  userId: string;
  userRole: string;
  userPermissions: string[];
  autoSave?: boolean;
  cacheTimeout?: number;
  enableLogging?: boolean;
}

interface MaskingState {
  preferences: UserMaskingPreferences | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface MaskingActions {
  // Mascaramento de dados
  maskData: (data: Record<string, any>, context?: Partial<AdvancedMaskingContext>) => Record<string, any>;
  maskField: (fieldName: string, value: any, context?: Partial<AdvancedMaskingContext>) => any;
  
  // Gerenciamento de preferências
  updatePreferences: (preferences: Partial<UserMaskingPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  savePreferences: () => Promise<void>;
  
  // Regras personalizadas
  addCustomRule: (rule: AdvancedMaskingRule) => void;
  updateCustomRule: (index: number, rule: AdvancedMaskingRule) => void;
  removeCustomRule: (index: number) => void;
  
  // Logs de acesso
  getLogs: (filters?: LogFilters) => MaskingAccessLog[];
  clearLogs: (olderThanDays?: number) => Promise<void>;
  exportLogs: (format?: 'json' | 'csv') => void;
  
  // Utilitários
  previewMasking: (type: AdvancedMaskingType, level: MaskingLevel, sampleValue?: string) => string;
  validateRule: (rule: AdvancedMaskingRule) => { isValid: boolean; errors: string[] };
  getEffectiveLevel: (fieldName: string, dataType: AdvancedMaskingType) => MaskingLevel;
}

interface LogFilters {
  dataType?: AdvancedMaskingType;
  startDate?: Date;
  endDate?: Date;
  fieldName?: string;
  userRole?: string;
}

type UseMaskingReturn = MaskingState & MaskingActions;

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutos
const DEFAULT_PREFERENCES: UserMaskingPreferences = {
  userId: '',
  customRules: [],
  defaultLevel: 'partial',
  enableLogging: true,
  allowedDataTypes: [],
  restrictedDataTypes: []
};

const SAMPLE_VALUES: Record<AdvancedMaskingType, string> = {
  email: 'usuario@exemplo.com',
  phone: '(11) 99999-9999',
  cpf: '123.456.789-00',
  cnpj: '12.345.678/0001-90',
  credit_card: '1234 5678 9012 3456',
  bank_account: '123456-7',
  bank_agency: '1234',
  pix_key: 'usuario@exemplo.com',
  password: 'minhasenha123',
  name: 'João da Silva Santos',
  full_address: 'Rua das Flores, 123, Bairro Centro, São Paulo - SP, 01234-567',
  street_address: 'Rua das Flores, 123',
  postal_code: '01234-567',
  ip_address: '192.168.1.100',
  mac_address: '00:11:22:33:44:55',
  license_plate: 'ABC-1234',
  passport: 'BR123456789',
  rg: '12.345.678-9',
  social_security: '123-45-6789',
  iban: 'BR1234567890123456789012345',
  swift_code: 'ABCDBR2X',
  custom: 'Dados personalizados'
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useDataMasking(options: UseMaskingOptions): UseMaskingReturn {
  const { toast } = useToast();
  const {
    userId,
    userRole,
    userPermissions,
    autoSave = true,
    cacheTimeout = DEFAULT_CACHE_TIMEOUT,
    enableLogging = true
  } = options;

  // ============================================
  // ESTADO
  // ============================================

  const [state, setState] = useState<MaskingState>({
    preferences: null,
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  const [cache, setCache] = useState<Map<string, { data: any; timestamp: number }>>(new Map());

  // ============================================
  // EFEITOS
  // ============================================

  // Carregar preferências do usuário
  useEffect(() => {
    loadUserPreferences();
  }, [userId]);

  // Auto-save das preferências
  useEffect(() => {
    if (autoSave && state.preferences && state.lastUpdated) {
      const timeoutId = setTimeout(() => {
        savePreferences();
      }, 1000); // Debounce de 1 segundo

      return () => clearTimeout(timeoutId);
    }
  }, [state.preferences, autoSave]);

  // Limpeza do cache
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newCache = new Map();
      
      cache.forEach((value, key) => {
        if (now - value.timestamp < cacheTimeout) {
          newCache.set(key, value);
        }
      });
      
      setCache(newCache);
    }, cacheTimeout);

    return () => clearInterval(interval);
  }, [cache, cacheTimeout]);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const loadUserPreferences = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Carregar preferências do localStorage
      const stored = localStorage.getItem(`masking_preferences_${userId}`);
      const preferences = stored ? JSON.parse(stored) : {
        ...DEFAULT_PREFERENCES,
        userId
      };
      
      setState(prev => ({
        ...prev,
        preferences,
        isLoading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
      setState(prev => ({
        ...prev,
        error: 'Não foi possível carregar as preferências de mascaramento',
        isLoading: false
      }));
    }
  };

  const getCacheKey = (data: any, context: any) => {
    return JSON.stringify({ data, context, userId, userRole, userPermissions });
  };

  const getFromCache = (key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    return null;
  };

  const setToCache = (key: string, data: any) => {
    setCache(prev => new Map(prev.set(key, { data, timestamp: Date.now() })));
  };

  // ============================================
  // AÇÕES DE MASCARAMENTO
  // ============================================

  const maskData = useCallback((data: Record<string, any>, context: Partial<AdvancedMaskingContext> = {}) => {
    if (!state.preferences) {
      return data;
    }

    const cacheKey = getCacheKey(data, context);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const fullContext: AdvancedMaskingContext = {
      userRole,
      userPermissions,
      purpose: 'display',
      dataClassification: 'internal',
      environment: (process.env.NODE_ENV === 'test' ? 'development' : process.env.NODE_ENV) as 'development' | 'production' | 'staging',
      ...context
    };

    try {
      const maskedData = maskDataAdvanced(
        data,
        userRole,
        userPermissions,
        {
          userId,
          purpose: fullContext.purpose,
          dataClassification: fullContext.dataClassification,
          complianceLevel: fullContext.complianceLevel
        }
      );

      setToCache(cacheKey, maskedData);
      return maskedData;
    } catch (error) {
      console.error('Erro ao mascarar dados:', error);
      return data; // Retorna dados originais em caso de erro
    }
  }, [state.preferences, userRole, userPermissions, cache, cacheTimeout]);

  const maskField = useCallback((fieldName: string, value: any, context: Partial<AdvancedMaskingContext> = {}) => {
    const data = { [fieldName]: value };
    const maskedData = maskData(data, context);
    return maskedData[fieldName];
  }, [maskData]);

  // ============================================
  // AÇÕES DE PREFERÊNCIAS
  // ============================================

  const updatePreferences = useCallback(async (updates: Partial<UserMaskingPreferences>) => {
    if (!state.preferences) return;

    try {
      const newPreferences = {
        ...state.preferences,
        ...updates
      };

      setState(prev => ({
        ...prev,
        preferences: newPreferences,
        lastUpdated: new Date(),
        error: null
      }));

      // Limpar cache quando preferências mudam
      setCache(new Map());

    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      setState(prev => ({
        ...prev,
        error: 'Não foi possível atualizar as preferências'
      }));
    }
  }, [state.preferences]);

  const resetPreferences = useCallback(async () => {
    try {
      const defaultPrefs = { ...DEFAULT_PREFERENCES, userId };
      
      setState(prev => ({
        ...prev,
        preferences: defaultPrefs,
        lastUpdated: new Date(),
        error: null
      }));

      setCache(new Map());

      if (enableLogging) {
        toast({
          title: 'Preferências Resetadas',
          description: 'As preferências foram restauradas para os valores padrão.',
        });
      }
    } catch (error) {
      console.error('Erro ao resetar preferências:', error);
      setState(prev => ({
        ...prev,
        error: 'Não foi possível resetar as preferências'
      }));
    }
  }, [userId, enableLogging, toast]);

  const savePreferences = useCallback(async () => {
    if (!state.preferences) return;

    try {
      setUserMaskingPreferences(userId, state.preferences);
      
      if (enableLogging) {
        toast({
          title: 'Preferências Salvas',
          description: 'Suas preferências de mascaramento foram salvas com sucesso.',
        });
      }
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      setState(prev => ({
        ...prev,
        error: 'Não foi possível salvar as preferências'
      }));
      
      if (enableLogging) {
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar as preferências.',
          variant: 'destructive'
        });
      }
    }
  }, [state.preferences, userId, enableLogging, toast]);

  // ============================================
  // AÇÕES DE REGRAS PERSONALIZADAS
  // ============================================

  const addCustomRule = useCallback((rule: AdvancedMaskingRule) => {
    updatePreferences({
      customRules: [...(state.preferences?.customRules || []), rule]
    });
  }, [state.preferences, updatePreferences]);

  const updateCustomRule = useCallback((index: number, rule: AdvancedMaskingRule) => {
    if (!state.preferences) return;
    
    const newRules = [...state.preferences.customRules];
    newRules[index] = rule;
    
    updatePreferences({ customRules: newRules });
  }, [state.preferences, updatePreferences]);

  const removeCustomRule = useCallback((index: number) => {
    if (!state.preferences) return;
    
    const newRules = state.preferences.customRules.filter((_, i) => i !== index);
    updatePreferences({ customRules: newRules });
  }, [state.preferences, updatePreferences]);

  // ============================================
  // AÇÕES DE LOGS
  // ============================================

  const getLogs = useCallback((filters: LogFilters = {}) => {
    try {
      const allLogs = getMaskingAccessLogs({ userId });
      
      return allLogs.filter(log => {
        if (filters.dataType && log.dataType !== filters.dataType) return false;
        if (filters.fieldName && !log.fieldName.toLowerCase().includes(filters.fieldName.toLowerCase())) return false;
        if (filters.userRole && log.userRole !== filters.userRole) return false;
        if (filters.startDate && log.timestamp < filters.startDate) return false;
        if (filters.endDate && log.timestamp > filters.endDate) return false;
        
        return true;
      });
    } catch (error) {
      console.error('Erro ao obter logs:', error);
      return [];
    }
  }, [userId]);

  const clearLogs = useCallback(async (olderThanDays: number = 0) => {
    try {
      clearOldMaskingLogs(olderThanDays);
      
      if (enableLogging) {
        toast({
          title: 'Logs Limpos',
          description: `Logs ${olderThanDays > 0 ? `mais antigos que ${olderThanDays} dias` : 'todos'} foram removidos.`,
        });
      }
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
      
      if (enableLogging) {
        toast({
          title: 'Erro ao Limpar Logs',
          description: 'Não foi possível limpar os logs.',
          variant: 'destructive'
        });
      }
    }
  }, [enableLogging, toast]);

  const exportLogs = useCallback((format: 'json' | 'csv' = 'json') => {
    try {
      const logs = getLogs();
      
      if (format === 'json') {
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        downloadFile(dataBlob, `masking-logs-${new Date().toISOString().split('T')[0]}.json`);
      } else {
        const csvContent = convertLogsToCSV(logs);
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        downloadFile(dataBlob, `masking-logs-${new Date().toISOString().split('T')[0]}.csv`);
      }
      
      if (enableLogging) {
        toast({
          title: 'Logs Exportados',
          description: `Logs exportados em formato ${format.toUpperCase()}.`,
        });
      }
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      
      if (enableLogging) {
        toast({
          title: 'Erro na Exportação',
          description: 'Não foi possível exportar os logs.',
          variant: 'destructive'
        });
      }
    }
  }, [getLogs, enableLogging, toast]);

  // ============================================
  // UTILITÁRIOS
  // ============================================

  const previewMasking = useCallback((type: AdvancedMaskingType, level: MaskingLevel, sampleValue?: string) => {
    const value = sampleValue || SAMPLE_VALUES[type] || 'Exemplo';
    const data = { [type]: value };
    
    // Criar contexto temporário para preview
    const tempPreferences: UserMaskingPreferences = {
      userId: 'preview',
      customRules: [{
        field: type,
        type,
        level,
        logAccess: false,
        allowedRoles: [],
        allowedPermissions: []
      }],
      defaultLevel: level,
      enableLogging: false,
      allowedDataTypes: [type],
      restrictedDataTypes: []
    };
    
    try {
      const masked = maskDataAdvanced(
        data,
        userRole,
        userPermissions,
        { 
          userId: 'preview',
          purpose: 'display', 
          dataClassification: 'internal' 
        }
      );
      
      return masked[type] || value;
    } catch (error) {
      console.error('Erro no preview:', error);
      return value;
    }
  }, [userRole, userPermissions]);

  const validateRule = useCallback((rule: AdvancedMaskingRule) => {
    const errors: string[] = [];
    
    if (!rule.field || rule.field.trim() === '') {
      errors.push('Nome do campo é obrigatório');
    }
    
    if (!rule.type) {
      errors.push('Tipo de dados é obrigatório');
    }
    
    if (!rule.level) {
      errors.push('Nível de mascaramento é obrigatório');
    }
    
    // Verificar se já existe uma regra para o mesmo campo
    if (state.preferences?.customRules.some(r => r.field === rule.field && r !== rule)) {
      errors.push('Já existe uma regra para este campo');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [state.preferences]);

  const getEffectiveLevel = useCallback((fieldName: string, dataType: AdvancedMaskingType): MaskingLevel => {
    if (!state.preferences) return 'partial';
    
    // Procurar regra personalizada para o campo
    const customRule = state.preferences.customRules.find(rule => rule.field === fieldName);
    if (customRule) {
      return customRule.level;
    }
    
    // Verificar se o tipo está restrito
    if (state.preferences.restrictedDataTypes.includes(dataType)) {
      return 'full';
    }
    
    // Verificar se o tipo está explicitamente permitido
    if (state.preferences.allowedDataTypes.includes(dataType)) {
      return 'minimal';
    }
    
    // Retornar nível padrão
    return state.preferences.defaultLevel;
  }, [state.preferences]);

  // ============================================
  // FUNÇÕES AUXILIARES INTERNAS
  // ============================================

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertLogsToCSV = (logs: MaskingAccessLog[]): string => {
    const headers = ['Data/Hora', 'Campo', 'Tipo', 'Nível', 'Usuário', 'Valor Mascarado'];
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.fieldName,
      log.dataType,
      log.maskingLevel,
      log.userRole,
      log.maskedValue
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  // ============================================
  // VALORES MEMOIZADOS
  // ============================================

  const memoizedActions = useMemo(() => ({
    maskData,
    maskField,
    updatePreferences,
    resetPreferences,
    savePreferences,
    addCustomRule,
    updateCustomRule,
    removeCustomRule,
    getLogs,
    clearLogs,
    exportLogs,
    previewMasking,
    validateRule,
    getEffectiveLevel
  }), [
    maskData,
    maskField,
    updatePreferences,
    resetPreferences,
    savePreferences,
    addCustomRule,
    updateCustomRule,
    removeCustomRule,
    getLogs,
    clearLogs,
    exportLogs,
    previewMasking,
    validateRule,
    getEffectiveLevel
  ]);

  // ============================================
  // RETORNO
  // ============================================

  return {
    ...state,
    ...memoizedActions
  };
}

export default useDataMasking;