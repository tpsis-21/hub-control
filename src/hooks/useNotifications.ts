'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

// Tipos para o hook de notificações
interface Notification {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  subject: string;
  content: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  delivered_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject_template: string;
  content_template: string;
  variables: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  by_channel: Record<string, number>;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  trends: {
    sent_change: number;
    delivery_rate_change: number;
  };
}

interface NotificationConfig {
  id: string;
  channel: string;
  config: Record<string, any>;
  enabled: boolean;
  rate_limit?: {
    max_requests: number;
    window_seconds: number;
  };
  retry_policy?: {
    max_retries: number;
    backoff_multiplier: number;
    max_delay_seconds: number;
  };
}

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
}

interface UseNotificationsReturn {
  // Estado
  notifications: Notification[];
  templates: NotificationTemplate[];
  stats: NotificationStats | null;
  configs: NotificationConfig[];
  loading: boolean;
  error: string | null;
  
  // Operações de notificação
  sendNotification: (notification: Partial<Notification>) => Promise<boolean>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  cancelNotification: (notificationId: string) => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  
  // Operações de template
  createTemplate: (template: Partial<NotificationTemplate>) => Promise<boolean>;
  updateTemplate: (templateId: string, updates: Partial<NotificationTemplate>) => Promise<boolean>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
  
  // Operações de configuração
  updateConfig: (configId: string, config: Partial<NotificationConfig>) => Promise<boolean>;
  testChannel: (channel: string, config: Record<string, any>) => Promise<boolean>;
  
  // Utilitários
  refresh: () => Promise<void>;
  exportData: (format: 'json' | 'csv' | 'xlsx', filters?: Record<string, any>) => Promise<void>;
  getNotificationById: (id: string) => Notification | undefined;
  getTemplateById: (id: string) => NotificationTemplate | undefined;
  
