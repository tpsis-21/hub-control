# Configuração de Perfil de Usuário com Upload de Imagens

Este documento descreve como configurar o sistema de perfil de usuário com upload de avatar e logomarca.

## Funcionalidades Implementadas

### 1. Perfil de Usuário Completo
- ✅ Exibição de dados reais do usuário (nome, email)
- ✅ Upload de foto de perfil (avatar)
- ✅ Upload de logomarca da empresa
- ✅ Campos adicionais: telefone, empresa, nome completo
- ✅ Interface moderna e responsiva

### 2. Componente de Upload de Imagens
- ✅ Suporte a PNG, JPG (máximo 5MB)
- ✅ Preview das imagens
- ✅ Remoção de imagens
- ✅ Validação de tipo e tamanho
- ✅ Feedback visual durante upload

## Configuração no Supabase

### Passo 1: Executar Migração do Banco de Dados

1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Execute o script `scripts/migrate-profiles-table.sql`

Este script irá:
- Adicionar novas colunas à tabela `profiles`
- Criar o bucket `profiles` no Storage
- Configurar políticas de segurança (RLS)
- Criar índices para performance

### Passo 2: Verificar Storage

1. Vá para **Storage** no painel do Supabase
2. Verifique se o bucket `profiles` foi criado
3. Confirme que está marcado como **Public**

### Passo 3: Configurar Políticas de Storage (se necessário)

As políticas já são criadas automaticamente pelo script, mas você pode verificar em **Storage > Policies**:

- **Public Access**: Permite visualização pública das imagens
- **Users can upload their own images**: Usuários podem fazer upload
- **Users can update their own images**: Usuários podem atualizar
- **Users can delete their own images**: Usuários podem deletar

## Estrutura da Tabela Profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  approved BOOLEAN DEFAULT false,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  avatar_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Componentes Criados/Atualizados

### 1. `src/components/ui/image-upload.tsx`
- Componente reutilizável para upload de imagens
- Suporte para avatar e logomarca
- Validação e feedback de erro
- Interface responsiva

### 2. `src/app/perfil/page.tsx`
- Página de perfil atualizada
- Integração com componente de upload
- Formulário completo de dados pessoais
- Salvamento automático no Supabase

### 3. `src/lib/database.types.ts`
- Tipos TypeScript atualizados
- Novos campos da tabela profiles
- Tipagem completa para TypeScript

### 4. `src/components/app/user-nav.tsx`
- Já estava implementado corretamente
- Mostra dados reais do usuário
- Avatar dinâmico baseado no perfil

## Como Usar

### Para o Usuário Final:

1. **Acessar Perfil**: Clique no avatar no canto superior direito → "Perfil"
2. **Alterar Foto**: Clique em "Alterar Foto" na seção do avatar
3. **Adicionar Logomarca**: Use o botão "Adicionar Logomarca" na seção inferior
4. **Preencher Dados**: Complete nome, telefone e empresa
5. **Salvar**: Clique em "Salvar Alterações"

### Para Desenvolvedores:

```tsx
// Usar o componente ImageUpload
import { ImageUpload } from "@/components/ui/image-upload";

<ImageUpload
  value={avatarUrl}
  onChange={(url) => setAvatarUrl(url)}
  onRemove={() => setAvatarUrl("")}
  type="avatar" // ou "logo"
  disabled={loading}
/>
```

## Segurança

### Políticas de Acesso (RLS)
- Usuários só podem ver/editar seu próprio perfil
- Admins podem ver/editar todos os perfis
- Upload de imagens restrito ao próprio usuário
- Validação de tipos de arquivo no frontend e backend

### Validações
- Tipos de arquivo: PNG, JPG apenas
- Tamanho máximo: 5MB por imagem
- Nomes de arquivo únicos com timestamp
- Organização por pasta de usuário

## Estrutura de Pastas no Storage

```
profiles/
├── {user_id}/
│   ├── avatar_1234567890.jpg
│   ├── logo_1234567890.png
│   └── ...
└── {outro_user_id}/
    ├── avatar_1234567890.jpg
    └── ...
```

## Troubleshooting

### Erro de Upload
1. Verifique se o bucket `profiles` existe
2. Confirme que as políticas RLS estão ativas
3. Verifique se o usuário está autenticado
4. Confirme o tamanho e tipo do arquivo

### Imagens não Aparecem
1. Verifique se o bucket está marcado como público
2. Confirme a URL da imagem no banco de dados
3. Verifique as políticas de visualização

### Erro de Permissão
1. Confirme que as políticas RLS estão configuradas
2. Verifique se o usuário tem perfil na tabela `profiles`
3. Confirme que `user_id` está preenchido corretamente

## Próximos Passos

- [ ] Implementar redimensionamento automático de imagens
- [ ] Adicionar suporte a mais formatos (WebP, AVIF)
- [ ] Implementar compressão de imagens
- [ ] Adicionar galeria de avatars padrão
- [ ] Implementar crop de imagens