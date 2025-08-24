# Integração The Best - Sistema de Renovação Automática

## 📋 Visão Geral

Este documento descreve a implementação completa da integração com a API The Best, incluindo o sistema de renovação automática de pacotes baseado em pagamentos processados.

## 🏗️ Arquitetura do Sistema

### Componentes Principais

1. **API Proxy** (`/api/thebest/proxy`)
   - Proxy seguro para chamadas à API The Best
   - Autenticação por usuário
   - Rate limiting e logs de auditoria

2. **Serviço de Renovação** (`thebest-renewal.service.ts`)
   - Lógica central de renovação automática
   - Processamento de pagamentos
   - Cálculo de datas de expiração

3. **Webhook de Pagamento** (`/api/thebest/webhook/payment`)
   - Recebe notificações de pagamento
   - Aciona renovações automáticas
   - Validação de assinatura

4. **Interface de Usuário** (`thebest-renewals.tsx`)
   - Dashboard de renovações
   - Estatísticas e análises
   - Gerenciamento de pacotes

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

#### `thebest_configs`
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- api_key: TEXT (encrypted)
- api_secret: TEXT (encrypted)
- webhook_secret: TEXT (encrypted)
- is_active: BOOLEAN
- settings: JSONB
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `thebest_packages`
```sql
- id: UUID (PK)
- package_id: TEXT (unique)
- name: TEXT
- classification: TEXT
- duration_months: INTEGER
- screens: INTEGER
- credits: INTEGER
- is_active: BOOLEAN
- metadata: JSONB
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `thebest_renewals`
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- package_id: TEXT
- payment_id: TEXT
- credits_added: INTEGER
- expiry_date: TIMESTAMP
- status: renewal_status_enum
- processed_at: TIMESTAMP
- metadata: JSONB
- created_at: TIMESTAMP
```

#### `thebest_api_logs`
```sql
- id: UUID (PK)
- user_id: UUID
- endpoint: TEXT
- method: TEXT
- request_data: JSONB
- response_data: JSONB
- status_code: INTEGER
- execution_time: INTEGER
- created_at: TIMESTAMP
```

## 🚀 Como Configurar

### 1. Executar Migração do Banco

```bash
# Execute o arquivo SQL no Supabase Dashboard
psql -f thebest-migration-manual.sql
```

### 2. Importar Pacotes do CSV

```bash
# Execute o script de importação
node import-thebest-packages.js
```

### 3. Configurar Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
THEBEST_API_BASE_URL=https://api.thebest.com
THEBEST_WEBHOOK_SECRET=seu_webhook_secret
```

### 4. Configurar Webhook

Configure o webhook no painel The Best para:
- URL: `https://seu-dominio.com/api/thebest/webhook/payment`
- Eventos: `payment.completed`
- Método: `POST`

## 📊 Fluxo de Renovação Automática

### 1. Recebimento do Webhook
```
Pagamento → Webhook → Validação → Processamento
```

### 2. Processamento da Renovação
```
1. Buscar configuração do usuário
2. Identificar pacote pelo valor do pagamento
3. Calcular nova data de expiração
4. Executar renovação via API The Best
5. Registrar renovação no banco
6. Logar operação
```

### 3. Tratamento de Erros
- Pagamentos duplicados são ignorados
- Falhas são logadas para análise
- Retry automático em caso de erro temporário

## 🔧 APIs Disponíveis

### Configuração
- `GET /api/thebest/config` - Buscar configuração
- `POST /api/thebest/config` - Salvar configuração
- `PUT /api/thebest/config` - Atualizar configuração

### Renovações
- `GET /api/thebest/renewals` - Listar renovações
- `POST /api/thebest/renewals` - Processar renovação manual
- `GET /api/thebest/renewals/stats` - Estatísticas

### Pacotes
- `GET /api/thebest/packages` - Listar pacotes
- `POST /api/thebest/packages` - Importar pacotes
- `PUT /api/thebest/packages` - Atualizar status

### Proxy
- `POST /api/thebest/proxy` - Proxy para API The Best

### Webhook
- `POST /api/thebest/webhook/payment` - Receber pagamentos

## 🎨 Interface de Usuário

### Dashboard de Renovações
- **Estatísticas**: Total de renovações, créditos, taxa de sucesso
- **Histórico**: Lista de todas as renovações com status
- **Pacotes**: Visualização dos pacotes disponíveis
- **Análises**: Gráficos e métricas mensais

### Configuração
- Formulário para API keys
- Teste de conectividade
- Configurações de webhook

## 🔒 Segurança

### Criptografia
- API keys são criptografadas no banco
- Webhook secrets são validados
- Tokens de acesso são temporários

### RLS (Row Level Security)
- Usuários só acessam seus próprios dados
- Políticas de segurança por tabela
- Auditoria completa de operações

### Validações
- Validação de assinatura do webhook
- Sanitização de dados de entrada
- Rate limiting nas APIs

## 📈 Monitoramento

### Logs
- Todas as operações são logadas
- Métricas de performance
- Rastreamento de erros

### Alertas
- Falhas de renovação
- Problemas de conectividade
- Webhooks inválidos

## 🧪 Testes

### Teste Manual de Renovação
```bash
# Simular pagamento
curl -X POST http://localhost:3000/api/thebest/renewals \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "uuid-do-usuario",
    "package_id": "PACOTE_TESTE",
    "payment_id": "PAY_123",
    "amount": 100.00
  }'
```

### Teste de Webhook
```bash
# Simular webhook de pagamento
curl -X POST http://localhost:3000/api/thebest/webhook/payment \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=assinatura" \
  -d '{
    "event": "payment.completed",
    "data": {
      "payment_id": "PAY_123",
      "user_id": "uuid-do-usuario",
      "amount": 100.00,
      "status": "completed"
    }
  }'
```

## 🔄 Manutenção

### Backup
- Backup automático das configurações
- Exportação de dados de renovação
- Versionamento de pacotes

### Atualizações
- Migração de schema
- Atualização de pacotes
- Deploy sem downtime

## 📞 Suporte

### Logs de Debug
```bash
# Verificar logs de renovação
select * from thebest_api_logs 
where endpoint like '%renewal%' 
order by created_at desc;

# Verificar renovações falhadas
select * from thebest_renewals 
where status = 'failed' 
order by created_at desc;
```

### Troubleshooting

1. **Renovação não processada**
   - Verificar webhook configurado
   - Validar assinatura
   - Checar logs de API

2. **Erro de autenticação**
   - Verificar API keys
   - Testar conectividade
   - Validar permissões

3. **Pacote não encontrado**
   - Verificar importação do CSV
   - Validar mapeamento de valores
   - Checar status ativo

## 📋 Próximos Passos

1. ✅ **Executar migração manual** no Supabase Dashboard
2. ✅ **Importar pacotes** do arquivo CSV
3. ⏳ **Testar integração** completa
4. ⏳ **Configurar monitoramento** em produção
5. ⏳ **Documentar** procedimentos operacionais

---

**Desenvolvido para Hub Control** - Sistema de renovação automática The Best

*Última atualização: Janeiro 2025*