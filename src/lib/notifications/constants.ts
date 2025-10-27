/**
 * Constantes do Sistema de Notificações
 * 
 * Este arquivo contém todas as constantes, configurações padrão e valores fixos
 * utilizados pelo sistema de notificações.
 */

import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus,
  DeliveryStatus,
  RateLimitConfig,
  RetryPolicy,
  NotificationSystemConfig
} from '@/types/notifications';

// ============================================================================
// CONSTANTES DE TIPOS
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
] as const;

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  'email',
  'webhook',
  'in_app',
  'sms',
  'slack',
  'push'
] as const;

export const NOTIFICATION_PRIORITIES: NotificationPriority[] = [
  'low',
  'medium',
  'high',
  'urgent'
] as const;

export const NOTIFICATION_STATUSES: NotificationStatus[] = [
  'pending',
  'sent',
  'delivered',
  'failed',
  'cancelled'
] as const;

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'processing',
  'delivered',
  'failed',
  'bounced',
  'rejected'
] as const;

// ============================================================================
// CONFIGURAÇÕES PADRÃO
// ============================================================================

/**
 * Configuração padrão do sistema de notificações
 */
export const DEFAULT_SYSTEM_CONFIG: NotificationSystemConfig = {
  enabled: true,
  default_channel: 'email',
  rate_limit_enabled: true,
  global_rate_limit: {
    max_requests: 1000,
    window_seconds: 3600, // 1 hora
    burst_limit: 100
  },
  default_retry_policy: {
    max_retries: 3,
    backoff_multiplier: 2,
    initial_delay_seconds: 1,
    max_delay_seconds: 300, // 5 minutos
    retry_on_status_codes: [500, 502, 503, 504, 408, 429]
  },
  queue_size: 10000,
  workers: 5,
  queue_interval_seconds: 5,
  cache_enabled: true,
  cache_ttl_seconds: 300, // 5 minutos
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

/**
 * Rate limits padrão por canal
 */
export const DEFAULT_CHANNEL_RATE_LIMITS: Record<NotificationChannel, RateLimitConfig> = {
  email: {
    max_requests: 100,
    window_seconds: 3600, // 1 hora
    burst_limit: 10
  },
  webhook: {
    max_requests: 500,
    window_seconds: 3600, // 1 hora
    burst_limit: 50
  },
  in_app: {
    max_requests: 1000,
    window_seconds: 3600, // 1 hora
    burst_limit: 100
  },
  sms: {
    max_requests: 200,
    window_seconds: 3600, // 1 hora
    burst_limit: 20
  },
  slack: {
    max_requests: 500,
    window_seconds: 3600, // 1 hora
    burst_limit: 50
  },
  push: {
    max_requests: 1000,
    window_seconds: 3600, // 1 hora
    burst_limit: 100
  }
};

/**
 * Políticas de retry padrão por canal
 */
export const DEFAULT_CHANNEL_RETRY_POLICIES: Record<NotificationChannel, RetryPolicy> = {
  email: {
    max_retries: 3,
    backoff_multiplier: 2,
    initial_delay_seconds: 5,
    max_delay_seconds: 300,
    retry_on_status_codes: [421, 450, 451, 500, 502, 503, 504]
  },
  webhook: {
    max_retries: 5,
    backoff_multiplier: 2,
    initial_delay_seconds: 1,
    max_delay_seconds: 300,
    retry_on_status_codes: [408, 429, 500, 502, 503, 504]
  },
  in_app: {
    max_retries: 1,
    backoff_multiplier: 1,
    initial_delay_seconds: 1,
    max_delay_seconds: 5,
    retry_on_status_codes: [500, 502, 503, 504]
  },
  sms: {
    max_retries: 3,
    backoff_multiplier: 2,
    initial_delay_seconds: 2,
    max_delay_seconds: 120,
    retry_on_status_codes: [408, 429, 500, 502, 503, 504]
  },
  slack: {
    max_retries: 5,
    backoff_multiplier: 2,
    initial_delay_seconds: 1,
    max_delay_seconds: 300,
    retry_on_status_codes: [408, 429, 500, 502, 503, 504]
  },
  push: {
    max_retries: 3,
    backoff_multiplier: 2,
    initial_delay_seconds: 2,
    max_delay_seconds: 120,
    retry_on_status_codes: [408, 429, 500, 502, 503, 504]
  }
};

// ============================================================================
// TEMPLATES PADRÃO
// ============================================================================

export const DEFAULT_TEMPLATES = {
  welcome_user: {
    name: 'Boas-vindas ao Usuário',
    type: 'user' as NotificationType,
    subject_template: 'Bem-vindo(a) ao {{app_name}}, {{user_name}}!',
    content_template: `
Olá {{user_name}},

Seja bem-vindo(a) ao {{app_name}}!

Sua conta foi criada com sucesso. Aqui estão alguns próximos passos:

1. Complete seu perfil
2. Explore nossas funcionalidades
3. Entre em contato se precisar de ajuda

Atenciosamente,
Equipe {{app_name}}
    `.trim(),
    variables: ['app_name', 'user_name']
  },
  
  security_alert: {
    name: 'Alerta de Segurança',
    type: 'security' as NotificationType,
    subject_template: '🔒 Alerta de Segurança: {{alert_type}}',
    content_template: `
⚠️ ALERTA DE SEGURANÇA

Tipo: {{alert_type}}
Data/Hora: {{timestamp}}
Descrição: {{description}}

{{#if details}}
Detalhes:
{{details}}
{{/if}}

{{#if action_required}}
Ação Necessária:
{{action_required}}
{{/if}}

Se você não reconhece esta atividade, entre em contato conosco imediatamente.

Equipe de Segurança
    `.trim(),
    variables: ['alert_type', 'timestamp', 'description', 'details', 'action_required']
  },
  
  backup_success: {
    name: 'Backup Realizado com Sucesso',
    type: 'backup' as NotificationType,
    subject_template: '✅ Backup realizado com sucesso - {{backup_name}}',
    content_template: `
✅ BACKUP CONCLUÍDO

Nome: {{backup_name}}
Data/Hora: {{timestamp}}
Tamanho: {{backup_size}}
Duração: {{duration}}

{{#if files_count}}
Arquivos processados: {{files_count}}
{{/if}}

{{#if backup_location}}
Localização: {{backup_location}}
{{/if}}

O backup foi realizado com sucesso e está disponível para restauração.

Equipe de Infraestrutura
    `.trim(),
    variables: ['backup_name', 'timestamp', 'backup_size', 'duration', 'files_count', 'backup_location']
  },
  
  system_maintenance: {
    name: 'Manutenção do Sistema',
    type: 'system' as NotificationType,
    subject_template: '🔧 Manutenção Programada: {{maintenance_title}}',
    content_template: `
🔧 MANUTENÇÃO PROGRAMADA

Título: {{maintenance_title}}
Data/Hora: {{start_time}} - {{end_time}}
Duração Estimada: {{duration}}

Descrição:
{{description}}

{{#if affected_services}}
Serviços Afetados:
{{affected_services}}
{{/if}}

{{#if impact}}
Impacto Esperado:
{{impact}}
{{/if}}

Pedimos desculpas por qualquer inconveniente.

Equipe de Infraestrutura
    `.trim(),
    variables: ['maintenance_title', 'start_time', 'end_time', 'duration', 'description', 'affected_services', 'impact']
  },
  
  performance_alert: {
    name: 'Alerta de Performance',
    type: 'performance' as NotificationType,
    subject_template: '📊 Alerta de Performance: {{metric_name}}',
    content_template: `
📊 ALERTA DE PERFORMANCE

Métrica: {{metric_name}}
Valor Atual: {{current_value}}
Limite: {{threshold}}
Data/Hora: {{timestamp}}

{{#if description}}
Descrição:
{{description}}
{{/if}}

{{#if recommendations}}
Recomendações:
{{recommendations}}
{{/if}}

Por favor, verifique o sistema e tome as ações necessárias.

Equipe de Monitoramento
    `.trim(),
    variables: ['metric_name', 'current_value', 'threshold', 'timestamp', 'description', 'recommendations']
  }
};

// ============================================================================
// CONFIGURAÇÕES DE CANAIS
// ============================================================================

/**
 * Timeouts padrão por canal (em segundos)
 */
export const DEFAULT_CHANNEL_TIMEOUTS: Record<NotificationChannel, number> = {
  email: 30,
  webhook: 30,
  in_app: 5,
  sms: 30,
  slack: 30,
  push: 30,

};

/**
 * Tamanhos máximos de conteúdo por canal (em caracteres)
 */
export const MAX_CONTENT_LENGTH: Record<NotificationChannel, number> = {
  email: 100000, // 100KB
  webhook: 50000, // 50KB
  in_app: 10000, // 10KB
  sms: 1600, // ~10 SMS concatenados
  slack: 40000, // limite típico de mensagem do Slack
  push: 4000, // 4KB (limite típico para push notifications)

};

/**
 * Número máximo de destinatários por canal
 */
export const MAX_RECIPIENTS: Record<NotificationChannel, number> = {
  email: 100,
  webhook: 10,
  in_app: 1000,
  sms: 500,
  slack: 10,
  push: 1000
};

// ============================================================================
// CÓDIGOS DE STATUS HTTP
// ============================================================================

/**
 * Códigos de status HTTP que indicam sucesso
 */
export const SUCCESS_STATUS_CODES = [200, 201, 202, 204];

/**
 * Códigos de status HTTP que indicam erro temporário (retry)
 */
export const TEMPORARY_ERROR_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Códigos de status HTTP que indicam erro permanente (não retry)
 */
export const PERMANENT_ERROR_CODES = [400, 401, 403, 404, 405, 406, 410, 413, 414, 415, 422];

/**
 * Códigos de status específicos por canal
 */
export const CHANNEL_SPECIFIC_ERROR_CODES = {
  email: {
    temporary: [421, 450, 451, 452],
    permanent: [550, 551, 552, 553, 554]
  },
  sms: {
    temporary: [429],
    permanent: [400, 401, 403, 404]
  },
  slack: {
    temporary: [429],
    permanent: [400, 401, 403, 404]
  }
};

// ============================================================================
// EVENTOS DO SISTEMA
// ============================================================================

/**
 * Tipos de eventos de notificação
 */
export const NOTIFICATION_EVENTS = [
  'notification.created',
  'notification.sent',
  'notification.delivered',
  'notification.failed',
  'notification.cancelled'
] as const;

/**
 * Tipos de eventos de webhook
 */
export const WEBHOOK_EVENTS = [
  'webhook.triggered',
  'webhook.success',
  'webhook.failed'
] as const;

/**
 * Todos os eventos disponíveis
 */
export const ALL_EVENTS = [...NOTIFICATION_EVENTS, ...WEBHOOK_EVENTS] as const;

// ============================================================================
// CONFIGURAÇÕES DE SEGURANÇA
// ============================================================================

/**
 * Algoritmos de assinatura suportados
 */
export const SUPPORTED_SIGNATURE_ALGORITHMS = [
  'sha256',
  'sha1',
  'md5'
] as const;

/**
 * Headers de segurança padrão
 */
export const DEFAULT_SECURITY_HEADERS = {
  'X-Notification-Signature': 'signature',
  'X-Notification-Timestamp': 'timestamp',
  'X-Notification-Event': 'event',
  'User-Agent': 'HubControl-Notifications/1.0'
};

/**
 * Configurações de sanitização
 */
export const SANITIZATION_CONFIG = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  allowedAttributes: {
    'a': ['href', 'title'],
    '*': ['style']
  },
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/i, /^rgba\(/i],
      'font-size': [/^\d+(?:px|em|rem|%)$/],
      'font-weight': [/^(?:normal|bold|\d+)$/],
      'text-align': [/^(?:left|center|right|justify)$/]
    }
  }
};

