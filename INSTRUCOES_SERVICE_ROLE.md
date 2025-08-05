# Instruções para Configurar Service Role Key

## Problema Identificado

O erro "JSON object requested, multiple (or no) rows returned" ao editar planos está ocorrendo devido às políticas RLS (Row Level Security) do Supabase que estão bloqueando a operação de UPDATE.

## Solução

### 1. Obter a Service Role Key

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/settings/api
2. Faça login na sua conta Supabase
3. Selecione seu projeto (se não estiver selecionado automaticamente)
4. **Alternativa**: Acesse diretamente as chaves API em: https://supabase.com/dashboard/project/_/settings/api-keys

#### Encontre a Service Role Key

Na página **Settings > API**, você verá as chaves disponíveis:

**Opção 1: JWT-based service_role key (Tradicional)**
- **service_role** - Chave JWT que começa com `eyJ...`
- Tem privilégios elevados e bypassa RLS
- Funciona imediatamente sem configuração adicional

**Opção 2: Secret Keys (Recomendado - Mais Seguro)**
- Procure por **"Secret keys"** na mesma página
- Clique em **"Create new secret key"** se não existir
- Chaves secretas começam com `sb_secret_...`
- São mais seguras que as JWT-based keys

**Para este projeto, use qualquer uma das duas opções. A service_role JWT funciona perfeitamente.**

5. **Copie a chave service_role** (JWT que começa com `eyJ...`) OU uma secret key (que começa com `sb_secret_...`)

**Nota**: Se você não encontrar "service_role" na página, procure por "Secret keys" e crie uma nova chave secreta.

### 2. Configurar a Variável de Ambiente

1. Abra o arquivo `.env.local` na raiz do projeto
2. Substitua `CONFIGURE_AQUI_A_SERVICE_ROLE_KEY` pela chave copiada:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...(sua_chave_aqui)
```

### 3. Reiniciar o Servidor

Após configurar a chave, reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Como Funciona a Correção

A correção implementada:

1. **Verificação de Admin**: Antes de editar um plano, verifica se o usuário tem role 'admin' na tabela `profiles`
2. **Cliente Administrativo**: Usa a service role key que bypassa as políticas RLS
3. **Fallback Seguro**: Se a service role não estiver configurada, usa o cliente normal

## Logs de Depuração

Com as modificações, você verá logs detalhados no terminal:

- `🔍 editPlanAction - Usuário é admin: true/false`
- `🔍 editPlanAction - Cliente Admin Supabase criado`
- `✅ editPlanAction - Plano atualizado com sucesso`

## Testando a Correção

1. Configure a service role key conforme instruções acima
2. Reinicie o servidor
3. Tente editar um plano na interface
4. Verifique os logs no terminal para confirmar que está funcionando

## Segurança

⚠️ **IMPORTANTE**: A service role key tem acesso total ao banco de dados. Mantenha-a segura:

- Nunca commite no Git
- Use apenas no servidor (backend)
- Não exponha no frontend

A implementação atual usa a service role apenas para operações administrativas autorizadas.