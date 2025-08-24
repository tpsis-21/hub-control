// 🔔 Interfaces do Sistema de Notificações

import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority, 
  DeliveryStatus 
} from '../../types/notifications';

// Interface para notificação
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  recipients: Recipient[];
  scheduledFor?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deliveryStatus: Record<NotificationChannel, DeliveryStatus>;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
}

// Interface para destinatário
export interface Recipient {
  id: string;
  type: 'user' | 'role' | 'group';
  identifier: string; // email, phone, user_id, etc.
  preferences: NotificationPreferences;
  timezone?: string;
}

// Preferências de notificação
export interface NotificationPreferences {
  channels: Partial<Record<NotificationChannel, boolean>>;
  types: Partial<Record<NotificationType, boolean>>;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
    timezone: string;
  };
  frequency: {
    immediate: NotificationType[];
    batched: NotificationType[];
    batchInterval: number; // minutos
  };
}

// Template de notificação
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Configuração de canal
export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  config: Record<string, any>;
  rateLimit?: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

// Configuração de webhook
export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  timeout: number;
  retries: number;
  authentication?: {
    type: 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}