/**
 * Sistema de alertas para monitoramento em produção
 * Detecta anomalias e envia notificações para diferentes canais
 */

import { logger } from './logger';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertChannel = 'email' | 'slack' | 'webhook' | 'sms';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
  condition: (metrics: any) => boolean;
  threshold?: number;
  timeWindow?: number; // em minutos
  cooldown?: number; // em minutos
  channels: AlertChannel[];
  tags: string[];
  metadata?: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  timestamp: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
  channels: AlertChannel[];
  tags: string[];
}

export interface AlertConfig {
  enabled: boolean;
  channels: {
    email?: {
      enabled: boolean;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      from: string;
      to: string[];
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
      username: string;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
      timeout: number;
    };
    sms?: {
      enabled: boolean;
      provider: 'twilio' | 'aws-sns';
      config: Record<string, any>;
      numbers: string[];
    };
  };
  rules: AlertRule[];
  storage: {
    type: 'memory' | 'database';
    maxAlerts: number;
    retentionDays: number;
  };
}

class AlertManager {
  private config: AlertConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastTriggered: Map<string, number> = new Map();
  private metrics: any = {};

  constructor(config: AlertConfig) {
    this.config = config;
    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    // Coletar métricas a cada minuto
    setInterval(() => {
      this.collectMetrics();
      this.evaluateRules();
    }, 60000);
  }

  private async collectMetrics() {
    try {
      // Métricas do sistema
      const systemMetrics = {
        memory: {
          used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
          usage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        },
        cpu: {
          usage: process.cpuUsage(),
        },
        uptime: process.uptime(),
      };

      // Métricas da aplicação (simuladas - integrar com métricas reais)
      const appMetrics = {
        requests: {
          total: await this.getRequestCount(),
          errors: await this.getErrorCount(),
          responseTime: await this.getAverageResponseTime(),
        },
        database: {
          connections: await this.getDatabaseConnections(),
          queryTime: await this.getAverageQueryTime(),
        },
        bpix: {
          payments: await this.getBpixPaymentCount(),
          errors: await this.getBpixErrorCount(),
          webhooks: await this.getBpixWebhookCount(),
        },
      };

      this.metrics = {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        application: appMetrics,
      };

      logger.debug('Métricas coletadas', { metrics: this.metrics });
    } catch (error) {
      logger.error('Erro ao coletar métricas', error as Error);
    }
  }

