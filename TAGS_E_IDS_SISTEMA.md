# Tags e IDs do Sistema IPTV Manager

## Identificadores de Cliente

### 1. **ID do Cliente (id)**
- **Formato**: UUID gerado automaticamente pelo Supabase
- **Exemplo**: `550e8400-e29b-41d4-a716-446655440000`
- **Uso**: Identificador único interno do sistema
- **Onde é usado**: URLs, referências internas, chaves primárias

### 2. **Customer ID (customerId)**
- **Formato**: `CUST` + timestamp + código aleatório
- **Exemplo**: `CUST1703123456789ABC`
- **Uso**: Identificador para APIs externas e integrações
- **Onde é usado**: API de chatbots, integrações externas
- **Nota**: Mencionado na documentação da API mas não implementado atualmente

### 3. **Manager ID (managerId)**
- **Formato Antigo**: 1 letra + 1 número (ex: `A1`)
- **Formato Novo**: 3 letras + 3 números (ex: `ABC123`)
- **Uso**: Identificação rápida do gestor responsável
- **Capacidade**: 
  - Formato antigo: 260 combinações (26 × 10)
  - Formato novo: 17.576.000 combinações (26³ × 10³)
- **Geração**: Automática se não fornecido ou inválido

### 4. **IPTV User ID (iptvUserId)**
- **Formato**: Apenas números
- **Exemplo**: `12345`
- **Uso**: ID do usuário no servidor IPTV
- **Obrigatório**: Apenas para servidores com gateway de pagamento

### 5. **IPTV Username (iptvUsername)**
- **Formato**: String alfanumérica
- **Exemplo**: `usuario123`
- **Uso**: Nome de usuário para acesso ao IPTV
- **Obrigatório**: Sim

### 6. **Unique Link (uniqueLink)**
- **Formato**: `/cliente/link_` + timestamp + código aleatório
- **Exemplo**: `/cliente/link_1703123456789abc123`
- **Uso**: Link único para área do cliente
- **Geração**: Automática na criação do cliente

## Tags de Status

### Status do Cliente
- `Ativo`: Cliente com plano ativo
- `Em teste`: Cliente em período de teste
- `Inativo`: Cliente com plano vencido
- `Bloqueado`: Cliente bloqueado manualmente

## Campos de Data

### No Banco de Dados (snake_case)
- `start_date`: Data de início do plano
- `expiration_date`: Data de vencimento do plano

### No Frontend (camelCase)
- `startDate`: Data de início (mapeada de start_date)
- `expirationDate`: Data de vencimento (mapeada de expiration_date)

## Recomendações de Uso

### Para Volume Alto de Clientes
1. **Manager ID**: Use o formato novo (ABC123) para maior capacidade
2. **Customer ID**: Implemente para APIs externas
3. **Indexação**: Considere índices no banco para campos frequentemente consultados

### Para APIs e Integrações
- Use `customerId` para identificação externa
- Use `managerId` para agrupamento por gestor
- Use `iptvUserId` para integração com servidores IPTV

### Para Busca e Filtros
- `name`: Nome do cliente
- `iptvUsername`: Username IPTV
- `managerId`: ID do gestor
- `status`: Status do cliente
- `planId`: ID do plano

## Migração de IDs

Se você tem muitos clientes com o formato antigo de Manager ID (A1), o sistema:
1. Mantém compatibilidade com IDs existentes
2. Gera novos IDs no formato longo (ABC123)
3. Valida ambos os formatos
4. Garante unicidade em ambos os casos

## Implementação de Customer ID

Para implementar o `customerId` mencionado na documentação da API:

```typescript
// Adicionar ao schema de cliente
customerId: string; // Formato: CUST + timestamp + random

// Gerar na criação do cliente
const customerId = generateCustomerId();
```

Este ID seria útil para:
- APIs públicas
- Integrações com chatbots
- Sistemas externos
- Logs e auditoria