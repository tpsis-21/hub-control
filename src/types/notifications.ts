/**
 * Tipos e Interfaces do Sistema de Notificações
 * 
 * Este arquivo define todos os tipos TypeScript utilizados pelo sistema de notificações.
 */

// ============================================================================
// TIPOS BÁSICOS
// ============================================================================

export type NotificationType = 
  | 'security'
  | 'security_alert'
  | 'performance'
  | 'performance_alert'
  | 'system'
  | 'backup'
  | 'backup_status'
  | 'financial'
  | 'marketing'
  | 'user'
  | 'integration'
  | 'maintenance'
  | 'compliance_alert'
  | 'error_report'
  | 'custom';

export type NotificationChannel = 
  | 'email'
  | 'webhook'
  | 'in_app'
  | 'sms'
  | 'slack'
  | 'push';

export type NotificationPriority = 
  | 'low'
  | 'medium'
  | 'normal'
  | 'high'
  | 'urgent';

export type NotificationStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type DeliveryStatus = 
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'rejected';

// ============================================================================
// INTERFACES DE DESTINATÁRIOS
// ============================================================================

export interface BaseRecipient {
  name?: string;
  metadata?: Record<string, any>;
}

export interface EmailRecipient extends BaseRecipient {
  email: string;
}

export interface WebhookRecipient extends BaseRecipient {
  webhook_url: string;
  headers?: Record<string, string>;
}

export interface InAppRecipient extends BaseRecipient {
  user_id: string;
}

export type NotificationRecipient = 
  | EmailRecipient
  | WebhookRecipient
  | InAppRecipient;

// ============================================================================
// INTERFACES DE CONFIGURAÇÃO DE CANAIS
// ============================================================================

export interface EmailChannelConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure?: boolean;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  from_name?: string;
  reply_to?: string;
  pool?: boolean;
  max_connections?: number;
  max_messages?: number;
}

export interface WebhookChannelConfig {
  default_url?: string;
  default_headers?: Record<string, string>;
  signature_secret?: string;
  signature_algorithm?: string;
}

export type ChannelConfig = 
  | EmailChannelConfig
  | WebhookChannelConfig;

// ============================================================================
// INTERFACES DE RATE LIMITING E RETRY
// ============================================================================

export interface RateLimitConfig {
  max_requests: number;
  window_seconds: number;
  burst_limit?: number;
}

export interface RetryPolicy {
  max_retries: number;
  backoff_multiplier: number;
  initial_delay_seconds?: number;
  max_delay_seconds: number;
  retry_on_status_codes?: number[];
}

// ============================================================================
// INTERFACES PRINCIPAIS
// ============================================================================

export interface NotificationRequest {
  type: NotificationType;
  channel: NotificationChannel;
  recipients: NotificationRecipient[];
  subject: string;
  content: string;
  priority: NotificationPriority;
  metadata?: Record<string, any>;
  scheduled_for?: Date;
  expires_at?: Date;
  template_id?: string;
  template_variables?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipients: NotificationRecipient[];
  subject: string;
  content: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  scheduled_for?: Date;
  expires_at?: Date;
  template_id?: string;
  template_variables?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  sent_at?: Date;
  delivered_at?: Date;
  failed_at?: Date;
  error_message?: string;
  retry_count: number;
  user_id?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject_template: string;
  content_template: string;
  variables: string[];
  enabled: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

export interface NotificationChannelConfig {
  id: string;
  channel: NotificationChannel;
  config: ChannelConfig;
  enabled: boolean;
  rate_limit?: RateLimitConfig;
  retry_policy?: RetryPolicy;
  created_at: Date;
  updated_at: Date;
  last_used_at?: Date;
}

export interface NotificationRecipientEntity {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  channels: NotificationChannel[];
  preferences: Record<NotificationType, boolean>;
  enabled: boolean;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
  secret?: string;
  enabled: boolean;
  retry_policy?: RetryPolicy;
  created_at: Date;
  updated_at: Date;
  last_triggered_at?: Date;
  success_count: number;
  failure_count: number;
}

export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  status: DeliveryStatus;
  attempts: number;
  response_data?: any;
  error_message?: string;
  delivered_at?: Date;
  created_at: Date;
  processing_time_ms?: number;
}

