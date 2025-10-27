// 🔔 Sistema de Notificações em Tempo Real
// Sistema avançado de notificações com múltiplos canais, priorização e personalização

// Removido: import de hooks do React para evitar uso em módulo do servidor
// import { useState, useEffect } from 'react';
import { createServerSupabaseClient } from "./supabase/clients/server";
import { performanceMonitoringSystem } from '@/lib/performance';
import { MetricType } from '@/lib/performance/types';
import { auditComplianceSystem, AuditEventType } from './audit-compliance-system';
import { realtimeSecurityMonitor } from './security';
import { SecurityEventType, SecuritySeverity } from './security-monitoring';
import { intelligentCacheSystem } from './intelligent-cache-system';
import { rateLimitCustom } from './security/rate-limit';
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus,
  Notification,
  NotificationTemplate,
  UserNotificationPreferences,
  NotificationSystemConfig,
  NotificationStats,
  NotificationRecipient
} from '@/types/notifications';
import { getEnabledChannels, getChannelConfig, toRealtimeChannelConfig } from './notifications/channel-configs';
import { logger } from '@/utils/production-logger'

// Estratégias de entrega
export enum DeliveryStrategy {
  IMMEDIATE = 'immediate',
  BATCHED = 'batched',
  SCHEDULED = 'scheduled',
  SMART = 'smart', // Baseado em padrões do usuário
  ESCALATION = 'escalation' // Escalação automática
}



// Interface para configuração de canal (específica do realtime system)
export interface NotificationChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
  template?: string;
  fallback?: NotificationChannel;
  conditions?: {
    userPreferences?: boolean;
    timeWindow?: {
      start: string; // HH:mm
      end: string; // HH:mm
      timezone?: string;
    };
    frequency?: {
      maxPerHour?: number;
      maxPerDay?: number;
      cooldown?: number; // ms
    };
    deviceType?: string[];
    location?: string[];
  };
}



// Configuração padrão
const DEFAULT_CONFIG: NotificationSystemConfig = {
  enabled: true,
  default_channel: 'email' as NotificationChannel,
  rate_limit_enabled: true,
  global_rate_limit: {
    max_requests: 1000,
    window_seconds: 3600,
    burst_limit: 100
  },
  default_retry_policy: {
    max_retries: 3,
    backoff_multiplier: 2,
    initial_delay_seconds: 1,
    max_delay_seconds: 300,
    retry_on_status_codes: [500, 502, 503, 504, 408, 429]
  },
  queue_size: 10000,
  workers: 5,
  queue_interval_seconds: 5,
  cache_enabled: true,
  cache_ttl_seconds: 300,
  log_level: 'info',
  log_delivery: true,
  log_errors: true,
  log_performance: true,
  auto_cleanup: true,
  cleanup_interval_hours: 24,
  retention_days: 90,
  log_retention_days: 30,
  stats_retention_days: 365,
  webhook_timeout_seconds: 30,
  webhook_signature_verification: true,
  content_sanitization: true,
  max_content_length: 10000,
  max_recipients: 100,
  test_mode: false
};

// Configuração específica de canais para o sistema realtime
// const CHANNEL_CONFIGS = { ... } // Removido em favor do módulo unificado

