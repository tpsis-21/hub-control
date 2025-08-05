# Plano de Otimização do Layout - Hub Control

## Problemas Identificados

### 1. Redundância de Headers
- **Problema**: Cada página tem seu próprio componente `Header` que duplica funcionalidades já presentes no `ModernHeader` do layout principal
- **Solução**: Remover headers individuais e usar apenas o `ModernHeader` centralizado

### 2. Estruturas de Tabela Repetitivas
- **Problema**: `ClientesTable` e `TestesTable` compartilham 80% do código (filtros, paginação, ações)
- **Solução**: Criar um componente `BaseTable` genérico reutilizável

### 3. Formulários com Código Duplicado
- **Problema**: `AddCustomerForm` e `AddTestForm` têm campos e validações similares
- **Solução**: Extrair componentes de campo reutilizáveis

### 4. Cards de Status Repetitivos
- **Problema**: Múltiplos componentes implementam badges de status de forma inconsistente
- **Solução**: Criar um `StatusBadge` unificado

### 5. Layout Wrapper Desnecessário
- **Problema**: Páginas envolvem conteúdo em divs com classes repetitivas
- **Solução**: Padronizar no layout principal

## Implementação

### Fase 1: Simplificação de Headers
- [ ] Remover componente `Header` individual
- [ ] Atualizar `ModernHeader` para ser dinâmico
- [ ] Atualizar todas as páginas

### Fase 2: Unificação de Tabelas
- [ ] Criar `BaseTable` genérico
- [ ] Migrar `ClientesTable` e `TestesTable`
- [ ] Criar hooks compartilhados para filtros

### Fase 3: Componentes Reutilizáveis
- [ ] Criar `StatusBadge` unificado
- [ ] Extrair campos de formulário comuns
- [ ] Padronizar ações de CRUD

### Fase 4: Layout Consistency
- [ ] Padronizar estrutura de páginas
- [ ] Remover wrappers desnecessários
- [ ] Otimizar responsividade

## Benefícios Esperados
- Redução de ~40% no código duplicado
- Manutenibilidade melhorada
- Consistência visual aprimorada
- Performance otimizada
- Experiência de usuário mais fluida