// ============================================================================
// INTERFACES DE RESPOSTA
// ============================================================================

export interface NotificationResult {
  success: boolean;
  notification_id?: string;
  error?: string;
  delivery_logs?: NotificationDeliveryLog[];
}

export interface DeliveryResult {
  success: boolean;
  message_id?: string;
  error?: string;
  retry_after?: number;
  processing_time_ms: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// INTERFACES DE ESTATÍSTICAS
// ============================================================================

export interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_pending: number;
  delivery_rate: number;
  average_processing_time_ms: number;
  stats_by_channel: Record<NotificationChannel, ChannelStats>;
  stats_by_type: Record<NotificationType, TypeStats>;
  stats_by_priority: Record<NotificationPriority, PriorityStats>;
  period_start: Date;
  period_end: Date;
}

export interface ChannelStats {
  channel: NotificationChannel;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  average_processing_time_ms: number;
  last_used_at?: Date;
  enabled: boolean;
}

export interface TypeStats {
  type: NotificationType;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
}

export interface PriorityStats {
  priority: NotificationPriority;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  average_processing_time_ms: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  delivery_rate: number;
  pending_notifications: number;
  failed_notifications_last_hour: number;
  average_processing_time_ms: number;
  active_channels: number;
  total_channels: number;
  issues: string[];
  last_check: Date;
}

// ============================================================================
// INTERFACES DE FILTROS E CONSULTAS
// ============================================================================

