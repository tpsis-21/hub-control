/**
 * Hook para Gerenciamento de Logs de Auditoria
 * 
 * Gerencia logs de acesso a dados sensíveis, incluindo:
 * - Registro de acessos
 * - Filtros e busca
 * - Exportação de logs
 * - Alertas de segurança
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  resourceType: string;
  fieldName?: string;
  dataType?: string;
  maskingLevel?: string;
  wasRevealed: boolean;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  context?: Record<string, any>;
  riskLevel: RiskLevel;
  metadata?: Record<string, any>;
}

export type AuditAction = 
  | 'view_data'
  | 'reveal_data'
  | 'copy_data'
  | 'export_data'
  | 'search_data'
  | 'filter_data'
  | 'change_masking_level'
  | 'access_denied'
  | 'suspicious_activity';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogFilters {
  userId?: string;
  userRole?: string;
  action?: AuditAction;
  resource?: string;
  resourceType?: string;
  riskLevel?: RiskLevel;
  dateFrom?: Date;
  dateTo?: Date;
  wasRevealed?: boolean;
  searchTerm?: string;
}

export interface AuditLogStats {
  totalLogs: number;
  uniqueUsers: number;
  riskDistribution: Record<RiskLevel, number>;
  actionDistribution: Record<AuditAction, number>;
  recentActivity: AuditLogEntry[];
  suspiciousActivity: AuditLogEntry[];
  topAccessedResources: Array<{ resource: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
}

export interface UseAuditLogsOptions {
  enableRealTimeUpdates?: boolean;
  maxLogsInMemory?: number;
  autoDetectSuspiciousActivity?: boolean;
  alertThresholds?: {
    maxAccessesPerMinute?: number;
    maxRevealsPerHour?: number;
    maxFailedAttemptsPerHour?: number;
  };
}

export interface UseAuditLogsReturn {
  // Dados
  logs: AuditLogEntry[];
  filteredLogs: AuditLogEntry[];
  stats: AuditLogStats;
  
  // Estado
  isLoading: boolean;
  error: string | null;
  
  // Filtros
  filters: AuditLogFilters;
  setFilters: (filters: Partial<AuditLogFilters>) => void;
  clearFilters: () => void;
  
  // Ações
  logAccess: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'riskLevel'>) => Promise<void>;
  exportLogs: (format: 'json' | 'csv' | 'xlsx') => Promise<void>;
  deleteLogs: (logIds: string[]) => Promise<void>;
  
  // Busca e paginação
  searchLogs: (term: string) => void;
  loadMoreLogs: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  
  // Alertas
  suspiciousActivities: AuditLogEntry[];
  clearSuspiciousActivity: (logId: string) => void;
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_OPTIONS: Required<UseAuditLogsOptions> = {
  enableRealTimeUpdates: true,
  maxLogsInMemory: 1000,
  autoDetectSuspiciousActivity: true,
  alertThresholds: {
    maxAccessesPerMinute: 50,
    maxRevealsPerHour: 100,
    maxFailedAttemptsPerHour: 10
  }
};

const RISK_LEVEL_WEIGHTS: Record<AuditAction, RiskLevel> = {
  view_data: 'low',
  reveal_data: 'medium',
  copy_data: 'medium',
  export_data: 'high',
  search_data: 'low',
  filter_data: 'low',
  change_masking_level: 'medium',
  access_denied: 'medium',
  suspicious_activity: 'critical'
};

const SUSPICIOUS_PATTERNS = {
  RAPID_ACCESS: 'rapid_access',
  MULTIPLE_REVEALS: 'multiple_reveals',
  UNUSUAL_HOURS: 'unusual_hours',
  FAILED_ATTEMPTS: 'failed_attempts',
  BULK_EXPORT: 'bulk_export',
  PRIVILEGE_ESCALATION: 'privilege_escalation'
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useAuditLogs(options: UseAuditLogsOptions = {}): UseAuditLogsReturn {
  const { toast } = useToast();
  const config = { ...DEFAULT_OPTIONS, ...options };

  // ============================================
  // ESTADO
  // ============================================

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFiltersState] = useState<AuditLogFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suspiciousActivities, setSuspiciousActivities] = useState<AuditLogEntry[]>([]);

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    loadInitialLogs();
  }, []);

  useEffect(() => {
    if (config.enableRealTimeUpdates) {
      const interval = setInterval(() => {
        checkForNewLogs();
      }, 30000); // Verificar a cada 30 segundos

      return () => clearInterval(interval);
    }
  }, [config.enableRealTimeUpdates]);

  useEffect(() => {
    if (config.autoDetectSuspiciousActivity) {
      detectSuspiciousActivity();
    }
  }, [logs, config.autoDetectSuspiciousActivity]);

  // ============================================
  // COMPUTAÇÕES DERIVADAS
  // ============================================

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtro por usuário
      if (filters.userId && log.userId !== filters.userId) return false;
      
      // Filtro por papel
      if (filters.userRole && log.userRole !== filters.userRole) return false;
      
      // Filtro por ação
      if (filters.action && log.action !== filters.action) return false;
      
      // Filtro por recurso
      if (filters.resource && !log.resource.toLowerCase().includes(filters.resource.toLowerCase())) return false;
      
      // Filtro por tipo de recurso
      if (filters.resourceType && log.resourceType !== filters.resourceType) return false;
      
      // Filtro por nível de risco
      if (filters.riskLevel && log.riskLevel !== filters.riskLevel) return false;
      
      // Filtro por data
      if (filters.dateFrom && log.timestamp < filters.dateFrom) return false;
      if (filters.dateTo && log.timestamp > filters.dateTo) return false;
      
      // Filtro por revelação
      if (filters.wasRevealed !== undefined && log.wasRevealed !== filters.wasRevealed) return false;
      
      // Filtro por termo de busca
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const searchableText = [
          log.userId,
          log.action,
          log.resource,
          log.fieldName,
          log.dataType,
          JSON.stringify(log.context || {})
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      return true;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [logs, filters]);

  const stats = useMemo((): AuditLogStats => {
    const totalLogs = logs.length;
    const uniqueUsers = new Set(logs.map(log => log.userId)).size;
    
    // Distribuição de risco
    const riskDistribution: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    // Distribuição de ações
    const actionDistribution: Record<AuditAction, number> = {
      view_data: 0,
      reveal_data: 0,
      copy_data: 0,
      export_data: 0,
      search_data: 0,
      filter_data: 0,
      change_masking_level: 0,
      access_denied: 0,
      suspicious_activity: 0
    };
    
    // Contadores de recursos e usuários
    const resourceCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    
    logs.forEach(log => {
      riskDistribution[log.riskLevel]++;
      actionDistribution[log.action]++;
      
      resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1;
      userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
    });
    
    // Atividade recente (últimas 24 horas)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = logs
      .filter(log => log.timestamp > yesterday)
      .slice(0, 10);
    
    // Top recursos e usuários
    const topAccessedResources = Object.entries(resourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));
    
    const topUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));
    
    return {
      totalLogs,
      uniqueUsers,
      riskDistribution,
      actionDistribution,
      recentActivity,
      suspiciousActivity: suspiciousActivities,
      topAccessedResources,
      topUsers
    };
  }, [logs, suspiciousActivities]);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const loadInitialLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simular carregamento de logs do backend
      // Em uma implementação real, isso seria uma chamada para API
      const storedLogs = localStorage.getItem('audit_logs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        setLogs(parsedLogs);
      }
    } catch (err) {
      setError('Erro ao carregar logs de auditoria');
      console.error('Erro ao carregar logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForNewLogs = async () => {
    try {
      // Verificar novos logs no backend
      // Implementação real faria polling ou usaria WebSockets
      console.log('Verificando novos logs...');
    } catch (err) {
      console.error('Erro ao verificar novos logs:', err);
    }
  };

  const calculateRiskLevel = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'riskLevel'>): RiskLevel => {
    let baseRisk = RISK_LEVEL_WEIGHTS[entry.action] || 'low';
    
    // Aumentar risco baseado em contexto
    if (entry.wasRevealed && entry.action === 'reveal_data') {
      baseRisk = baseRisk === 'low' ? 'medium' : baseRisk === 'medium' ? 'high' : baseRisk;
    }
    
    // Verificar padrões suspeitos
    const recentLogs = logs.filter(log => 
      log.userId === entry.userId && 
      Date.now() - log.timestamp.getTime() < 60 * 60 * 1000 // Última hora
    );
    
    if (recentLogs.length > config.alertThresholds.maxAccessesPerMinute) {
      baseRisk = 'critical';
    }
    
    return baseRisk;
  };

  const detectSuspiciousActivity = () => {
    const suspicious: AuditLogEntry[] = [];
    const now = Date.now();
    
    // Agrupar logs por usuário
    const userLogs = logs.reduce((acc, log) => {
      if (!acc[log.userId]) acc[log.userId] = [];
      acc[log.userId].push(log);
      return acc;
    }, {} as Record<string, AuditLogEntry[]>);
    
    Object.entries(userLogs).forEach(([userId, userLogEntries]) => {
      // Verificar acesso rápido (muitos acessos em pouco tempo)
      const recentLogs = userLogEntries.filter(log => 
        now - log.timestamp.getTime() < 60 * 1000 // Último minuto
      );
      
      if (recentLogs.length > config.alertThresholds.maxAccessesPerMinute) {
        suspicious.push(...recentLogs.map(log => ({
          ...log,
          riskLevel: 'critical' as RiskLevel,
          metadata: {
            ...log.metadata,
            suspiciousPattern: SUSPICIOUS_PATTERNS.RAPID_ACCESS,
            detectedAt: new Date()
          }
        })));
      }
      
      // Verificar múltiplas revelações
      const recentReveals = userLogEntries.filter(log => 
        log.action === 'reveal_data' && 
        now - log.timestamp.getTime() < 60 * 60 * 1000 // Última hora
      );
      
      if (recentReveals.length > config.alertThresholds.maxRevealsPerHour) {
        suspicious.push(...recentReveals.map(log => ({
          ...log,
          riskLevel: 'high' as RiskLevel,
          metadata: {
            ...log.metadata,
            suspiciousPattern: SUSPICIOUS_PATTERNS.MULTIPLE_REVEALS,
            detectedAt: new Date()
          }
        })));
      }
      
      // Verificar tentativas de acesso negadas
      const failedAttempts = userLogEntries.filter(log => 
        log.action === 'access_denied' && 
        now - log.timestamp.getTime() < 60 * 60 * 1000 // Última hora
      );
      
      if (failedAttempts.length > config.alertThresholds.maxFailedAttemptsPerHour) {
        suspicious.push(...failedAttempts.map(log => ({
          ...log,
          riskLevel: 'high' as RiskLevel,
          metadata: {
            ...log.metadata,
            suspiciousPattern: SUSPICIOUS_PATTERNS.FAILED_ATTEMPTS,
            detectedAt: new Date()
          }
        })));
      }
    });
    
    setSuspiciousActivities(suspicious);
    
    // Notificar sobre atividades suspeitas
    if (suspicious.length > 0) {
      toast({
        title: 'Atividade Suspeita Detectada',
        description: `${suspicious.length} atividade(s) suspeita(s) detectada(s).`,
        variant: 'destructive'
      });
    }
  };

  const persistLogs = (newLogs: AuditLogEntry[]) => {
    try {
      // Manter apenas os logs mais recentes na memória
      const logsToKeep = newLogs.slice(0, config.maxLogsInMemory);
      localStorage.setItem('audit_logs', JSON.stringify(logsToKeep));
    } catch (err) {
      console.error('Erro ao persistir logs:', err);
    }
  };

  // ============================================
  // FUNÇÕES PÚBLICAS
  // ============================================

  const logAccess = useCallback(async (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'riskLevel'>) => {
    try {
      const newEntry: AuditLogEntry = {
        ...entry,
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        riskLevel: calculateRiskLevel(entry)
      };
      
      const updatedLogs = [newEntry, ...logs];
      setLogs(updatedLogs);
      persistLogs(updatedLogs);
      
      // Em uma implementação real, enviaria para o backend
      console.log('Log de auditoria registrado:', newEntry);
      
    } catch (err) {
      console.error('Erro ao registrar log:', err);
      setError('Erro ao registrar log de auditoria');
    }
  }, [logs, config]);

  const setFilters = useCallback((newFilters: Partial<AuditLogFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const searchLogs = useCallback((term: string) => {
    setFilters({ searchTerm: term });
  }, [setFilters]);

  const exportLogs = useCallback(async (format: 'json' | 'csv' | 'xlsx') => {
    try {
      const dataToExport = filteredLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }));
      
      let content: string;
      let mimeType: string;
      let filename: string;
      
      switch (format) {
        case 'json':
          content = JSON.stringify(dataToExport, null, 2);
          mimeType = 'application/json';
          filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
          break;
          
        case 'csv':
          const headers = Object.keys(dataToExport[0] || {}).join(',');
          const rows = dataToExport.map(log => 
            Object.values(log).map(value => 
              typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
            ).join(',')
          );
          content = [headers, ...rows].join('\n');
          mimeType = 'text/csv';
          filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
          break;
          
        default:
          throw new Error(`Formato não suportado: ${format}`);
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Logs Exportados',
        description: `${filteredLogs.length} logs exportados em formato ${format.toUpperCase()}.`
      });
      
    } catch (err) {
      console.error('Erro ao exportar logs:', err);
      setError('Erro ao exportar logs');
      toast({
        title: 'Erro na Exportação',
        description: 'Não foi possível exportar os logs.',
        variant: 'destructive'
      });
    }
  }, [filteredLogs, toast]);

  const deleteLogs = useCallback(async (logIds: string[]) => {
    try {
      const updatedLogs = logs.filter(log => !logIds.includes(log.id));
      setLogs(updatedLogs);
      persistLogs(updatedLogs);
      
      toast({
        title: 'Logs Removidos',
        description: `${logIds.length} log(s) removido(s) com sucesso.`
      });
      
    } catch (err) {
      console.error('Erro ao deletar logs:', err);
      setError('Erro ao deletar logs');
    }
  }, [logs, toast]);

  const loadMoreLogs = useCallback(async () => {
    // Implementar paginação
    console.log('Carregando mais logs...');
  }, []);

  const refreshLogs = useCallback(async () => {
    await loadInitialLogs();
  }, []);

  const clearSuspiciousActivity = useCallback((logId: string) => {
    setSuspiciousActivities(prev => prev.filter(log => log.id !== logId));
  }, []);

  // ============================================
  // RETORNO
  // ============================================

  return {
    // Dados
    logs,
    filteredLogs,
    stats,
    
    // Estado
    isLoading,
    error,
    
    // Filtros
    filters,
    setFilters,
    clearFilters,
    
    // Ações
    logAccess,
    exportLogs,
    deleteLogs,
    
    // Busca e paginação
    searchLogs,
    loadMoreLogs,
    refreshLogs,
    
    // Alertas
    suspiciousActivities,
    clearSuspiciousActivity
  };
}

export default useAuditLogs;