# Sistema de Notificações - Guia Completo

## Visão Geral

O Sistema de Notificações do Hub Control é uma solução completa e escalável para gerenciar notificações em tempo real através de múltiplos canais. O sistema suporta email, SMS, push notifications, webhooks e integrações com plataformas como Slack, Teams, Discord e Telegram.

## Arquitetura

### Componentes Principais

1. **Core System** (`src/lib/notification-system.ts`)
   - Gerenciador principal de notificações
   - Processamento de filas
   - Rate limiting e retry policies
   - Templates e personalização

2. **Database Schema** (`supabase/migrations/`)
   - Tabelas para notificações, destinatários, templates
   - Logs de entrega e estatísticas
   - Configurações de canais e webhooks
   - Políticas RLS para segurança

3. **APIs REST** (`src/app/api/notifications/`)
   - Endpoints para CRUD de notificações
   - Gerenciamento de templates e configurações
   - Estatísticas e analytics
   - Webhooks e logs

4. **Interface de Usuário** (`src/components/dashboard/`)
   - Dashboard principal
   - Gerenciamento de templates
   - Configurações de canais
   - Analytics e relatórios

5. **Hooks Personalizados** (`src/hooks/useNotifications.ts`)
   - Estado compartilhado
   - Operações assíncronas
   - Cache e otimizações

## Funcionalidades

### 1. Canais de Notificação

- **Email**: SMTP configurável
- **SMS**: Integração com provedores
- **Push**: Notificações web e mobile
- **Webhook**: HTTP callbacks
- **Slack**: Integração nativa
- **Teams**: Microsoft Teams
- **Discord**: Bots e webhooks
- **Telegram**: Bot API
- **In-app**: Notificações internas

### 2. Tipos de Notificação

- **Segurança**: Alertas de segurança
- **Performance**: Métricas e alertas
- **Sistema**: Status e manutenção
- **Backup**: Status de backups
- **Financeiro**: Transações e cobranças
- **Marketing**: Campanhas e promoções
- **Usuário**: Ações do usuário
- **Integração**: Status de integrações

### 3. Prioridades

- **Low**: Informações gerais
- **Medium**: Notificações importantes
- **High**: Alertas críticos
- **Urgent**: Emergências

### 4. Templates

- Sistema de templates flexível
- Variáveis dinâmicas
- Suporte a HTML e texto
- Versionamento
- Localização

## Configuração

### 1. Variáveis de Ambiente

```env
# Configurações gerais
NOTIFICATION_SYSTEM_ENABLED=true
NOTIFICATION_DEFAULT_CHANNEL=email
NOTIFICATION_RATE_LIMIT_ENABLED=true

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@hubcontrol.com

# SMS
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@hubcontrol.com

# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Teams
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# Discord
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

### 2. Configuração de Canais

```typescript
// Exemplo de configuração de canal
const emailConfig = {
  channel: 'email',
  config: {
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: 'user@gmail.com',
    smtp_pass: 'password',
    from_email: 'noreply@hubcontrol.com',
    from_name: 'Hub Control'
  },
  enabled: true,
  rate_limit: {
    max_requests: 100,
    window_seconds: 3600
  },
  retry_policy: {
    max_retries: 3,
    backoff_multiplier: 2,
    max_delay_seconds: 300
  }
};
```

## Uso

### 1. Enviando Notificações

#### Via API

```typescript
// POST /api/notifications
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'security',
    channel: 'email',
    recipients: [{
      email: 'user@example.com',
      name: 'João Silva'
    }],
    subject: 'Alerta de Segurança',
    content: 'Detectamos uma tentativa de login suspeita.',
    priority: 'high',
    metadata: {
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0...'
    }
  })
});
```

#### Via Sistema Interno

```typescript
import { NotificationSystem } from '@/lib/notification-system';

const notificationSystem = new NotificationSystem();

// Enviar notificação simples
await notificationSystem.sendNotification({
  type: 'system',
  channel: 'slack',
  recipients: [{ slack_user_id: 'U1234567890' }],
  subject: 'Sistema Atualizado',
  content: 'O sistema foi atualizado com sucesso.',
  priority: 'medium'
});

