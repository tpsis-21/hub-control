# Instruções para Aplicar Migrações no Supabase

## ⚠️ Problema Identificado

O erro `syntax error at or near "\i"` ocorre porque você está tentando usar um comando específico do psql (`\i`) na interface web do Supabase, que não reconhece esse comando.

## ✅ Solução Correta para Supabase

### Passo 1: Aplicar a Migração Principal

1. **Abra o Supabase Dashboard**
2. **Vá para SQL Editor** (ícone de banco de dados na barra lateral)
3. **Abra o arquivo** `migrations/20241220000001_add_period_calculation_fields.sql` no seu editor de código local
4. **Copie TODO o conteúdo** do arquivo (Ctrl+A, Ctrl+C)
5. **Cole no SQL Editor do Supabase** (Ctrl+V)
6. **Execute** clicando no botão "Run" ou pressionando Ctrl+Enter

### Passo 2: Aplicar a Migração de Dados

1. **Após a migração principal ser executada com sucesso**
2. **Abra o arquivo** `scripts/migrate-existing-data.sql` no seu editor local
3. **Copie TODO o conteúdo** do arquivo
4. **Cole no SQL Editor do Supabase**
5. **Execute** clicando no botão "Run"

## 🔍 Verificação

Após executar ambas as migrações, execute este comando para verificar:

```sql
-- Verificar se as colunas foram criadas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('servers', 'plans', 'server_credit_notifications')
    AND (column_name LIKE '%period%' OR column_name LIKE '%credit%')
    AND table_schema = 'public'
ORDER BY table_name, column_name;
```

## 📋 Checklist de Execução

- [ ] ✅ Migração principal executada sem erros
- [ ] ✅ Verificação das colunas criadas
- [ ] ✅ Migração de dados executada sem erros
- [ ] ✅ Verificação final dos dados migrados

## 🚨 Comandos que NÃO funcionam no Supabase

❌ **NÃO use estes comandos na interface web do Supabase:**
```sql
\i arquivo.sql          -- Comando específico do psql
\dt                      -- Listar tabelas (psql)
\d tabela               -- Descrever tabela (psql)
\q                       -- Sair (psql)
```

✅ **Use estes comandos no Supabase:**
```sql
-- Listar tabelas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Descrever estrutura de uma tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'nome_da_tabela' AND table_schema = 'public';
```

## 💡 Dicas Importantes

1. **Sempre execute as migrações em ordem**: Principal → Dados
2. **Faça backup** antes de executar em produção
3. **Teste primeiro** em ambiente de desenvolvimento
4. **Copie e cole o arquivo inteiro**, não linha por linha
5. **Aguarde a execução completa** antes de executar a próxima migração

## 🔧 Troubleshooting

### Se der erro de "column already exists":
```sql
-- Verificar se a migração já foi aplicada
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'servers' 
AND column_name = 'period_calculation_type';
```

### Se der erro de "table does not exist":
```sql
-- Verificar se as tabelas existem
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('servers', 'plans');
```

### Se der erro de permissão:
- Certifique-se de estar logado como proprietário do projeto
- Verifique se tem permissões de administrador no Supabase

## 📞 Suporte

Se ainda tiver problemas:
1. Verifique os logs de erro no Supabase
2. Confirme que está no projeto correto
3. Teste a conexão com o banco
4. Execute as verificações de estrutura das tabelas