export interface NotificationFilters {
  type?: NotificationType[];
  channel?: NotificationChannel[];
  status?: NotificationStatus[];
  priority?: NotificationPriority[];
  recipient?: string;
  date_from?: Date;
  date_to?: Date;
  search?: string;
  user_id?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface StatsFilters {
  period?: '1h' | '24h' | '7d' | '30d' | '90d' | 'custom';
  start_date?: Date;
  end_date?: Date;
  channel?: NotificationChannel[];
  type?: NotificationType[];
  timezone?: string;
}

// ============================================================================
// INTERFACES DE CONFIGURAÇÃO DO SISTEMA
// ============================================================================

export interface NotificationSystemConfig {
  enabled: boolean;
  default_channel: NotificationChannel;
  rate_limit_enabled: boolean;
  global_rate_limit: RateLimitConfig;
  default_retry_policy: RetryPolicy;
  queue_size: number;
  workers: number;
  queue_interval_seconds: number;
  cache_enabled: boolean;
  cache_ttl_seconds: number;
  log_level: 'error' | 'warn' | 'info' | 'debug';
  log_delivery: boolean;
  log_errors: boolean;
  log_performance: boolean;
  auto_cleanup: boolean;
  cleanup_interval_hours: number;
  retention_days: number;
  log_retention_days: number;
  stats_retention_days: number;
  webhook_timeout_seconds: number;
  webhook_signature_verification: boolean;
  content_sanitization: boolean;
  max_content_length: number;
  max_recipients: number;
  test_mode: boolean;
  test_email?: string;
}

// ============================================================================
// INTERFACES DE PREFERÊNCIAS DO USUÁRIO
// ============================================================================

export interface UserNotificationPreferences {
  user_id: string;
  channels: {
    email: boolean;
    webhook: boolean;
    in_app: boolean;
    push: boolean;
  };
  types: Record<NotificationType, boolean>;
  priorities: Record<NotificationPriority, boolean>;
  quiet_hours?: {
    enabled: boolean;
    start_time: string; // HH:mm format
    end_time: string;   // HH:mm format
    timezone: string;
  };
  frequency_limits?: {
    max_per_hour?: number;
    max_per_day?: number;
  };
  language?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// INTERFACES DE EVENTOS
// ============================================================================

export interface NotificationEvent {
  type: 'notification.created' | 'notification.sent' | 'notification.delivered' | 'notification.failed' | 'notification.cancelled';
  notification_id: string;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  type: 'webhook.triggered' | 'webhook.success' | 'webhook.failed';
  webhook_id: string;
  notification_event: NotificationEvent;
  response_status?: number;
  response_data?: any;
  error_message?: string;
  timestamp: Date;
}

// ============================================================================
// INTERFACES DE EXPORTAÇÃO
// ============================================================================

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  filters?: NotificationFilters;
  fields?: string[];
  max_records?: number;
  include_metadata?: boolean;
}

export interface ExportResult {
  success: boolean;
  file_url?: string;
  file_name?: string;
  record_count?: number;
  error?: string;
}

// ============================================================================
// INTERFACES DE TEMPLATE ENGINE
// ============================================================================

export interface TemplateEngine {
  render(template: string, variables: Record<string, any>): string;
  validate(template: string, variables: string[]): ValidationResult;
  extractVariables(template: string): string[];
}

export interface TemplateRenderResult {
  subject: string;
  content: string;
  variables_used: string[];
  variables_missing: string[];
}

// ============================================================================
// INTERFACES DE MIDDLEWARE
// ============================================================================

export interface NotificationMiddleware {
  name: string;
  process(notification: NotificationRequest): Promise<NotificationRequest>;
  priority?: number;
}

export interface ChannelMiddleware {
  name: string;
  process(notification: Notification, config: NotificationChannel): Promise<{ notification: Notification; config: NotificationChannel }>;
  priority?: number;
}

// ============================================================================
// INTERFACES DE HOOKS
// ============================================================================

export interface UseNotificationsOptions {
  auto_refresh?: boolean;
  refresh_interval?: number;
  filters?: NotificationFilters;
  pagination?: PaginationOptions;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  templates: NotificationTemplate[];
  channels: NotificationChannel[];
  stats: NotificationStats | null;
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  sendNotification: (request: NotificationRequest) => Promise<boolean>;
  sendFromTemplate: (templateName: string, variables: Record<string, any>, options: Partial<NotificationRequest>) => Promise<boolean>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  cancelNotification: (notificationId: string) => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  
  // Templates
  createTemplate: (template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateTemplate: (id: string, template: Partial<NotificationTemplate>) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  
  // Channels
  createChannel: (channel: Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateChannel: (id: string, channel: Partial<NotificationChannel>) => Promise<boolean>;
  deleteChannel: (id: string) => Promise<boolean>;
  testChannel: (channel: NotificationChannel) => Promise<boolean>;
  
  // Utilities
  refresh: () => Promise<void>;
  exportData: (options: ExportOptions) => Promise<ExportResult>;
  clearFilters: () => void;
  setFilters: (filters: NotificationFilters) => void;
}

// ============================================================================
// TIPOS UTILITÁRIOS
// ============================================================================

export type NotificationChannelImplementation = {
  send(notification: Notification, config: ChannelConfig): Promise<DeliveryResult>;
  validate(config: ChannelConfig): Promise<ValidationResult>;
  test(config: ChannelConfig): Promise<ValidationResult>;
};

export type NotificationEventHandler = (event: NotificationEvent) => void | Promise<void>;

export type WebhookEventHandler = (event: WebhookEvent) => void | Promise<void>;

// ============================================================================
// CONSTANTES
// ============================================================================

export const NOTIFICATION_TYPES: NotificationType[] = [
  'security',
  'performance',
  'system',
  'backup',
  'financial',
  'marketing',
  'user',
  'integration'
];

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  'email',
  'webhook',
  'in_app',
  'sms',
  'slack',
  'push'
];

export const NOTIFICATION_PRIORITIES: NotificationPriority[] = [
  'low',
  'medium',
  'high',
  'urgent'
];

export const NOTIFICATION_STATUSES: NotificationStatus[] = [
  'pending',
  'sent',
  'delivered',
  'failed',
  'cancelled'
];

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'processing',
  'delivered',
  'failed',
  'bounced',
  'rejected'
];