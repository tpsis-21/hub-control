// 🔔 Configurações Unificadas de Canais de Notificação
// Módulo centralizado para configurações compartilhadas entre sistemas de notificação

import { NotificationChannel } from '@/types/notifications';

// Interface unificada para configuração de taxa limite
export interface UnifiedRateLimit {
  maxPerSecond?: number;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay?: number;
}

// Interface unificada para política de retry
export interface UnifiedRetryPolicy {
  maxRetries?: number;
  maxAttempts?: number;
  backoffMultiplier: number;
  initialDelay?: number;
  baseDelay?: number;
  maxDelay?: number;
  initialDelaySeconds?: number;
  maxDelaySeconds?: number;
}

// Interface unificada para configuração de canal
export interface UnifiedChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  provider?: string;
  priority?: number;
  config: Record<string, any>;
  rateLimit: UnifiedRateLimit;
  retryPolicy: UnifiedRetryPolicy;
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

// Configurações unificadas dos canais
export const UNIFIED_CHANNEL_CONFIGS: UnifiedChannelConfig[] = [
  {
    channel: 'email',
    enabled: true,
    provider: 'smtp',
    priority: 1,
    config: {
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      from: process.env.SMTP_FROM || 'noreply@hubcontrol.com'
    },
    rateLimit: {
      maxPerSecond: 10,
      maxPerMinute: 60,
      maxPerHour: 1000,
      maxPerDay: 10000
    },
    retryPolicy: {
      maxRetries: 3,
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      baseDelay: 1000,
      maxDelay: 30000,
      initialDelaySeconds: 1,
      maxDelaySeconds: 30
    }
  },
  {
    channel: 'webhook',
    enabled: true,
    provider: 'http',
    priority: 2,
    config: {},
    rateLimit: {
      maxPerSecond: 50,
      maxPerMinute: 30,
      maxPerHour: 500,
      maxPerDay: 5000
    },
    retryPolicy: {
      maxRetries: 5,
      maxAttempts: 5,
      backoffMultiplier: 2,
      initialDelay: 1000,
      baseDelay: 1000,
      maxDelay: 60000,
      initialDelaySeconds: 1,
      maxDelaySeconds: 60
    }
  },
  {
    channel: 'in_app',
    enabled: true,
    provider: 'internal',
    priority: 3,
    config: {},
    rateLimit: {
      maxPerSecond: 1000,
      maxPerMinute: 200,
      maxPerHour: 5000,
      maxPerDay: 50000
    },
    retryPolicy: {
      maxRetries: 1,
      maxAttempts: 1,
      backoffMultiplier: 1,
      initialDelay: 0,
      baseDelay: 0,
      maxDelay: 0,
      initialDelaySeconds: 0,
      maxDelaySeconds: 0
    }
  }
];

// Função para obter configuração por canal
export function getChannelConfig(channel: NotificationChannel): UnifiedChannelConfig | undefined {
  return UNIFIED_CHANNEL_CONFIGS.find(config => config.channel === channel);
}

// Função para obter canais habilitados
export function getEnabledChannels(): UnifiedChannelConfig[] {
  return UNIFIED_CHANNEL_CONFIGS.filter(config => config.enabled);
}

// Função para converter para formato do sistema padrão
export function toStandardChannelConfig(config: UnifiedChannelConfig) {
  return {
    channel: config.channel,
    enabled: config.enabled,
    config: config.config,
    rateLimit: {
      maxPerMinute: config.rateLimit.maxPerMinute,
      maxPerHour: config.rateLimit.maxPerHour,
      // Garantimos que maxPerDay seja sempre um número (requisito do tipo ChannelConfig)
      maxPerDay: config.rateLimit.maxPerDay ?? config.rateLimit.maxPerHour * 24,
    },
    retryPolicy: {
      maxRetries: config.retryPolicy.maxRetries || config.retryPolicy.maxAttempts || 3,
      backoffMultiplier: config.retryPolicy.backoffMultiplier,
      initialDelay: config.retryPolicy.initialDelay || config.retryPolicy.baseDelay || 1000,
    },
  };
}

// Função para converter para formato do sistema em tempo real
export function toRealtimeChannelConfig(config: UnifiedChannelConfig) {
  return {
    enabled: config.enabled,
    provider: config.provider,
    config: config.config,
    rateLimit: {
      maxPerSecond: config.rateLimit.maxPerSecond || 10,
      maxPerMinute: config.rateLimit.maxPerMinute,
      maxPerHour: config.rateLimit.maxPerHour
    },
    retry: {
      maxAttempts: config.retryPolicy.maxAttempts || config.retryPolicy.maxRetries || 3,
      baseDelay: config.retryPolicy.baseDelay || config.retryPolicy.initialDelay || 1000,
      maxDelay: config.retryPolicy.maxDelay || 30000,
      backoffMultiplier: config.retryPolicy.backoffMultiplier
    }
  };
}

// Função para validar configuração de canal
export function validateChannelConfig(config: UnifiedChannelConfig): boolean {
  if (!config.channel || !config.enabled === undefined) {
    return false;
  }

  if (!config.rateLimit || !config.retryPolicy) {
    return false;
  }

  if (config.rateLimit.maxPerMinute <= 0 || config.rateLimit.maxPerHour <= 0) {
    return false;
  }

  if (config.retryPolicy.backoffMultiplier <= 0) {
    return false;
  }

  return true;
}

// Função para mesclar configurações personalizadas
export function mergeChannelConfig(
  base: UnifiedChannelConfig,
  override: Partial<UnifiedChannelConfig>
): UnifiedChannelConfig {
  return {
    ...base,
    ...override,
    config: { ...base.config, ...override.config },
    rateLimit: { ...base.rateLimit, ...override.rateLimit },
    retryPolicy: { ...base.retryPolicy, ...override.retryPolicy },
    conditions: { ...base.conditions, ...override.conditions }
  };
}