// Classe principal do sistema de notificações
export class RealtimeNotificationSystem {
  private config: NotificationSystemConfig;
  private queues: Map<NotificationPriority, Notification[]> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private userPreferences: Map<string, UserNotificationPreferences> = new Map();
  private statistics: NotificationStats;
  private providers: Map<NotificationChannel, NotificationProvider> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<NotificationSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statistics = this.initializeStatistics();
    this.initializeQueues();
    this.initializeProviders();
    this.startProcessing();
    this.startMonitoring();
    this.startCleanup();
  }
  
  // Inicializar estatísticas
  private initializeStatistics(): NotificationStats {
    const types: Record<string, any> = {};
    const channels: Record<string, any> = {};
    const priorities: Record<string, any> = {};
    
    return {
      total_sent: 0,
      total_delivered: 0,
      total_failed: 0,
      total_pending: 0,
      delivery_rate: 0,
      average_processing_time_ms: 0,
      stats_by_channel: channels,
      stats_by_type: types,
      stats_by_priority: priorities,
      period_start: new Date(),
      period_end: new Date()
    };
  }
  
  // Inicializar filas
  private initializeQueues(): void {
    const priorities: NotificationPriority[] = ['low', 'medium', 'normal', 'high', 'urgent'];
    for (const priority of priorities) {
      this.queues.set(priority, []);
    }
  }
  
  // Inicializar provedores
  private initializeProviders(): void {
    // Substitui iteração sobre CHANNEL_CONFIGS por canais habilitados do módulo unificado
    const enabledChannels = getEnabledChannels();
    for (const entry of enabledChannels) {
      if (entry.enabled) {
        const rtConfig = toRealtimeChannelConfig(entry);
        const provider = this.createProvider(entry.channel as NotificationChannel, rtConfig);
        this.providers.set(entry.channel as NotificationChannel, provider);
      }
    }
  }
  
  // Criar provedor
  private createProvider(
    channel: NotificationChannel,
    config: any
  ): NotificationProvider {
    switch (channel) {
      case 'email':
        return new EmailProvider(config);
      case 'webhook':
        return new WebhookProvider(config);
      case 'in_app':
        return new InAppProvider(config);
      default:
        throw new Error(`Provedor não suportado para canal: ${channel}`);
    }
  }
  

  
  // Enviar notificação
  async send(
    type: NotificationType,
    title: string,
    message: string,
    options: {
      userId?: string;
      groupId?: string;
      priority?: NotificationPriority;
      channels?: NotificationChannelConfig[];
      data?: Record<string, any>;
      template?: string;
      variables?: Record<string, any>;
      tags?: string[];
      expiresAt?: Date;
      sendAt?: Date;
      correlationId?: string;
      parentId?: string;
      threadId?: string;
    } = {}
  ): Promise<string> {
    try {
      const notification = await this.createNotification(
        type,
        title,
        message,
        options
      );
      
      // Aplicar personalização
      await this.personalizeNotification(notification);
      
      // Validar e filtrar canais
      await this.validateAndFilterChannels(notification);
      
      // Adicionar à fila apropriada
      this.enqueue(notification);
      
      // Registrar evento de auditoria
      await auditComplianceSystem.recordAuditEvent(
        AuditEventType.NOTIFICATION_SENT,
        notification.metadata?.userId,
        undefined,
        'localhost',
        'notification-system',
        'notification',
        'send',
        {
          notificationId: notification.id,
          type: notification.type,
          priority: notification.priority,
          channel: notification.channel,
          content: notification.content
        },
        'success',
        SecuritySeverity.LOW
      );
      
      return notification.id;
      
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      throw error;
    }
  }
  
  // Criar notificação
  private async createNotification(
    type: NotificationType,
    title: string,
    message: string,
    options: any
  ): Promise<Notification> {
    const now = new Date();
    const id = this.generateId();
    
    return {
      id,
      type,
      channel: options.channel || 'email',
      recipients: options.recipients || [],
      subject: options.subject || `Notificação ${type}`,
      content: message,
      priority: options.priority || 'normal',
      status: 'pending' as NotificationStatus,
      metadata: {
        createdAt: now,
        updatedAt: now,
        expiresAt: options.expiresAt,
        sendAt: options.sendAt || now,
        userId: options.userId,
        groupId: options.groupId,
        source: 'application',
        category: type,
        tags: options.tags || [],
        correlationId: options.correlationId,
        parentId: options.parentId,
        threadId: options.threadId
      },
      scheduled_for: options.sendAt,
      expires_at: options.expiresAt,
      template_id: options.templateId,
      template_variables: options.templateVariables,
      created_at: now,
      updated_at: now,
      retry_count: 0,
      user_id: options.userId
    };
  }
  
  // Obter canais padrão
  private async getDefaultChannels(
    type: NotificationType,
    userId?: string
  ): Promise<NotificationChannelConfig[]> {
    const defaultChannels: NotificationChannelConfig[] = [];
    
    // Canais baseados no tipo de notificação
    switch (type) {
      case 'security':
      case 'security_alert':
        defaultChannels.push(
          {
            channel: 'email',
            enabled: true,
            priority: 1,
            config: {}
          },

          {
            channel: 'push',
            enabled: true,
            priority: 3,
            config: {}
          }
        );
        break;
      
      case 'error_report':
      case 'system':
        defaultChannels.push(
          {
            channel: 'email',
            enabled: true,
            priority: 1,
            config: {}
          },
          {
            channel: 'in_app',
            enabled: true,
            priority: 2,
            config: {}
          }
        );
        break;
      
      default:
        defaultChannels.push(
          {
            channel: 'in_app',
            enabled: true,
            priority: 1,
            config: {}
          },
          {
            channel: 'push',
            enabled: true,
            priority: 2,
            config: {}
          }
        );
    }
    
    // Aplicar preferências do usuário se disponível
    if (userId) {
      const preferences = await this.getUserPreferences(userId);
      if (preferences) {
        return this.applyUserPreferences(defaultChannels, preferences, type);
      }
    }
    
    return defaultChannels;
  }
  
  // Personalizar notificação
  private async personalizeNotification(notification: Notification): Promise<void> {
    // Aplicar template se especificado
    if (notification.template_id) {
      const template = await this.getTemplate(notification.template_id);
      if (template) {
        await this.applyTemplate(notification, template);
      }
    }
    
    // Aplicar localização
    await this.applyLocalization(notification);
    
    // Aplicar variáveis
    if (notification.template_variables) {
      await this.applyVariables(notification);
    }
  }
  
  // Validar e filtrar canais
  private async validateAndFilterChannels(notification: Notification): Promise<void> {
    // Usa config unificada por canal
    const unified = getChannelConfig(notification.channel as NotificationChannel);
    if (!unified || !unified.enabled) {
      // Se o canal estiver desabilitado nas configs, marca como falha e evita envio
      notification.status = 'failed';
      (notification as any).error_message = `Canal ${notification.channel} desabilitado pela configuração.`;
      return;
    }
  }
  
  // Verificar condições do canal
  private async checkChannelConditions(
    channelConfig: NotificationChannelConfig,
    notification: Notification
  ): Promise<boolean> {
    if (!channelConfig.conditions) return true;
    
    // Verificar janela de tempo
    if (channelConfig.conditions.timeWindow) {
      const now = new Date();
      const timeWindow = channelConfig.conditions.timeWindow;
      const timezone = timeWindow.timezone || 'UTC';
      
      // Implementar verificação de janela de tempo
      if (!this.isWithinTimeWindow(now, timeWindow, timezone)) {
        return false;
      }
    }
    
    // Verificar frequência
    if (channelConfig.conditions.frequency && notification.metadata?.userId) {
      const frequency = channelConfig.conditions.frequency;
      const userId = notification.metadata.userId;
      
      if (!await this.checkFrequencyLimits(userId, channelConfig.channel, frequency)) {
        return false;
      }
    }
    
    return true;
  }
  
  // Verificar se está dentro da janela de tempo
  private isWithinTimeWindow(
    now: Date,
    timeWindow: { start: string; end: string },
    timezone: string
  ): boolean {
    // Implementação placeholder - integrar com biblioteca de timezone
    const hour = now.getHours();
    const startHour = parseInt(timeWindow.start.split(':')[0]);
    const endHour = parseInt(timeWindow.end.split(':')[0]);
    
    return hour >= startHour && hour <= endHour;
  }
  
  // Verificar limites de frequência
  private async checkFrequencyLimits(
    userId: string,
    channel: string,
    frequency: any
  ): Promise<boolean> {
    // Implementação placeholder - verificar histórico de notificações
    return true;
  }
  
  // Adicionar à fila
  private enqueue(notification: Notification): void {
    const queue = this.queues.get(notification.priority);
    if (queue) {
      queue.push(notification);
      this.statistics.total_pending++;
      this.statistics.stats_by_channel[notification.channel] = this.statistics.stats_by_channel[notification.channel] || { sent: 0, delivered: 0, failed: 0 };
      // Incrementar contador de pendentes no total apenas
    }
  }
  
  // Iniciar processamento
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueues();
    }, 1000); // 1 segundo de intervalo padrão
  }
  
  // Processar filas
  private async processQueues(): Promise<void> {
    try {
      // Processar filas por prioridade (maior prioridade primeiro)
      const priorities = Array.from(this.queues.keys()).map(Number).sort((a, b) => b - a);
      
      for (const priority of priorities) {
        const queue = this.queues.get(priority as any)!;
        if (queue.length === 0) continue;
        
        // Processar lote
        const batch = queue.splice(0, 10); // Tamanho de lote padrão
        await this.processBatch(batch);
      }
      
    } catch (error) {
      console.error('Erro ao processar filas de notificação:', error);
    }
  }
  
  // Processar lote
  private async processBatch(notifications: Notification[]): Promise<void> {
    const promises = notifications.map(notification => 
      this.processNotification(notification)
    );
    
    await Promise.allSettled(promises);
  }
  
  // Processar notificação individual
  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Verificar se deve ser enviada agora
      if (notification.scheduled_for && notification.scheduled_for > new Date()) {
        // Reagendar
        this.enqueue(notification);
        return;
      }
      
      // Verificar expiração
      if (notification.expires_at && notification.expires_at < new Date()) {
        notification.status = 'expired';
        await this.updateNotificationStatus(notification);
        return;
      }
      
      // Enviar pelos canais
      await this.sendThroughChannels(notification);
      
    } catch (error) {
      console.error(`Erro ao processar notificação ${notification.id}:`, error);
      notification.status = 'failed';
      notification.failed_at = new Date();
      notification.error_message = error instanceof Error ? error.message : String(error);
      await this.updateNotificationStatus(notification);
    }
  }
  
  // Enviar através dos canais
  private async sendThroughChannels(notification: Notification): Promise<void> {
    const results: Array<{ channel: string; success: boolean; error?: string }> = [];
    
    // Processar canal único
    const channelConfig = { channel: notification.channel, enabled: true, priority: 1, config: {} };
    
    try {
      // Aplicar rate limiting centralizado usando identificador do canal
      const channelId = `${notification.channel}-${notification.metadata?.userId || 'anonymous'}`;
      const unifiedChannelCfg = getChannelConfig(notification.channel as NotificationChannel);
      const rt = unifiedChannelCfg ? toRealtimeChannelConfig(unifiedChannelCfg) : undefined;
      const rateLimitConfig = rt?.rateLimit;
      
      if (rateLimitConfig) {
        // Rate limit por segundo
        const rateLimitResult = await rateLimitCustom(
          {} as any, // Request dummy - usando identifier customizado
          {
            windowMs: 1000, // 1 segundo
            max: rateLimitConfig.maxPerSecond || 10,
            namespace: `notification:${notification.channel}:second`,
            identifier: channelId
          }
        );
        
        if (!rateLimitResult.success) {
          // Rate limit excedido - reagendar notificação
          const retryDelay = Math.pow(2, notification.retry_count || 0) * 1000;
          notification.scheduled_for = new Date(Date.now() + retryDelay);
          this.enqueue(notification);
          return;
        }
        
        // Rate limit por minuto
        const minuteRateLimitResult = await rateLimitCustom(
          {} as any,
          {
            windowMs: 60 * 1000, // 1 minuto
            max: rateLimitConfig.maxPerMinute || 100,
            namespace: `notification:${notification.channel}:minute`,
            identifier: channelId
          }
        );
        
        if (!minuteRateLimitResult.success) {
          const retryDelay = Math.pow(2, notification.retry_count || 0) * 1000;
          notification.scheduled_for = new Date(Date.now() + retryDelay);
          this.enqueue(notification);
          return;
        }

        // Rate limit por hora
        const hourRateLimitResult = await rateLimitCustom(
          {} as any,
          {
            windowMs: 60 * 60 * 1000, // 1 hora
            max: rateLimitConfig.maxPerHour || 1000,
            namespace: `notification:${notification.channel}:hour`,
            identifier: channelId
          }
        );
        
        if (!hourRateLimitResult.success) {
          const retryDelay = Math.pow(2, notification.retry_count || 0) * 1000;
          notification.scheduled_for = new Date(Date.now() + retryDelay);
          this.enqueue(notification);
          return;
        }
      }
      
      // Obter provedor
      const provider = this.providers.get(channelConfig.channel);
      if (!provider) {
        results.push({
          channel: channelConfig.channel,
          success: false,
          error: 'Provedor não encontrado'
        });
        return;
      }
      
      // Enviar
      const startTime = Date.now();
      const success = await provider.send(notification, channelConfig);
      const deliveryTime = Date.now() - startTime;
      
      // Atualizar estatísticas
      this.updateChannelStatistics(channelConfig.channel, success, deliveryTime);
      
      results.push({
        channel: channelConfig.channel,
        success
      });
      
      if (success) {
        // Marcar como enviado
        if (!notification.sent_at) {
          notification.sent_at = new Date();
          notification.status = 'sent';
        }
      }
      
    } catch (error) {
      results.push({
        channel: channelConfig.channel,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Verificar se pelo menos um canal teve sucesso
    const hasSuccess = results.some(r => r.success);
    
    if (hasSuccess) {
      notification.status = 'sent';
      this.statistics.total_sent++;
      this.statistics.stats_by_type[notification.type] = this.statistics.stats_by_type[notification.type] || { sent: 0, delivered: 0, failed: 0 };
      // Incrementar contador de enviados
    } else {
      // Tentar novamente se não excedeu o limite
      const currentRetries = notification.retry_count || 0;
      notification.retry_count = currentRetries + 1;
      
      if (notification.retry_count < 3) { // Máximo 3 tentativas
        const retryDelay = Math.pow(2, notification.retry_count) * 1000;
        notification.scheduled_for = new Date(Date.now() + retryDelay);
        this.enqueue(notification);
      } else {
        notification.status = 'failed';
        notification.failed_at = new Date();
        notification.error_message = 'Máximo de tentativas excedido';
        this.statistics.total_failed++;
        this.statistics.stats_by_type[notification.type] = this.statistics.stats_by_type[notification.type] || { 
          type: notification.type,
          total_sent: 0, 
          total_delivered: 0, 
          total_failed: 0, 
          delivery_rate: 0 
        };
        this.statistics.stats_by_type[notification.type].total_failed++;
      }
    }
    
    // Atualizar status
    await this.updateNotificationStatus(notification);
  }
  
  // Atualizar estatísticas do canal
  private updateChannelStatistics(
    channel: NotificationChannel,
    success: boolean,
    deliveryTime: number
  ): void {
    this.statistics.stats_by_channel[channel] = this.statistics.stats_by_channel[channel] || { 
      channel,
      total_sent: 0, 
      total_delivered: 0, 
      total_failed: 0, 
      delivery_rate: 0,
      average_processing_time_ms: 0,
      enabled: true
    };
    const stats = this.statistics.stats_by_channel[channel];
    
    if (success) {
      stats.total_sent++;
      stats.average_processing_time_ms = (stats.average_processing_time_ms + deliveryTime) / 2;
    } else {
      stats.total_failed++;
    }
  }
  
  // Atualizar status da notificação
  private async updateNotificationStatus(notification: Notification): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      
      // Determinar se é notificação de template (email/whatsapp) ou in-app
      const isTemplateNotification = ['email', 'whatsapp'].includes(notification.type as string);
      const isInAppNotification = notification.channel === 'in_app' || 
        ['user', 'system', 'security', 'performance', 'backup', 'financial', 'marketing', 'integration', 'maintenance', 'compliance_alert', 'error_report', 'custom'].includes(notification.type as string);
      
      if (isTemplateNotification) {
        // Para notificações de template (email/whatsapp), usar tabela notifications
        const { error } = await supabase
          .from('notifications')
          .upsert({
            id: notification.id,
            type: notification.type as 'email' | 'whatsapp',
            event: 'test_created', // Default event - pode ser ajustado conforme necessário
            message: notification.content,
            subject: notification.subject,
            active: notification.status === 'sent' || notification.status === 'delivered',
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Erro ao atualizar notificação de template:', error);
        }
      } else if (isInAppNotification) {
        // Para notificações in-app, usar tabela in_app_notifications
        const userId = notification.user_id || this.getInAppUserIdFromRecipients(notification.recipients || []);
        
        if (userId) {
          const { error } = await supabase
            .from('in_app_notifications')
            .upsert({
              id: notification.id,
              user_id: userId,
              type: this.mapToInAppType(notification.type),
              title: notification.subject,
              message: notification.content,
              data: notification.metadata || {},
              read: false,
              updated_at: new Date().toISOString()
            });
          
          if (error) {
            console.error('Erro ao atualizar notificação in-app:', error);
          }
        }
      } else {
        // Para outros tipos, usar sistema de logs de auditoria
        await this.logNotificationEvent(notification);
      }
      
    } catch (error) {
      console.error('Erro ao atualizar status da notificação:', error);
    }
  }
  
  // Mapear tipos de notificação para tipos aceitos pela tabela in_app_notifications
  private mapToInAppType(type: NotificationType | string): 'payment_activated' | 'payment_pending' | 'payment_confirmed' | 'system' {
    const typeMap: Record<string, 'payment_activated' | 'payment_pending' | 'payment_confirmed' | 'system'> = {
      'financial': 'payment_pending',
      'payment_activated': 'payment_activated',
      'payment_pending': 'payment_pending', 
      'payment_confirmed': 'payment_confirmed',
      'user': 'system',
      'security': 'system',
      'performance': 'system',
      'backup': 'system',
      'marketing': 'system',
      'integration': 'system',
      'maintenance': 'system',
      'compliance_alert': 'system',
      'error_report': 'system',
      'custom': 'system'
    };
    
    return typeMap[type as string] || 'system';
  }
  
  // Identifica o primeiro destinatário in-app e retorna o user_id
  private getInAppUserIdFromRecipients(recipients: NotificationRecipient[]): string | undefined {
    if (!Array.isArray(recipients)) return undefined;
    const inApp = recipients.find(
      (r: any) => r && typeof r === 'object' && 'user_id' in r && typeof r.user_id === 'string'
    ) as { user_id: string } | undefined;
    return inApp?.user_id;
  }
  
  // Log de eventos de notificação para auditoria
  private async logNotificationEvent(notification: Notification): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();

      await supabase
        .from('audit_logs')
        .insert({
          action: 'NOTIFICATION_STATUS_UPDATE',
          table_name: 'notifications',
          record_id: notification.id,
          new_values: {
            type: notification.type,
            status: notification.status,
            channel: notification.channel,
            subject: notification.subject,
            retry_count: notification.retry_count
          }
        });
    } catch (error) {
      console.error('Erro ao registrar evento de notificação:', error);
    }
  }

  // Obter template
  private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    // Verificar cache
    if (this.config.cache_enabled) {
      const cached = await intelligentCacheSystem.get<NotificationTemplate>(
        `template:${templateId}`,
        { tags: ['templates'] }
      );
      
      if (cached.status === 'hit' && cached.value) {
        return cached.value;
      }
    }
    
    try {
      // Buscar no banco
      const supabase = await createServerSupabaseClient();
      const { data, error } = await (supabase as any)
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (error || !data) {
        console.error('Template não encontrado:', templateId);
        return null;
      }
      
      // Converter dados do banco para o tipo NotificationTemplate
      const templateData = data as any;
      const template: NotificationTemplate = {
        id: templateData.id,
        name: templateData.name,
        type: templateData.type,
        subject_template: templateData.subject_template,
        content_template: templateData.content_template,
        variables: templateData.variables || [],
        enabled: templateData.enabled,
        version: templateData.version || 1,
        created_at: new Date(templateData.created_at),
        updated_at: new Date(templateData.updated_at),
        created_by: templateData.created_by
      };
      
      // Armazenar no cache
      if (this.config.cache_enabled) {
        await intelligentCacheSystem.set(
          `template:${templateId}`,
          template,
          {
            ttl: this.config.cache_ttl_seconds * 1000,
            tags: ['templates']
          }
        );
      }
      
      return template;
      
    } catch (error) {
      console.error('Erro ao buscar template:', error);
      return null;
    }
  }
  
  // Aplicar template
  private async applyTemplate(
    notification: Notification,
    template: NotificationTemplate
  ): Promise<void> {
    // Aplicar template para cada canal
    // Processar template para o canal da notificação
    const variables = {
      subject: notification.subject,
      content: notification.content,
      ...notification.metadata
    };
    
    notification.subject = this.replaceVariables(template.subject_template || notification.subject, variables);
    notification.content = this.replaceVariables(template.content_template, variables);
        
  }
  
  // Aplicar localização
  private async applyLocalization(notification: Notification): Promise<void> {
    // Implementação placeholder para localização
    // Em produção, integrar com sistema de i18n
  }
  
  // Aplicar variáveis
  private async applyVariables(notification: Notification): Promise<void> {
    const variables = notification.metadata || {};
    
    notification.subject = this.replaceVariables(notification.subject, variables);
    notification.content = this.replaceVariables(notification.content, variables);
  }
  
  // Substituir variáveis
  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
  
  // Obter preferências do usuário
  private async getUserPreferences(
    userId: string
  ): Promise<UserNotificationPreferences | null> {
    try {
      // Verificar cache
      const cached = await intelligentCacheSystem.get<UserNotificationPreferences>(
        `user_preferences:${userId}`,
        { tags: ['user_preferences'] }
      );
      
      if (cached.status === 'hit' && cached.value) {
        return cached.value;
      }
      
      // Buscar no banco
      const supabase = await createServerSupabaseClient();
      const { data, error } = await (supabase as any)
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      const preferences = data as any as UserNotificationPreferences;
      
      // Armazenar no cache
      await intelligentCacheSystem.set(
        `user_preferences:${userId}`,
        preferences,
        {
          ttl: 3600000, // 1 hora
          tags: ['user_preferences']
        }
      );
      
      return preferences;
      
    } catch (error) {
      console.error('Erro ao buscar preferências do usuário:', error);
      return null;
    }
  }
  
  // Aplicar preferências do usuário
  private applyUserPreferences(
    defaultChannels: NotificationChannelConfig[],
    preferences: UserNotificationPreferences,
    type: NotificationType
  ): NotificationChannelConfig[] {
    const filteredChannels: NotificationChannelConfig[] = [];
    
    for (const channelConfig of defaultChannels) {
      const channelEnabled = preferences.channels[channelConfig.channel as keyof typeof preferences.channels];
      const typeEnabled = preferences.types[type];
      
      if (channelEnabled && typeEnabled) {
        // Aplicar configurações do usuário
        const updatedConfig = {
          ...channelConfig,
          conditions: {
            ...channelConfig.conditions,
            timeWindow: preferences.quiet_hours?.enabled ? {
              start: preferences.quiet_hours.start_time,
              end: preferences.quiet_hours.end_time,
              timezone: preferences.quiet_hours.timezone
            } : channelConfig.conditions?.timeWindow,
            frequency: {
              maxPerHour: preferences.frequency_limits?.max_per_hour || 10,
              maxPerDay: preferences.frequency_limits?.max_per_day || 100
            }
          }
        };
        
        filteredChannels.push(updatedConfig);
      }
    }
    
    return filteredChannels;
  }
  
  // Gerar ID único
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Iniciar monitoramento
  private startMonitoring(): void {
    // Monitoramento desabilitado
    return;
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
    }, 60000); // 1 minuto
  }
  
  // Coletar métricas
  private async collectMetrics(): Promise<void> {
    try {
      // Calcular taxas
      const totalSent = this.statistics.total_sent;
      const totalFailed = this.statistics.total_failed;
      const totalDelivered = this.statistics.total_delivered;
      
      this.statistics.delivery_rate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      
      // Atualizar tamanho da fila
      const queueSize = Array.from(this.queues.values())
        .reduce((sum, queue) => sum + queue.length, 0);
      
      // Registrar métricas no sistema de performance
      performanceMonitoringSystem.recordMetric(
        MetricType.NOTIFICATION_DELIVERY_RATE,
        this.statistics.delivery_rate,
        '%',
        'notification-system',
        {
          totalSent,
          totalDelivered,
          totalFailed,
          queueSize
        },
        ['notifications', 'delivery']
      );
      
    } catch (error) {
      console.error('Erro ao coletar métricas de notificação:', error);
    }
  }
  
  // Verificar alertas
  private async checkAlerts(): Promise<void> {
    const thresholds = { errorRate: 0.1, responseTime: 5000 };
    
    // Verificar taxa de falha alta
    const failureRate = this.statistics.total_sent > 0 ? (this.statistics.total_failed / this.statistics.total_sent) * 100 : 0;
    const failureRateThreshold = 10; // 10% de taxa de falha
    if (failureRate > failureRateThreshold) {
      await realtimeSecurityMonitor.recordEvent(
        SecurityEventType.SYSTEM_OVERLOAD,
        SecuritySeverity.HIGH,
        'localhost',
        'notification-system',
        'delivery',
        {
          metric: 'failure_rate',
          value: failureRate,
          threshold: failureRateThreshold
        }
      );
    }
    
    // Verificar tempo de entrega alto (usando valor padrão de 5000ms)
    const deliveryTimeThreshold = 5000;
    if (this.statistics.average_processing_time_ms > deliveryTimeThreshold) {
      await realtimeSecurityMonitor.recordEvent(
        SecurityEventType.SYSTEM_OVERLOAD,
        SecuritySeverity.MEDIUM,
        'localhost',
        'notification-system',
        'latency',
        {
          metric: 'delivery_time',
          value: this.statistics.average_processing_time_ms,
          threshold: deliveryTimeThreshold
        }
      );
    }
    
    // Verificar tamanho da fila alto (usando valor padrão de 1000)
    const queueSizeThreshold = 1000;
    const queueSize = Array.from(this.queues.values()).reduce((sum, queue) => sum + queue.length, 0);
    if (queueSize > queueSizeThreshold) {
      await realtimeSecurityMonitor.recordEvent(
        SecurityEventType.SYSTEM_OVERLOAD,
        SecuritySeverity.MEDIUM,
        'localhost',
        'notification-system',
        'queue',
        {
          metric: 'queue_size',
          value: queueSize,
          threshold: queueSizeThreshold
        }
      );
    }
  }
  
  // Iniciar limpeza
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000); // Diário
  }
  
  // Limpeza
  private async cleanup(): Promise<void> {
    try {
      // Limpar notificações antigas
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 dias de retenção padrão
      
      const supabase = await createServerSupabaseClient();
      await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString());
      
      logger.debug('Limpeza de notificações antigas concluída');
      
    } catch (error) {
      console.error('Erro na limpeza de notificações:', error);
    }
  }
  
  // Marcar como entregue
  async markAsDelivered(notificationId: string, channel: NotificationChannel): Promise<void> {
    try {
      // Atualizar estatísticas somente; persistência de "delivered" não é suportada na tabela 'notifications'
      this.statistics.total_delivered++;
      this.statistics.stats_by_channel[channel] = this.statistics.stats_by_channel[channel] || { 
        channel: channel as NotificationChannel,
        total_sent: 0, 
        total_delivered: 0, 
        total_failed: 0, 
        delivery_rate: 0,
        average_processing_time_ms: 0,
        enabled: true
      };
      this.statistics.stats_by_channel[channel].total_delivered++; // Incrementa contador de entregues
      
    } catch (error) {
      console.error('Erro ao marcar notificação como entregue:', error);
    }
  }
  
  // Marcar como lida
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      
      await supabase
        .from('in_app_notifications')
        .update({
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);
      
      // Atualizar estatísticas
      this.statistics.total_delivered++;
      
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }
  
  // Obter estatísticas
  getStatistics(): NotificationStats {
    return { ...this.statistics };
  }
  
  // Obter configuração
  getConfig(): NotificationSystemConfig {
    return { ...this.config };
  }
  
  // Atualizar configuração
  updateConfig(newConfig: Partial<NotificationSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinicializar componentes se necessário
    // Propriedade channels não disponível na configuração atual
    // if (newConfig.channels) {
    //   this.initializeProviders();
    // }
    
    // Configuração de monitoramento não disponível - removida
    // this.stopMonitoring();
    // this.startMonitoring();
  }
  
  // Parar monitoramento
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  // Finalizar sistema
  async shutdown(): Promise<void> {
    // Parar intervalos
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.stopMonitoring();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Processar notificações pendentes
    await this.processQueues();
    
    // Fechar provedores
    for (const provider of this.providers.values()) {
      await provider.shutdown();
    }
    
    logger.debug('Sistema de notificações em tempo real finalizado');
  }
}

