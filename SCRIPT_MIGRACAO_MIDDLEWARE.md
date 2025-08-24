# 🔄 Script de Migração - Middleware Unificado

## 🎯 Objetivo

Este documento fornece um guia passo-a-passo para migrar rotas existentes que usam middlewares antigos (`createSecurityMiddleware`, `createValidationMiddleware`) para o novo **Middleware Unificado**.

---

## 📋 Rotas Identificadas para Migração

### ✅ Migradas
- `src/app/api/analytics/performance/route.ts` - **CONCLUÍDA**

### 🔄 Pendentes
- `src/app/api/notifications/summary/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/logs/route.ts`
- `src/app/api/notifications/webhooks/route.ts`
- `src/app/api/notifications/templates/route.ts`
- `src/app/api/notifications/stats/route.ts`

---

## 🛠️ Processo de Migração

### Passo 1: Identificar Padrão Atual

#### Padrão Antigo (Security Middleware)
```typescript
import { applySecurityMiddleware } from '@/middleware/security-middleware';

export async function POST(request: NextRequest) {
  const securityCheck = await applySecurityMiddleware(request, {
    enableRateLimit: true,
    enablePayloadScan: true,
    rateLimit: { requests: 10, windowMs: 60000 }
  });
  
  if (!securityCheck.success) {
    return securityCheck.response;
  }
  
  // Lógica da rota...
}
```

#### Padrão Antigo (Validation Middleware)
```typescript
import { createValidationMiddleware } from '@/middleware/validation-middleware';

const middleware = createValidationMiddleware({
  bodySchema: z.object({ ... }),
  rateLimit: { requests: 10, windowMs: 60000 }
});

export async function POST(request: NextRequest) {
  return middleware(request, async (req, validatedData) => {
    // Lógica da rota...
  });
}
```

### Passo 2: Aplicar Novo Padrão

#### Padrão Novo (Middleware Unificado)
```typescript
import { createUnifiedMiddleware } from '@/middleware/unified-middleware';

const middleware = createUnifiedMiddleware({
  bodySchema: z.object({ ... }),
  allowedMethods: ['POST'],
  rateLimit: { requests: 10, windowMs: 60000, namespace: 'route-name' },
  enablePayloadScan: true,
  enableIPBlocking: true
});

export async function POST(request: NextRequest) {
  return middleware(request, async (req, validatedData) => {
    const { body, user, ip } = validatedData;
    // Lógica da rota...
  });
}
```

---

## 🔧 Mapeamento de Configurações

### Security Middleware → Unified Middleware

| Configuração Antiga | Configuração Nova | Observações |
|---------------------|-------------------|-------------|
| `enableRateLimit: true` | `rateLimit: { ... }` | Agora obrigatório especificar configuração |
| `enablePayloadScan: true` | `enablePayloadScan: true` | Mantém o mesmo |
| `enableIPBlocking: true` | `enableIPBlocking: true` | Mantém o mesmo |
| `enableUserBlocking: true` | `enableUserBlocking: true` | Mantém o mesmo |
| `rateLimit: { ... }` | `rateLimit: { ..., namespace: 'xxx' }` | Adicionar namespace obrigatório |

### Validation Middleware → Unified Middleware

| Configuração Antiga | Configuração Nova | Observações |
|---------------------|-------------------|-------------|
| `bodySchema: z.object({})` | `bodySchema: z.object({})` | Mantém o mesmo |
| `querySchema: z.object({})` | `querySchema: z.object({})` | Mantém o mesmo |
| `rateLimit: { ... }` | `rateLimit: { ..., namespace: 'xxx' }` | Adicionar namespace obrigatório |
| `validateHeaders: true` | `validateHeaders: true` | Mantém o mesmo |
| `allowedMethods: [...]` | `allowedMethods: [...]` | Mantém o mesmo |

---

## 📝 Template de Migração

### Para Rotas de Notificação

