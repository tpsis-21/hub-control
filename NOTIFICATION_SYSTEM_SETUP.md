# 🚀 Setup Rápido - Sistema de Notificações

Guia de instalação e configuração rápida do sistema de notificações do Hub Control.

## ⚡ Instalação Rápida (5 minutos)

### 1. Instalar Dependências

```bash
# Instalar dependências do sistema de notificações
npm install
```

### 2. Configurar Banco de Dados

```bash
# Executar migrações
npx supabase db push
```

### 3. Configuração Inicial

```bash
# Copiar arquivo de configuração de desenvolvimento
cp .env.notifications.development .env.local

# Executar configuração interativa
npm run init:notifications
```

### 4. Verificar Instalação

```bash
# Verificar se tudo está funcionando
npm run notifications:check

# Testar envio de notificação
npm run notifications:test
```

## 📧 Configuração Mínima (Email)

Para começar rapidamente, configure apenas o email:

```env
# .env.local
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_DEFAULT_CHANNEL=email

# Email (use Mailtrap para desenvolvimento)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=seu_usuario_mailtrap
SMTP_PASS=sua_senha_mailtrap
SMTP_FROM_EMAIL=noreply@hubcontrol.dev
```

## 🔧 Scripts Disponíveis

```bash
# Configuração inicial interativa
npm run init:notifications

# Verificar status do sistema
npm run notifications:check

# Testar envio de notificação
npm run notifications:test

# Configurar canais específicos
npm run notifications:setup
```

## 📁 Arquivos Criados

O sistema de notificações inclui os seguintes arquivos:

### Core System
- `src/lib/notifications/core.ts` - Sistema principal
- `src/lib/notifications/channels/` - Implementação dos canais
- `src/lib/notifications/utils.ts` - Utilitários
- `src/lib/notifications/constants.ts` - Constantes

### Types
- `src/types/notifications.ts` - Tipos TypeScript

### Database
- `supabase/migrations/20241220000000_notification_system.sql` - Schema do banco

### Scripts
- `scripts/init-notifications.js` - Script de inicialização
- `scripts/check-notification-system.js` - Script de verificação

### Configuration
- `.env.notifications.example` - Exemplo completo de configuração
- `.env.notifications.development` - Configuração para desenvolvimento

### Documentation
- `NOTIFICATION_SYSTEM_GUIDE.md` - Guia completo
- `docs/NOTIFICATION_SYSTEM_TECHNICAL.md` - Documentação técnica
- `NOTIFICATION_SYSTEM_SETUP.md` - Este arquivo

### Tests
- `src/__tests__/notification-system.test.ts` - Testes unitários

## 💻 Uso Básico

### Enviar Notificação Simples

```typescript
import { NotificationService } from '@/lib/notifications';

const service = new NotificationService();

await service.send({
  type: 'user_action',
  title: 'Bem-vindo!',
  message: 'Sua conta foi criada com sucesso.',
  recipients: [{
    type: 'email',
    address: 'usuario@email.com'
  }]
});
```

### Hook React

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { sendNotification } = useNotifications();
  
  const handleClick = () => {
    sendNotification({
      type: 'info',
      title: 'Ação executada',
      message: 'A ação foi executada com sucesso!'
    });
  };
  
  return <button onClick={handleClick}>Enviar</button>;
}
```

## 🔍 Verificação de Problemas

### Comando de Diagnóstico

```bash
npm run notifications:check
```

Este comando verifica:
- ✅ Conexão com banco de dados
- ✅ Tabelas e funções criadas
- ✅ Canais configurados
- ✅ Templates disponíveis
- ✅ Variáveis de ambiente
- ✅ Conectividade com serviços externos

### Problemas Comuns

#### 1. Erro de migração
```bash
# Forçar aplicação das migrações
npx supabase db reset
npx supabase db push
```

#### 2. Variáveis de ambiente não encontradas
```bash
# Verificar se o arquivo .env.local existe
ls -la .env.local

# Copiar arquivo de exemplo
cp .env.notifications.development .env.local
```

#### 3. Dependências não instaladas
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

## 🌟 Próximos Passos

Após a instalação básica:

1. **Configure canais adicionais**:
   - Slack: Obtenha token do bot
   - SMS: Configure Twilio ou AWS SNS
   - Webhooks: Configure endpoints

2. **Personalize templates**:
   - Acesse `/admin/notifications`
   - Edite templates existentes
   - Crie novos templates

3. **Configure monitoramento**:
   - Ative logs detalhados
   - Configure alertas de falha
   - Monitore estatísticas

4. **Integre com sua aplicação**:
   - Use o `NotificationService`
   - Implemente hooks personalizados
   - Configure webhooks para eventos

## 📚 Documentação Completa

- **Guia Completo**: `NOTIFICATION_SYSTEM_GUIDE.md`
- **Documentação Técnica**: `docs/NOTIFICATION_SYSTEM_TECHNICAL.md`
- **Exemplos de Código**: `src/lib/notifications/examples/`
- **Testes**: `src/__tests__/notification-system.test.ts`

## 🆘 Suporte

Se encontrar problemas:

1. Execute `npm run notifications:check`
2. Verifique os logs: `npx supabase logs --follow`
3. Consulte a documentação técnica
4. Verifique os testes para exemplos de uso

---

**✅ Sistema de notificações instalado e pronto para uso!**

Para começar a enviar notificações, use o `NotificationService` ou os hooks React fornecidos.