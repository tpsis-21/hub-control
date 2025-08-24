# 📚 Guia de Migração - Middleware Unificado

## 🎯 Objetivo

Este guia demonstra como migrar rotas existentes para usar o novo **Middleware Unificado**, que combina funcionalidades de segurança, validação e rate limiting em uma única interface.

---

## 🔄 Antes vs Depois

### ❌ Implementação Anterior (Duplicada)

```typescript
// src/app/api/exemplo/route.ts - ANTES
import { NextRequest, NextResponse } from 'next/server'
import { createSecurityMiddleware } from '@/middleware/security-middleware'
import { createValidationMiddleware } from '@/middleware/validation-middleware'
import { z } from 'zod'

// Múltiplos middlewares com configurações separadas
const securityMiddleware = createSecurityMiddleware({
  enableRateLimit: true,
  enablePayloadScan: true,
  enableIPBlocking: true
})

const validationMiddleware = createValidationMiddleware({
  bodySchema: z.object({
    name: z.string().min(1),
    email: z.string().email()
  }),
  rateLimit: { requests: 10, windowMs: 60000 }
})

export async function POST(request: NextRequest) {
  // Aplicar múltiplos middlewares manualmente
  const securityResult = await securityMiddleware(request, async (req) => {
    return await validationMiddleware(req, async (validatedReq, data) => {
      // Lógica da rota
      return NextResponse.json({ success: true, data })
    })
  })
  
  return securityResult
}
```

### ✅ Implementação Nova (Unificada)

```typescript
// src/app/api/exemplo/route.ts - DEPOIS
import { NextRequest, NextResponse } from 'next/server'
import { createUnifiedMiddleware } from '@/middleware/unified-middleware'
import { z } from 'zod'

// Middleware único com todas as funcionalidades
const middleware = createUnifiedMiddleware({
  // Validação
  bodySchema: z.object({
    name: z.string().min(1),
    email: z.string().email()
  }),
  
  // Rate Limiting
  rateLimit: { requests: 10, windowMs: 60000, namespace: 'exemplo' },
  
  // Segurança
  enablePayloadScan: true,
  enableIPBlocking: true,
  
  // Métodos permitidos
  allowedMethods: ['POST']
})

export async function POST(request: NextRequest) {
  return middleware(request, async (req, validatedData) => {
    // Dados já validados e seguros
    const { body, user, ip } = validatedData
    
    // Lógica da rota
    return NextResponse.json({ 
      success: true, 
      data: body,
      user: user?.email 
    })
  })
}
```

---

## 🚀 Middlewares Pré-Configurados

### 1. Rotas de Autenticação

```typescript
import { authUnifiedMiddleware } from '@/middleware/unified-middleware'

export async function POST(request: NextRequest) {
  return authUnifiedMiddleware(request, async (req, validatedData) => {
    const { body } = validatedData // { email, password }
    
    // Lógica de login/registro
    return NextResponse.json({ success: true })
  })
}
```

### 2. APIs Administrativas

```typescript
import { adminUnifiedMiddleware } from '@/middleware/unified-middleware'

export async function DELETE(request: NextRequest) {
  return adminUnifiedMiddleware(request, async (req, validatedData) => {
    const { user } = validatedData // Usuário já verificado como admin
    
    // Lógica administrativa
    return NextResponse.json({ success: true })
  })
}
```

### 3. Upload de Arquivos

```typescript
import { uploadUnifiedMiddleware } from '@/middleware/unified-middleware'

export async function POST(request: NextRequest) {
  return uploadUnifiedMiddleware(request, async (req, validatedData) => {
    const { user, ip } = validatedData
    
    // Lógica de upload (sem escaneamento de payload)
    return NextResponse.json({ success: true })
  })
}
```

### 4. APIs Públicas

```typescript
import { publicUnifiedMiddleware } from '@/middleware/unified-middleware'

export async function GET(request: NextRequest) {
  return publicUnifiedMiddleware(request, async (req, validatedData) => {
    const { query, ip } = validatedData
    
    // Lógica pública (sem autenticação)
    return NextResponse.json({ success: true })
  })
}
```

---

## 🔧 Configurações Avançadas

### Middleware Customizado

