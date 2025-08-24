# Documentação do Projeto: Hub Control

Este documento descreve a arquitetura, funcionalidades, estrutura de dados e análise de segurança da aplicação Hub Control.

## Visão Geral

O Hub Control é uma aplicação web construída com Next.js 14, React 18, TypeScript e Supabase para gerenciar clientes, planos, servidores e automações de um serviço de IPTV. A ferramenta visa otimizar a gestão, automatizar tarefas repetitivas e fornecer uma base sólida para o crescimento do negócio.

## Arquitetura Técnica

### Stack Tecnológico
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Next.js API Routes, Server Actions
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth
- **UI:** Tailwind CSS, shadcn/ui, Radix UI
- **Validação:** Zod
- **Notificações:** Web Push API (VAPID)
- **Testes:** Jest, React Testing Library
- **Linting:** ESLint, Prettier

### Estrutura de Pastas
```
src/
├── app/                    # App Router (Next.js 14)
│   ├── (app)/             # Rotas protegidas
│   ├── api/               # API Routes
│   ├── cliente/           # Área do cliente
│   └── reset-password/    # Reset de senha
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── auth/             # Componentes de autenticação
│   ├── app/              # Componentes da aplicação
│   └── marketing/        # Componentes de marketing
├── hooks/                # Custom hooks
├── lib/                  # Utilitários e configurações
├── services/             # Serviços de negócio
└── __tests__/           # Testes automatizados
```

## Funcionalidades Principais

### 1. Dashboard Executivo
- **Métricas em Tempo Real:** Receita diária/mensal, total de clientes, testes ativos, novos clientes
- **Indicadores de Status:** Clientes vencidos, vencendo hoje, amanhã
- **Listas Dinâmicas:** Clientes vencendo e adicionados recentemente
- **Gráficos e Analytics:** Visualização de tendências e performance

### 2. Gerenciamento de Clientes (`/clientes`)
- **CRUD Completo:** Criar, visualizar, editar e gerenciar clientes
- **Status Dinâmicos:** Ativo, Inativo, Bloqueado com alteração em tempo real
- **Área do Cliente:** Link exclusivo para cada cliente com acesso personalizado
- **Histórico Completo:** Pagamentos, alterações e atividades
- **Importação em Massa:** Upload de CSV para cadastro múltiplo

### 3. Sistema de Testes (`/testes`)
- **Gestão de Trials:** Controle completo de usuários em teste
- **Automação Inteligente:** Criação automática via API ou chatbot
- **Conversão Rápida:** Transformar teste em cliente com um clique
- **Monitoramento:** Status em tempo real (Em teste, Expirado)

### 4. Planos e Grupos
- **Planos Individuais (`/planos`):** Configuração detalhada com preços, validade, telas
- **Grupos de Planos (`/planos/grupos`):** Organização em famílias para segmentação
- **Visibilidade Pública:** Controle de quais planos aparecem na área do cliente
- **Flexibilidade:** Estrutura preparada para diferentes estratégias de pricing

### 5. Gerenciamento de Servidores (`/servidores`)
- **Configuração Avançada:** URLs, chaves de API, status de saúde
- **Automação de Testes:** Integração com APIs de painéis IPTV
- **Gateway de Pagamento:** Preparação para cobranças automáticas
- **Monitoramento:** Status e performance dos servidores

### 6. Sistema de Notificações (`/notificacoes`)
- **Multi-canal:** WhatsApp, E-mail e Push Notifications
- **Templates Dinâmicos:** Sistema de tags personalizáveis
- **Automação Inteligente:** Lembretes de vencimento, boas-vindas, instruções
- **Sequências:** Fluxos automatizados de comunicação

### 7. Marketing e Campanhas (`/marketing`)
- **Campanhas de E-mail:** Sistema completo de email marketing
- **Configuração SMTP:** Múltiplos provedores de e-mail
- **Templates Responsivos:** Modelos profissionais para campanhas
- **Analytics:** Métricas de entrega e engajamento

### 8. API de Integração (`/api/v1/bot`)
- **Endpoint Seguro:** Autenticação via Bearer Token
- **Múltiplas Ações:** ping, get_customer, create_test, etc.
- **Integração Externa:** Compatível com BotConversa e outros serviços
- **Rate Limiting:** Proteção contra abuso

### 9. Sistema de Configurações (`/configuracoes`)
- **API Keys:** Geração e gerenciamento de chaves de acesso
- **Personalização:** Cores, logos, informações da empresa
- **Segurança:** Configurações de autenticação e acesso
- **Integrações:** NATV (completa), TMDB, BotConversa (WhatsApp) e outros serviços externos
  - **NATV:** Sistema completo de recarga com proxy API, rate limiting e gerenciamento de créditos
  - **BotConversa:** Integração WhatsApp funcional
  - **BPIX:** Documentada, aguardando implementação

## Análise de Segurança

### ⚠️ Vulnerabilidades Críticas Identificadas

