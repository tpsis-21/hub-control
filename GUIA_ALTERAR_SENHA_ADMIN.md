# 🔑 Guia: Alterar Senha do Admin (topplaytv7@gmail.com)

## 📋 Resumo
Este guia mostra como alterar a senha do usuário admin **topplaytv7@gmail.com** através do dashboard do Supabase.

## 🚀 Método 1: Dashboard do Supabase (Mais Fácil)

### Passo 1: Acessar o Dashboard
1. Abra seu navegador e vá para: https://supabase.com/dashboard
2. Faça login na sua conta Supabase
3. Selecione o projeto **hub-control** (htwiupmnqlmwvzqzroal)

### Passo 2: Acessar Usuários
1. No menu lateral esquerdo, clique em **"Authentication"**
2. Clique em **"Users"**
3. Procure pelo usuário **topplaytv7@gmail.com** na lista

### Passo 3: Alterar Senha
1. Encontre o usuário **topplaytv7@gmail.com**
2. Clique nos **três pontos (⋯)** ao lado do usuário
3. Selecione **"Reset Password"** ou **"Send Password Reset"**
4. O Supabase enviará um email de redefinição para **topplaytv7@gmail.com**

### Passo 4: Verificar Email
1. Acesse a caixa de entrada do email **topplaytv7@gmail.com**
2. Procure por um email do Supabase com assunto sobre redefinição de senha
3. Clique no link no email
4. Defina a nova senha desejada

---

## 🛠️ Método 2: SQL Editor (Avançado)

### Passo 1: Acessar SQL Editor
1. No dashboard do Supabase, clique em **"SQL Editor"** no menu lateral
2. Clique em **"New Query"**

### Passo 2: Executar Script
1. Copie e cole o conteúdo do arquivo `alterar-senha-admin.sql`
2. **IMPORTANTE**: Altere a senha na linha que contém `'admin123456'` para a senha desejada
3. Clique em **"Run"** para executar

### Exemplo de alteração:
```sql
-- Altere esta linha:
encrypted_password = crypt('admin123456', gen_salt('bf')),

-- Para sua senha desejada:
encrypted_password = crypt('SUA_NOVA_SENHA_AQUI', gen_salt('bf')),
```

---

## ✅ Verificação

Após alterar a senha, teste o login:

1. Acesse: http://localhost:9002/login
2. Digite:
   - **Email**: topplaytv7@gmail.com
   - **Senha**: (a nova senha definida)
3. Clique em **"Entrar"**

---

## 🔒 Informações de Segurança

### Credenciais Atuais:
- **Email**: topplaytv7@gmail.com
- **Senha**: admin123456 (se usar o script SQL sem alterações)
- **Função**: Administrador

### Recomendações:
1. **Altere a senha padrão** para algo mais seguro
2. **Use uma senha forte** com pelo menos 8 caracteres
3. **Inclua números, letras e símbolos** na senha
4. **Não compartilhe** as credenciais

---

## 🆘 Solução de Problemas

### Problema: "Email não encontrado"
- Verifique se o email está correto: **topplaytv7@gmail.com**
- Confirme que está no projeto correto do Supabase

### Problema: "Erro ao executar SQL"
- Verifique se você tem permissões de administrador no Supabase
- Confirme que está usando o SQL Editor correto

### Problema: "Login não funciona após alteração"
- Aguarde alguns minutos para a alteração ser processada
- Limpe o cache do navegador
- Tente fazer logout e login novamente

---

## 📞 Próximos Passos

Após alterar a senha com sucesso:

1. ✅ Teste o login na aplicação
2. ✅ Verifique se tem acesso às funções de administrador
3. ✅ Configure uma senha mais segura se necessário
4. ✅ Documente as novas credenciais em local seguro

---

**⚠️ IMPORTANTE**: Mantenha as credenciais de administrador em local seguro e não as compartilhe!