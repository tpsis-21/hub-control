# Especificações Técnicas - Hub Control

## 🏗️ Arquitetura da Aplicação

### Stack Tecnológica Principal

```typescript
// Framework e Runtime
Next.js 14.2.5          // Framework React com App Router
React 18.3.1            // Biblioteca de UI
TypeScript 5.5.4        // Tipagem estática
Node.js 18+             // Runtime JavaScript

// Backend e Banco de Dados
Supabase                // Backend-as-a-Service
PostgreSQL              // Banco de dados relacional
Prisma/Supabase Client  // ORM e cliente de banco

// UI e Estilização
Tailwind CSS 3.4.1     // Framework CSS utilitário
Shadcn/ui               // Componentes UI
Lucide React            // Ícones
Radix UI                // Primitivos de UI acessíveis

// Autenticação e Segurança
NextAuth.js             // Autenticação
Supabase Auth           // Sistema de autenticação
JWT                     // Tokens de autenticação
bcrypt                  // Hash de senhas

// Validação e Formulários
Zod                     // Validação de schemas
React Hook Form         // Gerenciamento de formulários

// Comunicação e APIs
Axios/Fetch             // Cliente HTTP
WebSockets              // Comunicação em tempo real
Supabase Realtime       // Atualizações em tempo real

// Notificações
Web Push API            // Push notifications
VAPID                   // Identificação de servidor push
Nodemailer              // Envio de emails

// Desenvolvimento
ESLint                  // Linting de código
Prettier                // Formatação de código
TypeScript              // Verificação de tipos
```

### Estrutura de Pastas Detalhada

```
hub-control/
├── 📁 src/
│   ├── 📁 app/                    # App Router (Next.js 14)
│   │   ├── 📁 (app)/             # Grupo de rotas autenticadas
│   │   │   ├── 📁 clientes/      # Gerenciamento de clientes
│   │   │   ├── 📁 testes/        # Sistema de testes/trials
│   │   │   ├── 📁 planos/        # Planos e grupos
│   │   │   ├── 📁 servidores/    # Servidores IPTV
│   │   │   ├── 📁 notificacoes/  # Templates de notificação
│   │   │   ├── 📁 marketing/     # Campanhas de email
│   │   │   ├── 📁 configuracoes/ # Configurações do sistema
│   │   │   └── 📁 documentacao/  # Documentação da API
│   │   ├── 📁 api/               # API Routes
│   │   │   ├── 📁 v1/            # API versão 1
│   │   │   ├── 📁 auth/          # Endpoints de autenticação
│   │   │   ├── 📁 marketing/     # APIs de marketing
│   │   │   └── 📁 messages/      # APIs de mensagens
│   │   ├── 📁 cliente/           # Área do cliente
│   │   ├── 📄 layout.tsx         # Layout principal
│   │   ├── 📄 page.tsx           # Dashboard principal
│   │   └── 📄 globals.css        # Estilos globais
│   ├── 📁 components/            # Componentes React
│   │   ├── 📁 ui/                # Componentes base (shadcn/ui)
│   │   ├── 📁 auth/              # Componentes de autenticação
│   │   ├── 📁 app/               # Componentes da aplicação
│   │   ├── 📁 marketing/         # Componentes de marketing
│   │   └── 📁 tests/             # Componentes de teste
│   ├── 📁 lib/                   # Utilitários e configurações
│   │   ├── 📄 supabase.ts        # Cliente Supabase
│   │   ├── 📄 supabase-api.ts    # API administrativa
│   │   ├── 📄 database.types.ts  # Tipos do banco de dados
│   │   ├── 📄 schemas.ts         # Schemas de validação Zod
│   │   └── 📄 utils.ts           # Funções utilitárias
│   ├── 📁 services/              # Serviços de negócio
│   │   ├── 📄 customer.service.ts
│   │   ├── 📄 message.service.ts
│   │   ├── 📄 marketing.service.ts
│   │   └── 📄 validation.service.ts
│   ├── 📁 hooks/                 # Custom React Hooks
│   │   ├── 📄 useAuth.ts
│   │   ├── 📄 useConfig.ts
│   │   └── 📄 useCache.ts
│   └── 📁 __tests__/             # Testes automatizados
├── 📁 public/                    # Arquivos estáticos
├── 📁 docs/                      # Documentação adicional
├── 📄 .env.local.example         # Template de variáveis
├── 📄 .env.local                 # Variáveis de ambiente
├── 📄 package.json               # Dependências do projeto
├── 📄 tsconfig.json              # Configuração TypeScript
├── 📄 tailwind.config.ts         # Configuração Tailwind
└── 📄 next.config.ts             # Configuração Next.js
```