// Usar template
await notificationSystem.sendNotificationFromTemplate('security_alert', {
  user_name: 'João Silva',
  ip_address: '192.168.1.1',
  timestamp: new Date().toISOString()
}, {
  channel: 'email',
  recipients: [{ email: 'admin@hubcontrol.com' }],
  priority: 'urgent'
});
```

#### Via Hook

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { sendNotification, loading } = useNotifications();

  const handleSendAlert = async () => {
    const success = await sendNotification({
      type: 'performance',
      channel: 'webhook',
      recipients: [{ webhook_url: 'https://api.example.com/alerts' }],
      subject: 'Performance Alert',
      content: 'CPU usage is above 90%',
      priority: 'high'
    });

    if (success) {
      console.log('Notificação enviada!');
    }
  };

  return (
    <button onClick={handleSendAlert} disabled={loading}>
      Enviar Alerta
    </button>
  );
}
```

### 2. Gerenciando Templates

```typescript
// Criar template
const template = {
  name: 'backup_success',
  type: 'backup',
  subject_template: 'Backup realizado com sucesso - {{backup_name}}',
  content_template: `
    Olá {{user_name}},
    
    O backup "{{backup_name}}" foi realizado com sucesso.
    
    Detalhes:
    - Tamanho: {{backup_size}}
    - Duração: {{backup_duration}}
    - Data: {{backup_date}}
    
    Atenciosamente,
    Equipe Hub Control
  `,
  variables: ['user_name', 'backup_name', 'backup_size', 'backup_duration', 'backup_date'],
  enabled: true
};

// Via API
await fetch('/api/notifications/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(template)
});

// Via Hook
const { createTemplate } = useNotifications();
await createTemplate(template);
```

### 3. Configurando Webhooks

```typescript
// Configurar webhook
const webhook = {
  name: 'External Monitoring',
  url: 'https://monitoring.example.com/webhook',
  events: ['notification.sent', 'notification.delivered', 'notification.failed'],
  headers: {
    'Authorization': 'Bearer your-token',
    'X-Source': 'hub-control'
  },
  enabled: true,
  retry_policy: {
    max_retries: 3,
    backoff_multiplier: 2
  }
};

// Via API
await fetch('/api/notifications/webhooks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(webhook)
});
```

## Interface de Usuário

### 1. Centro de Notificações

Acesse `/admin/notifications` para:

- **Visão Geral**: KPIs e resumo do sistema
- **Dashboard**: Lista de notificações com filtros
- **Templates**: Gerenciamento de templates
- **Configurações**: Canais e destinatários
- **Analytics**: Relatórios e métricas
- **Webhooks**: Configuração de webhooks

### 2. Componentes Disponíveis

```typescript
// Centro principal
import NotificationCenter from '@/components/dashboard/NotificationCenter';

// Componentes específicos
import NotificationDashboard from '@/components/dashboard/NotificationDashboard';
import NotificationTemplateManager from '@/components/dashboard/NotificationTemplateManager';
import NotificationSettings from '@/components/dashboard/NotificationSettings';
import NotificationAnalytics from '@/components/dashboard/NotificationAnalytics';
import NotificationWebhooks from '@/components/dashboard/NotificationWebhooks';
```

## APIs

### Endpoints Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/notifications` | GET | Listar notificações |
| `/api/notifications` | POST | Enviar notificação |
| `/api/notifications` | PUT | Atualizar status |
| `/api/notifications` | DELETE | Deletar notificação |
| `/api/notifications/templates` | GET/POST/PUT/DELETE | Gerenciar templates |
| `/api/notifications/config` | GET/POST/PUT/DELETE | Configurações |
| `/api/notifications/stats` | GET/POST | Estatísticas |
| `/api/notifications/webhooks` | GET/POST/PUT/DELETE | Webhooks |
| `/api/notifications/logs` | GET/POST/DELETE | Logs de entrega |
| `/api/notifications/summary` | GET | Resumo do sistema |

### Parâmetros de Consulta

```typescript
// Filtros disponíveis
interface NotificationFilters {
  type?: string;
  channel?: string;
  status?: 'sent' | 'delivered' | 'failed' | 'pending';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  recipient?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}
```

## Segurança

### 1. Autenticação e Autorização

