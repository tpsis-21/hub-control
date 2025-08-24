# Sistema de Notificações - Documentação Técnica

## Visão Geral

O Sistema de Notificações do Hub Control é uma solução completa e escalável para envio de notificações através de múltiplos canais. Este documento fornece informações técnicas detalhadas sobre a arquitetura, implementação e uso do sistema.

## Índice

1. [Arquitetura](#arquitetura)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Banco de Dados](#banco-de-dados)
4. [APIs](#apis)
5. [Canais de Notificação](#canais-de-notificação)
6. [Sistema de Templates](#sistema-de-templates)
7. [Rate Limiting](#rate-limiting)
8. [Sistema de Retry](#sistema-de-retry)
9. [Webhooks](#webhooks)
10. [Monitoramento](#monitoramento)
11. [Segurança](#segurança)
12. [Performance](#performance)
13. [Testes](#testes)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)

## Arquitetura

### Componentes Principais

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   REST APIs     │    │   Core System   │
│                 │    │                 │    │                 │
│ - Dashboard     │◄──►│ - /notifications│◄──►│ - Queue Manager │
│ - Settings      │    │ - /templates    │    │ - Channel Impl  │
│ - Analytics     │    │ - /channels     │    │ - Rate Limiter  │
│ - Webhooks      │    │ - /webhooks     │    │ - Retry Engine  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲                       ▲
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Database      │    │   External APIs │
                       │                 │    │                 │
                       │ - Notifications │    │ - SMTP Servers  │
                       │ - Templates     │    │ - SMS Providers │
                       │ - Channels      │    │ - Slack API     │
                       │ - Delivery Logs │    │ - Push Services │
                       │ - Webhooks      │    │ - Webhooks      │
                       └─────────────────┘    └─────────────────┘
```

### Fluxo de Processamento

```
1. Request → 2. Validation → 3. Queue → 4. Processing → 5. Delivery → 6. Logging
     ▲              ▲             ▲          ▲            ▲           ▲
     │              │             │          │            │           │
   API/UI      Rate Limit    Priority    Channel      External    Database
              Template       Queue       Selection      APIs        Logs
              Variables
```

## Estrutura de Arquivos

```
src/
├── lib/notifications/
│   ├── core/
│   │   ├── NotificationSystem.ts     # Sistema principal
│   │   ├── QueueManager.ts           # Gerenciador de fila
│   │   ├── RateLimiter.ts           # Rate limiting
│   │   └── RetryEngine.ts           # Sistema de retry
│   ├── channels/
│   │   ├── BaseChannel.ts           # Classe base
│   │   ├── EmailChannel.ts          # Implementação email
│   │   ├── SMSChannel.ts            # Implementação SMS
│   │   ├── SlackChannel.ts          # Implementação Slack
│   │   ├── WebhookChannel.ts        # Implementação webhook
│   │   └── index.ts                 # Exportações
│   ├── templates/
│   │   ├── TemplateEngine.ts        # Engine de templates
│   │   └── TemplateValidator.ts     # Validação
│   ├── utils.ts                     # Utilitários
│   ├── constants.ts                 # Constantes
│   └── index.ts                     # Exportação principal
├── components/dashboard/
│   ├── NotificationCenter.tsx       # Dashboard principal
│   ├── NotificationDashboard.tsx    # Visão geral
│   ├── NotificationSettings.tsx     # Configurações
│   ├── NotificationAnalytics.tsx    # Analytics
│   ├── NotificationTemplateManager.tsx # Templates
│   └── NotificationWebhooks.tsx     # Webhooks
├── hooks/
│   └── useNotifications.ts          # Hook React
├── types/
│   └── notifications.ts             # Tipos TypeScript
└── app/api/notifications/
    ├── route.ts                     # CRUD notifications
    ├── send/route.ts                # Envio
    ├── templates/route.ts           # Templates
    ├── channels/route.ts            # Canais
    ├── webhooks/route.ts            # Webhooks
    ├── stats/route.ts               # Estatísticas
    └── summary/route.ts             # Resumo
```

## Banco de Dados

### Schema Principal

```sql
-- Tabela principal de notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  recipients JSONB NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  priority notification_priority DEFAULT 'medium',
  status notification_status DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  template_id UUID REFERENCES notification_templates(id),
  template_variables JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id)
);

-- Templates de notificação
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type notification_type NOT NULL,
  subject_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Configurações de canais
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel notification_channel NOT NULL UNIQUE,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  rate_limit JSONB,
  retry_policy JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Logs de entrega
CREATE TABLE notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  recipient JSONB NOT NULL,
  status delivery_status NOT NULL,
  attempts INTEGER DEFAULT 1,
  response_data JSONB,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processing_time_ms INTEGER
);

-- Webhooks
CREATE TABLE notification_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  headers JSONB DEFAULT '{}',
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  retry_policy JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0
);

-- Destinatários
CREATE TABLE notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  channels notification_channel[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Índices

```sql
-- Índices para performance
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

CREATE INDEX idx_delivery_logs_notification_id ON notification_delivery_logs(notification_id);
CREATE INDEX idx_delivery_logs_status ON notification_delivery_logs(status);
CREATE INDEX idx_delivery_logs_created_at ON notification_delivery_logs(created_at);

CREATE INDEX idx_templates_type ON notification_templates(type);
CREATE INDEX idx_templates_enabled ON notification_templates(enabled);

CREATE INDEX idx_channels_enabled ON notification_channels(enabled);

CREATE INDEX idx_webhooks_enabled ON notification_webhooks(enabled);
```

### Triggers

```sql
-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON notification_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON notification_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at
  BEFORE UPDATE ON notification_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## APIs

### Endpoints Principais

#### POST /api/notifications/send

Envia uma notificação.

```typescript
// Request
interface SendNotificationRequest {
  type: NotificationType;
  channel: NotificationChannel;
  recipients: NotificationRecipient[];
  subject: string;
  content: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
  scheduled_for?: string;
  expires_at?: string;
  template_id?: string;
  template_variables?: Record<string, any>;
}

// Response
interface SendNotificationResponse {
  success: boolean;
  notification_id?: string;
  error?: string;
  delivery_logs?: NotificationDeliveryLog[];
}
```

#### GET /api/notifications

Lista notificações com filtros e paginação.

```typescript
// Query Parameters
interface NotificationListParams {
  type?: NotificationType[];
  channel?: NotificationChannel[];
  status?: NotificationStatus[];
  priority?: NotificationPriority[];
  recipient?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Response
interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
```

#### GET /api/notifications/stats

Estatísticas do sistema.

```typescript
// Query Parameters
interface StatsParams {
  period?: '1h' | '24h' | '7d' | '30d' | '90d' | 'custom';
  start_date?: string;
  end_date?: string;
  channel?: NotificationChannel[];
  type?: NotificationType[];
  timezone?: string;
}

// Response
interface StatsResponse {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_pending: number;
  delivery_rate: number;
  average_processing_time_ms: number;
  stats_by_channel: Record<NotificationChannel, ChannelStats>;
  stats_by_type: Record<NotificationType, TypeStats>;
  stats_by_priority: Record<NotificationPriority, PriorityStats>;
  period_start: string;
  period_end: string;
}
```

### Autenticação e Autorização

Todas as APIs requerem autenticação via JWT token:

```typescript
// Headers obrigatórios
const headers = {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
};
```

### Rate Limiting

As APIs implementam rate limiting:

- **Envio de notificações**: 100 requests/hora por usuário
- **Consultas**: 1000 requests/hora por usuário
- **Webhooks**: 500 requests/hora por webhook

### Códigos de Status

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `401` - Não autenticado
- `403` - Não autorizado
- `404` - Não encontrado
- `429` - Rate limit excedido
- `500` - Erro interno

## Canais de Notificação

### Implementação Base

Todos os canais implementam a interface `NotificationChannelImplementation`:

```typescript
interface NotificationChannelImplementation {
  send(notification: Notification, config: ChannelConfig): Promise<DeliveryResult>;
  validate(config: ChannelConfig): Promise<ValidationResult>;
  test(config: ChannelConfig): Promise<ValidationResult>;
}
```

### Email Channel

```typescript
// Configuração
interface EmailChannelConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure?: boolean;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  from_name?: string;
  reply_to?: string;
}

// Implementação
class EmailChannel implements NotificationChannelImplementation {
  async send(notification: Notification, config: EmailChannelConfig): Promise<DeliveryResult> {
    const transporter = nodemailer.createTransporter({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      }
    });

    const mailOptions = {
      from: `${config.from_name || 'Sistema'} <${config.from_email}>`,
      to: notification.recipients.map(r => (r as EmailRecipient).email).join(','),
      subject: notification.subject,
      html: notification.content,
      replyTo: config.reply_to
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return {
        success: true,
        message_id: result.messageId,
        processing_time_ms: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processing_time_ms: 0
      };
    }
  }
}
```

### SMS Channel

```typescript
// Configuração
interface SMSChannelConfig {
  provider: 'twilio' | 'aws-sns' | 'nexmo';
  account_sid?: string; // Twilio
  auth_token?: string;  // Twilio
  from_number?: string; // Twilio
  aws_access_key_id?: string;     // AWS SNS
  aws_secret_access_key?: string; // AWS SNS
  aws_region?: string;            // AWS SNS
}

// Implementação Twilio
class TwilioSMSProvider {
  async send(to: string, message: string, config: SMSChannelConfig): Promise<DeliveryResult> {
    const client = twilio(config.account_sid, config.auth_token);
    
    try {
      const result = await client.messages.create({
        body: message,
        from: config.from_number,
        to: to
      });
      
      return {
        success: true,
        message_id: result.sid,
        processing_time_ms: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processing_time_ms: 0
      };
    }
  }
}
```

### Slack Channel

```typescript
// Configuração
interface SlackChannelConfig {
  bot_token?: string;
  webhook_url?: string;
  default_channel?: string;
}

// Implementação
class SlackChannel implements NotificationChannelImplementation {
  async send(notification: Notification, config: SlackChannelConfig): Promise<DeliveryResult> {
    if (config.webhook_url) {
      return this.sendViaWebhook(notification, config);
    } else if (config.bot_token) {
      return this.sendViaAPI(notification, config);
    }
    
    throw new Error('Configuração do Slack inválida');
  }
  
  private async sendViaWebhook(notification: Notification, config: SlackChannelConfig): Promise<DeliveryResult> {
    const payload = {
      text: notification.subject,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: notification.content
          }
        }
      ]
    };
    
    const response = await fetch(config.webhook_url!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    return {
      success: response.ok,
      error: response.ok ? undefined : await response.text(),
      processing_time_ms: 0
    };
  }
}
```

## Sistema de Templates

### Template Engine

```typescript
class TemplateEngine {
  render(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variable) => {
      const keys = variable.trim().split('.');
      let value = variables;
      
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) break;
      }
      
      return value !== undefined ? String(value) : match;
    });
  }
  
  validate(template: string, variables: string[]): ValidationResult {
    const requiredVars = this.extractVariables(template);
    const missingVars = requiredVars.filter(v => !variables.includes(v));
    
    return {
      valid: missingVars.length === 0,
      errors: missingVars.map(v => `Variável '${v}' é obrigatória`)
    };
  }
  
  extractVariables(template: string): string[] {
    const regex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    return variables;
  }
}
```

### Uso de Templates

```typescript
// Criando um template
const template = await createTemplate({
  name: 'welcome_user',
  type: 'user',
  subject_template: 'Bem-vindo ao {{app_name}}, {{user.name}}!',
  content_template: `
    Olá {{user.name}},
    
    Sua conta foi criada em {{created_at}}.
    
    {{#if user.email_verified}}
    Seu email foi verificado com sucesso.
    {{else}}
    Por favor, verifique seu email clicando no link enviado.
    {{/if}}
  `,
  variables: ['app_name', 'user.name', 'user.email_verified', 'created_at']
});

// Enviando com template
const result = await sendNotification({
  template_id: template.id,
  template_variables: {
    app_name: 'Hub Control',
    user: {
      name: 'João Silva',
      email_verified: true
    },
    created_at: new Date().toLocaleDateString()
  },
  channel: 'email',
  recipients: [{ email: 'joao@example.com' }]
});
```

## Rate Limiting

### Implementação

```typescript
class RateLimiter {
  private cache = new Map<string, { count: number; resetTime: number }>();
  
  async checkLimit(
    key: string, 
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; resetTime?: number }> {
    const now = Date.now();
    const windowMs = config.window_seconds * 1000;
    
    let bucket = this.cache.get(key);
    
    if (!bucket || now >= bucket.resetTime) {
      bucket = {
        count: 0,
        resetTime: now + windowMs
      };
      this.cache.set(key, bucket);
    }
    
    if (bucket.count >= config.max_requests) {
      return {
        allowed: false,
        resetTime: bucket.resetTime
      };
    }
    
    bucket.count++;
    return { allowed: true };
  }
  
  generateKey(channel: NotificationChannel, identifier: string): string {
    return `rate_limit:${channel}:${identifier}`;
  }
}
```

### Configuração por Canal

```typescript
const rateLimits: Record<NotificationChannel, RateLimitConfig> = {
  email: {
    max_requests: 100,
    window_seconds: 3600, // 1 hora
    burst_limit: 10
  },
  sms: {
    max_requests: 50,
    window_seconds: 3600,
    burst_limit: 5
  },
  slack: {
    max_requests: 100,
    window_seconds: 60, // Limite do Slack
    burst_limit: 10
  }
};
```

## Sistema de Retry

### Implementação

```typescript
class RetryEngine {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    policy: RetryPolicy,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= policy.max_retries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= policy.max_retries && this.shouldRetry(error, policy)) {
          const delay = this.calculateDelay(attempt, policy);
          await this.sleep(delay);
          
          console.log(`Retry attempt ${attempt} for ${context} after ${delay}ms`);
        } else {
          break;
        }
      }
    }
    
    throw lastError!;
  }
  
  private shouldRetry(error: any, policy: RetryPolicy): boolean {
    if (error.code && policy.retry_on_status_codes) {
      return policy.retry_on_status_codes.includes(error.code);
    }
    
    // Retry em erros de rede por padrão
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ENOTFOUND';
  }
  
  private calculateDelay(attempt: number, policy: RetryPolicy): number {
    const baseDelay = (policy.initial_delay_seconds || 1) * 1000;
    const delay = baseDelay * Math.pow(policy.backoff_multiplier, attempt - 1);
    const maxDelay = policy.max_delay_seconds * 1000;
    
    return Math.min(delay, maxDelay);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Políticas por Canal

```typescript
const retryPolicies: Record<NotificationChannel, RetryPolicy> = {
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
  }
};
```

## Webhooks

### Implementação

```typescript
class WebhookManager {
  async triggerWebhook(
    webhook: NotificationWebhook,
    event: NotificationEvent
  ): Promise<void> {
    if (!webhook.enabled || !webhook.events.includes(event.type)) {
      return;
    }
    
    const payload = {
      event: event.type,
      notification_id: event.notification_id,
      channel: event.channel,
      recipient: event.recipient,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata
    };
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HubControl-Notifications/1.0',
      ...webhook.headers
    };
    
    if (webhook.secret) {
      const signature = this.generateSignature(payload, webhook.secret);
      headers['X-Notification-Signature'] = signature;
    }
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30s timeout
      });
      
      if (response.ok) {
        await this.updateWebhookStats(webhook.id, true);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      await this.updateWebhookStats(webhook.id, false);
      throw error;
    }
  }
  
  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }
}
```

### Verificação de Assinatura

```typescript
// No endpoint que recebe o webhook
export async function POST(request: Request) {
  const signature = request.headers.get('X-Notification-Signature');
  const body = await request.text();
  
  if (!verifySignature(body, signature, process.env.WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const event = JSON.parse(body);
  // Processar evento...
  
  return new Response('OK');
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const expectedSignature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

## Monitoramento

### Métricas de Saúde

```typescript
class HealthMonitor {
  async checkSystemHealth(): Promise<SystemHealth> {
    const stats = await this.getRecentStats();
    const issues: string[] = [];
    
    // Verificar taxa de entrega
    if (stats.delivery_rate < 0.95) {
      issues.push(`Taxa de entrega baixa: ${(stats.delivery_rate * 100).toFixed(1)}%`);
    }
    
    // Verificar notificações pendentes
    if (stats.pending_notifications > 1000) {
      issues.push(`Muitas notificações pendentes: ${stats.pending_notifications}`);
    }
    
    // Verificar falhas recentes
    if (stats.failed_notifications_last_hour > 100) {
      issues.push(`Muitas falhas na última hora: ${stats.failed_notifications_last_hour}`);
    }
    
    // Verificar tempo de processamento
    if (stats.average_processing_time_ms > 5000) {
      issues.push(`Tempo de processamento alto: ${stats.average_processing_time_ms}ms`);
    }
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      delivery_rate: stats.delivery_rate,
      pending_notifications: stats.pending_notifications,
      failed_notifications_last_hour: stats.failed_notifications_last_hour,
      average_processing_time_ms: stats.average_processing_time_ms,
      active_channels: stats.active_channels,
      total_channels: stats.total_channels,
      issues,
      last_check: new Date()
    };
  }
}
```

### Alertas

```typescript
class AlertManager {
  async checkAlerts(): Promise<void> {
    const health = await this.healthMonitor.checkSystemHealth();
    
    if (health.status === 'unhealthy') {
      await this.sendAlert({
        type: 'system',
        priority: 'urgent',
        subject: '🚨 Sistema de Notificações com Problemas Críticos',
        content: `
          O sistema de notificações está com problemas críticos:
          
          ${health.issues.map(issue => `• ${issue}`).join('\n')}
          
          Taxa de entrega: ${(health.delivery_rate * 100).toFixed(1)}%
          Notificações pendentes: ${health.pending_notifications}
          Falhas na última hora: ${health.failed_notifications_last_hour}
        `,
        recipients: await this.getAdminRecipients()
      });
    }
  }
}
```

## Segurança

### Sanitização de Conteúdo

```typescript
class ContentSanitizer {
  sanitize(content: string): string {
    // Remove scripts
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove event handlers
    content = content.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: links
    content = content.replace(/javascript:/gi, '');
    
    // Sanitize HTML tags
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'];
    // Implementar sanitização baseada em whitelist...
    
    return content;
  }
  
