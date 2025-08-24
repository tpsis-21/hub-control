# Guia: Configuração de Email no Supabase

## Problema Identificado

O código de reset de senha está funcionando corretamente, mas os emails não estão sendo enviados porque o **SMTP não está configurado** no projeto Supabase.

## ✅ Status do Teste

- ✅ Código funcionando corretamente
- ✅ Conexão com Supabase estabelecida
- ✅ Função `resetPasswordForEmail` executada sem erros
- ❌ **SMTP não configurado** (emails não chegam ao destinatário)

## 🔧 Solução: Configurar SMTP no Supabase

### Passo 1: Acessar o Dashboard do Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta
3. Selecione o projeto **hub-control**

### Passo 2: Configurar SMTP

1. No menu lateral, clique em **"Authentication"**
2. Clique na aba **"Settings"**
3. Role para baixo até encontrar **"SMTP Settings"**
4. Clique em **"Enable custom SMTP"**

### Passo 3: Configurações SMTP Recomendadas

#### Opção 1: Gmail (Gratuito)

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: seu-email@gmail.com
SMTP Password: sua-senha-de-app
Sender Name: Hub Control
Sender Email: seu-email@gmail.com
```

**⚠️ Importante para Gmail:**
- Use uma "Senha de App" em vez da senha normal
- Ative a autenticação de 2 fatores
- Gere uma senha de app em: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

#### Opção 2: SendGrid (Recomendado para produção)

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: sua-api-key-do-sendgrid
Sender Name: Hub Control
Sender Email: noreply@seudominio.com
```

#### Opção 3: Mailgun

```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: postmaster@seudominio.mailgun.org
SMTP Password: sua-senha-do-mailgun
Sender Name: Hub Control
Sender Email: noreply@seudominio.com
```

### Passo 4: Configurar Templates de Email

1. Ainda em **Authentication > Settings**
2. Role até **"Email Templates"**
3. Personalize os templates:
   - **Reset Password**: Template para redefinição de senha
   - **Confirm Signup**: Template para confirmação de cadastro
   - **Magic Link**: Template para login sem senha

#### Template de Reset de Senha Sugerido:

**Subject:**
```
Redefinir senha - Hub Control
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Redefinir Senha</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #333; text-align: center;">🔐 Redefinir Senha</h1>
        
        <p style="color: #666; font-size: 16px;">Olá,</p>
        
        <p style="color: #666; font-size: 16px;">
            Você solicitou a redefinição da sua senha no <strong>Hub Control</strong>.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ .ConfirmationURL }}" 
               style="background: #007bff; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;
                      display: inline-block;">
                Redefinir Minha Senha
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            Se você não solicitou esta redefinição, ignore este email.
            Este link expira em 1 hora.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
            Hub Control - Sistema de Gestão
        </p>
    </div>
</body>
</html>
```

### Passo 5: Testar a Configuração

1. Salve as configurações SMTP
2. Teste enviando um email de reset:
   - Acesse a página de login
   - Clique em "Esqueci minha senha"
   - Digite um email válido
   - Verifique se o email chegou

### Passo 6: Configurações Adicionais

#### Domínios Autorizados

1. Em **Authentication > Settings**
2. Procure por **"Site URL"** e **"Additional Redirect URLs"**
3. Adicione suas URLs:
   ```
   Site URL: http://localhost:9010
   Additional Redirect URLs: 
   http://localhost:9010/reset-password
   http://localhost:9010/auth/callback
   https://seudominio.com/reset-password
   https://seudominio.com/auth/callback
   ```

#### Rate Limiting

1. Configure limites para evitar spam:
   ```
   Email Rate Limit: 30 emails per hour
   SMS Rate Limit: 60 SMS per hour
   ```

## 🧪 Teste Final

Após configurar o SMTP, execute novamente o teste:

```bash
node test-password-reset.js
```

Agora você deve receber o email de reset na caixa de entrada.

## 🚨 Troubleshooting

### Email não chega

1. **Verifique a pasta de spam/lixo eletrônico**
2. **Confirme as credenciais SMTP**
3. **Teste com outro provedor de email**
4. **Verifique os logs do Supabase**:
   - Dashboard > Logs > Auth Logs

### Erro de autenticação SMTP

1. **Gmail**: Use senha de app, não a senha normal
2. **SendGrid**: Verifique se a API key está correta
3. **Mailgun**: Confirme o domínio verificado

### Template não funciona

1. **Verifique a sintaxe HTML**
2. **Teste com template simples primeiro**
3. **Confirme as variáveis {{ .ConfirmationURL }}**

## 📋 Checklist de Configuração

- [ ] SMTP configurado no Supabase
- [ ] Credenciais testadas e funcionando
- [ ] Templates de email personalizados
- [ ] URLs de redirecionamento configuradas
- [ ] Rate limiting configurado
- [ ] Teste de envio realizado com sucesso
- [ ] Email recebido na caixa de entrada

## 🎯 Próximos Passos

1. **Configure um domínio personalizado** para emails profissionais
2. **Implemente monitoramento** de entrega de emails
3. **Configure backup SMTP** para alta disponibilidade
4. **Adicione analytics** de abertura de emails

---

**💡 Dica**: Para produção, recomendamos usar SendGrid ou Mailgun em vez do Gmail, pois oferecem melhor deliverability e recursos avançados.

**🔒 Segurança**: Nunca compartilhe suas credenciais SMTP. Use variáveis de ambiente em produção.