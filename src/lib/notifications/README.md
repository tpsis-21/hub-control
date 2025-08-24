# Sistema de Notificações - Hub Control

## Instalação Rápida

### 1. Executar Migrações

```bash
# Aplicar todas as migrações do sistema de notificações
npx supabase db push

# Ou aplicar individualmente
npx supabase migration up --to 20241220000001
npx supabase migration up --to 20241220000002
npx supabase migration up --to 20241220000003
npx supabase migration up --to 20241220000004
npx supabase migration up --to 20241220000005
npx supabase migration up --to 20241220000006
```

### 2. Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env.local`:

```env
# Sistema de Notificações
NOTIFICATION_SYSTEM_ENABLED=true
NOTIFICATION_DEFAULT_CHANNEL=email
NOTIFICATION_RATE_LIMIT_ENABLED=true

# Email (obrigatório)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@hubcontrol.com

# Webhook (para WhatsApp e outras integrações)
WEBHOOK_URL=https://your-webhook-endpoint.com/notifications
WEBHOOK_SECRET=your-webhook-secret
```

### 3. Instalar Dependências

```bash
# Se ainda não instaladas
npm install nodemailer
```

### 4. Inicializar Sistema

```typescript
// Em seu app/layout.tsx ou _app.tsx
import { NotificationSystem } from '@/lib/notifications';

// Inicializar o sistema
const notificationSystem = new NotificationSystem();

// Opcional: configurar canais padrão
await notificationSystem.initializeDefaultChannels();
```

## Uso Básico

### 1. Enviar Primeira Notificação

```typescript
import { NotificationSystem } from '@/lib/notifications';

const notificationSystem = new NotificationSystem();

// Enviar email simples
await notificationSystem.sendNotification({
  type: 'system',
  channel: 'email',
  recipients: [{
    email: 'user@example.com',
    name: 'João Silva'
  }],
  subject: 'Bem-vindo ao Hub Control',
  content: 'Sua conta foi criada com sucesso!',
  priority: 'medium'
});
```

### 2. Usar Interface de Administração

1. Acesse `/admin/notifications`
2. Configure seus canais de notificação
3. Crie templates personalizados
4. Monitore estatísticas e logs

### 3. Usar Hook em Componentes

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { sendNotification, notifications, loading } = useNotifications();

  const handleSendAlert = async () => {
    await sendNotification({
      type: 'security',
      channel: 'email',
      recipients: [{ email: 'admin@hubcontrol.com' }],
      subject: 'Alerta de Segurança',
      content: 'Atividade suspeita detectada.',
      priority: 'high'
    });
  };

  return (
    <div>
      <button onClick={handleSendAlert}>Enviar Alerta</button>
      {notifications.map(notification => (
        <div key={notification.id}>
          {notification.subject}
        </div>
      ))}
    </div>
  );
}
```

## Estrutura de Arquivos

```
src/lib/notifications/
├── README.md                 # Este arquivo
├── constants.ts             # Constantes e configurações
├── utils.ts                 # Utilitários do sistema
└── examples/                # Exemplos de uso
    └── usage-examples.ts

src/app/api/notifications/   # APIs REST
├── route.ts                 # CRUD principal
├── templates/route.ts       # Gerenciar templates
├── config/route.ts          # Configurações
├── stats/route.ts           # Estatísticas
├── webhooks/route.ts        # Webhooks
├── logs/route.ts            # Logs de entrega
└── summary/route.ts         # Resumo do sistema

src/components/dashboard/    # Interface de usuário
├── NotificationCenter.tsx   # Dashboard principal
├── NotificationDashboard.tsx
├── NotificationTemplateManager.tsx
├── NotificationSettings.tsx
├── NotificationAnalytics.tsx
└── NotificationWebhooks.tsx

src/hooks/
└── useNotifications.ts      # Hook personalizado

