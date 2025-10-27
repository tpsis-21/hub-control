# ✅ Checklist de Verificação - Clientes Supabase

## 🎯 Objetivo

Este checklist deve ser usado por desenvolvedores para garantir o uso correto dos clientes Supabase e evitar inconsistências na aplicação Hub Control.

## 📋 Checklist Geral

### Antes de Implementar

- [ ] **Identifiquei o contexto de execução correto?**
  - [ ] API Route (`/app/api/*`) → `createApiSupabaseClient`
  - [ ] Server Action (`"use server"`) → `createServerSupabaseClientForActions`
  - [ ] Middleware (`middleware.ts`) → `createMiddlewareSupabaseClient`
  - [ ] Client Component (`"use client"`) → `createBrowserSupabaseClient`
  - [ ] SSR/SSG (server rendering) → `createServerSupabaseClient`

- [ ] **Verifiquei se já existe implementação similar?**
  - [ ] Busquei por código similar na aplicação
  - [ ] Reutilizei funções existentes quando possível
  - [ ] Evitei duplicação de lógica

- [ ] **Planejei o tratamento de erros?**
  - [ ] Autenticação (usuário não logado)
  - [ ] Permissões (RLS violations)
  - [ ] Erros de rede/banco
  - [ ] Validação de dados

### Durante a Implementação

- [ ] **Imports estão corretos?**
  - [ ] Usando clientes consolidados (`@/lib/supabase/clients/*`)
  - [ ] Não importando `createClient` diretamente
  - [ ] Não usando arquivos antigos (`supabase-*.ts`)

- [ ] **Async/Await está correto?**
  - [ ] Server Actions usam `await createServerSupabaseClientForActions()`
  - [ ] Outros clientes não precisam de `await`
  - [ ] Todas as operações assíncronas têm `await`

- [ ] **Autenticação está sendo verificada?**
  - [ ] Chamando `supabase.auth.getUser()` quando necessário
  - [ ] Tratando caso de usuário não autenticado
  - [ ] Verificando permissões específicas quando necessário

- [ ] **Segurança está adequada?**
  - [ ] RLS policies estão ativas nas tabelas
  - [ ] Não expondo dados sensíveis
  - [ ] Validando entrada do usuário
  - [ ] Usando cliente com permissões adequadas

### Após a Implementação

- [ ] **Testei todas as funcionalidades?**
  - [ ] Usuário logado
  - [ ] Usuário não logado
  - [ ] Diferentes roles/permissões
  - [ ] Casos de erro

- [ ] **Performance está adequada?**
  - [ ] Não fazendo queries desnecessárias
  - [ ] Usando índices apropriados
  - [ ] Implementando cache quando necessário

- [ ] **Documentação está atualizada?**
  - [ ] Comentários no código explicam lógica complexa
  - [ ] README atualizado se necessário
  - [ ] Tipos TypeScript documentados

## 🔍 Checklists Específicos por Contexto

### 🌐 API Routes

```typescript
// Exemplo de verificação
export async function GET(request: NextRequest) {
  const supabase = createApiSupabaseClient(); // ✅
  
  // Checklist específico:
  // [ ] Usando createApiSupabaseClient
  // [ ] Não usando await no cliente
  // [ ] Tratando erros adequadamente
  // [ ] Validando parâmetros de entrada
  // [ ] Retornando NextResponse.json()
}
```

**Checklist API Routes:**
- [ ] Usando `createApiSupabaseClient()` (sem await)
- [ ] Validando parâmetros de entrada
- [ ] Tratando erros com status HTTP apropriados
- [ ] Retornando `NextResponse.json()`
- [ ] Não dependendo de cookies de usuário
- [ ] Documentando endpoint se público

### ⚡ Server Actions

