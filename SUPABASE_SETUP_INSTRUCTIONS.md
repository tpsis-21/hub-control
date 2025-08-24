# Instruções de Configuração do Supabase

## 🔗 Obter Credenciais

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **Settings > API**
4. Copie:
   - **URL**: Project URL
   - **Chave Anon**: anon/public key

## ⚙️ Configurar Projeto

1. **Editar arquivo .env:**
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. **Testar conectividade:**
   ```bash
   node test-complete-security.cjs
   ```

## 🚀 Aplicar Migrações de Segurança

### Método 1: Painel Web
1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Execute o conteúdo de: `security-implementation-optimized.sql`

### Método 2: CLI (se disponível)
```bash
supabase db push
```

## 🔧 Desenvolvimento Local

1. **Iniciar Supabase local:**
   ```bash
   supabase start
   ```

2. **Configurar .env para local:**
   ```env
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=local-anon-key
   ```

3. **Aplicar migrações:**
   ```bash
   supabase db push
   ```

## 📊 Verificar Implementação

Após configurar, execute:
```bash
node test-complete-security.cjs
```

## 🔒 Funcionalidades Implementadas

- ✅ **MFA para Administradores**
- ✅ **Cobertura RLS Completa**
- ✅ **Sistema de Alertas de Segurança**
- ✅ **Monitoramento de Atividades Suspeitas**
- ✅ **Configurações de Segurança**
- ✅ **Função Health Check**

## 🆘 Solução de Problemas

### Erro "fetch failed"
- Verifique as credenciais no .env
- Confirme se o projeto está ativo
- Teste a conectividade de rede

### Erro "function does not exist"
- Execute as migrações de segurança
- Verifique se as funções foram criadas

### Erro de RLS
- Confirme se as políticas foram aplicadas
- Verifique permissões do usuário

---
*Gerado automaticamente em 06/08/2025, 14:05:11*