  private evaluateRules() {
    if (!this.config.enabled) return;

    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      try {
        const shouldTrigger = rule.condition(this.metrics);
        const now = Date.now();
        const lastTrigger = this.lastTriggered.get(rule.id) || 0;
        const cooldownMs = (rule.cooldown || 5) * 60 * 1000;

        if (shouldTrigger && (now - lastTrigger) > cooldownMs) {
          this.triggerAlert(rule);
          this.lastTriggered.set(rule.id, now);
        }
      } catch (error) {
        logger.error(`Erro ao avaliar regra ${rule.id}`, error as Error);
      }
    }
  }

  private async triggerAlert(rule: AlertRule) {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ruleId: rule.id,
      severity: rule.severity,
      status: 'active',
      title: rule.name,
      message: rule.description,
      timestamp: new Date().toISOString(),
      channels: rule.channels,
      tags: rule.tags,
      metadata: {
        ...rule.metadata,
        metrics: this.metrics,
      },
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    logger.warn('Alerta disparado', {
      alertId: alert.id,
      rule: rule.name,
      severity: alert.severity,
    });

    // Enviar notificações
    await this.sendNotifications(alert);
  }

  private async sendNotifications(alert: Alert) {
    const promises = alert.channels.map(channel => {
      switch (channel) {
        case 'email':
          return this.sendEmailAlert(alert);
        case 'slack':
          return this.sendSlackAlert(alert);
        case 'webhook':
          return this.sendWebhookAlert(alert);
        case 'sms':
          return this.sendSmsAlert(alert);
        default:
          logger.warn(`Canal de alerta não suportado: ${channel}`);
          return Promise.resolve();
      }
    });

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Erro ao enviar notificações', error as Error);
    }
  }

  private async sendEmailAlert(alert: Alert) {
    const emailConfig = this.config.channels.email;
    if (!emailConfig?.enabled) return;

    try {
      // Implementar envio de email (usar nodemailer ou similar)
      logger.info('Email de alerta enviado', { alertId: alert.id });
    } catch (error) {
      logger.error('Erro ao enviar email de alerta', error as Error);
    }
  }

  private async sendSlackAlert(alert: Alert) {
    const slackConfig = this.config.channels.slack;
    if (!slackConfig?.enabled) return;

    try {
      const payload = {
        channel: slackConfig.channel,
        username: slackConfig.username,
        text: `🚨 *${alert.title}*`,
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            fields: [
              {
                title: 'Severidade',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Status',
                value: alert.status,
                short: true,
              },
              {
                title: 'Timestamp',
                value: alert.timestamp,
                short: false,
              },
              {
                title: 'Descrição',
                value: alert.message,
                short: false,
              },
            ],
          },
        ],
      };

      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API retornou ${response.status}`);
      }

      logger.info('Alerta Slack enviado', { alertId: alert.id });
    } catch (error) {
      logger.error('Erro ao enviar alerta Slack', error as Error);
    }
  }

  private async sendWebhookAlert(alert: Alert) {
    const webhookConfig = this.config.channels.webhook;
    if (!webhookConfig?.enabled) return;

    try {
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers,
        },
        body: JSON.stringify(alert),
        signal: AbortSignal.timeout(webhookConfig.timeout || 5000),
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou ${response.status}`);
      }

      logger.info('Webhook de alerta enviado', { alertId: alert.id });
    } catch (error) {
      logger.error('Erro ao enviar webhook de alerta', error as Error);
    }
  }

  private async sendSmsAlert(alert: Alert) {
    const smsConfig = this.config.channels.sms;
    if (!smsConfig?.enabled) return;

    try {
      // Implementar envio de SMS baseado no provider
      logger.info('SMS de alerta enviado', { alertId: alert.id });
    } catch (error) {
      logger.error('Erro ao enviar SMS de alerta', error as Error);
    }
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      low: '#36a64f',     // Verde
      medium: '#ff9500',  // Laranja
      high: '#ff0000',    // Vermelho
      critical: '#8b0000', // Vermelho escuro
    };
    return colors[severity] || '#808080';
  }

  // Métodos para obter métricas (implementar integração real)
  private async getRequestCount(): Promise<number> {
    // Integrar com sistema de métricas real
    return Math.floor(Math.random() * 1000);
  }

  private async getErrorCount(): Promise<number> {
    return Math.floor(Math.random() * 10);
  }

  private async getAverageResponseTime(): Promise<number> {
    return Math.floor(Math.random() * 500) + 100;
  }

  private async getDatabaseConnections(): Promise<number> {
    return Math.floor(Math.random() * 20) + 5;
  }

  private async getAverageQueryTime(): Promise<number> {
    return Math.floor(Math.random() * 100) + 10;
  }

  private async getBpixPaymentCount(): Promise<number> {
    return Math.floor(Math.random() * 50);
  }

  private async getBpixErrorCount(): Promise<number> {
    return Math.floor(Math.random() * 3);
  }

  private async getBpixWebhookCount(): Promise<number> {
    return Math.floor(Math.random() * 30);
  }

  // Métodos públicos
  public acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date().toISOString();
      alert.acknowledgedBy = acknowledgedBy;
      
      logger.info('Alerta reconhecido', {
        alertId,
        acknowledgedBy,
      });
    }
  }

  public resolveAlert(alertId: string) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      this.activeAlerts.delete(alertId);
      
      logger.info('Alerta resolvido', { alertId });
    }
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(limit = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  public addRule(rule: AlertRule) {
    const existingIndex = this.config.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.config.rules[existingIndex] = rule;
    } else {
      this.config.rules.push(rule);
    }
    
    logger.info('Regra de alerta adicionada/atualizada', { ruleId: rule.id });
  }

  public removeRule(ruleId: string) {
    this.config.rules = this.config.rules.filter(r => r.id !== ruleId);
    logger.info('Regra de alerta removida', { ruleId });
  }

  public getCurrentMetrics() {
    return this.metrics;
  }
}

