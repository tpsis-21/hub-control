# 🔒 Configuração das Políticas RLS para o Bucket Avatars

## ⚠️ PROBLEMA IDENTIFICADO

O teste revelou que **uploads anônimos estão funcionando**, o que representa um **risco de segurança**. Qualquer pessoa pode fazer upload de arquivos sem autenticação.

## 🎯 OBJETIVO

Configurar políticas RLS que permitam:
- ✅ **Leitura pública** (qualquer pessoa pode ver avatares)
- ❌ **Upload/modificação apenas para usuários autenticados**

## 📋 PASSOS PARA CONFIGURAÇÃO

### 1. Acesse o Painel do Supabase
1. Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta
3. Selecione o projeto: `htwiupmnqlmwvzqzroal`

### 2. Navegue até Storage
1. No menu lateral, clique em **"Storage"**
2. Clique no bucket **"avatars"**
3. Clique na aba **"Policies"** (Políticas)

### 3. Configure as Políticas RLS

#### 🔍 Política 1: SELECT (Leitura Pública)
```sql
-- Nome: "Public Avatar Read"
-- Operação: SELECT
-- Target roles: public
-- USING expression:
true
```

#### 📤 Política 2: INSERT (Upload Autenticado)
```sql
-- Nome: "Authenticated Avatar Upload"
-- Operação: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
auth.role() = 'authenticated'
```

#### ✏️ Política 3: UPDATE (Atualização Autenticada)
```sql
-- Nome: "Authenticated Avatar Update"
-- Operação: UPDATE
-- Target roles: authenticated
-- USING expression:
auth.role() = 'authenticated'
-- WITH CHECK expression:
auth.role() = 'authenticated'
```

#### 🗑️ Política 4: DELETE (Exclusão Autenticada)
```sql
-- Nome: "Authenticated Avatar Delete"
-- Operação: DELETE
-- Target roles: authenticated
-- USING expression:
auth.role() = 'authenticated'
```

### 4. Remover Políticas Antigas (se existirem)
- Delete qualquer política que permita operações para `anon` role
- Mantenha apenas as políticas configuradas acima

## ✅ VERIFICAÇÃO PÓS-CONFIGURAÇÃO

Após configurar as políticas, execute:

```bash
node check-avatar-policies.js
```

### Resultado Esperado:
- ✅ Bucket existe e é visível
- ✅ Leitura pública funciona
- ✅ **Upload anônimo FALHA** (correto!)
- ✅ Upload com service role funciona
- ✅ URLs públicas funcionam

## 🚨 SINAIS DE CONFIGURAÇÃO CORRETA

Quando você executar o teste, deve ver:
```
4️⃣ Testando upload com anon key (deve falhar)...
✅ Upload com anon key falhou (correto): [mensagem de erro]
```

## 🔧 TROUBLESHOOTING

### Se o upload anônimo ainda funcionar:
1. Verifique se todas as políticas antigas foram removidas
2. Confirme que não há política de INSERT para `anon` role
3. Aguarde alguns minutos para as mudanças propagarem

### Se a leitura pública não funcionar:
1. Confirme que existe uma política SELECT com `true` como condição
2. Verifique se o bucket está marcado como público

## 📞 PRÓXIMOS PASSOS

1. **Configure as políticas** seguindo este guia
2. **Execute o teste** para verificar
3. **Teste na aplicação** fazendo upload de avatar
4. **Remova arquivos de teste** se necessário

---

💡 **Dica**: Após a configuração, o sistema de avatar funcionará com segurança total, permitindo apenas usuários logados fazerem upload, mas mantendo os avatares visíveis publicamente.