// Classes base para provedores
abstract class NotificationProvider {
  protected config: any;
  
  constructor(config: any) {
    this.config = config;
  }
  
  abstract send(
    notification: Notification,
    channelConfig: NotificationChannelConfig
  ): Promise<boolean>;
  
  abstract shutdown(): Promise<void>;
}

// Implementações de provedores (placeholders)
class EmailProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    logger.debug(`Enviando email: ${notification.subject}`);
    // Implementação real do envio de email
    return true;
  }
  
  async shutdown(): Promise<void> {
    logger.debug('Fechando provedor de email');
  }
}

class SMSProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    logger.debug(`Enviando SMS: ${notification.subject}`);
    // Implementação real do envio de SMS
    return true;
  }
  
  async shutdown(): Promise<void> {
    logger.debug('Fechando provedor de SMS');
  }
}

class PushProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    logger.debug(`Enviando push: ${notification.subject}`);
    // Implementação real do envio de push
    return true;
  }
  
  async shutdown(): Promise<void> {
    logger.debug('Fechando provedor de push');
  }
}

class WebhookProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    logger.debug(`Enviando webhook: ${notification.subject}`);
    // Implementação real do envio de webhook
    return true;
  }
  
  async shutdown(): Promise<void> {
    logger.debug('Fechando provedor de webhook');
  }
}

class SlackProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    logger.debug(`Enviando Slack: ${notification.subject}`);
    // Implementação real do envio para Slack
    return true;
  }
  
  async shutdown(): Promise<void> {
    logger.debug('Fechando provedor do Slack');
  }
}

class DiscordProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    console.log(`Enviando Discord: ${notification.subject}`);
    // Implementação real do envio para Discord
    return true;
  }
  
  async shutdown(): Promise<void> {
    console.log('Fechando provedor do Discord');
  }
}

class InAppProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    logger.debug(`Enviando in-app: ${notification.subject}`, undefined, "DEBUG");
    // Implementação real do envio in-app
    return true;
  }
  
  async shutdown(): Promise<void> {
    logger.debug('Fechando provedor in-app', undefined, "DEBUG");
  }
}

class BrowserProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    logger.debug(`Enviando browser: ${notification.subject}`, undefined, "DEBUG");
    // Implementação real do envio para browser
    return true;
  }
  
  async shutdown(): Promise<void> {
    logger.debug('Fechando provedor do browser', undefined, "DEBUG");
  }
}

class DesktopProvider extends NotificationProvider {
  async send(notification: Notification, channelConfig: NotificationChannelConfig): Promise<boolean> {
    logger.debug(`Enviando desktop: ${notification.subject}`, undefined, "DEBUG");
    // Implementação real do envio para desktop
    return true;
  }
  
