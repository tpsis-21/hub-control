# Correção da Migração de Notificações In-App

## Problema Identificado

O erro `column "user_id" does not exist` ocorreu porque a migração original tentava criar uma referência direta entre `in_app_notifications.user_id` e `auth.users(id)`, mas a estrutura atual do banco de dados não suporta essa relação diretamente.

### Estrutura Atual do Banco

- **auth.users**: Tabela de usuários autenticados do Supabase
- **clients**: Tabela de clientes IPTV (sem vinculação direta com auth.users)
- **payments**: Tabela de pagamentos (vinculada a clients via client_id)
- **servers**: Tabela de servidores

### Problema na Migração Original

A migração tentava criar:
```sql
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

Mas não havia uma estrutura que conectasse os clientes IPTV com os usuários autenticados.

## Solução Implementada

### 1. Adição de user_id à tabela clients

```sql
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

Esta coluna permite vincular opcionalmente um cliente IPTV a um usuário autenticado.

### 2. Estrutura Aprimorada da Tabela in_app_notifications

```sql
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment_activated', 'payment_pending', 'payment_confirmed', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Políticas RLS Adicionadas

- **Visualização**: Usuários só podem ver suas próprias notificações
- **Atualização**: Usuários só podem atualizar suas próprias notificações
- **Inserção**: Apenas o sistema (service_role) pode inserir notificações

### 4. Índices Otimizados

- `idx_in_app_notifications_user_id`: Para consultas por usuário
- `idx_in_app_notifications_client_id`: Para consultas por cliente
- `idx_in_app_notifications_user_unread`: Para notificações não lidas por usuário

## Arquivos Criados/Modificados

1. **`create_in_app_notifications_table.sql`** (modificado): Migração original corrigida
2. **`create_in_app_notifications_table_fixed.sql`** (novo): Versão completa e corrigida com RLS

## Como Usar

### Opção 1: Usar a Migração Corrigida

Execute o arquivo `create_in_app_notifications_table_fixed.sql` no SQL Editor do Supabase.

### Opção 2: Executar Comandos Individuais

1. Primeiro, adicione a coluna user_id à tabela clients:
```sql
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

2. Em seguida, execute o resto da migração normalmente.

## Benefícios da Correção

1. **Flexibilidade**: Permite notificações tanto para usuários autenticados quanto para clientes IPTV
2. **Segurança**: RLS garante isolamento de dados por usuário
3. **Performance**: Índices otimizados para consultas frequentes
4. **Compatibilidade**: Funciona com a estrutura atual do banco

## Próximos Passos

1. Execute a migração corrigida
2. Atualize os serviços de notificação para usar a nova estrutura
3. Considere popular a coluna `clients.user_id` para clientes existentes que tenham usuários autenticados correspondentes
4. Teste o sistema de notificações com a nova estrutura