// Regras de alerta padrão
export const defaultAlertRules: AlertRule[] = [
  {
    id: 'high_memory_usage',
    name: 'Alto uso de memória',
    description: 'Uso de memória acima de 80%',
    severity: 'high',
    enabled: true,
    condition: (metrics) => metrics.system?.memory?.usage > 80,
    threshold: 80,
    timeWindow: 5,
    cooldown: 10,
    channels: ['slack', 'email'],
    tags: ['system', 'memory'],
  },
  {
    id: 'high_error_rate',
    name: 'Alta taxa de erros',
    description: 'Taxa de erros acima de 5%',
    severity: 'critical',
    enabled: true,
    condition: (metrics) => {
      const requests = metrics.application?.requests;
      if (!requests?.total || requests.total === 0) return false;
      return (requests.errors / requests.total) * 100 > 5;
    },
    threshold: 5,
    timeWindow: 5,
    cooldown: 5,
    channels: ['slack', 'email', 'sms'],
    tags: ['application', 'errors'],
  },
  {
    id: 'slow_response_time',
    name: 'Tempo de resposta lento',
    description: 'Tempo médio de resposta acima de 2 segundos',
    severity: 'medium',
    enabled: true,
    condition: (metrics) => metrics.application?.requests?.responseTime > 2000,
    threshold: 2000,
    timeWindow: 10,
    cooldown: 15,
    channels: ['slack'],
    tags: ['application', 'performance'],
  },
  {
    id: 'bpix_errors',
    name: 'Erros na integração BPIX',
    description: 'Erros detectados na integração BPIX',
    severity: 'high',
    enabled: true,
    condition: (metrics) => metrics.application?.bpix?.errors > 0,
    threshold: 0,
    timeWindow: 5,
    cooldown: 10,
    channels: ['slack', 'email'],
    tags: ['bpix', 'integration'],
  },
  {
    id: 'database_slow_queries',
    name: 'Consultas lentas no banco',
    description: 'Tempo médio de consulta acima de 1 segundo',
    severity: 'medium',
    enabled: true,
    condition: (metrics) => metrics.application?.database?.queryTime > 1000,
    threshold: 1000,
    timeWindow: 10,
    cooldown: 20,
    channels: ['slack'],
    tags: ['database', 'performance'],
  },
];

// Configuração padrão
export const defaultAlertConfig: AlertConfig = {
  enabled: process.env.NODE_ENV === 'production',
  channels: {
    email: {
      enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      from: process.env.ALERT_EMAIL_FROM || 'alerts@hubcontrol.com',
      to: (process.env.ALERT_EMAIL_TO || '').split(',').filter(Boolean),
    },
    slack: {
      enabled: process.env.ALERT_SLACK_ENABLED === 'true',
      webhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL || '',
      channel: process.env.ALERT_SLACK_CHANNEL || '#alerts',
      username: process.env.ALERT_SLACK_USERNAME || 'Hub Control Alerts',
    },
    webhook: {
      enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
      url: process.env.ALERT_WEBHOOK_URL || '',
      timeout: parseInt(process.env.ALERT_WEBHOOK_TIMEOUT || '5000'),
    },
    sms: {
      enabled: process.env.ALERT_SMS_ENABLED === 'true',
      provider: (process.env.ALERT_SMS_PROVIDER as 'twilio' | 'aws-sns') || 'twilio',
      config: {},
      numbers: (process.env.ALERT_SMS_NUMBERS || '').split(',').filter(Boolean),
    },
  },
  rules: defaultAlertRules,
  storage: {
    type: 'memory',
    maxAlerts: 1000,
    retentionDays: 30,
  },
};

// Instância global do gerenciador de alertas
export const alertManager = new AlertManager(defaultAlertConfig);

export default alertManager;