```typescript
// Exemplo de verificação
"use server";

export async function createItem(formData: FormData) {
  const supabase = await createServerSupabaseClientForActions(); // ✅
  
  // Checklist específico:
  // [ ] Usando await createServerSupabaseClientForActions()
  // [ ] Verificando autenticação
  // [ ] Validando dados do formulário
  // [ ] Revalidando cache após mutação
  // [ ] Retornando resultado estruturado
}
```

**Checklist Server Actions:**
- [ ] Diretiva `"use server"` no topo
- [ ] Usando `await createServerSupabaseClientForActions()`
- [ ] Verificando `supabase.auth.getUser()`
- [ ] Validando dados de entrada (Zod recomendado)
- [ ] Chamando `revalidatePath()` ou `revalidateTag()` após mutações
- [ ] Retornando objeto com `success/error`
- [ ] Tratando casos de não autenticação

### 🛡️ Middleware

```typescript
// Exemplo de verificação
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(request, response); // ✅
  
  // Checklist específico:
  // [ ] Passando request e response
  // [ ] Verificando sessão
  // [ ] Implementando redirecionamentos
  // [ ] Retornando response
}
```

**Checklist Middleware:**
- [ ] Usando `createMiddlewareSupabaseClient(request, response)`
- [ ] Criando `NextResponse.next()` primeiro
- [ ] Verificando `supabase.auth.getSession()`
- [ ] Implementando redirecionamentos apropriados
- [ ] Retornando response (modificado ou não)
- [ ] Configurando `matcher` no export config

### 🖥️ Client Components

```typescript
// Exemplo de verificação
'use client';

export function MyComponent() {
  const supabase = createBrowserSupabaseClient(); // ✅
  
  // Checklist específico:
  // [ ] Diretiva "use client"
  // [ ] Usando createBrowserSupabaseClient
  // [ ] Gerenciando estados de loading
  // [ ] Implementando cleanup de subscriptions
}
```

**Checklist Client Components:**
- [ ] Diretiva `'use client'` no topo
- [ ] Usando `createBrowserSupabaseClient()` (sem await)
- [ ] Gerenciando estados de loading/error
- [ ] Implementando cleanup em `useEffect`
- [ ] Tratando casos de não autenticação na UI
- [ ] Usando `toast` para feedback ao usuário

### 🏗️ SSR/SSG

```typescript
// Exemplo de verificação
export default async function Page() {
  const supabase = createServerSupabaseClient(); // ✅
  
  // Checklist específico:
  // [ ] Usando createServerSupabaseClient
  // [ ] Verificando autenticação se necessário
  // [ ] Fazendo redirect() se não autorizado
  // [ ] Otimizando queries para performance
}
```

**Checklist SSR/SSG:**
- [ ] Usando `createServerSupabaseClient()` (sem await)
- [ ] Verificando autenticação com `supabase.auth.getUser()`
- [ ] Usando `redirect()` para redirecionamentos
- [ ] Usando `notFound()` para recursos não encontrados
- [ ] Otimizando queries (select específico, limits)
- [ ] Considerando cache e revalidação

## 🚨 Red Flags - Sinais de Alerta

### ❌ Nunca Fazer

- [ ] **Importar `createClient` diretamente**
  ```typescript
  // ❌ NUNCA
  import { createClient } from '@supabase/supabase-js';
  ```

- [ ] **Usar cliente errado no contexto**
  ```typescript
  // ❌ NUNCA - API Route com Server Action client
  export async function GET() {
    const supabase = await createServerSupabaseClientForActions();
  }
  ```

- [ ] **Esquecer await em Server Actions**
  ```typescript
  // ❌ NUNCA
  "use server";
  export async function action() {
    const supabase = createServerSupabaseClientForActions(); // Faltou await!
  }
  ```

- [ ] **Hardcodar credenciais**
  ```typescript
  // ❌ NUNCA
  const supabase = createClient('url', 'key');
  ```

### ⚠️ Cuidado Com

