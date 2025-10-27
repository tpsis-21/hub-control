# Checklist de Consistência - Clientes Supabase

## 📋 Checklist para Desenvolvimento

Use este checklist antes de fazer commit ou deploy para garantir consistência nos clientes Supabase.

### ✅ Verificações Obrigatórias

#### 1. Importações Corretas
- [ ] **API Routes**: Usa `createApiSupabaseClient` de `@/lib/supabase/clients/api`
- [ ] **Componentes React**: Usa `createBrowserSupabaseClient` de `@/lib/supabase/clients/browser`
- [ ] **Server Components**: Usa `createServerSupabaseClient` de `@/lib/supabase/clients/server`
- [ ] **Middleware**: Usa `createMiddlewareSupabaseClient` de `@/lib/supabase/clients/middleware`

#### 2. Importações Proibidas
- [ ] **NÃO** usa `import { createClient } from '@supabase/supabase-js'` diretamente
- [ ] **NÃO** usa arquivos obsoletos (`@/lib/supabase-client`, `@/lib/supabase-server`, etc.)
- [ ] **NÃO** cria instâncias manuais com `createClient(url, key)`

#### 3. Padrões de Código
- [ ] **NÃO** define funções como `createAdminClient()` ou similares
- [ ] **NÃO** configura URLs e chaves manualmente
- [ ] **NÃO** duplica lógica de criação de cliente

### 🔍 Comandos de Verificação

#### Buscar Uso Direto de createClient
```bash
# Buscar importações diretas (deve retornar vazio)
grep -r "import.*createClient.*from.*@supabase/supabase-js" src/

# Buscar criação manual de clientes (deve retornar vazio)
grep -r "createClient(" src/
```

#### Buscar Arquivos Obsoletos
```bash
# Buscar importações de arquivos antigos (deve retornar vazio)
grep -r "@/lib/supabase-client" src/
grep -r "@/lib/supabase-server" src/
grep -r "@/lib/supabase-middleware" src/
```

#### Verificar Clientes Consolidados
```bash
# Verificar uso correto dos clientes consolidados
grep -r "createApiSupabaseClient" src/app/api/
grep -r "createBrowserSupabaseClient" src/components/
grep -r "createServerSupabaseClient" src/app/
```

### 🚨 Sinais de Alerta

Se encontrar qualquer um destes padrões, **CORRIJA IMEDIATAMENTE**:

#### ❌ Padrões Incorretos
```typescript
// INCORRETO - Importação direta
import { createClient } from '@supabase/supabase-js';

// INCORRETO - Configuração manual
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// INCORRETO - Função personalizada
function createAdminClient() {
  return createClient(...);
}

// INCORRETO - Arquivo obsoleto
import { createClient } from '@/lib/supabase-client';
```

#### ✅ Padrões Corretos
```typescript
// CORRETO - API Route
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
const supabase = createApiSupabaseClient();

// CORRETO - Componente React
import { createBrowserSupabaseClient } from '@/lib/supabase/clients/browser';
const supabase = createBrowserSupabaseClient();

// CORRETO - Server Component
import { createServerSupabaseClient } from '@/lib/supabase/clients/server';
const supabase = createServerSupabaseClient();
```

### 📁 Estrutura de Arquivos Esperada

```
src/lib/supabase/clients/
├── api.ts          ✅ Cliente para API routes
├── browser.ts      ✅ Cliente para browser
├── server.ts       ✅ Cliente para server
└── middleware.ts   ✅ Cliente para middleware

# Arquivos que NÃO devem existir:
src/lib/
├── supabase-client.ts     ❌ Obsoleto
├── supabase-server.ts     ❌ Obsoleto
└── supabase-middleware.ts ❌ Obsoleto
```

### 🔧 Processo de Correção

Se encontrar inconsistências:

1. **Identifique o contexto**:
   - API route → use `createApiSupabaseClient`
   - Componente React → use `createBrowserSupabaseClient`
   - Server Component → use `createServerSupabaseClient`
   - Middleware → use `createMiddlewareSupabaseClient`

2. **Substitua a importação**:
   ```typescript
   // Antes
   import { createClient } from '@supabase/supabase-js';
   
   // Depois
   import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
   ```

3. **Substitua a criação do cliente**:
   ```typescript
   // Antes
   const supabase = createClient(url, key);
   
   // Depois
   const supabase = createApiSupabaseClient();
   ```

4. **Remova configurações manuais**:
   - Remova definições de URL e chaves
   - Remova funções personalizadas de criação
   - Remova configurações duplicadas

### 📊 Métricas de Qualidade

#### Indicadores de Sucesso
- ✅ Zero ocorrências de `import { createClient } from '@supabase/supabase-js'`
- ✅ Zero funções personalizadas de criação de cliente
- ✅ Zero arquivos obsoletos em uso
- ✅ Todos os API routes usam `createApiSupabaseClient`
- ✅ Todos os componentes usam `createBrowserSupabaseClient`

#### Comandos de Auditoria
```bash
# Auditoria completa
echo "=== Verificando importações diretas ==="
grep -r "createClient.*@supabase" src/ || echo "✅ Nenhuma importação direta encontrada"

echo "\n=== Verificando arquivos obsoletos ==="
grep -r "@/lib/supabase-[^/]" src/ || echo "✅ Nenhum arquivo obsoleto em uso"

echo "\n=== Verificando clientes consolidados ==="
echo "API routes:"
find src/app/api -name "*.ts" -exec grep -l "createApiSupabaseClient" {} \;
echo "Componentes:"
find src/components -name "*.tsx" -exec grep -l "createBrowserSupabaseClient" {} \;
```

### 🎯 Objetivos de Qualidade

- **100%** dos API routes usando clientes consolidados
- **0** importações diretas de `@supabase/supabase-js`
- **0** arquivos obsoletos em uso
- **0** funções personalizadas de criação de cliente

### 📝 Processo de Review

Antes de aprovar qualquer PR:

1. [ ] Execute os comandos de verificação
2. [ ] Confirme que não há padrões incorretos
3. [ ] Verifique se novos arquivos seguem os padrões
4. [ ] Teste a funcionalidade após mudanças

### 🚀 Automação Futura

Considere implementar:

- **ESLint rules** para detectar importações incorretas
- **Pre-commit hooks** para executar verificações
- **CI/CD checks** para validar consistência
- **Testes automatizados** para padrões de código

---

**Lembre-se**: A consistência é fundamental para a manutenibilidade do código. Use este checklist religiosamente!