## 🗄️ Modelo de Dados

### Entidades Principais

```typescript
// Clientes
interface Customer {
  id: string
  name: string
  email: string
  phone: string
  iptvUser: string
  iptvPassword: string
  planId: string
  status: 'active' | 'inactive' | 'blocked'
  expiryDate: Date
  createdAt: Date
  updatedAt: Date
  linkId: string          // Link único para área do cliente
  groupId?: string        // Grupo de planos
}

// Testes/Trials
interface Test {
  id: string
  name: string
  email: string
  phone: string
  iptvUser: string
  iptvPassword: string
  serverId: string
  status: 'active' | 'expired'
  expiryDate: Date
  createdAt: Date
  convertedToCustomer?: boolean
}

// Planos
interface Plan {
  id: string
  name: string
  price: number
  validity: number        // Dias
  screens: number
  panelId: string
  isPublic: boolean
  groupId?: string
  createdAt: Date
}

// Grupos de Planos
interface PlanGroup {
  id: string
  name: string
  description: string
  plans: Plan[]
  createdAt: Date
}

// Servidores
interface Server {
  id: string
  name: string
  url: string
  apiKey: string
  status: 'active' | 'inactive'
  automationEnabled: boolean
  paymentGatewayEnabled: boolean
  createdAt: Date
}

// Templates de Notificação
interface NotificationTemplate {
  id: string
  name: string
  type: 'whatsapp' | 'email' | 'push'
  subject?: string        // Para emails
  content: string
  variables: string[]     // Tags disponíveis
  isActive: boolean
  createdAt: Date
}
```

### Relacionamentos

```sql
-- Relacionamentos principais
Customers ←→ Plans (many-to-one)
Plans ←→ PlanGroups (many-to-one)
Tests ←→ Servers (many-to-one)
Customers ←→ PlanGroups (many-to-one)
```

## 🔌 APIs e Integrações

### Endpoints Principais

```typescript
// API Bot (Integração Externa)
POST /api/v1/bot
{
  "action": "ping" | "get_customer" | "create_test",
  "data": { /* dados específicos da ação */ }
}

// Autenticação
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/register

// Marketing
POST /api/marketing/send-campaign
POST /api/marketing/test-smtp

// Mensagens
POST /api/messages/send-email
POST /api/messages/send-whatsapp
```

### Integrações Externas

```typescript
// TMDB (The Movie Database)
interface TMDBIntegration {
  apiKey: string          // NEXT_PUBLIC_TMDB_API_KEY
  baseUrl: 'https://api.themoviedb.org/3'
  usage: 'Sugestões de conteúdo para clientes'
}

// NATV (Painel IPTV)
interface NATVIntegration {
  url: string
  token: string
  password: string
  usage: 'Gerenciamento de usuários IPTV'
}

// WhatsApp Business API
interface WhatsAppIntegration {
  apiKey: string
  baseUrl: string
  usage: 'Envio de notificações'
}

// SMTP (Email)
interface SMTPIntegration {
  host: string
  port: number
  user: string
  password: string
  usage: 'Envio de emails e campanhas'
}
```

## 🔐 Configurações de Segurança

### Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # URL pública do projeto
SUPABASE_ANON_KEY=                 # Chave anônima (frontend)
SUPABASE_SERVICE_ROLE_KEY=         # Chave administrativa (backend only)

# Autenticação
NEXTAUTH_URL=                      # URL da aplicação
NEXTAUTH_SECRET=                   # Secret para NextAuth

# Criptografia
ENCRYPTION_KEY=                    # Chave de criptografia
JWT_SECRET=                        # Secret para JWT
API_SECRET_KEY=                    # Chave da API
SESSION_SECRET=                    # Secret de sessão

