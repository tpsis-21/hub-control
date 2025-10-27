# Guia de Uso dos Clientes Supabase

## Visão Geral

Este documento define as práticas corretas para uso dos clientes Supabase na aplicação, garantindo consistência e evitando duplicações.

## Estrutura dos Clientes

### Clientes Consolidados (USAR SEMPRE)

Localização: `src/lib/supabase/clients/`

#### 1. Cliente para API Routes (`api.ts`)
```typescript
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';

// ✅ CORRETO - Use em API routes
const supabase = createApiSupabaseClient();
```

#### 2. Cliente para Browser (`browser.ts`)
```typescript
import { createBrowserSupabaseClient } from '@/lib/supabase/clients/browser';

// ✅ CORRETO - Use em componentes React
const supabase = createBrowserSupabaseClient();
```

#### 3. Cliente para Server Components (`server.ts`)
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/clients/server';

// ✅ CORRETO - Use em Server Components
const supabase = createServerSupabaseClient();
```

#### 4. Cliente para Middleware (`middleware.ts`)
```typescript
import { createMiddlewareSupabaseClient } from '@/lib/supabase/clients/middleware';

// ✅ CORRETO - Use em middleware
const supabase = createMiddlewareSupabaseClient(req);
```

## Quando Usar Cada Cliente

### 🔴 API Routes (`/api/*` e `/pages/api/*`)
**SEMPRE use:** `createApiSupabaseClient()`

```typescript
// ✅ CORRETO
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';

export async function POST(request: Request) {
  const supabase = createApiSupabaseClient();
  // ...
}
```

```typescript
// ❌ INCORRETO - NÃO FAÇA ISSO
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 🟡 Componentes React (Client-side)
**SEMPRE use:** `createBrowserSupabaseClient()`

```typescript
// ✅ CORRETO
import { createBrowserSupabaseClient } from '@/lib/supabase/clients/browser';

function MyComponent() {
  const supabase = createBrowserSupabaseClient();
  // ...
}
```

### 🟢 Server Components
**SEMPRE use:** `createServerSupabaseClient()`

```typescript
// ✅ CORRETO
import { createServerSupabaseClient } from '@/lib/supabase/clients/server';

export default async function ServerPage() {
  const supabase = createServerSupabaseClient();
  // ...
}
```

### 🔵 Middleware
**SEMPRE use:** `createMiddlewareSupabaseClient()`

```typescript
// ✅ CORRETO
import { createMiddlewareSupabaseClient } from '@/lib/supabase/clients/middleware';

export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareSupabaseClient(request);
  // ...
}
```

## ❌ O Que NÃO Fazer

### 1. Não use `createClient` diretamente
```typescript
// ❌ INCORRETO
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 2. Não crie múltiplas instâncias
```typescript
// ❌ INCORRETO
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

### 3. Não use clientes antigos/duplicados
```typescript
// ❌ INCORRETO - Arquivos obsoletos
import { createClient } from '@/lib/supabase-client';
import { createClient } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-middleware';
```

## Benefícios dos Clientes Consolidados

1. **Configuração Centralizada**: Todas as configurações em um local
2. **Consistência**: Mesmo comportamento em toda aplicação
3. **Manutenibilidade**: Fácil de atualizar e manter
4. **Segurança**: Configurações de segurança padronizadas
5. **Performance**: Otimizações centralizadas

## Configurações Automáticas

Os clientes consolidados já incluem:

- ✅ Configuração automática de URLs e chaves
- ✅ Configurações de autenticação apropriadas
- ✅ Headers de segurança
- ✅ Configurações de cache
- ✅ Tratamento de erros padronizado

## Migração de Código Legado

Se encontrar código usando `createClient` diretamente:

1. **Identifique o contexto** (API route, componente, etc.)
2. **Substitua pela importação correta**
3. **Remova configurações manuais**
4. **Teste a funcionalidade**

### Exemplo de Migração

**Antes:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Depois:**
```typescript
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';

const supabase = createApiSupabaseClient();
```

## Troubleshooting

### Erro: "Cannot find module"
Verifique se está importando do caminho correto:
```typescript
// ✅ CORRETO
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
```

### Erro: "Unauthorized"
Verifique se está usando o cliente correto para o contexto:
- API routes → `createApiSupabaseClient()`
- Browser → `createBrowserSupabaseClient()`

### Erro: "Environment variables not found"
Os clientes consolidados gerenciam as variáveis automaticamente. Verifique se estão definidas no `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Conclusão

Sempre use os clientes consolidados da pasta `src/lib/supabase/clients/`. Isso garante:

- 🔒 **Segurança** padronizada
- 🚀 **Performance** otimizada
- 🛠️ **Manutenibilidade** simplificada
- 🎯 **Consistência** em toda aplicação

---

**Lembre-se**: Quando em dúvida, consulte este guia e use sempre os clientes consolidados!