  // Filtros e busca
  setFilters: (filters: Record<string, any>) => void;
  setSearchTerm: (term: string) => void;
  filters: Record<string, any>;
  searchTerm: string;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 segundos
    enableRealtime = false
  } = options;

  // Estado
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { toast } = useToast();

  // Função para fazer requisições com tratamento de erro
  const apiRequest = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<any> => {
    try {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null; // Requisição cancelada
      }
      throw error;
    }
  }, []);

  // Carregar notificações
  const loadNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      
      // Aplicar busca
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const data = await apiRequest(`/api/notifications?${params.toString()}`);
      if (data) {
        setNotifications(data.notifications || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
      setError(error.message);
    }
  }, [apiRequest, filters, searchTerm]);

  // Carregar templates
  const loadTemplates = useCallback(async () => {
    try {
      const data = await apiRequest('/api/notifications/templates');
      if (data) {
        setTemplates(data.templates || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar templates:', error);
    }
  }, [apiRequest]);

  // Carregar estatísticas
  const loadStats = useCallback(async () => {
    try {
      const data = await apiRequest('/api/notifications/stats');
      if (data) {
        setStats(data);
      }
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }, [apiRequest]);

  // Carregar configurações
  const loadConfigs = useCallback(async () => {
    try {
      const data = await apiRequest('/api/notifications/config');
      if (data) {
        setConfigs(data.configs || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, [apiRequest]);

  // Refresh geral
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadNotifications(),
        loadTemplates(),
        loadStats(),
        loadConfigs()
      ]);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [loadNotifications, loadTemplates, loadStats, loadConfigs]);

  // Enviar notificação
  const sendNotification = useCallback(async (notification: Partial<Notification>): Promise<boolean> => {
    try {
      await apiRequest('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notification)
      });
      
      toast({
        title: 'Sucesso',
        description: 'Notificação enviada com sucesso'
      });
      
      // Recarregar dados
      await loadNotifications();
      await loadStats();
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast, loadNotifications, loadStats]);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      await apiRequest('/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          notification_id: notificationId,
          action: 'mark_read'
        })
      });
      
      // Atualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'delivered' as const }
            : n
        )
      );
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast]);

  // Cancelar notificação
  const cancelNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      await apiRequest('/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          notification_id: notificationId,
          action: 'cancel'
        })
      });
      
      // Atualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'failed' as const }
            : n
        )
      );
      
      toast({
        title: 'Sucesso',
        description: 'Notificação cancelada'
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast]);

  // Deletar notificação
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      await apiRequest('/api/notifications', {
        method: 'DELETE',
        body: JSON.stringify({ notification_id: notificationId })
      });
      
      // Remover do estado local
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: 'Sucesso',
        description: 'Notificação deletada'
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast]);

  // Criar template
  const createTemplate = useCallback(async (template: Partial<NotificationTemplate>): Promise<boolean> => {
    try {
      const data = await apiRequest('/api/notifications/templates', {
        method: 'POST',
        body: JSON.stringify(template)
      });
      
      // Adicionar ao estado local
      setTemplates(prev => [...prev, data.template]);
      
      toast({
        title: 'Sucesso',
        description: 'Template criado com sucesso'
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast]);

  // Atualizar template
  const updateTemplate = useCallback(async (
    templateId: string, 
    updates: Partial<NotificationTemplate>
  ): Promise<boolean> => {
    try {
      const data = await apiRequest('/api/notifications/templates', {
        method: 'PUT',
        body: JSON.stringify({
          template_id: templateId,
          ...updates
        })
      });
      
      // Atualizar estado local
      setTemplates(prev => 
        prev.map(t => 
          t.id === templateId 
            ? { ...t, ...data.template }
            : t
        )
      );
      
      toast({
        title: 'Sucesso',
        description: 'Template atualizado'
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast]);

  // Deletar template
  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      await apiRequest('/api/notifications/templates', {
        method: 'DELETE',
        body: JSON.stringify({ template_id: templateId })
      });
      
      // Remover do estado local
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      toast({
        title: 'Sucesso',
        description: 'Template deletado'
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast]);

  // Atualizar configuração
  const updateConfig = useCallback(async (
    configId: string, 
    config: Partial<NotificationConfig>
  ): Promise<boolean> => {
    try {
      const data = await apiRequest('/api/notifications/config', {
        method: 'PUT',
        body: JSON.stringify({
          config_id: configId,
          ...config
        })
      });
      
      // Atualizar estado local
      setConfigs(prev => 
        prev.map(c => 
          c.id === configId 
            ? { ...c, ...data.config }
            : c
        )
      );
      
      toast({
        title: 'Sucesso',
        description: 'Configuração atualizada'
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast]);

  // Testar canal
  const testChannel = useCallback(async (
    channel: string, 
    config: Record<string, any>
  ): Promise<boolean> => {
    try {
      await apiRequest('/api/notifications/config/test', {
        method: 'POST',
        body: JSON.stringify({ channel, config })
      });
      
      toast({
        title: 'Sucesso',
        description: 'Teste do canal realizado com sucesso'
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro no teste',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [apiRequest, toast]);

  // Exportar dados
  const exportData = useCallback(async (
    format: 'json' | 'csv' | 'xlsx', 
    filters: Record<string, any> = {}
  ): Promise<void> => {
    try {
      const params = new URLSearchParams({ format, ...filters });
      const response = await fetch(`/api/notifications/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao exportar dados');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notifications_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Sucesso',
        description: 'Dados exportados com sucesso'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Utilitários
  const getNotificationById = useCallback((id: string): Notification | undefined => {
    return notifications.find(n => n.id === id);
  }, [notifications]);

  const getTemplateById = useCallback((id: string): NotificationTemplate | undefined => {
    return templates.find(t => t.id === id);
  }, [templates]);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Efeito para recarregar quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      loadNotifications();
    }
  }, [filters, searchTerm, loading, loadNotifications]);

  // Efeito para auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refresh();
      }, refreshInterval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refresh]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Estado
    notifications,
    templates,
    stats,
    configs,
    loading,
    error,
    filters,
    searchTerm,
    
    // Operações de notificação
    sendNotification,
    markAsRead,
    cancelNotification,
    deleteNotification,
    
    // Operações de template
    createTemplate,
    updateTemplate,
    deleteTemplate,
    
    // Operações de configuração
    updateConfig,
    testChannel,
    
    // Utilitários
    refresh,
    exportData,
    getNotificationById,
    getTemplateById,
    setFilters,
    setSearchTerm
  };
}