// ============================================================================
// CONFIGURAÇÕES DE CACHE
// ============================================================================

/**
 * TTLs de cache por tipo de dados (em segundos)
 */
export const CACHE_TTLS = {
  templates: 3600, // 1 hora
  channels: 1800, // 30 minutos
  recipients: 900, // 15 minutos
  stats: 300, // 5 minutos
  health: 60, // 1 minuto
  config: 3600 // 1 hora
};

/**
 * Prefixos de chave de cache
 */
export const CACHE_PREFIXES = {
  template: 'notif:template:',
  channel: 'notif:channel:',
  recipient: 'notif:recipient:',
  stats: 'notif:stats:',
  health: 'notif:health:',
  config: 'notif:config:',
  rate_limit: 'notif:rate:'
};

// ============================================================================
// CONFIGURAÇÕES DE LOGS
// ============================================================================

/**
 * Níveis de log
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
} as const;

/**
 * Categorias de log
 */
export const LOG_CATEGORIES = [
  'system',
  'delivery',
  'error',
  'performance',
  'security',
  'webhook',
  'rate_limit'
] as const;

// ============================================================================
// CONFIGURAÇÕES DE FILA
// ============================================================================

/**
 * Prioridades de fila (maior número = maior prioridade)
 */
export const QUEUE_PRIORITIES: Record<NotificationPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  normal: 2,
  low: 1
};

