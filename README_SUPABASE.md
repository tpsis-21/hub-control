# Hub Control com Supabase
## Funções de Acesso a Dados

As funções para acessar dados do Supabase estão organizadas por módulo:

- `src/app/(app)/clientes/supabase-actions.ts`: Funções para gerenciar clientes
- `src/app/(app)/planos/supabase-actions.ts`: Funções para gerenciar planos
- `src/app/(app)/servidores/actions.ts`: Funções para gerenciar servidores
- `src/app/(app)/notificacoes/supabase-actions.ts`: Funções para gerenciar notificações
- `src/app/(app)/configuracoes/supabase-actions.ts`: Funções para configurações do sistema
- `src/app/(app)/ajuda/supabase-actions.ts`: Funções para artigos da base de conhecimento

## Migração do Firebase

Para migrar os dados do Firebase para o Supabase, siga as instruções no arquivo `MIGRACAO_FIREBASE_SUPABASE.md`.

## Executando o Projeto

```bash
npm run dev
```

O projeto estará disponível em http://localhost:9002.

## Próximos Passos

1. **Configurar Autenticação**: Configure os provedores de autenticação no painel do Supabase (Email, Google, etc.)
2. **Migrar Dados**: Migre os dados do Firebase para o Supabase
3. **Implementar Área do Cliente**: Crie uma área do cliente com autenticação separada
4. **Configurar Políticas de Segurança**: Configure as políticas de segurança (RLS) no Supabase para proteger seus dados

## Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do React](https://reactjs.org/docs)