supabase/migrations/         # Migrações do banco
├── 20241220000001_create_notifications_tables.sql
├── 20241220000002_create_notification_channels.sql
├── 20241220000003_create_notification_templates.sql
├── 20241220000004_create_notification_webhooks.sql
├── 20241220000005_create_notification_logs.sql
└── 20241220000006_create_notification_functions.sql
```

## Configuração de Canais

### Email (SMTP)

```typescript
// Configuração via API
const emailConfig = {
  channel: 'email',
  config: {
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: 'your-email@gmail.com',
    smtp_pass: 'your-app-password',
    from_email: 'noreply@hubcontrol.com',
    from_name: 'Hub Control'
  },
  enabled: true
};

await fetch('/api/notifications/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(emailConfig)
});
```

### Slack

```typescript
const slackConfig = {
  channel: 'slack',
  config: {
    bot_token: 'xoxb-your-bot-token',
    webhook_url: 'https://hooks.slack.com/services/...',
    default_channel: '#general'
  },
  enabled: true
};
```

### SMS (Twilio)

```typescript
const smsConfig = {
  channel: 'sms',
  config: {
    provider: 'twilio',
    account_sid: 'your-account-sid',
    auth_token: 'your-auth-token',
    from_number: '+1234567890'
  },
  enabled: true
};
```

## Templates

### Criar Template

```typescript
const template = {
  name: 'welcome_email',
  type: 'user',
  subject_template: 'Bem-vindo ao {{app_name}}, {{user_name}}!',
  content_template: `
    Olá {{user_name}},
    
    Bem-vindo ao {{app_name}}!
    
    Sua conta foi criada em {{created_date}}.
    
    Atenciosamente,
    Equipe {{app_name}}
  `,
  variables: ['user_name', 'app_name', 'created_date'],
  enabled: true
};

// Via API
await fetch('/api/notifications/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(template)
});

// Usar template
await notificationSystem.sendNotificationFromTemplate('welcome_email', {
  user_name: 'João Silva',
  app_name: 'Hub Control',
  created_date: new Date().toLocaleDateString('pt-BR')
}, {
  channel: 'email',
  recipients: [{ email: 'joao@example.com' }]
});
```

## Monitoramento

### Verificar Status

```typescript
// Obter resumo do sistema
const summary = await fetch('/api/notifications/summary').then(r => r.json());
console.log('Taxa de entrega:', summary.delivery_rate);
console.log('Notificações pendentes:', summary.pending_count);

// Obter estatísticas detalhadas
const stats = await fetch('/api/notifications/stats?period=7d').then(r => r.json());
console.log('Estatísticas dos últimos 7 dias:', stats);

// Verificar logs de entrega
const logs = await fetch('/api/notifications/logs?status=failed').then(r => r.json());
console.log('Notificações com falha:', logs);
```

### Dashboard Web

Acesse `/admin/notifications` para:

- 📊 **Dashboard**: Visão geral e KPIs
- 📝 **Templates**: Gerenciar templates
- ⚙️ **Configurações**: Canais e destinatários
- 📈 **Analytics**: Relatórios e métricas
- 🔗 **Webhooks**: Configurar integrações

## Troubleshooting

### Problemas Comuns

1. **Erro: "SMTP connection failed"**
   - Verificar credenciais SMTP
   - Confirmar se 2FA está habilitado (usar app password)
   - Testar conectividade de rede

2. **Notificações não chegam**
   - Verificar spam/lixo eletrônico
   - Validar endereços de email
   - Checar rate limits

3. **Slack não funciona**
   - Verificar permissões do bot
   - Confirmar token de acesso
   - Testar webhook URL

### Logs de Debug

```typescript
// Habilitar logs detalhados
process.env.NOTIFICATION_DEBUG = 'true';

// Verificar logs no console do navegador
// Ou nos logs do servidor
```

## Próximos Passos

1. **Configurar canais adicionais** (SMS, Slack, etc.)
2. **Criar templates personalizados** para sua aplicação
3. **Configurar webhooks** para integrações externas
4. **Implementar alertas automáticos** baseados em eventos
5. **Personalizar interface** conforme necessário

## Suporte

Para mais informações, consulte:

- 📖 [Guia Completo](../../NOTIFICATION_SYSTEM_GUIDE.md)
- 🔧 [Documentação da API](../api/notifications/)
- 🎨 [Componentes UI](../components/dashboard/)
- 🪝 [Hooks](../hooks/useNotifications.ts)

---

**Desenvolvido para Hub Control** 🚀