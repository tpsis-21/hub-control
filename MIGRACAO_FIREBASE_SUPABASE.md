# Guia de Migração: Firebase para Supabase

Este documento fornece instruções passo a passo para migrar o projeto Hub Control do Firebase para o Supabase.

## Índice

1. [Configuração do Supabase](#configuração-do-supabase)
2. [Modelagem do Banco de Dados](#modelagem-do-banco-de-dados)
3. [Migração de Dados](#migração-de-dados)
4. [Atualização do Código](#atualização-do-código)
5. [Implementação de Autenticação](#implementação-de-autenticação)
6. [Testes](#testes)

## Configuração do Supabase

### 1. Criar uma conta no Supabase

1. Acesse [supabase.com](https://supabase.com/) e crie uma conta gratuita
2. Crie um novo projeto
3. Anote a URL do projeto e a chave anônima (encontradas em Configurações > API)

### 2. Configurar variáveis de ambiente

1. Crie um arquivo `.env.local` na raiz do projeto baseado no arquivo `.env.local.example`
2. Preencha as variáveis com os valores do seu projeto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
```

## Modelagem do Banco de Dados

### 1. Criar tabelas no Supabase

Acesse o painel do Supabase > SQL Editor e execute os seguintes comandos para criar as tabelas necessárias:

```sql
-- Tabela de Grupos de Planos
CREATE TABLE plan_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Planos
CREATE TABLE plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  price_before_discount DECIMAL,
  validity INTEGER NOT NULL,
  screens INTEGER NOT NULL,
  panel_plan_id TEXT,
  restrictions TEXT,
  send_welcome_message BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  group_id UUID REFERENCES plan_groups(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Servidores
CREATE TABLE servers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  api_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('Online', 'Offline', 'Instável')),
  integration_type TEXT NOT NULL CHECK (integration_type IN ('generic', 'pixbot', 'natv', 'none')),
  test_automation BOOLEAN DEFAULT FALSE,
  test_config JSONB,
  renewal_automation BOOLEAN DEFAULT FALSE,
  payment_gateway BOOLEAN DEFAULT FALSE,
  send_expiration_reminder BOOLEAN DEFAULT FALSE,
  send_usage_instructions BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  iptv_username TEXT NOT NULL,
  iptv_user_id TEXT,
  iptv_password TEXT,
  manager_id TEXT,
  email TEXT,
  whatsapp TEXT,
  start_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Ativo', 'Em teste', 'Inativo', 'Bloqueado')),
  plan_id UUID NOT NULL REFERENCES plans(id),
  server_id UUID REFERENCES servers(id),
  notes TEXT,
  payment_history JSONB,
  unique_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações
CREATE TABLE settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_api_key TEXT,
  company_name TEXT,
  company_logo TEXT,
  primary_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Notificações
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp')),
  event TEXT NOT NULL CHECK (event IN ('welcome', 'expiration_reminder', 'payment_confirmation', 'test_created')),
  days_before_expiration INTEGER,
  subject TEXT,
  message TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pagamentos
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  date DATE NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Pendente', 'Atrasado')),
  plan_id UUID NOT NULL REFERENCES plans(id),
  transaction_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_groups_updated_at
BEFORE UPDATE ON plan_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_servers_updated_at
BEFORE UPDATE ON servers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2. Configurar políticas de segurança (RLS)

Acesse o painel do Supabase > Authentication > Policies e configure as políticas de segurança para cada tabela. Por exemplo:

```sql
-- Exemplo de política para a tabela clients
CREATE POLICY "Acesso público aos clientes" ON clients
FOR ALL USING (true);
```

## Migração de Dados

### 1. Exportar dados do Firebase

1. Acesse o Firebase Console > Firestore Database
2. Para cada coleção, clique nos três pontos e selecione "Exportar coleção"
3. Salve os arquivos JSON exportados

### 2. Transformar e importar dados para o Supabase

Crie um script de migração para transformar os dados do Firebase para o formato do Supabase. Exemplo:

```javascript
// scripts/migrate-data.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Chave de serviço (não a anônima)
);

async function migrateData() {
  // Migrar grupos de planos
  const planGroupsData = JSON.parse(fs.readFileSync('./data/planGroups.json'));
  for (const group of planGroupsData) {
    const { id, ...groupData } = group;
    await supabase.from('plan_groups').insert({
      ...groupData,
      created_at: new Date(groupData.createdAt || Date.now()).toISOString(),
      updated_at: new Date(groupData.updatedAt || Date.now()).toISOString(),
    });
  }

  // Migrar planos
  const plansData = JSON.parse(fs.readFileSync('./data/plans.json'));
  for (const plan of plansData) {
    const { id, createdAt, updatedAt, ...planData } = plan;
    await supabase.from('plans').insert({
      ...planData,
      created_at: new Date(createdAt || Date.now()).toISOString(),
      updated_at: new Date(updatedAt || Date.now()).toISOString(),
    });
  }

  // Continuar com outras coleções...
}

migrateData().catch(console.error);
```

# Guia de Migração: Firebase para Supabase

Este documento fornece instruções passo a passo para migrar o projeto Hub Control do Firebase para o Supabase.

## Índice

1. [Configuração do Supabase](#configuração-do-supabase)
2. [Modelagem do Banco de Dados](#modelagem-do-banco-de-dados)
3. [Migração de Dados](#migração-de-dados)
4. [Atualização do Código](#atualização-do-código)
5. [Implementação de Autenticação](#implementação-de-autenticação)
6. [Testes](#testes)

## Configuração do Supabase

### 1. Criar uma conta no Supabase

1. Acesse [supabase.com](https://supabase.com/) e crie uma conta gratuita
2. Crie um novo projeto
3. Anote a URL do projeto e a chave anônima (encontradas em Configurações > API)

### 2. Configurar variáveis de ambiente

1. Crie um arquivo `.env.local` na raiz do projeto baseado no arquivo `.env.local.example`
2. Preencha as variáveis com os valores do seu projeto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
```

## Modelagem do Banco de Dados

### 1. Criar tabelas no Supabase

Acesse o painel do Supabase > SQL Editor e execute os seguintes comandos para criar as tabelas necessárias:

```sql
-- Tabela de Grupos de Planos
CREATE TABLE plan_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Planos
CREATE TABLE plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  price_before_discount DECIMAL,
  validity INTEGER NOT NULL,
  screens INTEGER NOT NULL,
  panel_plan_id TEXT,
  restrictions TEXT,
  send_welcome_message BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  group_id UUID REFERENCES plan_groups(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Servidores
CREATE TABLE servers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  api_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('Online', 'Offline', 'Instável')),
  integration_type TEXT NOT NULL CHECK (integration_type IN ('generic', 'pixbot', 'natv', 'none')),
  test_automation BOOLEAN DEFAULT FALSE,
  test_config JSONB,
  renewal_automation BOOLEAN DEFAULT FALSE,
  payment_gateway BOOLEAN DEFAULT FALSE,
  send_expiration_reminder BOOLEAN DEFAULT FALSE,
  send_usage_instructions BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  iptv_username TEXT NOT NULL,
  iptv_user_id TEXT,
  iptv_password TEXT,
  manager_id TEXT,
  email TEXT,
  whatsapp TEXT,
  start_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Ativo', 'Em teste', 'Inativo', 'Bloqueado')),
  plan_id UUID NOT NULL REFERENCES plans(id),
  server_id UUID REFERENCES servers(id),
  notes TEXT,
  payment_history JSONB,
  unique_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações
CREATE TABLE settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_api_key TEXT,
  company_name TEXT,
  company_logo TEXT,
  primary_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Notificações
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp')),
  event TEXT NOT NULL CHECK (event IN ('welcome', 'expiration_reminder', 'payment_confirmation', 'test_created')),
  days_before_expiration INTEGER,
  subject TEXT,
  message TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pagamentos
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  date DATE NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Pendente', 'Atrasado')),
  plan_id UUID NOT NULL REFERENCES plans(id),
  transaction_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_groups_updated_at
BEFORE UPDATE ON plan_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_servers_updated_at
BEFORE UPDATE ON servers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2. Configurar políticas de segurança (RLS)

Acesse o painel do Supabase > Authentication > Policies e configure as políticas de segurança para cada tabela. Por exemplo:

```sql
-- Exemplo de política para a tabela clients
CREATE POLICY "Acesso público aos clientes" ON clients
FOR ALL USING (true);
```

## Migração de Dados

### 1. Exportar dados do Firebase

1. Acesse o Firebase Console > Firestore Database
2. Para cada coleção, clique nos três pontos e selecione "Exportar coleção"
3. Salve os arquivos JSON exportados

### 2. Transformar e importar dados para o Supabase

Crie um script de migração para transformar os dados do Firebase para o formato do Supabase. Exemplo:

```javascript
// scripts/migrate-data.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Chave de serviço (não a anônima)
);

async function migrateData() {
  // Migrar grupos de planos
  const planGroupsData = JSON.parse(fs.readFileSync('./data/planGroups.json'));
  for (const group of planGroupsData) {
    const { id, ...groupData } = group;
    await supabase.from('plan_groups').insert({
      ...groupData,
      created_at: new Date(groupData.createdAt || Date.now()).toISOString(),
      updated_at: new Date(groupData.updatedAt || Date.now()).toISOString(),
    });
  }

  // Migrar planos
  const plansData = JSON.parse(fs.readFileSync('./data/plans.json'));
  for (const plan of plansData) {
    const { id, createdAt, updatedAt, ...planData } = plan;
    await supabase.from('plans').insert({
      ...planData,
      created_at: new Date(createdAt || Date.now()).toISOString(),
      updated_at: new Date(updatedAt || Date.now()).toISOString(),
    });
  }

  // Continuar com outras coleções...
}

migrateData().catch(console.error);
```

# Guia de Migração: Firebase para Supabase

Este documento fornece instruções passo a passo para migrar o projeto Hub Control do Firebase para o Supabase.

## Índice

1. [Configuração do Supabase](#configuração-do-supabase)
2. [Modelagem do Banco de Dados](#modelagem-do-banco-de-dados)
3. [Migração de Dados](#migração-de-dados)
4. [Atualização do Código](#atualização-do-código)
5. [Implementação de Autenticação](#implementação-de-autenticação)
6. [Testes](#testes)

## Configuração do Supabase

### 1. Criar uma conta no Supabase

1. Acesse [supabase.com](https://supabase.com/) e crie uma conta gratuita
2. Crie um novo projeto
3. Anote a URL do projeto e a chave anônima (encontradas em Configurações > API)

### 2. Configurar variáveis de ambiente

1. Crie um arquivo `.env.local` na raiz do projeto baseado no arquivo `.env.local.example`
2. Preencha as variáveis com os valores do seu projeto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
```

## Modelagem do Banco de Dados

### 1. Criar tabelas no Supabase

Acesse o painel do Supabase > SQL Editor e execute os seguintes comandos para criar as tabelas necessárias:

```sql
-- Tabela de Grupos de Planos
CREATE TABLE plan_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Planos
CREATE TABLE plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  price_before_discount DECIMAL,
  validity INTEGER NOT NULL,
  screens INTEGER NOT NULL,
  panel_plan_id TEXT,
  restrictions TEXT,
  send_welcome_message BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  group_id UUID REFERENCES plan_groups(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Servidores
CREATE TABLE servers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  api_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('Online', 'Offline', 'Instável')),
  integration_type TEXT NOT NULL CHECK (integration_type IN ('generic', 'pixbot', 'natv', 'none')),
  test_automation BOOLEAN DEFAULT FALSE,
  test_config JSONB,
  renewal_automation BOOLEAN DEFAULT FALSE,
  payment_gateway BOOLEAN DEFAULT FALSE,
  send_expiration_reminder BOOLEAN DEFAULT FALSE,
  send_usage_instructions BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  iptv_username TEXT NOT NULL,
  iptv_user_id TEXT,
  iptv_password TEXT,
  manager_id TEXT,
  email TEXT,
  whatsapp TEXT,
  start_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Ativo', 'Em teste', 'Inativo', 'Bloqueado')),
  plan_id UUID NOT NULL REFERENCES plans(id),
  server_id UUID REFERENCES servers(id),
  notes TEXT,
  payment_history JSONB,
  unique_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações
CREATE TABLE settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_api_key TEXT,
  company_name TEXT,
  company_logo TEXT,
  primary_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Notificações
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp')),
  event TEXT NOT NULL CHECK (event IN ('welcome', 'expiration_reminder', 'payment_confirmation', 'test_created')),
  days_before_expiration INTEGER,
  subject TEXT,
  message TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pagamentos
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  date DATE NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Pendente', 'Atrasado')),
  plan_id UUID NOT NULL REFERENCES plans(id),
  transaction_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_groups_updated_at
BEFORE UPDATE ON plan_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_servers_updated_at
BEFORE UPDATE ON servers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2. Configurar políticas de segurança (RLS)

Acesse o painel do Supabase > Authentication > Policies e configure as políticas de segurança para cada tabela. Por exemplo:

```sql
-- Exemplo de política para a tabela clients
CREATE POLICY "Acesso público aos clientes" ON clients
FOR ALL USING (true);
```

## Migração de Dados

### 1. Exportar dados do Firebase

1. Acesse o Firebase Console > Firestore Database
2. Para cada coleção, clique nos três pontos e selecione "Exportar coleção"
3. Salve os arquivos JSON exportados

### 2. Transformar e importar dados para o Supabase

Crie um script de migração para transformar os dados do Firebase para o formato do Supabase. Exemplo:

```javascript
// scripts/migrate-data.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Chave de serviço (não a anônima)
);

async function migrateData() {
  // Migrar grupos de planos
  const planGroupsData = JSON.parse(fs.readFileSync('./data/planGroups.json'));
  for (const group of planGroupsData) {
    const { id, ...groupData } = group;
    await supabase.from('plan_groups').insert({
      ...groupData,
      created_at: new Date(groupData.createdAt || Date.now()).toISOString(),
      updated_at: new Date(groupData.updatedAt || Date.now()).toISOString(),
    });
  }

  // Migrar planos
  const plansData = JSON.parse(fs.readFileSync('./data/plans.json'));
  for (const plan of plansData) {
    const { id, createdAt, updatedAt, ...planData } = plan;
    await supabase.from('plans').insert({
      ...planData,
      created_at: new Date(createdAt || Date.now()).toISOString(),
      updated_at: new Date(updatedAt || Date.now()).toISOString(),
    });
  }

  // Continuar com outras coleções...
}

migrateData().catch(console.error);
```

## Implementação de Autenticação

### 1. Configurar autenticação no Supabase

1. Acesse o painel do Supabase > Authentication > Providers
2. Habilite os provedores desejados (Email, Google, etc.)

### 2. Implementar autenticação no frontend

Crie componentes de autenticação usando o Supabase Auth:

```javascript
// src/components/auth/login-form.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      window.location.href = "/dashboard";
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Campos do formulário */}
    </form>
  );
}
```

## Testes

### 1. Testar todas as funcionalidades

1. Teste todas as operações CRUD para cada entidade
2. Verifique se as relações entre tabelas estão funcionando corretamente
3. Teste a autenticação e autorização

### 2. Monitorar erros

1. Verifique os logs do Supabase para identificar possíveis erros
2. Implemente um sistema de monitoramento de erros (como Sentry)

## Conclusão

A migração do Firebase para o Supabase oferece várias vantagens, incluindo consultas SQL mais poderosas, melhor desempenho e menor custo. Seguindo este guia, você poderá migrar seu projeto de forma organizada e eficiente.

Se encontrar problemas durante a migração, consulte a [documentação oficial do Supabase](https://supabase.com/docs) ou entre em contato com o suporte.