# Quando Usar Cada Cliente Supabase

## 🎯 Decisão Rápida

### Fluxograma de Decisão

```
Onde estou executando o código?
│
├─ 🌐 API Route (/app/api/*)
│  └─ ✅ createApiSupabaseClient
│
├─ ⚡ Server Action ("use server")
│  └─ ✅ createServerSupabaseClientForActions
│
├─ 🛡️ Middleware (middleware.ts)
│  └─ ✅ createMiddlewareSupabaseClient
│
├─ 🖥️ Componente Client ("use client")
│  └─ ✅ createBrowserSupabaseClient
│
└─ 🏗️ Server-Side Rendering (SSR/SSG)
   └─ ✅ createServerSupabaseClient
```

## 📋 Matriz de Contextos

| Contexto | Cliente | Async? | Cookies | Permissões | Casos de Uso |
|----------|---------|--------|---------|------------|-------------|
| **API Routes** | `createApiSupabaseClient` | ❌ | ❌ | Service Role | Admin, integrações |
| **Server Actions** | `createServerSupabaseClientForActions` | ✅ | ✅ | Usuário | CRUD, formulários |
| **Middleware** | `createMiddlewareSupabaseClient` | ❌ | ✅ | Usuário | Auth, redirecionamento |
| **Client Components** | `createBrowserSupabaseClient` | ❌ | ✅ | Usuário | UI, real-time |
| **SSR/SSG** | `createServerSupabaseClient` | ❌ | ✅ | Usuário | Renderização |

## 🔍 Cenários Específicos

### 1. 🌐 API Routes - `createApiSupabaseClient`

**Quando usar:**
- Endpoints públicos (`/api/public/*`)
- Integrações com sistemas externos
- Webhooks de terceiros
- Operações administrativas
- Sincronização de dados

**Características:**
- ✅ Service Role (acesso completo)
- ❌ Não usa cookies
- ❌ Não é assíncrono
- ⚡ Performance máxima

**Exemplos:**

```typescript
// ✅ Webhook do Stripe
export async function POST(request: NextRequest) {
  const supabase = createApiSupabaseClient();
  
  // Acesso direto sem autenticação de usuário
  const { data } = await supabase
    .from('payments')
    .insert({ /* dados do webhook */ });
}

// ✅ Sincronização com sistema externo
export async function GET() {
  const supabase = createApiSupabaseClient();
  
  // Operação administrativa
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('sync_needed', true);
}

// ✅ Endpoint público de estatísticas
export async function GET() {
  const supabase = createApiSupabaseClient();
  
  const { count } = await supabase
    .from('public_stats')
    .select('*', { count: 'exact' });
    
  return NextResponse.json({ total_users: count });
}
```

### 2. ⚡ Server Actions - `createServerSupabaseClientForActions`

**Quando usar:**
- Formulários do usuário
- Operações CRUD autenticadas
- Validação de dados
- Mutações que requerem revalidação

**Características:**
- ✅ Usa cookies para autenticação
- ✅ É assíncrono (await obrigatório)
- 🔒 Permissões do usuário logado
- 🔄 Integra com revalidatePath/revalidateTag

**Exemplos:**

```typescript
// ✅ Criar perfil de usuário
"use server";

export async function createProfile(formData: FormData) {
  const supabase = await createServerSupabaseClientForActions();
  
  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };
  
  // Inserir dados do usuário logado
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id, // Automaticamente do usuário logado
      name: formData.get('name')
    });
    
  revalidatePath('/profile');
  return { data, error };
}

// ✅ Atualizar configurações
export async function updateSettings(settings: UserSettings) {
  const supabase = await createServerSupabaseClientForActions();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  
  // RLS garante que só atualiza dados do próprio usuário
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...settings });
    
  if (error) throw error;
  revalidatePath('/settings');
}
```

### 3. 🛡️ Middleware - `createMiddlewareSupabaseClient`

**Quando usar:**
- Verificação de autenticação
- Redirecionamentos baseados em auth
- Refresh de tokens
- Proteção de rotas

**Características:**
- ✅ Lê e escreve cookies
- ❌ Não é assíncrono
- 🔒 Acesso à sessão do usuário
- ⚡ Executa antes de cada request

**Exemplos:**

```typescript
// ✅ Proteção de rotas autenticadas
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(request, response);
  
  const { data: { session } } = await supabase.auth.getSession();
  
  // Redirecionar se não autenticado
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Redirecionar se já autenticado
  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return response;
}

// ✅ Verificação de permissões de admin
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(request, response);
  
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Verificar role de admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
      
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  return response;
}
```

### 4. 🖥️ Client Components - `createBrowserSupabaseClient`

**Quando usar:**
- Componentes React interativos
- Real-time subscriptions
- Autenticação no frontend
- Upload de arquivos
- Estados de loading/error

**Características:**
- ✅ Executa no navegador
- ✅ Suporte a real-time
- ✅ Gerenciamento de estado
- 🔒 Permissões do usuário

**Exemplos:**

