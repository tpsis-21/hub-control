// 🔔 Barrel para Sistema de Notificações
// Centraliza todas as exportações do módulo de notificações

// Re-exportar todos os tipos principais de notifications
export * from '@/types/notifications';

// Re-exportar configurações e utilitários
export * from './config';
// Removido para evitar conflitos de star exports com '@/types/notifications' e './config'
// export * from './constants';
export * from './utils';
export * from './channel-configs';

// Interface específica dos barrel para evitar conflitos
export type {
  Notification,
  Recipient,
  NotificationPreferences,
  NotificationTemplate,
  ChannelConfig,
  WebhookConfig
} from './interfaces';

// Re-exportar sistemas de notificação
export { 
  notificationSystem,
  NotificationSystem
} from '../notification-system';

export { 
  realtimeNotificationSystem,
  RealtimeNotificationSystem,
  sendNotification,
  sendSecurityAlert,
  sendSystemAlert,
  sendUserNotification,
  sendBulkNotification,
  sendScheduledNotification,
  markNotificationAsDelivered,
  markNotificationAsRead,
  getNotificationStatistics,
  getNotificationConfig,
  updateNotificationConfig,
  // useNotifications foi movido para '@/hooks/useNotifications' para evitar dependência de client em módulos server
  createNotificationMiddleware,
  DeliveryStrategy
} from '../realtime-notification-system';

// Re-exportar tipo de configuração do realtime system com alias
export type { NotificationChannelConfig as RealtimeChannelConfig } from '../realtime-notification-system';
