# Migração para IDs Únicos e Intransferíveis

Este documento descreve o processo de migração implementado para garantir que `planId` e `serverId` sejam definidos automaticamente, únicos e intransferíveis.

## 📋 Resumo da Implementação

### Características dos IDs
- **Automáticos**: Gerados automaticamente no momento da criação
- **Únicos**: Cada plano/servidor recebe um ID único de 2 dígitos (10-99)
- **Intransferíveis**: IDs nunca são reutilizados, mesmo após exclusões
- **Sequenciais**: Gerados em ordem de criação

### Formato dos IDs
- **Planos**: `panel_plan_id` - números de 10 a 99 (fallback para 3 dígitos se necessário)
- **Servidores**: `panel_server_id` - números de 10 a 99 (fallback para 3 dígitos se necessário)

## 🗂️ Arquivos Criados

### 1. Migração SQL Principal
**Arquivo**: `migration-auto-generate-ids.sql`
- Adiciona colunas `panel_plan_id` e `panel_server_id`
- Cria funções de geração de IDs únicos
- Configura triggers automáticos
- Atualiza registros existentes

### 2. Scripts de Aplicação
- **`apply-complete-migration.cjs`**: Script principal para aplicar a migração
- **`apply-plan-migration.cjs`**: Script específico para planos (legacy)

### 3. Migrações Específicas (Legacy)
- **`migration-add-panel-plan-id.sql`**: Migração específica para planos

## 🚀 Como Aplicar a Migração

### Passo 1: Executar a Migração SQL
1. Acesse o painel do Supabase
2. Vá para "SQL Editor"
3. Execute o conteúdo do arquivo `migration-auto-generate-ids.sql`

### Passo 2: Aplicar o Script de Migração
```bash
node apply-complete-migration.cjs
```

### Passo 3: Verificar Resultados
O script irá:
- ✅ Verificar se as funções foram criadas
- ✅ Atualizar registros existentes sem IDs
- ✅ Mostrar relatório final com status

## 🔧 Estrutura Técnica

### Funções do Banco de Dados

#### `generate_unique_panel_plan_id()`
```sql
-- Gera IDs únicos para planos (10-99, fallback 100-999)
CREATE OR REPLACE FUNCTION generate_unique_panel_plan_id()
RETURNS INTEGER AS $$
-- Implementação completa no arquivo SQL
```

#### `generate_unique_panel_server_id()`
```sql
-- Gera IDs únicos para servidores (10-99, fallback 100-999)
CREATE OR REPLACE FUNCTION generate_unique_panel_server_id()
RETURNS INTEGER AS $$
-- Implementação completa no arquivo SQL
```

### Triggers Automáticos

#### `trigger_ensure_panel_plan_id`
- Executa antes de inserir novos planos
- Gera automaticamente `panel_plan_id` se não fornecido

#### `trigger_ensure_panel_server_id`
- Executa antes de inserir novos servidores
- Gera automaticamente `panel_server_id` se não fornecido

## 📝 Alterações no Código

### Arquivos Modificados

#### `src/app/(app)/planos/actions.ts`
- ❌ Removido: Geração manual de `panelPlanId`
- ❌ Removido: Função `generateUniquePanelPlanId`
- ✅ Adicionado: Comentário sobre geração automática

#### `src/app/(app)/servidores/actions.ts`
- ❌ Removido: Geração manual de `panelServerId`
- ❌ Removido: Import de `generateUniqueServerPanelId`
- ✅ Adicionado: Comentário sobre geração automática

#### `src/app/(app)/documentacao/api-chatbots/page.tsx`
- ✅ Atualizado: Exemplos de IDs para formato de 2 dígitos
- ✅ Atualizado: Descrição do campo `serverId`

## 🧪 Testando a Implementação

### Teste 1: Criação de Novo Plano
```javascript
// O ID será gerado automaticamente pelo trigger
const newPlan = {
  name: "Plano Teste",
  description: "Descrição do plano"
  // panel_plan_id será gerado automaticamente
};
```

### Teste 2: Criação de Novo Servidor
```javascript
// O ID será gerado automaticamente pelo trigger
const newServer = {
  name: "Servidor Teste",
  description: "Descrição do servidor"
  // panel_server_id será gerado automaticamente
};
```

### Teste 3: Verificar Unicidade
```sql
-- Verificar se não há IDs duplicados
SELECT panel_plan_id, COUNT(*) 
FROM plans 
WHERE panel_plan_id IS NOT NULL 
GROUP BY panel_plan_id 
HAVING COUNT(*) > 1;

SELECT panel_server_id, COUNT(*) 
FROM servers 
WHERE panel_server_id IS NOT NULL 
GROUP BY panel_server_id 
HAVING COUNT(*) > 1;
```

## 📊 Monitoramento

### Consultas Úteis

#### Verificar Status dos IDs
```sql
-- Status dos planos
SELECT 
  COUNT(*) as total_plans,
  COUNT(panel_plan_id) as plans_with_id,
  COUNT(*) - COUNT(panel_plan_id) as plans_without_id
FROM plans;

-- Status dos servidores
SELECT 
  COUNT(*) as total_servers,
  COUNT(panel_server_id) as servers_with_id,
  COUNT(*) - COUNT(panel_server_id) as servers_without_id
FROM servers;
```

#### Listar IDs Utilizados
```sql
-- IDs de planos em uso
SELECT panel_plan_id, name, created_at 
FROM plans 
WHERE panel_plan_id IS NOT NULL 
ORDER BY panel_plan_id;

-- IDs de servidores em uso
SELECT panel_server_id, name, created_at 
FROM servers 
WHERE panel_server_id IS NOT NULL 
ORDER BY panel_server_id;
```

## 🔒 Garantias de Integridade

### 1. Unicidade
- Índices únicos nas colunas `panel_plan_id` e `panel_server_id`
- Funções verificam IDs existentes antes de gerar novos

### 2. Intransferibilidade
- IDs nunca são reutilizados
- Funções sempre geram o próximo ID disponível
- Histórico de IDs é preservado mesmo após exclusões

### 3. Automatização
- Triggers garantem geração automática
- Não requer intervenção manual no código
- Funciona para inserções diretas no banco

## 🚨 Troubleshooting

### Problema: Script falha ao verificar funções
**Solução**: Execute primeiro a migração SQL no Supabase

### Problema: IDs não estão sendo gerados
**Solução**: Verifique se os triggers estão ativos:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_ensure_panel_plan_id', 'trigger_ensure_panel_server_id');
```

### Problema: IDs duplicados
**Solução**: Execute as funções de verificação e corrija manualmente:
```sql
-- Encontrar duplicatas
SELECT panel_plan_id, COUNT(*) 
FROM plans 
GROUP BY panel_plan_id 
HAVING COUNT(*) > 1;
```

## ✅ Checklist de Validação

- [ ] Migração SQL executada no Supabase
- [ ] Script `apply-complete-migration.cjs` executado com sucesso
- [ ] Todos os planos existentes têm `panel_plan_id`
- [ ] Todos os servidores existentes têm `panel_server_id`
- [ ] Novos planos recebem IDs automaticamente
- [ ] Novos servidores recebem IDs automaticamente
- [ ] IDs são únicos (sem duplicatas)
- [ ] Documentação da API atualizada
- [ ] Código não gera mais IDs manualmente

---

**Data da Migração**: Dezembro 2024  
**Versão**: 1.0  
**Status**: ✅ Implementado