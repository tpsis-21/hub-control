# Guia de Notificações Push - Hub Control

## Visão Geral

O sistema de notificações push permite enviar notificações em tempo real para os usuários, mesmo quando o navegador está fechado. Utiliza Service Workers e a Web Push API para garantir entrega confiável.

## Configuração Inicial

### 1. Configurar Variáveis de Ambiente

As chaves VAPID são necessárias para autenticar o servidor com os serviços de push dos navegadores.

```bash
# Gerar chaves VAPID
npx web-push generate-vapid-keys
```

Adicione as chaves no arquivo `.env.local`:

```env
# Push Notifications Configuration (VAPID Keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica_aqui
VAPID_PRIVATE_KEY=sua_chave_privada_aqui
VAPID_EMAIL=mailto:seu_email@dominio.com
```

### 2. Executar Migração do Banco

Execute a migração para criar a tabela `push_subscriptions`:

```sql
-- Execute no Supabase SQL Editor
-- Arquivo: migrations/create_push_subscriptions_table.sql
```

### 3. Configurar Service Worker

O Service Worker (`public/sw.js`) já está configurado e será registrado automaticamente.

## Componentes Principais

### 1. Hook `usePushNotifications`

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission
  } = usePushNotifications();

  // Usar os métodos conforme necessário
}
```

### 2. Componente `PushNotificationSettings`

```typescript
import { PushNotificationSettings } from '@/components/app/PushNotificationSettings';

function SettingsPage() {
  return (
    <div>
      <PushNotificationSettings />
    </div>
  );
}
```

### 3. Central de Notificações

```typescript
import { NotificationCenter } from '@/components/app/NotificationCenter';

function Dashboard() {
  return (
    <div>
      <NotificationCenter />
    </div>
  );
}
```

## API de Notificações

### Enviar Notificação para Usuário Específico

```typescript
// POST /api/push-notifications
const response = await fetch('/api/push-notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'user',
    targets: {
      userId: 'uuid-do-usuario'
    },
    payload: {
      title: 'Título da Notificação',
      body: 'Corpo da mensagem',
      tag: 'payment',
      data: { type: 'payment', id: '123' },
      url: '/pagamentos'
    }
  })
});
```

### Enviar para Múltiplos Usuários

```typescript
const response = await fetch('/api/push-notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'users',
    targets: {
      userIds: ['uuid1', 'uuid2', 'uuid3']
    },
    payload: {
      title: 'Notificação em Massa',
      body: 'Mensagem para múltiplos usuários'
    }
  })
});
```

### Enviar para Empresa

```typescript
const response = await fetch('/api/push-notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'company',
    targets: {
      empresaId: 'uuid-da-empresa'
    },
    payload: {
      title: 'Notificação da Empresa',
      body: 'Mensagem para todos da empresa'
    }
  })
});
```

### Broadcast (Todos os Usuários)

```typescript
const response = await fetch('/api/push-notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'all',
    payload: {
      title: 'Notificação Geral',
      body: 'Mensagem para todos os usuários',
      requireInteraction: true
    }
  })
});
```

## Serviços de Conveniência

### Notificação de Pagamento

```typescript
import { sendPaymentNotification } from '@/lib/push-notifications.service';

// Enviar quando um pagamento for processado
await sendPaymentNotification(userId, {
  id: 'payment-123',
  amount: 99.90
});
```

### Notificação de Cliente

```typescript
import { sendClientNotification } from '@/lib/push-notifications.service';

// Enviar quando um novo cliente for cadastrado
await sendClientNotification(userId, {
  id: 'client-456',
  name: 'João Silva'
});
```

### Notificação do Sistema

```typescript
import { sendSystemNotification } from '@/lib/push-notifications.service';

// Enviar notificação do sistema
await sendSystemNotification(
  ['user1', 'user2'], 
  'Sistema será atualizado em 10 minutos'
);
```

## Estrutura do Payload

```typescript
interface PushNotificationPayload {
  title: string;                    // Título da notificação (obrigatório)
  body: string;                     // Corpo da mensagem (obrigatório)
  icon?: string;                    // Ícone da notificação
  badge?: string;                   // Badge da notificação
  tag?: string;                     // Tag para agrupar notificações
  data?: any;                       // Dados customizados
  actions?: Array<{                 // Ações da notificação
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;     // Requer interação do usuário
  silent?: boolean;                 // Notificação silenciosa
  vibrate?: number[];              // Padrão de vibração
  url?: string;                    // URL para abrir ao clicar
}
```

## Permissões e Segurança

### Verificação de Permissões

Apenas usuários com role `admin` ou permissão `send_notifications` podem enviar notificações através da API.

### RLS (Row Level Security)

A tabela `push_subscriptions` possui políticas RLS que garantem que:
- Usuários só podem ver suas próprias subscriptions
- Usuários só podem inserir/atualizar/deletar suas próprias subscriptions

## Monitoramento e Estatísticas

### Obter Estatísticas

```typescript
// GET /api/push-notifications/stats
const response = await fetch('/api/push-notifications/stats');
const { stats } = await response.json();

console.log(stats);
// {
//   total: 150,
//   byUser: { 'user1': 2, 'user2': 1 },
//   recent: 25
// }
```

### Logs e Debugging

Todos os envios são logados no console do servidor. Para debugging:

1. Verifique os logs do servidor
2. Use as ferramentas de desenvolvedor do navegador
3. Teste com o botão "Enviar Teste" na interface

## Troubleshooting

### Notificações não aparecem

1. **Verificar permissões**: Usuário deve ter permitido notificações
2. **Verificar VAPID keys**: Devem estar configuradas corretamente
3. **Verificar Service Worker**: Deve estar registrado e ativo
4. **Verificar subscription**: Usuário deve estar inscrito

### Erro de VAPID

```
WebPushError: Received unexpected response code
```

- Verificar se as chaves VAPID estão corretas
- Verificar se o email VAPID está no formato correto

### Subscription inválida

Subscriptions inválidas são automaticamente removidas do banco de dados quando detectadas.

## Boas Práticas

1. **Não spam**: Evite enviar muitas notificações
2. **Conteúdo relevante**: Envie apenas notificações importantes
3. **Timing**: Considere o fuso horário do usuário
4. **Fallback**: Sempre tenha um método alternativo (email, in-app)
5. **Teste**: Sempre teste antes de enviar para produção

## Limitações

- **Suporte do navegador**: Nem todos os navegadores suportam push notifications
- **Tamanho do payload**: Limitado a ~4KB
- **Rate limiting**: Serviços de push têm limites de taxa
- **Bateria**: Notificações frequentes podem afetar a bateria do dispositivo

## Próximos Passos

1. Implementar notificações por email
2. Adicionar templates de notificação
3. Implementar agendamento de notificações
4. Adicionar analytics detalhados
5. Implementar notificações push para mobile apps