- Todas as APIs requerem autenticação
- Verificação de roles (admin, manager, user)
- Políticas RLS no banco de dados
- Rate limiting por usuário

### 2. Validação de Dados

- Schemas Zod para validação
- Sanitização de conteúdo
- Validação de URLs e emails
- Prevenção de XSS e injection

### 3. Logs de Auditoria

- Todas as operações são logadas
- Rastreamento de eventos de segurança
- Monitoramento de tentativas de acesso
- Alertas automáticos para atividades suspeitas

## Monitoramento

### 1. Métricas Principais

- Taxa de entrega por canal
- Tempo de processamento
- Volume de notificações
- Falhas e erros
- Performance dos webhooks

### 2. Alertas Automáticos

- Taxa de entrega baixa
- Muitas notificações pendentes
- Falhas de canal
- Problemas de conectividade
- Rate limit atingido

### 3. Dashboards

- Visão geral do sistema
- Performance por canal
- Análise de tendências
- Relatórios personalizados
- Exportação de dados

## Troubleshooting

### Problemas Comuns

1. **Notificações não sendo enviadas**
   - Verificar configuração do canal
   - Validar credenciais
   - Checar rate limits
   - Verificar logs de erro

2. **Taxa de entrega baixa**
   - Verificar configuração SMTP
   - Validar endereços de email
   - Checar spam filters
   - Revisar conteúdo das mensagens

3. **Webhooks falhando**
   - Verificar URL de destino
   - Validar headers e autenticação
   - Checar timeout settings
   - Revisar logs de entrega

4. **Performance lenta**
   - Verificar índices do banco
   - Otimizar queries
   - Ajustar configurações de fila
   - Monitorar recursos do servidor

### Logs e Debugging

```bash
# Verificar logs do sistema
tail -f logs/notification-system.log

# Verificar status dos canais
curl -X GET /api/notifications/config

# Testar canal específico
curl -X POST /api/notifications/config/test \
  -H "Content-Type: application/json" \
  -d '{"channel": "email", "config": {...}}'

# Verificar estatísticas
curl -X GET /api/notifications/stats
```

## Manutenção

### 1. Limpeza de Dados

```sql
-- Limpar notificações antigas (30 dias)
SELECT cleanup_old_notifications(30);

-- Limpar logs de entrega (90 dias)
DELETE FROM notification_delivery_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Otimizar tabelas
VACUUM ANALYZE notifications;
VACUUM ANALYZE notification_delivery_logs;
```

### 2. Backup e Restore

```bash
# Backup das configurações
pg_dump -t notification_* hub_control > notifications_backup.sql

# Restore
psql hub_control < notifications_backup.sql
```

### 3. Atualizações

- Sempre testar em ambiente de desenvolvimento
- Fazer backup antes de aplicar migrações
- Verificar compatibilidade de APIs
- Monitorar performance após atualizações

## Extensibilidade

### 1. Adicionando Novos Canais

```typescript
// Implementar interface de canal
class CustomChannel implements NotificationChannel {
  async send(notification: Notification): Promise<DeliveryResult> {
    // Implementação específica
  }

  async validate(config: any): Promise<boolean> {
    // Validação da configuração
  }
}

// Registrar no sistema
notificationSystem.registerChannel('custom', new CustomChannel());
```

### 2. Templates Personalizados

```typescript
// Engine de template customizado
class CustomTemplateEngine implements TemplateEngine {
  render(template: string, variables: Record<string, any>): string {
    // Implementação personalizada
  }
}

// Registrar engine
notificationSystem.setTemplateEngine(new CustomTemplateEngine());
```

### 3. Middlewares

```typescript
// Middleware de processamento
class NotificationMiddleware {
  async process(notification: Notification): Promise<Notification> {
    // Processamento personalizado
    return notification;
  }
}

// Registrar middleware
notificationSystem.use(new NotificationMiddleware());
```

## Conclusão

O Sistema de Notificações do Hub Control oferece uma solução robusta e escalável para gerenciar comunicações em tempo real. Com suporte a múltiplos canais, templates flexíveis, monitoramento avançado e interface intuitiva, o sistema atende às necessidades de projetos de qualquer tamanho.

Para suporte adicional ou contribuições, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.