  validateLength(content: string, maxLength: number): boolean {
    return content.length <= maxLength;
  }
}
```

### Criptografia

```typescript
class EncryptionService {
  encrypt(data: string, key: string): string {
    const crypto = require('crypto');
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  decrypt(encryptedData: string, key: string): string {
    const crypto = require('crypto');
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

## Performance

### Otimizações

1. **Connection Pooling**: Reutilização de conexões SMTP
2. **Batch Processing**: Processamento em lote para múltiplos destinatários
3. **Caching**: Cache de templates e configurações
4. **Queue Management**: Fila com prioridades
5. **Lazy Loading**: Carregamento sob demanda de componentes

### Métricas

```typescript
class PerformanceMonitor {
  async measureDeliveryTime(operation: () => Promise<any>): Promise<{ result: any; timeMs: number }> {
    const start = performance.now();
    const result = await operation();
    const timeMs = performance.now() - start;
    
    // Log métrica
    await this.logMetric('delivery_time', timeMs);
    
    return { result, timeMs };
  }
  
  async getAverageProcessingTime(channel: NotificationChannel, period: string): Promise<number> {
    // Consultar banco de dados para calcular média
    const { data } = await supabase
      .from('notification_delivery_logs')
      .select('processing_time_ms')
      .eq('channel', channel)
      .gte('created_at', this.getPeriodStart(period))
      .not('processing_time_ms', 'is', null);
    
    if (!data || data.length === 0) return 0;
    
    const total = data.reduce((sum, log) => sum + log.processing_time_ms, 0);
    return total / data.length;
  }
}
```

## Testes

### Testes Unitários

```typescript
// __tests__/notification-system.test.ts
describe('NotificationSystem', () => {
  let system: NotificationSystem;
  
  beforeEach(() => {
    system = new NotificationSystem({
      supabase: mockSupabase,
      config: testConfig
    });
  });
  
  describe('sendNotification', () => {
    it('should send email notification successfully', async () => {
      const request: NotificationRequest = {
        type: 'user',
        channel: 'email',
        recipients: [{ email: 'test@example.com' }],
        subject: 'Test',
        content: 'Test content',
        priority: 'medium'
      };
      
      const result = await system.sendNotification(request);
      
      expect(result.success).toBe(true);
      expect(result.notification_id).toBeDefined();
    });
    
    it('should handle rate limiting', async () => {
      // Simular rate limit excedido
      mockRateLimiter.checkLimit.mockResolvedValue({ allowed: false });
      
      const request: NotificationRequest = {
        type: 'user',
        channel: 'email',
        recipients: [{ email: 'test@example.com' }],
        subject: 'Test',
        content: 'Test content',
        priority: 'medium'
      };
      
      await expect(system.sendNotification(request))
        .rejects.toThrow('Rate limit exceeded');
    });
  });
});
```

### Testes de Integração

```typescript
// __tests__/integration/email-channel.test.ts
describe('EmailChannel Integration', () => {
  it('should send real email in test environment', async () => {
    if (process.env.NODE_ENV !== 'test') {
      return; // Skip em outros ambientes
    }
    
    const channel = new EmailChannel();
    const config: EmailChannelConfig = {
      smtp_host: process.env.TEST_SMTP_HOST!,
      smtp_port: parseInt(process.env.TEST_SMTP_PORT!),
      smtp_user: process.env.TEST_SMTP_USER!,
      smtp_pass: process.env.TEST_SMTP_PASS!,
      from_email: process.env.TEST_FROM_EMAIL!
    };
    
    const notification: Notification = {
      id: 'test-id',
      type: 'user',
      channel: 'email',
      recipients: [{ email: process.env.TEST_TO_EMAIL! }],
      subject: 'Test Email',
      content: 'This is a test email',
      priority: 'medium',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      retry_count: 0
    };
    
    const result = await channel.send(notification, config);
    
    expect(result.success).toBe(true);
    expect(result.message_id).toBeDefined();
  });
});
```

## Deployment

### Variáveis de Ambiente

```bash
# .env.production

# Sistema
NOTIFICATION_SYSTEM_ENABLED=true
NOTIFICATION_DEFAULT_CHANNEL=email
NOTIFICATION_RATE_LIMIT_ENABLED=true
NOTIFICATION_QUEUE_SIZE=10000
NOTIFICATION_WORKERS=5

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourapp.com
FROM_NAME="Your App"

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Webhooks
WEBHOOK_TIMEOUT_SECONDS=30
WEBHOOK_SECRET=your-webhook-secret

# Segurança
CONTENT_SANITIZATION=true
MAX_CONTENT_LENGTH=10000
MAX_RECIPIENTS=100

# Logs
LOG_LEVEL=info
LOG_DELIVERY=true
LOG_ERRORS=true

# Cache
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300

# Limpeza
AUTO_CLEANUP=true
RETENTION_DAYS=90
LOG_RETENTION_DAYS=30
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NOTIFICATION_SYSTEM_ENABLED=true
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=hubcontrol
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Troubleshooting

### Problemas Comuns

#### 1. Emails não sendo enviados

**Sintomas**: Status "failed" para notificações de email

**Possíveis causas**:
- Configuração SMTP incorreta
- Credenciais inválidas
- Firewall bloqueando porta SMTP
- Rate limit do provedor

**Soluções**:
```bash
# Testar configuração SMTP
curl -v telnet://smtp.gmail.com:587

# Verificar logs
tail -f logs/notification-system.log | grep email

# Testar canal
POST /api/notifications/channels/test
{
  "channel": "email",
  "config": { ... }
}
```

#### 2. Rate limit sendo atingido

**Sintomas**: Erro 429 nas APIs

**Soluções**:
```typescript
// Verificar configuração de rate limit
const rateLimitConfig = await getRateLimitConfig('email');
console.log('Current limits:', rateLimitConfig);

// Ajustar limites se necessário
await updateRateLimitConfig('email', {
  max_requests: 200,
  window_seconds: 3600
});
```

#### 3. Webhooks falhando

**Sintomas**: Webhooks com status "failed"

**Verificações**:
```bash
# Testar endpoint manualmente
curl -X POST https://your-webhook-url.com \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar logs de webhook
SELECT * FROM notification_webhooks 
WHERE failure_count > 0 
ORDER BY last_triggered_at DESC;
```

### Logs e Debugging

```typescript
// Habilitar logs detalhados
process.env.LOG_LEVEL = 'debug';
process.env.LOG_DELIVERY = 'true';
process.env.LOG_PERFORMANCE = 'true';

// Consultar logs no banco
const logs = await supabase
  .from('notification_delivery_logs')
  .select('*')
  .eq('status', 'failed')
  .order('created_at', { ascending: false })
  .limit(50);

console.log('Recent failures:', logs.data);
```

### Monitoramento de Produção

```typescript
// Script de monitoramento
setInterval(async () => {
  const health = await checkSystemHealth();
  
  if (health.status !== 'healthy') {
    console.error('System health check failed:', health);
    
    // Enviar alerta para administradores
    await sendAlert({
      type: 'system',
      priority: 'urgent',
      subject: 'Sistema de Notificações com Problemas',
      content: JSON.stringify(health, null, 2)
    });
  }
}, 60000); // A cada minuto
```

### Performance Tuning

```typescript
// Otimizações de performance
const optimizations = {
  // Aumentar workers para maior throughput
  workers: 10,
  
  // Reduzir timeout para falhas mais rápidas
  timeout_seconds: 15,
  
  // Habilitar connection pooling
  email_pool: true,
  max_connections: 5,
  
  // Ajustar cache
  cache_ttl_seconds: 600,
  
  // Batch processing
  batch_size: 50,
  batch_interval_ms: 1000
};
```

---

## Conclusão

Este sistema de notificações fornece uma base sólida e escalável para envio de notificações em aplicações modernas. A arquitetura modular permite fácil extensão para novos canais e funcionalidades, enquanto as práticas de segurança e monitoramento garantem operação confiável em produção.

Para mais informações, consulte:
- [Guia do Usuário](./NOTIFICATION_SYSTEM_GUIDE.md)
- [README do Sistema](../src/lib/notifications/README.md)
- [Testes](../src/__tests__/notification-system.test.ts)