# Push Notifications
VAPID_PUBLIC_KEY=                  # Chave pública VAPID
VAPID_PRIVATE_KEY=                 # Chave privada VAPID
VAPID_EMAIL=                       # Email VAPID

# APIs Externas
NEXT_PUBLIC_TMDB_API_KEY=          # TMDB API Key
WHATSAPP_API_KEY=                  # WhatsApp API Key

# SMTP
SMTP_HOST=                         # Servidor SMTP
SMTP_PORT=                         # Porta SMTP
SMTP_USER=                         # Usuário SMTP
SMTP_PASSWORD=                     # Senha SMTP

# Rate Limiting
RATE_LIMIT_MAX=                    # Máximo de requests
RATE_LIMIT_WINDOW=                 # Janela de tempo
```

### Configurações de Segurança Recomendadas

```typescript
// Rate Limiting
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,    // 15 minutos
  max: 100,                    // Máximo 100 requests por IP
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false
}

// CORS
const corsConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Headers de Segurança
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

## 📊 Performance e Monitoramento

### Métricas Importantes

```typescript
// Métricas de Performance
interface PerformanceMetrics {
  pageLoadTime: number      // Tempo de carregamento
  apiResponseTime: number   // Tempo de resposta da API
  databaseQueryTime: number // Tempo de consulta ao banco
  errorRate: number         // Taxa de erro
  uptime: number           // Tempo de atividade
}

// Métricas de Negócio
interface BusinessMetrics {
  totalCustomers: number
  activeTests: number
  monthlyRevenue: number
  conversionRate: number    // Taxa de conversão teste → cliente
  churnRate: number        // Taxa de cancelamento
}
```

### Logs e Auditoria

```typescript
// Estrutura de Log
interface LogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  userId?: string
  action?: string
  metadata?: Record<string, any>
}

// Eventos de Auditoria
interface AuditEvent {
  id: string
  userId: string
  action: string           // 'create_customer', 'delete_test', etc.
  resource: string         // 'customer', 'test', 'plan', etc.
  resourceId: string
  changes?: Record<string, any>
  timestamp: Date
  ipAddress: string
  userAgent: string
}
```

## 🚀 Deploy e Infraestrutura

### Ambientes

```typescript
// Configuração por Ambiente
interface EnvironmentConfig {
  development: {
    database: 'local_supabase'
    logging: 'verbose'
    caching: false
    rateLimit: false
  }
  staging: {
    database: 'staging_supabase'
    logging: 'normal'
    caching: true
    rateLimit: true
  }
  production: {
    database: 'production_supabase'
    logging: 'error_only'
    caching: true
    rateLimit: true
    monitoring: true
    backup: true
  }
}
```

### Checklist de Deploy

```markdown
## Pre-Deploy Checklist

### Segurança
- [ ] Todas as chaves de API estão em variáveis de ambiente
- [ ] Service Role Key não está exposta no frontend
- [ ] Rate limiting está configurado
- [ ] CORS está restritivo
- [ ] Headers de segurança estão configurados

### Performance
- [ ] Imagens estão otimizadas
- [ ] Bundle size está dentro do limite
- [ ] Lazy loading está implementado
- [ ] Cache está configurado

### Funcionalidade
- [ ] Todos os testes passam
- [ ] Integração com Supabase funciona
- [ ] Envio de emails funciona
- [ ] Push notifications funcionam
- [ ] APIs externas respondem

### Monitoramento
- [ ] Logs estão configurados
- [ ] Métricas estão sendo coletadas
- [ ] Alertas estão configurados
- [ ] Backup está funcionando
```

---

## 📚 Documentação Adicional

- **API Documentation:** `/documentacao/api-chatbots`
- **Security Report:** `SECURITY_ANALYSIS_REPORT.md`
- **Main Documentation:** `DOCUMENTATION.md`
- **Backup Guide:** `BACKUP_BACKEND_GUIDE.md`
- **App Initialization:** `APP_INITIALIZATION_GUIDE.md`

---

**Última Atualização:** $(Get-Date -Format "yyyy-MM-dd")
**Versão:** 1.0
**Mantenedor:** Equipe de Desenvolvimento Hub Control