```typescript
import { createUnifiedMiddleware } from '@/middleware/unified-middleware'
import { z } from 'zod'

const customMiddleware = createUnifiedMiddleware({
  // Validação personalizada
  bodySchema: z.object({
    data: z.array(z.string()),
    metadata: z.object({
      version: z.string(),
      timestamp: z.number()
    })
  }),
  
  querySchema: z.object({
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional()
  }),
  
  // Autenticação e autorização
  requireAuth: true,
  requiredRole: 'moderator',
  
  // Rate limiting específico
  rateLimit: {
    requests: 50,
    windowMs: 5 * 60 * 1000, // 5 minutos
    namespace: 'custom-api'
  },
  
  // Segurança avançada
  enablePayloadScan: true,
  enableSuspiciousPatternDetection: true,
  maxPayloadSize: 2 * 1024 * 1024, // 2MB
  
  // IPs confiáveis (bypass completo)
  trustedIPs: ['127.0.0.1', '::1'],
  
  // Métodos permitidos
  allowedMethods: ['GET', 'POST', 'PUT'],
  
  // Headers obrigatórios
  requiredHeaders: ['x-api-version']
})

export async function POST(request: NextRequest) {
  return customMiddleware(request, async (req, validatedData) => {
    const { body, query, user, headers } = validatedData
    
    // Todos os dados já validados e seguros
    return NextResponse.json({
      received: body,
      pagination: query,
      user: user.email,
      apiVersion: headers['x-api-version']
    })
  })
}
```

### Helper para Múltiplas Rotas

```typescript
import { withUnifiedMiddleware } from '@/middleware/unified-middleware'
import { z } from 'zod'

// Configuração compartilhada
const sharedConfig = {
  requireAuth: true,
  rateLimit: { requests: 100, windowMs: 60000, namespace: 'api' },
  enablePayloadScan: true
}

// GET com validação de query
export const GET = withUnifiedMiddleware(
  async (request: NextRequest) => {
    const validatedData = getValidatedData(request)
    return NextResponse.json({ data: validatedData?.query })
  },
  {
    ...sharedConfig,
    querySchema: z.object({
      search: z.string().optional(),
      category: z.enum(['tech', 'business', 'personal'])
    })
  }
)

// POST com validação de body
export const POST = withUnifiedMiddleware(
  async (request: NextRequest) => {
    const validatedData = getValidatedData(request)
    return NextResponse.json({ created: validatedData?.body })
  },
  {
    ...sharedConfig,
    bodySchema: z.object({
      title: z.string().min(1),
      content: z.string().min(10)
    })
  }
)
```

---

## 📊 Dados Validados Disponíveis

```typescript
interface UnifiedValidatedData {
  headers: Record<string, string>    // Headers da requisição
  query: Record<string, any>         // Query params validados
  body: any                          // Body validado
  params?: Record<string, any>       // Params da rota (futuro)
  user?: any                         // Usuário autenticado
  ip: string                         // IP do cliente
  method: string                     // Método HTTP
  userAgent: string                  // User Agent
  rateLimitResult: RateLimitResult   // Resultado do rate limiting
}
```

---

## ⚡ Benefícios da Migração

### 🎯 Simplicidade
- **Antes:** Múltiplos middlewares com configurações separadas
- **Depois:** Middleware único com configuração centralizada

### 🔒 Segurança
- Rate limiting centralizado e consistente
- Validação automática de entrada
- Detecção de padrões suspeitos
- Bloqueio de IPs e usuários

### 🚀 Performance
- Pipeline otimizado de validação
- Cache compartilhado de rate limiting
- Menos overhead de processamento

### 🛠️ Manutenibilidade
- Configuração declarativa
- Logs estruturados
- Respostas de erro padronizadas
- Código mais limpo e legível

---

## 📋 Checklist de Migração

### Para cada rota:

- [ ] **Identificar middlewares atuais** usados na rota
- [ ] **Mapear configurações** de segurança e validação
- [ ] **Escolher middleware pré-configurado** ou criar customizado
- [ ] **Atualizar imports** para usar middleware unificado
- [ ] **Refatorar handler** para usar `validatedData`
- [ ] **Testar funcionalidade** (rate limiting, validação, segurança)
- [ ] **Remover middlewares antigos** se não usados em outras rotas

### Verificações finais:

- [ ] **Rate limiting** funcionando corretamente
- [ ] **Validação de entrada** bloqueando dados inválidos
- [ ] **Autenticação** verificando usuários corretamente
- [ ] **Logs** sendo gerados adequadamente
- [ ] **Headers de segurança** sendo anexados
- [ ] **Performance** mantida ou melhorada

---

## 🚨 Pontos de Atenção

### ⚠️ Compatibilidade
- Verificar se todas as funcionalidades antigas estão cobertas
- Testar cenários de erro específicos
- Validar comportamento de rate limiting

### ⚠️ Performance
- Monitorar tempo de resposta após migração
- Verificar uso de memória do cache de rate limiting
- Otimizar schemas de validação se necessário

### ⚠️ Segurança
- Confirmar que todos os padrões suspeitos são detectados
- Verificar bloqueios de IP funcionando
- Testar bypass para IPs confiáveis

---

## 🎉 Conclusão

O **Middleware Unificado** simplifica significativamente a implementação de segurança e validação nas rotas da API, eliminando duplicidade de código e fornecendo uma interface consistente e poderosa.

**Próximos passos:**
1. Migrar rotas críticas primeiro (auth, admin)
2. Testar thoroughly cada migração
3. Monitorar logs e métricas
4. Documentar configurações específicas do projeto