/**
 * Configurações de processamento por prioridade
 */
export const PRIORITY_PROCESSING_CONFIG = {
  urgent: {
    max_concurrent: 10,
    timeout_seconds: 10
  },
  high: {
    max_concurrent: 5,
    timeout_seconds: 30
  },
  medium: {
    max_concurrent: 3,
    timeout_seconds: 60
  },
  low: {
    max_concurrent: 1,
    timeout_seconds: 120
  }
};

// ============================================================================
// CONFIGURAÇÕES DE MONITORAMENTO
// ============================================================================

/**
 * Métricas de saúde do sistema
 */
export const HEALTH_METRICS = {
  delivery_rate_threshold: 0.95, // 95%
  max_pending_notifications: 1000,
  max_failed_per_hour: 100,
  max_processing_time_ms: 5000 // 5 segundos
};

/**
 * Intervalos de coleta de métricas (em segundos)
 */
export const METRICS_INTERVALS = {
  health_check: 60, // 1 minuto
  stats_collection: 300, // 5 minutos
  cleanup: 3600, // 1 hora
  rate_limit_reset: 60 // 1 minuto
};

// ============================================================================
// CONFIGURAÇÕES DE EXPORTAÇÃO
// ============================================================================

/**
 * Formatos de exportação suportados
 */
