# 🔑 Guia Visual: Como Encontrar as Chaves do Supabase

## Problema Atual
O erro "JSON object requested, multiple (or no) rows returned" ocorre porque as políticas RLS (Row Level Security) estão bloqueando a edição de planos. Precisamos da **service_role key** para contornar isso.

## 📍 Passo a Passo Detalhado

### 1. Acesse o Dashboard
1. Vá para: https://supabase.com/dashboard
2. Faça login se necessário
3. Clique no seu projeto (hub_control ou similar)

### 2. Navegue até as Configurações de API

**Opção A - Via Menu Lateral:**
1. No menu lateral esquerdo, clique em **"Settings"** (ícone de engrenagem)
2. No submenu, clique em **"API"**

**Opção B - Link Direto:**
- Use este link direto: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/settings/api

### 3. Localize as Chaves na Página

Na página de configurações da API, você verá seções como:

```
📋 Project Configuration
   ├── URL: https://htwiupmnqlmwvzqzroal.supabase.co
   └── Reference ID: htwiupmnqlmwvzqzroal

🔑 Project API keys
   ├── anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   └── service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

🔐 Secret keys (se disponível)
   └── [Create new secret key] ou chaves existentes
```

### 4. Identifique a Chave Correta

**Procure por uma dessas opções:**

#### Opção 1: service_role (JWT)
- **Nome**: "service_role" ou "Service Role"
- **Formato**: Começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Tamanho**: Muito longa (centenas de caracteres)
- **Descrição**: "Full access to your project's data, bypassing RLS"

#### Opção 2: Secret Key (Mais Segura)
- **Nome**: "Secret keys" ou similar
- **Formato**: Começa com `sb_secret_...`
- **Localização**: Pode estar em uma seção separada
- **Ação**: Se não existir, clique em "Create new secret key"

### 5. Copie a Chave
1. Clique no ícone de **"Copy"** (📋) ao lado da chave
2. A chave será copiada para sua área de transferência
3. **IMPORTANTE**: Copie a chave inteira!

### 6. Configure no Projeto
1. Abra o arquivo `.env.local` no seu projeto
2. Encontre a linha: `SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_AQUI`
3. Substitua `SUA_SERVICE_ROLE_KEY_AQUI` pela chave copiada
4. Salve o arquivo

## 🚨 Se Não Encontrar as Chaves

### Cenário 1: Página Diferente
Se a página parecer diferente, procure por:
- **"API Keys"**
- **"Project Settings"**
- **"Configuration"**
- Qualquer seção que mencione "keys" ou "tokens"

### Cenário 2: Sem Permissão
Se você não vê as chaves:
- Verifique se você é **Owner** ou **Admin** do projeto
- Peça para o proprietário do projeto te dar acesso

### Cenário 3: Interface Nova
O Supabase às vezes atualiza a interface. Procure por:
- Ícones de chave (🔑)
- Texto que menciona "service_role"
- Seções de "Security" ou "Authentication"

## ✅ Verificação Final

Após configurar a chave:

1. **Reinicie o servidor**: `npm run dev`
2. **Teste a edição** de um plano
3. **Verifique os logs** no terminal para mensagens de sucesso

## 🆘 Ainda com Problemas?

Se ainda não conseguir encontrar:

1. **Tire um print** da página de configurações
2. **Verifique o URL** - deve conter seu project ID
3. **Tente o link alternativo**: https://supabase.com/dashboard/project/_/settings/api-keys
4. **Contate o suporte** do Supabase se necessário

---

**Lembre-se**: A service_role key é muito poderosa e deve ser mantida em segredo! Nunca a compartilhe publicamente.