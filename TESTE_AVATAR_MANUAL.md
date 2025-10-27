# Teste Manual - Avatar Upload

## Problema Identificado
A imagem de perfil não está sendo salva corretamente. Precisamos testar cada etapa do fluxo.

## Configuração do Supabase
⚠️ **ATENÇÃO**: Há um problema de privilégios no Supabase. Você precisa:
1. Verificar se sua conta tem as permissões necessárias
2. Consultar: https://supabase.com/docs/guides/platform/access-control
3. Configurar as credenciais corretas no projeto

## Fluxo de Teste

### 1. Teste de Upload
1. Acesse: http://localhost:8080/perfil
2. Clique em "Alterar Foto"
3. Selecione uma imagem
4. **Verificar no console**: Deve aparecer logs como:
   ```
   🔍 [DEBUG] Avatar upload success: {...}
   🔍 [DEBUG] Calling onChange with URL: [URL_DA_IMAGEM]
   ```

### 2. Teste de Atualização do Estado
1. Após o upload, verificar no console:
   ```
   🔍 [DEBUG] Avatar onChange called with URL: [URL]
   🔍 [DEBUG] FormData updated with avatar_url: [URL]
   ```
2. A imagem deve aparecer imediatamente no componente Avatar

### 3. Teste de Salvamento
1. Clique em "Salvar Alterações"
2. Verificar no console:
   ```
   🔍 [DEBUG] FormData before save: {avatar_url: "[URL]"}
   ```
3. Deve aparecer toast de sucesso

### 4. Teste de Persistência
1. Recarregue a página (F5)
2. A imagem deve continuar aparecendo
3. Se não aparecer, o problema está na persistência no banco

## Possíveis Problemas

### A. Upload não funciona
- Verificar configuração do Supabase Storage
- Verificar permissões do bucket
- Verificar se o hook useAvatarUpload está funcionando

### B. Estado não atualiza
- Verificar se onChange está sendo chamado
- Verificar se setFormData está funcionando
- Verificar se o componente está re-renderizando

### C. Salvamento falha
- Verificar se handleSave está sendo executado
- Verificar se há erros no Supabase
- Verificar se a coluna avatar_url existe na tabela profiles

### D. Persistência falha
- Verificar se os dados estão sendo salvos no banco
- Verificar se o carregamento inicial está buscando avatar_url
- Verificar se há problemas de cache

## Comandos Úteis

```bash
# Ver logs do servidor
npm run dev

# Verificar estrutura da tabela (se Supabase estiver configurado)
# Executar no SQL Editor do Supabase:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public';

# Verificar dados salvos
SELECT id, user_id, full_name, avatar_url 
FROM profiles 
WHERE user_id = '[SEU_USER_ID]';
```

## Próximos Passos
1. **PRIMEIRO**: Resolver problema de privilégios do Supabase
2. Executar teste manual seguindo os passos acima
3. Identificar em qual etapa o problema ocorre
4. Aplicar correção específica
5. Remover logs de debug após correção