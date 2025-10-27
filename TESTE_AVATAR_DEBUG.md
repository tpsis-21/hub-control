# 🔍 Guia de Teste - Fluxo Completo de Avatar com Debug

## Objetivo
Testar o fluxo completo de upload, onChange, salvamento e recarregamento do avatar com logs de debug implementados.

## Pré-requisitos
- Servidor rodando em http://localhost:8080
- Usuário logado na aplicação
- Console do navegador aberto (F12 > Console)

## Passos do Teste

### 1. Acesso à Página de Perfil
1. Abra http://localhost:8080 no navegador
2. Faça login se necessário
3. Navegue para a página de perfil
4. Abra o Console do navegador (F12 > Console)

### 2. Teste de Upload de Avatar
1. **Clique no botão "Alterar Foto"** na seção do avatar
2. **Selecione uma imagem** (PNG, JPG)
3. **Observe os logs no console:**
   ```
   🔍 [DEBUG] Avatar upload success: {data: {publicUrl: "..."}}
   🔍 [DEBUG] Calling onChange with URL: https://...
   🔍 [DEBUG] Avatar onChange called with URL: https://...
   🔍 [DEBUG] FormData updated with avatar_url: https://...
   ```

### 3. Verificação Visual
1. **Confirme que a imagem aparece** no componente Avatar
2. **Verifique se o botão de remoção (X)** aparece no canto superior direito

### 4. Teste de Salvamento
1. **Clique no botão "Salvar Alterações"**
2. **Observe os logs no console:**
   ```
   🔍 [DEBUG] FormData before save: {avatar_url: "https://...", ...}
   🔍 [DEBUG] ProfileData to save: {avatar_url: "https://...", ...}
   ```
3. **Aguarde a mensagem de sucesso:** "Perfil atualizado com sucesso!"

### 5. Teste de Persistência
1. **Recarregue a página** (F5 ou Ctrl+R)
2. **Navegue novamente para o perfil**
3. **Confirme que a imagem ainda está lá**

### 6. Teste de Remoção (Opcional)
1. **Clique no botão X** para remover a imagem
2. **Observe os logs:**
   ```
   🔍 [DEBUG] Avatar onRemove called
   🔍 [DEBUG] FormData avatar_url cleared
   ```
3. **Salve as alterações**
4. **Recarregue e confirme** que a imagem foi removida

## Pontos de Verificação

### ✅ Upload Funcionando
- [ ] Logs de upload success aparecem
- [ ] URL é retornada corretamente
- [ ] onChange é chamado com a URL

### ✅ FormData Atualizado
- [ ] Logs mostram formData sendo atualizado
- [ ] avatar_url contém a URL correta

### ✅ Salvamento no Banco
- [ ] Logs mostram profileData com avatar_url
- [ ] Mensagem de sucesso aparece
- [ ] Sem erros no console

### ✅ Persistência
- [ ] Imagem permanece após reload
- [ ] Dados são carregados do banco corretamente

## Comandos Úteis para Debug

### No Console do Navegador:
```javascript
// Verificar formData atual
console.log('FormData atual:', formData);

// Verificar se há erros de rede
console.log('Verificar Network tab para erros HTTP');

// Limpar console
clear();
```

### Verificação no Supabase (se tiver acesso):
```sql
-- Verificar dados do perfil
SELECT user_id, full_name, avatar_url, updated_at 
FROM profiles 
WHERE user_id = 'seu-user-id';
```

## Problemas Comuns

### 🚨 Upload não funciona
- Verificar se o arquivo é uma imagem válida
- Verificar tamanho do arquivo (limite configurado)
- Verificar logs de erro no console

### 🚨 onChange não é chamado
- Verificar se o componente ImageUpload está configurado corretamente
- Verificar se os hooks useAvatarUpload estão funcionando

### 🚨 Salvamento falha
- Verificar se o usuário está autenticado
- Verificar permissões no Supabase
- Verificar logs de erro detalhados

### 🚨 Imagem não persiste
- Verificar se o avatar_url está sendo salvo no banco
- Verificar se o carregamento inicial está funcionando
- Verificar se há problemas de cache

## Próximos Passos
Após completar todos os testes:
1. Remover logs de debug temporários
2. Confirmar funcionamento em produção
3. Documentar qualquer problema encontrado

---
**Nota:** Este arquivo será removido após os testes serem concluídos.