  async shutdown(): Promise<void> {
    logger.debug('Fechando provedor do desktop', undefined, "DEBUG");
  }
}



// Instância global do sistema
export const realtimeNotificationSystem = new RealtimeNotificationSystem();

// Funções utilitárias para uso direto
export async function sendNotification(
  type: NotificationType | string,
  title: string,
  message: string,
  options?: any
): Promise<string> {
  return realtimeNotificationSystem.send(type as NotificationType, title, message, options);
}

export async function sendSecurityAlert(
  title: string,
  message: string,
  severity: SecuritySeverity,
  userId?: string
): Promise<string> {
  const priority = severity === SecuritySeverity.CRITICAL 
    ? 'critical'
    : severity === SecuritySeverity.HIGH
    ? 'urgent'
    : 'high';
  
  return sendNotification(
    'security',
    title,
    message,
    {
      userId,
      priority,
      tags: ['security', severity],
      channels: [
        {
          channel: 'email',
          enabled: true,
          priority: 1,
          config: {}
        },
        {
          channel: 'sms',
          enabled: severity === SecuritySeverity.CRITICAL,
          priority: 2,
          config: {}
        },
        {
          channel: 'push',
          enabled: true,
          priority: 3,
          config: {}
        }
      ]
    }
  );
}

export async function sendSystemAlert(
  title: string,
  message: string,
  priority: NotificationPriority = 'high'
): Promise<string> {
  return sendNotification(
    'system',
    title,
    message,
    {
      priority,
      tags: ['system', 'alert'],
      channels: [
        {
          channel: 'email',
          enabled: true,
          priority: 1,
          config: {}
        },
        {
          channel: 'slack',
          enabled: true,
          priority: 2,
          config: {}
        }
      ]
    }
  );
}