```typescript
// ✅ Componente de login
'use client';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserSupabaseClient();
  
  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      router.push('/dashboard');
    }
    
    setLoading(false);
  };
  
  return (
    <form onSubmit={handleLogin}>
      {/* formulário */}
    </form>
  );
}

// ✅ Real-time notifications
'use client';

export function NotificationsList() {
  const [notifications, setNotifications] = useState([]);
  const supabase = createBrowserSupabaseClient();
  
  useEffect(() => {
    // Buscar notificações iniciais
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
        
      setNotifications(data || []);
    };
    
    fetchNotifications();
    
    // Escutar novas notificações
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [supabase]);
  
  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id}>{notification.message}</div>
      ))}
    </div>
  );
}

// ✅ Upload de arquivos
'use client';

export function FileUpload() {
  const supabase = createBrowserSupabaseClient();
  
  const handleUpload = async (file: File) => {
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(`${Date.now()}-${file.name}`, file);
      
    if (error) {
      toast.error('Erro no upload');
    } else {
      toast.success('Arquivo enviado!');
    }
  };
  
  return (
    <input 
      type="file" 
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
    />
  );
}
```

### 5. 🏗️ SSR/SSG - `createServerSupabaseClient`

**Quando usar:**
- Páginas que precisam de dados no servidor
- SEO otimizado
- Dados que não mudam frequentemente
- Performance crítica

**Características:**
- ✅ Executa no servidor
- ✅ Usa cookies para auth
- ❌ Não é assíncrono
- 🚀 Renderização otimizada

**Exemplos:**

```typescript
// ✅ Página de dashboard com dados do servidor
export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  
  // Buscar dados do usuário no servidor
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Buscar dados específicos do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  return (
    <div>
      <h1>Bem-vindo, {profile?.name}</h1>
      <NotificationsList initialData={notifications} />
    </div>
  );
}

// ✅ Página pública com dados estáticos
export default async function PublicStatsPage() {
  const supabase = createServerSupabaseClient();
  
  // Dados públicos para SEO
  const { data: stats } = await supabase
    .from('public_statistics')
    .select('*')
    .single();
  
  return (
    <div>
      <h1>Estatísticas Públicas</h1>
      <p>Total de usuários: {stats?.total_users}</p>
      <p>Projetos ativos: {stats?.active_projects}</p>
    </div>
  );
}

// ✅ Página com dados dinâmicos
export default async function UserProfilePage({ 
  params 
}: { 
  params: { userId: string } 
}) {
  const supabase = createServerSupabaseClient();
  
  // Verificar se o usuário pode ver este perfil
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.userId)
    .single();
    
  if (!profile || (profile.private && profile.user_id !== user?.id)) {
    notFound();
  }
  
  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.bio}</p>
    </div>
  );
}
```

## ❌ Anti-Padrões Comuns

### 1. Cliente Errado no Contexto

```typescript
// ❌ NUNCA fazer isso
export async function GET() {
  // ERRO: Server Action client em API Route
  const supabase = await createServerSupabaseClientForActions();
}

// ❌ NUNCA fazer isso
'use client';
export function Component() {
  // ERRO: API client no browser
  const supabase = createApiSupabaseClient();
}
```

### 2. Esquecer Await em Clientes Assíncronos

```typescript
// ❌ ERRO: Faltou await
"use server";
export async function action() {
  const supabase = createServerSupabaseClientForActions(); // ERRO!
}

// ✅ CORRETO
"use server";
export async function action() {
  const supabase = await createServerSupabaseClientForActions();
}
```

### 3. Usar createClient Diretamente

```typescript
// ❌ NUNCA fazer isso
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key); // ERRO!

// ✅ SEMPRE usar clientes consolidados
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';

const supabase = createApiSupabaseClient();
```

## 🔧 Troubleshooting

### Problemas Comuns

| Erro | Causa Provável | Solução |
|------|----------------|----------|
| "Cannot read cookies" | Cliente errado | Usar cliente com suporte a cookies |
| "Unauthorized" | Sem autenticação | Verificar se usuário está logado |
| "RLS policy violation" | Permissões | Verificar políticas RLS |
| "Client is not a function" | Import incorreto | Verificar path do import |

### Debug Checklist

1. **Contexto correto?**
   - [ ] API Route → `createApiSupabaseClient`
   - [ ] Server Action → `createServerSupabaseClientForActions`
   - [ ] Middleware → `createMiddlewareSupabaseClient`
   - [ ] Client Component → `createBrowserSupabaseClient`
   - [ ] SSR → `createServerSupabaseClient`

2. **Async/Await correto?**
   - [ ] Server Actions usam `await`
   - [ ] Outros clientes não precisam de `await`

3. **Autenticação verificada?**
   - [ ] `supabase.auth.getUser()` quando necessário
   - [ ] Tratamento de usuário não logado

4. **Imports corretos?**
   - [ ] Usando clientes consolidados
   - [ ] Paths corretos dos imports

---

*Este documento deve ser consultado sempre que houver dúvidas sobre qual cliente usar em cada contexto.*