- [ ] **Queries sem filtros em tabelas grandes**
- [ ] **Não verificar autenticação em operações sensíveis**
- [ ] **Não tratar erros adequadamente**
- [ ] **Não revalidar cache após mutações**
- [ ] **Subscriptions sem cleanup**

## 🧪 Checklist de Testes

### Testes Funcionais
- [ ] **Usuário autenticado pode acessar recursos**
- [ ] **Usuário não autenticado é redirecionado**
- [ ] **Usuário sem permissão recebe erro apropriado**
- [ ] **Dados são filtrados corretamente por RLS**
- [ ] **Mutações revalidam cache**
- [ ] **Erros são tratados graciosamente**

### Testes de Segurança
- [ ] **RLS policies estão ativas**
- [ ] **Não é possível acessar dados de outros usuários**
- [ ] **Service role só é usado em contextos seguros**
- [ ] **Validação de entrada está funcionando**

### Testes de Performance
- [ ] **Queries são otimizadas**
- [ ] **Cache está funcionando**
- [ ] **Não há queries N+1**
- [ ] **Subscriptions são limpas adequadamente**

## 📊 Métricas de Qualidade

### Indicadores de Sucesso
- [ ] **Zero uso de `createClient` direto**
- [ ] **100% dos contextos usando cliente correto**
- [ ] **Todos os Server Actions com verificação de auth**
- [ ] **Zero hardcoding de credenciais**
- [ ] **Cobertura de testes > 80%**

### Indicadores de Problema
- [ ] **Múltiplas implementações do mesmo cliente**
- [ ] **Imports de arquivos antigos (`supabase-*.ts`)**
- [ ] **Erros de autenticação frequentes**
- [ ] **Performance degradada**
- [ ] **Violações de RLS**

## 🔄 Processo de Review

### Antes do Commit
- [ ] **Executei todos os testes**
- [ ] **Verifiquei se não quebrei funcionalidades existentes**
- [ ] **Atualizei documentação se necessário**
- [ ] **Removi código comentado/debug**

### Durante Code Review
- [ ] **Revisor verificou uso correto dos clientes**
- [ ] **Revisor testou funcionalidades críticas**
- [ ] **Revisor aprovou mudanças de segurança**

### Após Deploy
- [ ] **Monitorei logs por erros**
- [ ] **Verifiquei métricas de performance**
- [ ] **Testei em produção (se aplicável)**

## 📚 Recursos de Referência

### Documentação Interna
- [ ] [Guia de Uso dos Clientes Supabase](./guia-uso-clientes-supabase.md)
- [ ] [Quando Usar Cada Cliente](./quando-usar-cada-cliente.md)
- [ ] [Relatório de Inconsistências](./relatorio-inconsistencias-supabase.md)

### Comandos Úteis

```bash
# Buscar uso incorreto de createClient
grep -r "createClient" src/ --exclude-dir=node_modules

# Buscar imports antigos
grep -r "supabase-client\|supabase-server\|supabase-middleware" src/

# Verificar Server Actions sem await
grep -A 5 "createServerSupabaseClientForActions()" src/

# Executar testes
npm run test
npm run test:e2e
```

## 🎯 Próximos Passos

Após usar este checklist:

1. **Se encontrou problemas:**
   - [ ] Documente o problema
   - [ ] Corrija imediatamente
   - [ ] Atualize este checklist se necessário

2. **Se tudo está correto:**
   - [ ] Prossiga com confiança
   - [ ] Compartilhe boas práticas com a equipe

3. **Melhoria contínua:**
   - [ ] Sugira melhorias neste checklist
   - [ ] Automatize verificações quando possível
   - [ ] Mantenha documentação atualizada

---

**📝 Nota:** Este checklist deve ser usado em todas as implementações que envolvem Supabase. Mantenha-o atualizado conforme a aplicação evolui.

*Última atualização: " + new Date().toLocaleString('pt-BR') + "*
*Versão: 1.0*