export async function sendUserNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType | string = 'info',
  data?: Record<string, any>
): Promise<string> {
  return sendNotification(
    type,
    title,
    message,
    {
      userId,
      data,
      tags: ['user', type]
    }
  );
}

export async function sendBulkNotification(
  userIds: string[],
  title: string,
  message: string,
  type: NotificationType | string = 'info',
  options?: any
): Promise<string[]> {
  const promises = userIds.map(userId => 
    sendNotification(type, title, message, { ...options, userId })
  );
  
  return Promise.all(promises);
}

export async function sendScheduledNotification(
  type: NotificationType,
  title: string,
  message: string,
  sendAt: Date,
  options?: any
): Promise<string> {
  return sendNotification(
    type,
    title,
    message,
    {
      ...options,
      sendAt
    }
  );
}

export async function markNotificationAsDelivered(
  notificationId: string,
  channel: NotificationChannel
): Promise<void> {
  return realtimeNotificationSystem.markAsDelivered(notificationId, channel);
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  return realtimeNotificationSystem.markAsRead(notificationId);
}

export function getNotificationStatistics(): NotificationStats {
  return realtimeNotificationSystem.getStatistics();
}

export function getNotificationConfig(): NotificationSystemConfig {
  return realtimeNotificationSystem.getConfig();
}

export function updateNotificationConfig(
  config: Partial<NotificationSystemConfig>
): void {
  realtimeNotificationSystem.updateConfig(config);
}

// Hook para React/Next.js
export function useNotifications() { // REMOVIDO - migre para '@/hooks/useNotifications'
  throw new Error('useNotifications foi movido para "@/hooks/useNotifications". Importe de lá no cliente.');
}

// Middleware para Next.js
export function createNotificationMiddleware() {
  return async (req: any, res: any, next: any) => {
    // Adicionar funções de notificação ao request
    req.notify = {
      send: (type: NotificationType, title: string, message: string, options?: any) => 
        sendNotification(type, title, message, options),
      sendToUser: (userId: string, title: string, message: string, type?: NotificationType, data?: any) => 
        sendUserNotification(userId, title, message, type, data),
      sendSecurityAlert: (title: string, message: string, severity: SecuritySeverity, userId?: string) => 
        sendSecurityAlert(title, message, severity, userId),
      sendSystemAlert: (title: string, message: string, priority?: NotificationPriority) => 
        sendSystemAlert(title, message, priority)
    };
    
    next();
  };
}

// Sistema de notificações em tempo real exportado
// (classe já exportada na linha 161)
