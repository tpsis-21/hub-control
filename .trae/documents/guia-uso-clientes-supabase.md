# Guia de Uso - Clientes Supabase

## 📖 Visão Geral

Este guia documenta como usar corretamente os clientes Supabase consolidados na aplicação Hub Control. Cada contexto de execução requer um cliente específico para garantir segurança, performance e funcionalidade adequada.

## 🏗️ Arquitetura dos Clientes

### Estrutura de Arquivos
```
src/lib/supabase/
├── clients/
│   ├── api.ts          # Cliente para API Routes
│   ├── browser.ts      # Cliente para componentes React (client-side)
│   ├── middleware.ts   # Cliente para middleware de autenticação
│   └── server.ts       # Cliente para Server Actions e SSR
├── types.ts           # Tipos TypeScript compartilhados
└── index.ts           # Exports consolidados para fácil importação
```

## 🎯 Quando Usar Cada Cliente

| Contexto | Cliente | Função Principal | Características |
|----------|---------|------------------|----------------|
| **API Routes** | `createApiSupabaseClient` | Endpoints `/api/*` | Service Role, sem cookies |
| **Server Actions** | `createServerSupabaseClientForActions` | Funções `"use server"` | Cookies, autenticação |
| **Middleware** | `createMiddlewareSupabaseClient` | `middleware.ts` | Leitura/escrita de cookies |
| **Componentes Client** | `createBrowserSupabaseClient` | React client-side | Navegador, real-time |
| **SSR/SSG** | `createServerSupabaseClient` | `getServerSideProps`, etc. | Server-side rendering |

## 📋 Exemplos Práticos

### 1. API Routes (`/app/api/*/route.ts`)

```typescript
// ✅ CORRETO
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';

const supabase = createApiSupabaseClient();

export async function GET(request: NextRequest) {
  try {
    // Operações com privilégios elevados
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

```typescript
// ❌ INCORRETO - Não usar createClient diretamente
import { createClient } from '@supabase/supabase-js';

// ❌ INCORRETO - Não usar outros clientes em API routes
import { createServerSupabaseClientForActions } from '@/lib/supabase/clients/server';
```

### 2. Server Actions (`"use server"`)

```typescript
// ✅ CORRETO
"use server";

import { createServerSupabaseClientForActions } from '@/lib/supabase/clients/server';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const supabase = await createServerSupabaseClientForActions();
  
  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Não autenticado' };
  }
  
  // Operação no banco
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      name: formData.get('name') as string
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath('/dashboard');
  return { success: true, data };
}
```

### 3. Middleware (`middleware.ts`)

```typescript
// ✅ CORRETO
import { createMiddlewareSupabaseClient } from '@/lib/supabase/clients/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(request, response);
  
  // Verificar sessão
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return response;
}
```

### 4. Componentes React (Client-Side)

```typescript
// ✅ CORRETO
'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/clients/browser';
import { useEffect, useState } from 'react';

export function UserProfile() {
  const [user, setUser] = useState(null);
  const supabase = createBrowserSupabaseClient();
  
  useEffect(() => {
    // Buscar usuário atual
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
    
    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase]);
  
  return (
    <div>
      {user ? `Olá, ${user.email}` : 'Não logado'}
    </div>
  );
}
```

### 5. Server-Side Rendering (SSR)

```typescript
// ✅ CORRETO
import { createServerSupabaseClient } from '@/lib/supabase/clients/server';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  
  // Buscar dados no servidor
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');
  
  return (
    <div>
      <h1>Dashboard</h1>
      {profiles?.map(profile => (
        <div key={profile.id}>{profile.name}</div>
      ))}
    </div>
  );
}
```

## 🔒 Considerações de Segurança

### Row Level Security (RLS)

```sql
-- Exemplo de política RLS
CREATE POLICY "Users can only see their own data" ON profiles
  FOR ALL USING (auth.uid() = user_id);
```

### Permissões por Contexto

| Cliente | Permissões | Uso Recomendado |
|---------|------------|----------------|
| **API** | Service Role (completo) | Operações administrativas |
| **Server Actions** | Usuário autenticado | CRUD com validação |
| **Middleware** | Leitura de sessão | Verificação de auth |
| **Browser** | Usuário autenticado | Interface do usuário |

## ⚠️ Erros Comuns e Como Evitar

### 1. Usar Cliente Errado no Contexto

```typescript
// ❌ INCORRETO - API Route usando cliente de Server Action
export async function GET() {
  const supabase = await createServerSupabaseClientForActions(); // ERRO!
  // ...
}

// ✅ CORRETO
export async function GET() {
  const supabase = createApiSupabaseClient();
  // ...
}
```

### 2. Não Aguardar Cliente Assíncrono

```typescript
// ❌ INCORRETO
const supabase = createServerSupabaseClientForActions(); // Faltou await!

// ✅ CORRETO
const supabase = await createServerSupabaseClientForActions();
```

### 3. Importar de Local Incorreto

```typescript
// ❌ INCORRETO - Arquivos antigos removidos
import { createClient } from '@/lib/supabase-client';

// ✅ CORRETO - Usar clientes consolidados
import { createBrowserSupabaseClient } from '@/lib/supabase/clients/browser';
```

## 🧪 Testes

### Testando Server Actions

```typescript
// __tests__/actions.test.ts
import { createServerSupabaseClientForActions } from '@/lib/supabase/clients/server';
import { createUser } from '@/app/actions';

// Mock do cliente
jest.mock('@/lib/supabase/clients/server');

test('should create user successfully', async () => {
  const mockSupabase = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: '123' } } }) },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: { id: '456' }, error: null })
    })
  };
  
  (createServerSupabaseClientForActions as jest.Mock).mockResolvedValue(mockSupabase);
  
  const formData = new FormData();
  formData.append('name', 'João Silva');
  
  const result = await createUser(formData);
  
  expect(result.success).toBe(true);
});
```

## 📚 Referências Rápidas

### Imports Essenciais

```typescript
// API Routes
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';

// Server Actions
import { createServerSupabaseClientForActions } from '@/lib/supabase/clients/server';

// Middleware
import { createMiddlewareSupabaseClient } from '@/lib/supabase/clients/middleware';

// Componentes Client
import { createBrowserSupabaseClient } from '@/lib/supabase/clients/browser';

// SSR/SSG
import { createServerSupabaseClient } from '@/lib/supabase/clients/server';
```

### Checklist de Verificação

- [ ] Usando o cliente correto para o contexto?
- [ ] Aguardando clientes assíncronos com `await`?
- [ ] Verificando autenticação quando necessário?
- [ ] Tratando erros adequadamente?
- [ ] Revalidando cache após mutações?
- [ ] Seguindo princípios de segurança (RLS)?

## 🔄 Atualizações

Este guia deve ser atualizado sempre que:
- Novos clientes forem adicionados
- Configurações de segurança mudarem
- Novos padrões de uso forem estabelecidos
- Bugs relacionados a clientes forem descobertos

---

*Última atualização: " + new Date().toLocaleString('pt-BR') + "*
*Versão: 1.0*