export const EXPORT_FORMATS = ['json', 'csv', 'xlsx'] as const;

/**
 * Limites de exportação
 */
export const EXPORT_LIMITS = {
  max_records: 10000,
  max_file_size_mb: 50,
  timeout_seconds: 300 // 5 minutos
};

/**
 * Campos padrão para exportação
 */
export const DEFAULT_EXPORT_FIELDS = [
  'id',
  'type',
  'channel',
  'subject',
  'priority',
  'status',
  'created_at',
  'sent_at',
  'delivered_at'
];

// ============================================================================
// CONFIGURAÇÕES DE DESENVOLVIMENTO
// ============================================================================

/**
 * Configurações para modo de teste
 */
export const TEST_MODE_CONFIG = {
  skip_actual_delivery: true,
  log_all_attempts: true,
  simulate_delays: false,
  simulate_failures: false,
  failure_rate: 0.1 // 10%
};

/**
 * Dados de teste
 */
export const TEST_DATA = {
  test_email: 'test@example.com',
  test_phone: '+5511999999999',
  test_webhook_url: 'https://httpbin.org/post',

};

// ============================================================================
// MENSAGENS DE ERRO PADRÃO
// ============================================================================

export const ERROR_MESSAGES = {
  // Validação
  INVALID_EMAIL: 'Endereço de email inválido',
  INVALID_PHONE: 'Número de telefone inválido',
  INVALID_URL: 'URL inválida',
  MISSING_RECIPIENT: 'Pelo menos um destinatário é obrigatório',
  MISSING_CONTENT: 'Conteúdo da notificação é obrigatório',
  MISSING_SUBJECT: 'Assunto da notificação é obrigatório',
  
  // Canal
  CHANNEL_DISABLED: 'Canal de notificação está desabilitado',
  CHANNEL_NOT_CONFIGURED: 'Canal de notificação não está configurado',
  CHANNEL_RATE_LIMITED: 'Canal atingiu o limite de taxa',
  
  // Template
  TEMPLATE_NOT_FOUND: 'Template de notificação não encontrado',
  TEMPLATE_INVALID: 'Template de notificação inválido',
  MISSING_TEMPLATE_VARIABLES: 'Variáveis obrigatórias do template estão faltando',
  
  // Sistema
  SYSTEM_DISABLED: 'Sistema de notificações está desabilitado',
  QUEUE_FULL: 'Fila de notificações está cheia',
  PROCESSING_TIMEOUT: 'Timeout no processamento da notificação',
  
  // Delivery
  DELIVERY_FAILED: 'Falha na entrega da notificação',
  MAX_RETRIES_EXCEEDED: 'Número máximo de tentativas excedido',
  RECIPIENT_UNREACHABLE: 'Destinatário não pode ser alcançado',
  
  // Webhook
  WEBHOOK_TIMEOUT: 'Timeout na chamada do webhook',
  WEBHOOK_INVALID_RESPONSE: 'Resposta inválida do webhook',
  WEBHOOK_SIGNATURE_INVALID: 'Assinatura do webhook inválida',
  
  // Genérico
  INTERNAL_ERROR: 'Erro interno do sistema',
  NETWORK_ERROR: 'Erro de rede',
  CONFIGURATION_ERROR: 'Erro de configuração',
  PERMISSION_DENIED: 'Permissão negada'
};

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  template_variable: /\{\{\s*([^}]+)\s*\}\}/g,

  discord_channel: /^\d{17,19}$/,
  telegram_chat: /^-?\d+$/
};

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export const NotificationConstants = {
  // Tipos
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  DELIVERY_STATUSES,
  
  // Configurações
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_CHANNEL_RATE_LIMITS,
  DEFAULT_CHANNEL_RETRY_POLICIES,
  DEFAULT_TEMPLATES,
  DEFAULT_CHANNEL_TIMEOUTS,
  
  // Limites
  MAX_CONTENT_LENGTH,
  MAX_RECIPIENTS,
  
  // Status Codes
  SUCCESS_STATUS_CODES,
  TEMPORARY_ERROR_CODES,
  PERMANENT_ERROR_CODES,
  CHANNEL_SPECIFIC_ERROR_CODES,
  
  // Eventos
  NOTIFICATION_EVENTS,
  WEBHOOK_EVENTS,
  ALL_EVENTS,
  
  // Segurança
  SUPPORTED_SIGNATURE_ALGORITHMS,
  DEFAULT_SECURITY_HEADERS,
  SANITIZATION_CONFIG,
  
  // Cache
  CACHE_TTLS,
  CACHE_PREFIXES,
  
  // Logs
  LOG_LEVELS,
  LOG_CATEGORIES,
  
  // Fila
  QUEUE_PRIORITIES,
  PRIORITY_PROCESSING_CONFIG,
  
  // Monitoramento
  HEALTH_METRICS,
  METRICS_INTERVALS,
  
  // Exportação
  EXPORT_FORMATS,
  EXPORT_LIMITS,
  DEFAULT_EXPORT_FIELDS,
  
  // Desenvolvimento
  TEST_MODE_CONFIG,
  TEST_DATA,
  
  // Erros
  ERROR_MESSAGES,
  
  // Regex
  REGEX_PATTERNS
};

export default NotificationConstants;
