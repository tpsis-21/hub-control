/**
 * Hook para Gerenciamento de Alertas do Sistema
 * 
 * Funcionalidades:
 * - Criação e gerenciamento de alertas
 * - Configuração de regras de alerta
 * - Notificações automáticas
 * - Histórico de alertas
 * - Integração com diferentes canais (email, push, webhook)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/production-logger'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: AlertSource;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
  actions?: AlertAction[];
  tags?: string[];
  category?: string;
  affectedUsers?: string[];
  estimatedImpact?: 'low' | 'medium' | 'high' | 'critical';
  autoResolve?: boolean;
  autoResolveAfter?: number; // em minutos
}

export type AlertType = 
  | 'performance'
  | 'security'
  | 'error'
  | 'resource'
  | 'user_activity'
  | 'system'
  | 'business'
  | 'custom';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertSource = 
  | 'performance_monitor'
  | 'error_tracker'
  | 'security_scanner'
  | 'resource_monitor'
  | 'user_behavior'
  | 'external_api'
  | 'manual'
  | 'automated_rule';

export interface AlertAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'api_call';
  action: string | (() => void | Promise<void>);
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertRuleAction[];
  cooldown?: number; // em minutos
  lastTriggered?: Date;
  triggerCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: number | string;
  timeWindow?: number; // em minutos
  aggregation?: 'avg' | 'sum' | 'count' | 'max' | 'min';
}

export interface AlertRuleAction {
  type: 'create_alert' | 'send_email' | 'send_webhook' | 'execute_script';
  config: Record<string, any>;
}

export interface AlertChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'push' | 'sms' | 'slack';
  enabled: boolean;
  config: Record<string, any>;
  filters?: AlertFilter[];
}

export interface AlertFilter {
  field: keyof SystemAlert;
  operator: 'eq' | 'ne' | 'in' | 'not_in' | 'contains';
  value: any;
}

export interface AlertStats {
  total: number;
  byType: Record<AlertType, number>;
  bySeverity: Record<AlertSeverity, number>;
  bySource: Record<AlertSource, number>;
  acknowledged: number;
  resolved: number;
  active: number;
  avgResolutionTime: number; // em minutos
  topCategories: Array<{ category: string; count: number }>;
  recentTrends: Array<{ date: string; count: number }>;
}

export interface UseSystemAlertsOptions {
  userId?: string;
  userRole?: string;
  autoAcknowledge?: boolean;
  maxAlerts?: number;
  enableNotifications?: boolean;
  enableSound?: boolean;
  onAlert?: (alert: SystemAlert) => void;
  onCriticalAlert?: (alert: SystemAlert) => void;
}

export interface UseSystemAlertsReturn {
  // Estado
  alerts: SystemAlert[];
  rules: AlertRule[];
  channels: AlertChannel[];
  stats: AlertStats;
  isLoading: boolean;
  error: string | null;
  
  // Ações de Alertas
  createAlert: (alert: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>) => Promise<SystemAlert>;
  acknowledgeAlert: (alertId: string, userId?: string) => Promise<void>;
  resolveAlert: (alertId: string, userId?: string, resolution?: string) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  bulkAcknowledge: (alertIds: string[], userId?: string) => Promise<void>;
  bulkResolve: (alertIds: string[], userId?: string) => Promise<void>;
  bulkDelete: (alertIds: string[]) => Promise<void>;
  
  // Ações de Regras
  createRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>) => Promise<AlertRule>;
  updateRule: (ruleId: string, updates: Partial<AlertRule>) => Promise<AlertRule>;
  deleteRule: (ruleId: string) => Promise<void>;
  toggleRule: (ruleId: string, enabled: boolean) => Promise<void>;
  testRule: (ruleId: string) => Promise<boolean>;
  
  // Ações de Canais
  createChannel: (channel: Omit<AlertChannel, 'id'>) => Promise<AlertChannel>;
  updateChannel: (channelId: string, updates: Partial<AlertChannel>) => Promise<AlertChannel>;
  deleteChannel: (channelId: string) => Promise<void>;
  testChannel: (channelId: string) => Promise<boolean>;
  
  // Filtros e Busca
  filterAlerts: (filters: Partial<SystemAlert>) => SystemAlert[];
  searchAlerts: (query: string) => SystemAlert[];
  getAlertsByTimeRange: (startDate: Date, endDate: Date) => SystemAlert[];
  getAlertsByUser: (userId: string) => SystemAlert[];
  
  // Utilitários
  exportAlerts: (format: 'json' | 'csv') => string;
  importAlerts: (data: string, format: 'json' | 'csv') => Promise<void>;
  clearOldAlerts: (olderThanDays: number) => Promise<number>;
  getAlertHistory: (alertId: string) => Promise<any[]>;
  
  // Configurações
  updateSettings: (settings: Partial<UseSystemAlertsOptions>) => void;
  resetSettings: () => void;
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_OPTIONS: UseSystemAlertsOptions = {
  autoAcknowledge: false,
  maxAlerts: 1000,
  enableNotifications: true,
  enableSound: false
};

const ALERT_STORAGE_KEY = 'system_alerts';
const RULES_STORAGE_KEY = 'alert_rules';
const CHANNELS_STORAGE_KEY = 'alert_channels';
const SETTINGS_STORAGE_KEY = 'alert_settings';

const SEVERITY_PRIORITY = {
  critical: 4,
  error: 3,
  warning: 2,
  info: 1
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useSystemAlerts(options: UseSystemAlertsOptions = {}): UseSystemAlertsReturn {
  const { toast } = useToast();
  const optionsRef = useRef({ ...DEFAULT_OPTIONS, ...options });
  
  // ============================================
  // ESTADO
  // ============================================
  
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UseSystemAlertsOptions>(optionsRef.current);
  
  // ============================================
  // EFEITOS
  // ============================================
  
  // Carregar dados do localStorage
  useEffect(() => {
    try {
      const savedAlerts = localStorage.getItem(ALERT_STORAGE_KEY);
      const savedRules = localStorage.getItem(RULES_STORAGE_KEY);
      const savedChannels = localStorage.getItem(CHANNELS_STORAGE_KEY);
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      
      if (savedAlerts) {
        const parsedAlerts = JSON.parse(savedAlerts).map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined
        }));
        setAlerts(parsedAlerts);
      }
      
      if (savedRules) {
        const parsedRules = JSON.parse(savedRules).map((rule: any) => ({
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt),
          lastTriggered: rule.lastTriggered ? new Date(rule.lastTriggered) : undefined
        }));
        setRules(parsedRules);
      }
      
      if (savedChannels) {
        setChannels(JSON.parse(savedChannels));
      }
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_OPTIONS, ...parsedSettings });
        optionsRef.current = { ...DEFAULT_OPTIONS, ...parsedSettings };
      }
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
      setError('Erro ao carregar dados dos alertas');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Salvar alertas no localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
    }
  }, [alerts, isLoading]);
  
  // Salvar regras no localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    }
  }, [rules, isLoading]);
  
  // Salvar canais no localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));
    }
  }, [channels, isLoading]);
  
  // Auto-resolução de alertas
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setAlerts(prev => prev.map(alert => {
        if (alert.autoResolve && alert.autoResolveAfter && !alert.resolved) {
          const minutesSinceCreated = (now.getTime() - alert.timestamp.getTime()) / (1000 * 60);
          if (minutesSinceCreated >= alert.autoResolveAfter) {
            return {
              ...alert,
              resolved: true,
              resolvedBy: 'system',
              resolvedAt: now
            };
          }
        }
        return alert;
      }));
    }, 60000); // Verificar a cada minuto
    
    return () => clearInterval(interval);
  }, []);
  
  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================
  
  const generateId = (): string => {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  const sortAlerts = (alertList: SystemAlert[]): SystemAlert[] => {
    return [...alertList].sort((a, b) => {
      // Primeiro por severidade
      const severityDiff = SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Depois por timestamp (mais recente primeiro)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  };
  
  const shouldNotify = (alert: SystemAlert): boolean => {
    if (!settings.enableNotifications) return false;
    
    // Verificar filtros dos canais
    const applicableChannels = channels.filter(channel => {
      if (!channel.enabled) return false;
      
      if (channel.filters) {
        return channel.filters.every(filter => {
          const alertValue = alert[filter.field];
          switch (filter.operator) {
            case 'eq': return alertValue === filter.value;
            case 'ne': return alertValue !== filter.value;
            case 'in': return Array.isArray(filter.value) && filter.value.includes(alertValue);
            case 'not_in': return Array.isArray(filter.value) && !filter.value.includes(alertValue);
            case 'contains': return String(alertValue).includes(String(filter.value));
            default: return true;
          }
        });
      }
      
      return true;
    });
    
    return applicableChannels.length > 0;
  };
  
  const sendNotification = async (alert: SystemAlert): Promise<void> => {
    if (!shouldNotify(alert)) return;
    
    // Notificação via toast
    toast({
      title: alert.title,
      description: alert.message,
      variant: alert.severity === 'critical' || alert.severity === 'error' ? 'destructive' : 'default'
    });
    
    // Notificação sonora
    if (settings.enableSound && (alert.severity === 'critical' || alert.severity === 'error')) {
      try {
        const audio = new Audio('/sounds/alert.mp3');
        audio.volume = 0.5;
        await audio.play();
      } catch (err) {
        logger.warn('Não foi possível reproduzir som de alerta:', err instanceof Error ? err : new Error(String(err)));
      }
    }
    
    // Notificação do navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/icons/alert.png',
        tag: alert.id
      });
    }
    
    // Callbacks personalizados
    if (settings.onAlert) {
      settings.onAlert(alert);
    }
    
    if (alert.severity === 'critical' && settings.onCriticalAlert) {
      settings.onCriticalAlert(alert);
    }
  };
  
  // ============================================
  // AÇÕES DE ALERTAS
  // ============================================
  
  const createAlert = useCallback(async (alertData: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): Promise<SystemAlert> => {
    const newAlert: SystemAlert = {
      ...alertData,
      id: generateId(),
      timestamp: new Date(),
      acknowledged: false,
      resolved: false
    };
    
    setAlerts(prev => {
      const updated = [newAlert, ...prev];
      
      // Limitar número máximo de alertas
      if (settings.maxAlerts && updated.length > settings.maxAlerts) {
        return updated.slice(0, settings.maxAlerts);
      }
      
      return sortAlerts(updated);
    });
    
    // Enviar notificação
    await sendNotification(newAlert);
    
    return newAlert;
  }, [settings, toast]);
  
  const acknowledgeAlert = useCallback(async (alertId: string, userId?: string): Promise<void> => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedBy: userId || settings.userId || 'unknown',
            acknowledgedAt: new Date()
          }
        : alert
    ));
  }, [settings.userId]);
  
  const resolveAlert = useCallback(async (alertId: string, userId?: string, resolution?: string): Promise<void> => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? {
            ...alert,
            resolved: true,
            resolvedBy: userId || settings.userId || 'unknown',
            resolvedAt: new Date(),
            metadata: {
              ...alert.metadata,
              resolution
            }
          }
        : alert
    ));
  }, [settings.userId]);
  
  const deleteAlert = useCallback(async (alertId: string): Promise<void> => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);
  
  const bulkAcknowledge = useCallback(async (alertIds: string[], userId?: string): Promise<void> => {
    const user = userId || settings.userId || 'unknown';
    const now = new Date();
    
    setAlerts(prev => prev.map(alert => 
      alertIds.includes(alert.id)
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedBy: user,
            acknowledgedAt: now
          }
        : alert
    ));
  }, [settings.userId]);
  
  const bulkResolve = useCallback(async (alertIds: string[], userId?: string): Promise<void> => {
    const user = userId || settings.userId || 'unknown';
    const now = new Date();
    
    setAlerts(prev => prev.map(alert => 
      alertIds.includes(alert.id)
        ? {
            ...alert,
            resolved: true,
            resolvedBy: user,
            resolvedAt: now
          }
        : alert
    ));
  }, [settings.userId]);
  
  const bulkDelete = useCallback(async (alertIds: string[]): Promise<void> => {
    setAlerts(prev => prev.filter(alert => !alertIds.includes(alert.id)));
  }, []);
  
  // ============================================
  // AÇÕES DE REGRAS
  // ============================================
  
  const createRule = useCallback(async (ruleData: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>): Promise<AlertRule> => {
    const newRule: AlertRule = {
      ...ruleData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      triggerCount: 0
    };
    
    setRules(prev => [...prev, newRule]);
    return newRule;
  }, []);
  
  const updateRule = useCallback(async (ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule> => {
    let updatedRule: AlertRule | null = null;
    
    setRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        updatedRule = {
          ...rule,
          ...updates,
          updatedAt: new Date()
        };
        return updatedRule;
      }
      return rule;
    }));
    
    if (!updatedRule) {
      throw new Error('Regra não encontrada');
    }
    
    return updatedRule;
  }, []);
  
  const deleteRule = useCallback(async (ruleId: string): Promise<void> => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);
  
  const toggleRule = useCallback(async (ruleId: string, enabled: boolean): Promise<void> => {
    await updateRule(ruleId, { enabled });
  }, [updateRule]);
  
  const testRule = useCallback(async (ruleId: string): Promise<boolean> => {
    // Implementação simplificada - em produção seria mais complexa
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return false;
    
    // Simular teste da regra
    return new Promise(resolve => {
      setTimeout(() => resolve(Math.random() > 0.5), 1000);
    });
  }, [rules]);
  
  // ============================================
  // AÇÕES DE CANAIS
  // ============================================
  
  const createChannel = useCallback(async (channelData: Omit<AlertChannel, 'id'>): Promise<AlertChannel> => {
    const newChannel: AlertChannel = {
      ...channelData,
      id: generateId()
    };
    
    setChannels(prev => [...prev, newChannel]);
    return newChannel;
  }, []);
  
  const updateChannel = useCallback(async (channelId: string, updates: Partial<AlertChannel>): Promise<AlertChannel> => {
    let updatedChannel: AlertChannel | null = null;
    
    setChannels(prev => prev.map(channel => {
      if (channel.id === channelId) {
        updatedChannel = { ...channel, ...updates };
        return updatedChannel;
      }
      return channel;
    }));
    
    if (!updatedChannel) {
      throw new Error('Canal não encontrado');
    }
    
    return updatedChannel;
  }, []);
  
  const deleteChannel = useCallback(async (channelId: string): Promise<void> => {
    setChannels(prev => prev.filter(channel => channel.id !== channelId));
  }, []);
  
  const testChannel = useCallback(async (channelId: string): Promise<boolean> => {
    // Implementação simplificada
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return false;
    
    // Simular teste do canal
    return new Promise(resolve => {
      setTimeout(() => resolve(Math.random() > 0.3), 1000);
    });
  }, [channels]);
  
  // ============================================
  // FILTROS E BUSCA
  // ============================================
  
  const filterAlerts = useCallback((filters: Partial<SystemAlert>): SystemAlert[] => {
    return alerts.filter(alert => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        
        const alertValue = alert[key as keyof SystemAlert];
        
        if (Array.isArray(value)) {
          return value.includes(alertValue);
        }
        
        return alertValue === value;
      });
    });
  }, [alerts]);
  
  const searchAlerts = useCallback((query: string): SystemAlert[] => {
    if (!query.trim()) return alerts;
    
    const searchTerm = query.toLowerCase();
    
    return alerts.filter(alert => 
      alert.title.toLowerCase().includes(searchTerm) ||
      alert.message.toLowerCase().includes(searchTerm) ||
      alert.type.toLowerCase().includes(searchTerm) ||
      alert.source.toLowerCase().includes(searchTerm) ||
      (alert.category && alert.category.toLowerCase().includes(searchTerm)) ||
      (alert.tags && alert.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
  }, [alerts]);
  
  const getAlertsByTimeRange = useCallback((startDate: Date, endDate: Date): SystemAlert[] => {
    return alerts.filter(alert => 
      alert.timestamp >= startDate && alert.timestamp <= endDate
    );
  }, [alerts]);
  
  const getAlertsByUser = useCallback((userId: string): SystemAlert[] => {
    return alerts.filter(alert => 
      alert.acknowledgedBy === userId || 
      alert.resolvedBy === userId ||
      (alert.affectedUsers && alert.affectedUsers.includes(userId))
    );
  }, [alerts]);
  
  // ============================================
  // UTILITÁRIOS
  // ============================================
  
  const exportAlerts = useCallback((format: 'json' | 'csv'): string => {
    if (format === 'json') {
      return JSON.stringify(alerts, null, 2);
    }
    
    // CSV
    const headers = ['ID', 'Tipo', 'Severidade', 'Título', 'Mensagem', 'Origem', 'Data', 'Reconhecido', 'Resolvido'];
    const rows = alerts.map(alert => [
      alert.id,
      alert.type,
      alert.severity,
      alert.title,
      alert.message,
      alert.source,
      alert.timestamp.toISOString(),
      alert.acknowledged ? 'Sim' : 'Não',
      alert.resolved ? 'Sim' : 'Não'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }, [alerts]);
  
  const importAlerts = useCallback(async (data: string, format: 'json' | 'csv'): Promise<void> => {
    try {
      let importedAlerts: SystemAlert[];
      
      if (format === 'json') {
        importedAlerts = JSON.parse(data);
      } else {
        // Implementação simplificada para CSV
        const lines = data.split('\n');
        const headers = lines[0].split(',');
        
        importedAlerts = lines.slice(1).map(line => {
          const values = line.split(',');
          return {
            id: values[0],
            type: values[1] as AlertType,
            severity: values[2] as AlertSeverity,
            title: values[3],
            message: values[4],
            source: values[5] as AlertSource,
            timestamp: new Date(values[6]),
            acknowledged: values[7] === 'Sim',
            resolved: values[8] === 'Sim'
          } as SystemAlert;
        });
      }
      
      setAlerts(prev => sortAlerts([...prev, ...importedAlerts]));
    } catch (err) {
      throw new Error('Erro ao importar alertas: ' + (err as Error).message);
    }
  }, []);
  
  const clearOldAlerts = useCallback(async (olderThanDays: number): Promise<number> => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const oldAlerts = alerts.filter(alert => alert.timestamp < cutoffDate);
    const count = oldAlerts.length;
    
    setAlerts(prev => prev.filter(alert => alert.timestamp >= cutoffDate));
    
    return count;
  }, [alerts]);
  
  const getAlertHistory = useCallback(async (alertId: string): Promise<any[]> => {
    // Implementação simplificada - em produção viria do backend
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return [];
    
    const history = [];
    
    history.push({
      action: 'created',
      timestamp: alert.timestamp,
      user: 'system'
    });
    
    if (alert.acknowledged) {
      history.push({
        action: 'acknowledged',
        timestamp: alert.acknowledgedAt,
        user: alert.acknowledgedBy
      });
    }
    
    if (alert.resolved) {
      history.push({
        action: 'resolved',
        timestamp: alert.resolvedAt,
        user: alert.resolvedBy
      });
    }
    
    return history;
  }, [alerts]);
  
  // ============================================
  // CONFIGURAÇÕES
  // ============================================
  
  const updateSettings = useCallback((newSettings: Partial<UseSystemAlertsOptions>): void => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    optionsRef.current = updated;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  }, [settings]);
  
  const resetSettings = useCallback((): void => {
    setSettings(DEFAULT_OPTIONS);
    optionsRef.current = DEFAULT_OPTIONS;
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }, []);
  
  // ============================================
  // ESTATÍSTICAS
  // ============================================
  
  const stats: AlertStats = {
    total: alerts.length,
    byType: alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<AlertType, number>),
    bySeverity: alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<AlertSeverity, number>),
    bySource: alerts.reduce((acc, alert) => {
      acc[alert.source] = (acc[alert.source] || 0) + 1;
      return acc;
    }, {} as Record<AlertSource, number>),
    acknowledged: alerts.filter(a => a.acknowledged).length,
    resolved: alerts.filter(a => a.resolved).length,
    active: alerts.filter(a => !a.resolved).length,
    avgResolutionTime: (() => {
      const resolvedAlerts = alerts.filter(a => a.resolved && a.resolvedAt);
      if (resolvedAlerts.length === 0) return 0;
      
      const totalTime = resolvedAlerts.reduce((sum, alert) => {
        const resolutionTime = alert.resolvedAt!.getTime() - alert.timestamp.getTime();
        return sum + resolutionTime;
      }, 0);
      
      return Math.round(totalTime / resolvedAlerts.length / (1000 * 60)); // em minutos
    })(),
    topCategories: (() => {
      const categories = alerts.reduce((acc, alert) => {
        if (alert.category) {
          acc[alert.category] = (acc[alert.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(categories)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    })(),
    recentTrends: (() => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();
      
      return last7Days.map(date => {
        const count = alerts.filter(alert => 
          alert.timestamp.toISOString().split('T')[0] === date
        ).length;
        
        return { date, count };
      });
    })()
  };
  
  // ============================================
  // RETORNO
  // ============================================
  
  return {
    // Estado
    alerts: sortAlerts(alerts),
    rules,
    channels,
    stats,
    isLoading,
    error,
    
    // Ações de Alertas
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    deleteAlert,
    bulkAcknowledge,
    bulkResolve,
    bulkDelete,
    
    // Ações de Regras
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    testRule,
    
    // Ações de Canais
    createChannel,
    updateChannel,
    deleteChannel,
    testChannel,
    
    // Filtros e Busca
    filterAlerts,
    searchAlerts,
    getAlertsByTimeRange,
    getAlertsByUser,
    
    // Utilitários
    exportAlerts,
    importAlerts,
    clearOldAlerts,
    getAlertHistory,
    
    // Configurações
    updateSettings,
    resetSettings
  };
}

export default useSystemAlerts;
