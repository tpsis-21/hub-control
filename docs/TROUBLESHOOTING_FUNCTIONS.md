# Guia de Solução de Problemas - Funções de Duração

## Erros Comuns

### ❌ **Erro: `syntax error at or near "docs"`**

**Causa:** Você tentou executar um caminho de arquivo como código SQL.

**Explicação:** 
- Comandos como `docs/CLEAN_TEST.sql` são caminhos de arquivo, não código SQL
- PostgreSQL espera código SQL válido, não referências a arquivos
- Você precisa abrir o arquivo e executar seu conteúdo

**Solução:** 
- ❌ **NÃO execute**: `docs/CLEAN_TEST.sql` (isso é um caminho)
- ✅ **Execute**: o conteúdo do arquivo SQL
- ✅ **Use**: `docs/FINAL_TEST.sql` (script mais direto)

### ❌ **Erro: `syntax error at or near "#"`**

**Causa:** Você tentou executar um arquivo `.md` (markdown) como SQL.

**Explicação:** 
- Arquivos `.md` contêm formatação Markdown (como `#`, `##`, `**texto**`)
- PostgreSQL não entende essa sintaxe e gera erro de sintaxe
- Você precisa executar apenas código SQL puro

**Solução:** 
- ❌ **NÃO execute**: `TROUBLESHOOTING_FUNCTIONS.md`
- ✅ **Execute apenas**: arquivos `.sql`
- ✅ **Use**: `docs/FINAL_TEST.sql` (script mais direto)
- ✅ **Ou use**: `docs/SIMPLE_TEST.sql` ou `docs/TEST_FUNCTIONS_STANDALONE.sql`

**Scripts SQL disponíveis:**
- `FINAL_TEST.sql` - Script final e direto (recomendado)
- `CLEAN_TEST.sql` - Teste rápido e limpo
- `SIMPLE_TEST.sql` - Teste básico
- `TEST_FUNCTIONS_STANDALONE.sql` - Script completo com criação de funções

### ❌ **Erro: `function convert_duration_flexible(unknown) does not exist`**

**Causa:** A função `convert_duration_flexible` não foi criada no banco de dados.

**Possíveis razões:**
1. **Migrações não aplicadas**: As migrações do Supabase não foram executadas
2. **Docker não rodando**: O ambiente local do Supabase não está ativo
3. **Ambiente diferente**: Você está testando em um ambiente onde as funções não existem
4. **Ordem de execução**: As funções foram criadas após você tentar usá-las

### 🛠️ **Soluções por Cenário**

#### **Cenário 1: Ambiente Local (Supabase CLI)**

**Pré-requisitos:**
- Docker Desktop instalado e rodando
- Supabase CLI configurado

**Passos:**
```bash
# 1. Verificar se Docker está rodando
docker --version

# 2. Iniciar Supabase local
cd supabase
npx supabase start

# 3. Aplicar migrações
npx supabase db reset

# 4. Testar as funções
npx supabase db shell
```

**No shell do PostgreSQL:**
```sql
SELECT convert_duration_flexible('45');
```

#### **Cenário 2: Ambiente de Produção/Staging**

**Opção A: Via Supabase Dashboard**
1. Acesse o Supabase Dashboard
2. Vá para "SQL Editor"
3. Execute o script: `docs/TEST_FUNCTIONS_STANDALONE.sql`

**Opção B: Via Cliente PostgreSQL**
1. Conecte-se ao banco usando pgAdmin, DBeaver, ou psql
2. Execute o script: `docs/TEST_FUNCTIONS_STANDALONE.sql`

#### **Cenário 3: Docker não Disponível**

Se você não tem Docker instalado ou não pode usá-lo:

1. **Use o script standalone**: Execute `docs/TEST_FUNCTIONS_STANDALONE.sql` diretamente no seu ambiente PostgreSQL
2. **Conecte-se ao ambiente remoto**: Use as credenciais do Supabase para conectar diretamente

### 📋 **Script de Verificação Rápida**

Execute este script para verificar se as funções existem:

```sql
-- Verificar se as funções existem
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%duration%'
AND routine_schema = 'public';

-- Verificar se os tipos enum existem
SELECT 
  typname,
  typtype
FROM pg_type 
WHERE typname LIKE '%thebest%';
```

**Resultado esperado:**
```
routine_name                    | routine_type | data_type
--------------------------------|--------------|----------
convert_duration_flexible       | FUNCTION     | integer
convert_days_to_thebest_enum    | FUNCTION     | USER-DEFINED
convert_thebest_duration_to_days| FUNCTION     | integer
test_duration_conversions       | FUNCTION     | TABLE

typname                        | typtype
-------------------------------|--------
thebest_package_classification | e
thebest_package_duration       | e
```

### 🔧 **Soluções Específicas**

#### **Problema: "Docker não está instalado"**

**Solução 1: Instalar Docker**
1. Baixe Docker Desktop: https://docs.docker.com/desktop/
2. Instale e reinicie o computador
3. Execute `docker --version` para verificar

**Solução 2: Usar ambiente remoto**
1. Configure conexão direta com Supabase
2. Execute o script standalone

#### **Problema: "Migrações não aplicadas"**

```bash
# Verificar status das migrações
npx supabase migration list

# Aplicar migrações pendentes
npx supabase db push

# Ou resetar completamente
npx supabase db reset
```

#### **Problema: "Função existe mas não funciona"**

Verifique a assinatura da função:
```sql
-- Ver detalhes da função
\df convert_duration_flexible

-- Ou via query
SELECT 
  p.proname,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments,
  pg_catalog.pg_get_function_result(p.oid) as result
FROM pg_catalog.pg_proc p
WHERE p.proname = 'convert_duration_flexible';
```

### 🧪 **Testes de Validação**

Após resolver o problema, execute estes testes:

```sql
-- Teste básico
SELECT convert_duration_flexible('30') as test1;

-- Teste com enum
SELECT convert_duration_flexible('1_MES') as test2;

-- Teste completo
SELECT * FROM test_duration_conversions();
```

### 📞 **Quando Pedir Ajuda**

Se nenhuma solução funcionar, forneça estas informações:

1. **Ambiente**: Local/Produção/Staging
2. **Sistema Operacional**: Windows/Mac/Linux
3. **Versão do Docker**: `docker --version`
4. **Versão do Supabase CLI**: `npx supabase --version`
5. **Resultado do script de verificação** (acima)
6. **Logs de erro completos**

### 🚀 **Prevenção de Problemas**

Para evitar este problema no futuro:

1. **Sempre execute migrações**: Antes de testar novas funções
2. **Use scripts standalone**: Para ambientes sem Supabase CLI
3. **Documente dependências**: Mantenha lista de funções necessárias
4. **Teste em múltiplos ambientes**: Local, staging, produção

### 📁 **Arquivos de Referência**

- `docs/TEST_FUNCTIONS_STANDALONE.sql` - Script completo para criar e testar funções
- `docs/DURATION_CONVERSION_GUIDE.md` - Guia de uso das funções
- `docs/DURATION_EXAMPLES.sql` - Exemplos de uso
- `supabase/migrations/20250114000002_create_mapping_functions.sql` - Migração original

---

**💡 Dica**: Sempre mantenha uma cópia do script standalone para situações onde o ambiente local não está disponível!