#### 1. **Exposição de Chaves Sensíveis**
- **Arquivo `.env.local`:** Contém chaves reais do Supabase e VAPID expostas
- **Chaves Expostas:**
  - `SUPABASE_URL` e `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (acesso administrativo total)
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
  - Chaves de criptografia e JWT secrets

#### 2. **Exposição no Frontend**
- **Variáveis de Ambiente Públicas:** `NEXT_PUBLIC_TMDB_API_KEY` acessível no cliente
- **Chaves de API Visíveis:** Exibição parcial de API keys em componentes React
- **Dados Sensíveis em Props:** Senhas IPTV e tokens passados via props

#### 3. **Configurações Inseguras**
- **Service Role Key:** Utilizada no frontend para operações administrativas
- **Headers de Autorização:** API keys expostas em requests do cliente
- **Logs de Desenvolvimento:** Possível vazamento de dados sensíveis

### 🔒 Recomendações de Segurança

#### **Imediatas (Críticas)**
1. **Migrar Service Role para Backend:**
   ```typescript
   // ❌ Evitar no frontend
   const supabase = createClient(url, serviceRoleKey)
   
   // ✅ Usar apenas no backend/API routes
   // pages/api/admin/[...].ts
   ```

2. **Implementar Proxy para APIs Externas:**
   ```typescript
   // ❌ Direto no frontend
   fetch(`https://api.tmdb.org/3/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`)
   
   // ✅ Via API route
   fetch('/api/tmdb/movies')
   ```

3. **Mascarar Dados Sensíveis:**
   ```typescript
   // ✅ Implementar função de mascaramento
   const maskApiKey = (key: string) => `${key.slice(0, 4)}${'•'.repeat(8)}${key.slice(-4)}`
   ```

#### **Curto Prazo**
1. ✅ **Rate Limiting Avançado** - Implementado no middleware com diferentes limites por rota
2. ✅ **Validação de Input Rigorosa** - Implementada em `security-config.ts` com sanitização e validação
3. ✅ **CORS Restritivo** - Configurado no middleware para APIs específicas
4. ✅ **Logs de Auditoria** - Sistema implementado via migrations do Supabase

#### **Médio Prazo**
1. ⚠️ **Migrar para Autenticação JWT Robusta** - Em progresso (Supabase Auth + middleware)
2. ⚠️ **Implementar Criptografia End-to-End** - Parcialmente implementado (configurações criptografadas)
3. ⚠️ **Adicionar Monitoramento de Segurança** - Sistema básico implementado, necessita expansão
4. ❌ **Configurar Backup Criptografado** - Pendente de implementação

#### **Implementações Recentes Concluídas**
1. ✅ **Proxy para APIs Externas** - TMDB, NATV e Bot protegidos via `/api/proxy/*`
2. ✅ **Mascaramento de Dados Sensíveis** - Componente `SensitiveData` implementado
3. ✅ **Middleware de Segurança** - Rate limiting, CORS, CSP e verificação de User-Agent
4. ✅ **Configurações Centralizadas** - `security-config.ts` com todas as configurações de segurança
5. ✅ **Remoção de Service Role Key** - Migrada para backend apenas
6. ✅ **Headers de Segurança** - CSP, HSTS e outros headers implementados

### 📊 Status de Conformidade

| Categoria | Status | Prioridade | Detalhes |
|-----------|--------|------------|----------|
| Autenticação | ✅ Segura | Baixa | Supabase Auth + middleware robusto |
| Autorização | ✅ Implementada | Baixa | RLS + verificação de roles |
| Criptografia | ⚠️ Parcial | Média | Configurações criptografadas, E2E pendente |
| Logs/Auditoria | ✅ Implementado | Baixa | Sistema completo de auditoria |
| Rate Limiting | ✅ Avançado | Baixa | Múltiplos níveis por rota |
| CORS | ✅ Restritivo | Baixa | Configurado por API específica |
| Proxy APIs | ✅ Implementado | Baixa | TMDB, NATV, Bot protegidos |
| Headers Segurança | ✅ Implementado | Baixa | CSP, HSTS, X-Frame-Options |
| Mascaramento | ✅ Implementado | Baixa | Dados sensíveis protegidos |

### 🛡️ Arquivos Críticos para Revisão

1. **`src/lib/supabase-api.ts`** - Service role usage
2. **`src/services/*.service.ts`** - API integrations
3. **`.env.local`** - Environment variables
4. **`src/app/api/**`** - API routes security
5. **`src/components/auth/**`** - Authentication flows

---

## Possíveis Melhorias e Próximos Passos

### **Segurança (Prioridade Máxima)**
1. **Refatoração de Segurança:** Migrar todas as operações administrativas para API routes
2. **Implementar Vault de Secrets:** Usar serviços como AWS Secrets Manager ou Azure Key Vault
3. **Auditoria de Código:** Revisão completa focada em segurança

### **Funcionalidades**
1. **Persistência de Dados:** Migrar do localStorage para Firebase Firestore
2. **Lógica de Negócios no Servidor:** Implementar Server Actions para operações críticas
3. **Área do Cliente:** Interface dedicada para clientes
4. **Automações:** Implementar notificações e lembretes configurados
5. **Relatórios Avançados:** Gráficos de receita e métricas de negócio
6. **Integração com Gateways:** Stripe, PayPal para cobranças automáticas

### **Infraestrutura**
1. **Sistema de Backup:** Backup automático criptografado
2. **Monitoramento:** Logs, métricas e alertas
3. **CI/CD:** Pipeline de deploy seguro
4. **Testes:** Cobertura de testes de segurança

---

**⚠️ Nota Importante:** Esta aplicação contém vulnerabilidades de segurança críticas que devem ser corrigidas antes de qualquer deploy em produção. A exposição de chaves administrativas representa um risco significativo de comprometimento total do sistema.
