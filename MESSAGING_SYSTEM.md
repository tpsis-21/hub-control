# Sistema de Mensagens Automáticas

Este documento descreve o sistema completo de mensagens automáticas implementado no Hub Control, incluindo envio de e-mails, WhatsApp, lembretes de vencimento e notificações.

## 📋 Visão Geral

O sistema de mensagens é composto por:

- **Serviço de Mensagens** (`MessageService`): Gerencia envio de e-mails e WhatsApp
- **Fila de Mensagens** (`MessageQueueService`): Processa mensagens em background
- **Serviço de Lembretes** (`ReminderService`): Envia lembretes automáticos de vencimento
- **APIs de Controle**: Endpoints para gerenciar e monitorar o sistema
- **Interface de Administração**: Painel para controle e monitoramento

## 🚀 Funcionalidades

### ✉️ Envio de E-mails
- Configuração SMTP flexível
- Templates dinâmicos com tags personalizáveis
- Suporte a HTML e texto simples
- Validação de configurações

### 📱 Envio de WhatsApp
- Integração com API BotConversa
- Mensagens de texto personalizadas
- Validação de números de telefone
- Fallback para outros provedores

### 🔄 Fila de Mensagens
- Processamento em background
- Sistema de retry automático
- Priorização de mensagens
- Agendamento de envios
- Limpeza automática de mensagens antigas

### ⏰ Lembretes Automáticos
- Verificação automática de vencimentos
- Lembretes em 3 dias e 1 dia antes do vencimento
- Atualização automática de status para clientes vencidos
- Notificações de vencimento

### 📊 Monitoramento
- Dashboard de administração
- Estatísticas em tempo real
- Logs detalhados
- Teste de conectividade

## 📁 Estrutura de Arquivos

```
src/
├── services/
│   ├── message.service.ts          # Serviço principal de mensagens
│   ├── message-queue.service.ts     # Fila de processamento
│   └── reminder.service.ts          # Lembretes automáticos
├── app/
│   ├── api/
│   │   ├── messages/route.ts        # API de mensagens
│   │   ├── message-queue/route.ts   # API da fila
│   │   └── reminders/route.ts       # API de lembretes
│   └── (app)/
│       └── admin/
│           └── mensagens/page.tsx   # Painel de administração
├── components/
│   └── message-sender.tsx           # Componente de envio manual
└── (app)/
    └── clientes/
        └── actions.ts               # Integração com ações de clientes
```

## 🔧 Configuração

### E-mail (SMTP)
Configure as seguintes variáveis no sistema:

```typescript
{
  smtp_host: string,
  smtp_port: number,
  smtp_secure: boolean,
  smtp_user: string,
  smtp_password: string,
  smtp_from_name: string,
  smtp_from_email: string
}
```

### WhatsApp (BotConversa)
Configure as seguintes variáveis:

```typescript
{
  whatsapp_api_url: string,
  whatsapp_api_token: string,
  whatsapp_phone_number: string
}
```

## 📡 APIs

### `/api/messages`

#### POST - Enviar Mensagem
```json
{
  "type": "general",
  "clientId": "string",
  "clientName": "string",
  "email": "string",
  "whatsapp": "string",
  "subject": "string",
  "message": "string",
  "priority": "normal"
}
```

#### PUT - Mensagem de Boas-vindas
```json
{
  "clientId": "string",
  "clientName": "string",
  "email": "string",
  "whatsapp": "string",
  "planName": "string",
  "expirationDate": "string"
}
```

#### PATCH - Lembrete de Vencimento
```json
{
  "clientId": "string",
  "clientName": "string",
  "email": "string",
  "whatsapp": "string",
  "expirationDate": "string",
  "daysUntilExpiration": 3,
  "isUrgent": false
}
```

#### GET - Testar Conectividade
Retorna o status dos serviços de e-mail e WhatsApp.

### `/api/message-queue`

#### GET - Estatísticas da Fila
Retorna estatísticas detalhadas da fila de mensagens.

#### POST - Controlar Fila
```json
{
  "action": "start" | "stop" | "reprocess-failed" | "cleanup"
}
```

### `/api/reminders`

#### GET - Status dos Lembretes
Retorna status do serviço e estatísticas de clientes.

#### POST - Controlar Serviço
```json
{
  "action": "start" | "stop" | "check" | "check-expired"
}
```

