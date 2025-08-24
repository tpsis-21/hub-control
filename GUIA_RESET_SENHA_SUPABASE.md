# Guia: Como Alterar Senha no Supabase

## Método 1: Através do Dashboard do Supabase (Recomendado)

### Passo 1: Acesse o Dashboard
1. Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta do Supabase
3. Selecione o projeto "hub-control"

### Passo 2: Acesse a Tabela de Usuários
1. No menu lateral, clique em **"Table Editor"**
2. Procure pela tabela **"auth.users"** ou **"users"**
3. Encontre o usuário pelo email

### Passo 3: Resetar a Senha
1. Clique no usuário que deseja alterar
2. Vá para a aba **"Authentication"** no menu lateral
3. Clique em **"Users"**
4. Encontre o usuário e clique nos **três pontos (...)** ao lado
5. Selecione **"Reset Password"**
6. O Supabase enviará um email de reset para o usuário

## Método 2: Via SQL Editor (Alternativo)

### Passo 1: Acesse o SQL Editor
1. No dashboard do Supabase, clique em **"SQL Editor"**
2. Cole o seguinte comando SQL:

```sql
-- Resetar senha para um usuário específico
UPDATE auth.users 
SET 
  encrypted_password = crypt('nova_senha_aqui', gen_salt('bf')),
  updated_at = now()
WHERE email = 'seu_email@exemplo.com';
```

3. Substitua:
   - `'nova_senha_aqui'` pela nova senha desejada
   - `'seu_email@exemplo.com'` pelo email do usuário

4. Clique em **"Run"** para executar

## Método 3: Criar um Novo Usuário Admin (Emergência)

### Se você perdeu acesso ao admin, crie um novo:

```sql
-- Inserir novo usuário admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@seudominio.com',
  crypt('senha123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"role": "admin"}',
  false,
  '',
  '',
  '',
  ''
);
```

### Depois, adicione o perfil na tabela profiles:

```sql
-- Adicionar perfil admin
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  is_approved,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@seudominio.com'),
  'admin@seudominio.com',
  'Administrador',
  'admin',
  true,
  now(),
  now()
);
```

## Método 4: Usando a Função de Reset do Sistema

### Se o sistema de reset estiver funcionando:
1. Acesse: `http://localhost:9002/login`
2. Clique em **"Esqueci minha senha"**
3. Digite seu email
4. Verifique sua caixa de entrada
5. Clique no link recebido
6. Defina uma nova senha

## Verificação de Segurança

### Após alterar a senha, verifique:
1. **RLS (Row Level Security)** está ativo
2. **Políticas de segurança** estão funcionando
3. **Logs de auditoria** estão sendo gerados

### Comando para verificar usuários:
```sql
-- Listar todos os usuários
SELECT 
  u.email,
  u.created_at,
  u.email_confirmed_at,
  p.role,
  p.is_approved
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

## Dicas de Segurança

1. **Use senhas fortes** (mínimo 8 caracteres, com números e símbolos)
2. **Ative 2FA** no Supabase quando possível
3. **Monitore logs** de acesso regularmente
4. **Faça backup** das configurações importantes

## Troubleshooting

### Se ainda não conseguir acessar:
1. Verifique se o email está correto
2. Confirme se o usuário existe na tabela `auth.users`
3. Verifique se o perfil existe na tabela `profiles`
4. Confirme se `is_approved = true`
5. Verifique os logs do Supabase para erros

### Contatos de Emergência:
- **Supabase Support**: [https://supabase.com/support](https://supabase.com/support)
- **Documentação**: [https://supabase.com/docs](https://supabase.com/docs)

---

**⚠️ IMPORTANTE**: Sempre faça backup antes de executar comandos SQL diretamente no banco de dados!