```typescript
// ANTES
import { applySecurityMiddleware } from '@/middleware/security-middleware';

export async function POST(request: NextRequest) {
  const securityCheck = await applySecurityMiddleware(request, {
    enableRateLimit: true,
    enablePayloadScan: true,
    enableIPBlocking: true,
    rateLimit: { requests: 10, windowMs: 60000 }
  });
  
  if (!securityCheck.success) {
    return securityCheck.response;
  }
  
  // Lógica específica...
}

// DEPOIS
import { createUnifiedMiddleware } from '@/middleware/unified-middleware';
import { z } from 'zod';

const notificationMiddleware = createUnifiedMiddleware({
  bodySchema: z.object({
    // Definir schema específico da rota
  }),
  allowedMethods: ['POST'],
  rateLimit: { requests: 10, windowMs: 60000, namespace: 'notifications' },
  enablePayloadScan: true,
  enableIPBlocking: true,
  requireAuth: true // Se necessário
});

export async function POST(request: NextRequest) {
  return notificationMiddleware(request, async (req, validatedData) => {
    const { body, user, ip } = validatedData;
    
    // Lógica específica...
    
    return NextResponse.json({ success: true, data: result });
  });
}
```

---

## 🧪 Checklist de Migração

### Para cada rota:

- [ ] **Backup da rota original**
- [ ] **Identificar middleware atual** (security/validation)
- [ ] **Mapear configurações** para o middleware unificado
- [ ] **Definir schemas de validação** (se necessário)
- [ ] **Atualizar imports**
- [ ] **Refatorar handler** para usar `validatedData`
- [ ] **Definir namespace** único para rate limiting
- [ ] **Testar funcionalidade**
- [ ] **Verificar logs** e métricas
- [ ] **Confirmar rate limiting** funcionando
- [ ] **Validar respostas de erro**

### Verificações finais:

- [ ] **Todos os middlewares antigos** removidos dos imports
- [ ] **Rate limiting** funcionando com namespaces corretos
- [ ] **Validação** bloqueando dados inválidos
- [ ] **Autenticação** (se aplicável) funcionando
- [ ] **Logs estruturados** sendo gerados
- [ ] **Performance** mantida ou melhorada

---

## ⚡ Benefícios da Migração

### 🎯 Antes da Migração
- Múltiplos middlewares com configurações separadas
- Rate limiting inconsistente
- Validação manual de entrada
- Logs não padronizados
- Respostas de erro inconsistentes

### 🚀 Depois da Migração
- Middleware único com configuração centralizada
- Rate limiting consistente com namespaces
- Validação automática com Zod
- Logs estruturados padronizados
- Respostas de erro consistentes
- Dados validados disponíveis automaticamente

---

## 🚨 Pontos de Atenção

### ⚠️ Namespaces de Rate Limiting
- **Obrigatório** definir namespace único para cada rota
- **Evitar** conflitos entre diferentes endpoints
- **Usar** padrão: `categoria:acao` (ex: `notifications:create`)

### ⚠️ Schemas de Validação
- **Definir** schemas específicos para cada rota
- **Reutilizar** schemas comuns quando possível
- **Validar** tanto entrada quanto saída se necessário

### ⚠️ Autenticação
- **Verificar** se a rota precisa de autenticação
- **Definir** papel necessário (`user`, `admin`, `moderator`)
- **Testar** cenários de acesso negado

### ⚠️ Compatibilidade
- **Manter** comportamento existente
- **Testar** cenários de erro específicos
- **Verificar** integrações com frontend

---

## 📊 Progresso da Migração

### Status Atual
- ✅ **Analytics Performance** - Migrada com sucesso
- 🔄 **6 rotas de notificação** - Pendentes
- 📊 **Total:** 1/7 rotas migradas (14%)

### Próximos Passos
1. Migrar rotas de notificação (prioridade alta)
2. Testar integração completa
3. Monitorar performance e logs
4. Documentar padrões específicos do projeto

---

## 🎉 Conclusão

A migração para o **Middleware Unificado** simplifica significativamente o desenvolvimento e manutenção das rotas da API, fornecendo:

- **Consistência** em segurança e validação
- **Redução** de código duplicado
- **Melhoria** na manutenibilidade
- **Padronização** de respostas e logs
- **Facilidade** de configuração por rota

Cada rota migrada contribui para um sistema mais robusto e fácil de manter.