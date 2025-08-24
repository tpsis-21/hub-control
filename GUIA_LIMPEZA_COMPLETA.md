# 🧹 GUIA COMPLETO - LIMPEZA DO SISTEMA DE AUTENTICAÇÃO

**Data:** 2024-12-23  
**Versão:** 1.0  
**Status:** Pronto para execução

---

## ⚠️ ATENÇÃO IMPORTANTE

**Este processo irá DELETAR TODOS os usuários e dados do sistema!**  
**Esta ação é IRREVERSÍVEL!**  
**Use apenas em ambiente de desenvolvimento!**

---

## 📋 PRÉ-REQUISITOS

### 1. 🔑 Obter a Service Role Key do Supabase

**Passo a passo:**

1. **Acesse o Dashboard do Supabase:**
   ```
   https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/settings/api
   ```

2. **Localize a seção "Project API keys"**

3. **Copie a chave "service_role"** (não a "anon"!)
   - Clique no ícone de "olho" para revelar a chave
   - Copie toda a chave (começa com `eyJ...`)

4. **Atualize o arquivo `.env.local`:**
   ```bash
   # Substitua esta linha:
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
   
   # Por:
   SUPABASE_SERVICE_ROLE_KEY=eyJ... (sua chave real aqui)
   ```

### 2. 📦 Instalar dependências (se necessário)

```bash
npm install @supabase/supabase-js dotenv
```

---

## 🚀 EXECUÇÃO DA LIMPEZA

### Etapa 1: Verificar Estado Atual

```bash
node verificar-usuarios-atuais.js
```

**O que este comando faz:**
- Lista usuários existentes
- Verifica estrutura das tabelas
- Confirma configurações

### Etapa 2: Executar Limpeza Completa

```bash
node executar-limpeza-completa.js
```

**O que este comando faz:**
1. 🗑️ Remove TODOS os usuários do `auth.users`
2. 🧹 Limpa todas as tabelas relacionadas (`profiles`, `user_settings`, etc.)
3. 🔄 Remove e recria políticas RLS
4. 👤 Cria novo usuário admin: `topplaytv7@gmail.com`
5. 🔧 Reorganiza estrutura do sistema

**Durante a execução:**
- O script pedirá confirmação
- Digite `CONFIRMO` para prosseguir
- Acompanhe o progresso no terminal

---

## 📊 VERIFICAÇÃO PÓS-LIMPEZA

### 1. Verificar Usuários

```bash
node verificar-usuarios-atuais.js
```

**Resultado esperado:**
- Apenas 1 usuário: `topplaytv7@gmail.com`
- Role: `admin`
- Tabelas limpas e reorganizadas

### 2. Testar Login

1. **Acesse:** http://localhost:3002/login

2. **Credenciais do admin:**
   - **Email:** `topplaytv7@gmail.com`
   - **Senha:** `Admin123!@#`

3. **Verificar acesso:**
   - Login deve funcionar
   - Redirecionamento para dashboard
   - Permissões de admin ativas

---

## 🔧 ESTRUTURA REORGANIZADA

### Tabelas Principais

```sql
-- Tabela de perfis simplificada
profiles {
  id: UUID (PK)
  email: TEXT
  role: TEXT (admin/user)
  full_name: TEXT
  is_approved: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- Configurações de usuário
user_settings {
  id: UUID (PK)
  user_id: UUID (FK)
  theme: TEXT
  language: TEXT
  notifications_enabled: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- Logs de auditoria
audit_logs {
  id: UUID (PK)
  user_id: UUID
  action: TEXT
  details: JSONB
  ip_address: TEXT
  user_agent: TEXT
  created_at: TIMESTAMP
}
```

### Políticas RLS Otimizadas

- **Profiles:** Usuários veem apenas próprio perfil
- **User Settings:** Acesso apenas ao próprio registro
- **Audit Logs:** Apenas admins podem visualizar
- **Storage:** Upload de imagens apenas para usuários autenticados

### Triggers Essenciais

- **Auto-criação de perfil** para novos usuários
- **Auto-criação de configurações** para novos usuários
- **Atualização automática** de `updated_at`
- **Log de auditoria** para ações importantes

---

## 🛠️ APIS REORGANIZADAS

### Endpoints Simplificados

- **`/api/auth/login`** - Login com validação aprimorada
- **`/api/auth/register`** - Registro com rate limiting
- **`/api/auth/logout`** - Logout simplificado

### Melhorias Implementadas

1. **Validação consistente** com Zod
2. **Rate limiting** por IP
3. **Mapeamento de erros** amigáveis
4. **Logs estruturados**
5. **Respostas padronizadas**
6. **Suporte a CORS**

---

## 🔍 TROUBLESHOOTING

### Problema: "Service Role Key não configurada"

**Solução:**
1. Verifique se copiou a chave correta do Supabase
2. Confirme que atualizou o `.env.local`
3. Reinicie o servidor de desenvolvimento

### Problema: "Permission denied"

**Solução:**
1. Confirme que está usando a Service Role Key
2. Verifique se a chave não expirou
3. Teste a conexão com o Supabase

### Problema: "Tabela não existe"

**Solução:**
1. Execute o script de reorganização
2. Verifique as migrações do Supabase
3. Recrie as tabelas manualmente se necessário

### Problema: "Login não funciona após limpeza"

**Solução:**
1. Verifique se o admin foi criado corretamente
2. Confirme as credenciais: `topplaytv7@gmail.com` / `Admin123!@#`
3. Verifique os logs do servidor
4. Teste com o script de verificação

---

## 📝 PRÓXIMOS PASSOS

### Após a Limpeza

1. **✅ Alterar senha do admin** (recomendado)
2. **✅ Criar usuários de teste** se necessário
3. **✅ Configurar notificações** por email
4. **✅ Testar todas as funcionalidades**
5. **✅ Fazer backup** da nova configuração

### Para Produção

1. **🚫 NUNCA execute** esta limpeza em produção
2. **🔄 Use migrações** para mudanças estruturais
3. **📊 Monitore** logs e métricas
4. **🔐 Implemente** autenticação 2FA
5. **🛡️ Configure** alertas de segurança

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verifique os logs** do terminal
2. **Execute o script de verificação** novamente
3. **Consulte a documentação** do Supabase
4. **Revise as configurações** do `.env.local`

---

**✅ Sistema reorganizado e otimizado para desenvolvimento!**
**🔐 Autenticação simplificada e segura!**
**🚀 Pronto para desenvolvimento ágil!**