#### PUT - Enviar Lembrete Manual
```json
{
  "clientId": "string",
  "type": "normal" | "urgent"
}
```

## 🎯 Integração com Ações de Clientes

O sistema está integrado automaticamente com as seguintes ações:

### Novo Cliente
- Envia mensagem de boas-vindas automaticamente
- Inclui informações do plano e data de vencimento

### Renovação
- Envia confirmação de renovação
- Informa nova data de vencimento

### Conversão de Teste
- Envia mensagem de conversão
- Parabeniza pela ativação

## 📝 Templates de Mensagens

### Tags Disponíveis
- `{NOME}` - Nome do cliente
- `{PLANO}` - Nome do plano
- `{DATA_VENCIMENTO}` - Data de vencimento formatada
- `{DIAS_RESTANTES}` - Dias até o vencimento
- `{EMPRESA}` - Nome da empresa

### Mensagem de Boas-vindas
```
Olá {NOME}! 🎉

Seja bem-vindo(a) ao nosso serviço!

Seu plano: {PLANO}
Data de vencimento: {DATA_VENCIMENTO}

Qualquer dúvida, estamos aqui para ajudar!
```

### Lembrete de Vencimento (3 dias)
```
Olá {NOME}! ⏰

Seu plano vence em {DIAS_RESTANTES} dias ({DATA_VENCIMENTO}).

Renove agora para não perder o acesso!
```

### Lembrete Urgente (1 dia)
```
🚨 URGENTE - {NOME}

Seu plano vence AMANHÃ ({DATA_VENCIMENTO})!

Renove agora para evitar a interrupção do serviço.
```

## 🔄 Fluxo de Processamento

### 1. Adição à Fila
```
Cliente criado/renovado → MessageQueueService.addMessage() → Fila de mensagens
```

### 2. Processamento
```
Fila → MessageService.sendMessage() → SMTP/WhatsApp API → Atualização de status
```

### 3. Lembretes Automáticos
```
ReminderService (1h) → Verificar vencimentos → Adicionar à fila → Processar
```

### 4. Retry em Falhas
```
Falha no envio → Incrementar tentativas → Reagendar → Tentar novamente
```

## 📊 Monitoramento e Logs

### Logs Disponíveis
- `system`: Eventos do sistema (início/parada de serviços)
- `notification`: Envios de mensagens
- `error`: Erros e falhas
- `queue`: Operações da fila

### Métricas Monitoradas
- Total de mensagens na fila
- Mensagens pendentes/processando/concluídas/falharam
- Status dos serviços (ativo/parado)
- Clientes próximos ao vencimento
- Clientes vencidos

## 🛠️ Administração

### Painel de Controle (`/admin/mensagens`)
- Visualizar estatísticas em tempo real
- Controlar serviços (iniciar/parar)
- Executar verificações manuais
- Testar conectividade
- Reprocessar mensagens falhas
- Limpar mensagens antigas

### Componente de Envio Manual
- Enviar mensagens personalizadas
- Agendar envios
- Definir prioridades
- Enviar lembretes rápidos

## 🔒 Segurança

### Autenticação
- Todas as APIs requerem autenticação
- Verificação de permissões específicas
- Logs de todas as operações

### Validação
- Validação de dados de entrada
- Sanitização de conteúdo
- Verificação de limites de rate

### Privacidade
- Não armazenamento de senhas em logs
- Criptografia de dados sensíveis
- Conformidade com LGPD

## 🚀 Próximos Passos

### Melhorias Planejadas
- [ ] Templates visuais para e-mail (HTML)
- [ ] Integração com mais provedores de WhatsApp
- [ ] Relatórios de entrega
- [ ] A/B testing para mensagens
- [ ] Webhooks para eventos
- [ ] API para integrações externas
- [ ] Suporte a anexos
- [ ] Mensagens em massa
- [ ] Segmentação de clientes
- [ ] Analytics avançados

### Otimizações
- [ ] Cache de templates
- [ ] Processamento paralelo
- [ ] Compressão de dados
- [ ] Otimização de queries
- [ ] Monitoramento de performance

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique os logs no painel de administração
2. Teste a conectividade dos serviços
3. Consulte a documentação da API
4. Entre em contato com o suporte técnico

---

**Versão:** 1.0.0  
**Última atualização:** Dezembro 2024  
**Compatibilidade:** Next.js 14+, Node.js 18+