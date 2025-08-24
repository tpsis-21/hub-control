# Análise de Compatibilidade - Períodos de Validade entre Sistema e Painéis IPTV

## 🔍 Problema Identificado

### Situação Atual
O sistema HubControl contabiliza a validade dos planos em **dias**, mas diferentes painéis IPTV utilizam lógicas distintas:
- **Alguns painéis**: Contabilizam em dias (28, 29, 30, 31 dias)
- **Outros painéis**: Contabilizam em meses (sem diferenciação de dias)

### Impacto do Problema
- **Inconsistência de datas**: Renovações podem não refletir corretamente nos painéis IPTV
- **Problemas de sincronização**: Planos podem expirar no sistema mas continuar ativos no painel (ou vice-versa)
- **Dificuldade de identificação**: Sistema não identifica automaticamente qual lógica o painel utiliza

## 📊 Análise da Implementação Atual

### 1. Estrutura de Planos no Sistema

```sql
-- Tabela plans - Validade sempre em dias
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  validity INTEGER NOT NULL,           -- ⚠️ SEMPRE EM DIAS
  screens INTEGER NOT NULL,
  panel_plan_id TEXT,                  -- ID do plano no painel IPTV
  -- ... outros campos
);
```

**Problema**: O campo `validity` é sempre interpretado como dias, independente da lógica do painel.

### 2. Cálculo de Renovação Manual

```typescript
// DOCUMENTACAO_LOGICA_PLANOS_RENOVACOES.md - Linha 95
export async function renewCustomerAction(customerId: string, planValidity: number) {
  // 2. Calcular nova data de expiração
  const currentExpiration = new Date(data.expiration_date);
  const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
  const newExpirationDate = addDays(baseDate, planValidity); // ⚠️ SEMPRE ADICIONA DIAS
  
  // 3. Atualizar cliente
  const { error: updateError } = await supabase
    .from('clients')
    .update({ 
      expiration_date: newExpirationDate.toISOString(), 
      status: 'Ativo' 
    })
    .eq('id', customerId);
}
```

**Problema**: Sempre usa `addDays()`, não considera se o painel trabalha com meses.

### 3. Renovação Automática The Best

```typescript
// thebest-renewal.service.ts - Linha 176
private calculateExpirationDate(durationMonths: number): string {
  const now = new Date();
  const expirationDate = new Date(now);
  expirationDate.setMonth(expirationDate.getMonth() + durationMonths); // ✅ USA MESES
  return expirationDate.toISOString();
}
```

**Inconsistência**: The Best usa meses, mas o sistema interno usa dias.

### 4. Interface de Criação de Planos

```typescript
// add-plan-form.tsx - Linha 169
{isMonthly ? (
  // Opções para contagem mensal (em dias equivalentes)
  <>
    <SelectItem value="30">1 mês</SelectItem>     // ⚠️ 30 dias = 1 mês
    <SelectItem value="60">2 meses</SelectItem>   // ⚠️ 60 dias = 2 meses
    <SelectItem value="90">3 meses</SelectItem>   // ⚠️ 90 dias = 3 meses
    <SelectItem value="180">6 meses</SelectItem>  // ⚠️ 180 dias = 6 meses
    <SelectItem value="365">12 meses</SelectItem> // ⚠️ 365 dias = 12 meses
  </>
) : (
  // Opções para contagem por dias
  <>
    <SelectItem value="30">30 dias</SelectItem>
    <SelectItem value="60">60 dias</SelectItem>
    // ...
  </>
)}
```

**Problema**: Conversão fixa (30 dias = 1 mês) não considera variações mensais.

## 🎯 Problemas Específicos Identificados

### 1. **Conversão Inadequada de Períodos**
- **1 mês ≠ 30 dias**: Janeiro tem 31 dias, fevereiro 28/29
- **Acúmulo de diferenças**: Em 12 meses, diferença pode ser de 5-6 dias
- **Inconsistência sazonal**: Renovações em fevereiro vs dezembro

### 2. **Falta de Configuração por Painel**
- **Sem identificação**: Sistema não sabe se painel usa dias ou meses
- **Configuração única**: Todos os painéis tratados igual
- **Sem flexibilidade**: Não permite configurar lógica por servidor

### 3. **Problemas de Sincronização**
- **Datas divergentes**: Sistema e painel com datas diferentes
- **Renovações falhando**: Painel não reconhece período enviado
- **Clientes afetados**: Serviço pode ser interrompido incorretamente

## 💡 Soluções Propostas

### 1. **Adicionar Configuração de Período por Servidor**

```sql
-- Adicionar campo na tabela servers
ALTER TABLE servers ADD COLUMN period_calculation_type TEXT DEFAULT 'days' CHECK (period_calculation_type IN ('days', 'months'));
ALTER TABLE servers ADD COLUMN period_calculation_config JSONB DEFAULT '{}';

-- Exemplos de configuração
-- Para painéis que usam dias:
-- period_calculation_config = { "type": "days", "strict": true }

-- Para painéis que usam meses:
-- period_calculation_config = { "type": "months", "dayOfMonth": "same" }
```

### 2. **Criar Serviço de Cálculo de Períodos**

```typescript
// services/period-calculation.service.ts
export class PeriodCalculationService {
  
  /**
   * Calcula data de expiração baseada na configuração do servidor
   */
  static calculateExpirationDate(
    baseDate: Date,
    planValidity: number,
    serverConfig: ServerPeriodConfig
  ): Date {
    const config = serverConfig.period_calculation_config;
    
    switch (serverConfig.period_calculation_type) {
      case 'days':
        return addDays(baseDate, planValidity);
        
      case 'months':
        return this.calculateMonthlyExpiration(baseDate, planValidity, config);
        
      default:
        return addDays(baseDate, planValidity); // fallback
    }
  }
  
  /**
   * Calcula expiração mensal considerando diferentes estratégias
   */
  private static calculateMonthlyExpiration(
    baseDate: Date,
    months: number,
    config: any
  ): Date {
    const result = new Date(baseDate);
    
    switch (config.dayOfMonth) {
      case 'same':
        // Mantém o mesmo dia do mês
        result.setMonth(result.getMonth() + months);
        break;
        
      case 'endOfMonth':
        // Sempre vai para o último dia do mês
        result.setMonth(result.getMonth() + months + 1, 0);
        break;
        
      case 'fixed':
        // Dia fixo do mês (ex: sempre dia 15)
        result.setMonth(result.getMonth() + months);
        result.setDate(config.fixedDay || 1);
        break;
        
      default:
        result.setMonth(result.getMonth() + months);
    }
    
    return result;
  }
  
  /**
   * Converte validade em dias para meses (quando necessário)
   */
  static convertDaysToMonths(days: number): number {
    // Conversão aproximada: 30.44 dias por mês (365.25/12)
    return Math.round(days / 30.44);
  }
  
  /**
   * Identifica o período mais adequado para o painel
   */
  static identifyBestPeriod(
    planValidity: number,
    serverConfig: ServerPeriodConfig
  ): { value: number; unit: 'days' | 'months' } {
    if (serverConfig.period_calculation_type === 'months') {
      const months = this.convertDaysToMonths(planValidity);
      return { value: months, unit: 'months' };
    }
    
    return { value: planValidity, unit: 'days' };
  }
}
```

### 3. **Atualizar Estrutura de Planos**

```sql
-- Adicionar campos para melhor controle de períodos
ALTER TABLE plans ADD COLUMN period_type TEXT DEFAULT 'days' CHECK (period_type IN ('days', 'months'));
ALTER TABLE plans ADD COLUMN period_config JSONB DEFAULT '{}';

-- Migração para planos existentes
UPDATE plans SET 
  period_type = CASE 
    WHEN validity IN (30, 60, 90, 180, 365) THEN 'months'
    ELSE 'days'
  END,
  period_config = CASE 
    WHEN validity = 30 THEN '{"months": 1}'
    WHEN validity = 60 THEN '{"months": 2}'
    WHEN validity = 90 THEN '{"months": 3}'
    WHEN validity = 180 THEN '{"months": 6}'
    WHEN validity = 365 THEN '{"months": 12}'
    ELSE '{}'
  END;
```

### 4. **Atualizar Função de Renovação**

```typescript
// Atualizar renewCustomerAction
export async function renewCustomerAction(
  customerId: string, 
  planId: string,
  serverId?: string
) {
  const supabase = await createApiSupabaseClient();
  
  // 1. Buscar dados necessários
  const [clientData, planData, serverData] = await Promise.all([
    supabase.from('clients').select('expiration_date').eq('id', customerId).single(),
    supabase.from('plans').select('validity, period_type, period_config').eq('id', planId).single(),
    serverId ? supabase.from('servers').select('period_calculation_type, period_calculation_config').eq('id', serverId).single() : null
  ]);
  
  if (!clientData.data || !planData.data) {
    return { success: false, error: "Dados não encontrados" };
  }
  
  // 2. Calcular nova data de expiração
  const currentExpiration = new Date(clientData.data.expiration_date);
  const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
  
  const serverConfig = serverData?.data || { period_calculation_type: 'days', period_calculation_config: {} };
  
  const newExpirationDate = PeriodCalculationService.calculateExpirationDate(
    baseDate,
    planData.data.validity,
    serverConfig
  );
  
  // 3. Atualizar cliente
  const { error: updateError } = await supabase
    .from('clients')
    .update({ 
      expiration_date: newExpirationDate.toISOString(), 
      status: 'Ativo' 
    })
    .eq('id', customerId);
  
  // 4. Se há servidor configurado, enviar dados para o painel
  if (serverId && !updateError) {
    await this.syncWithPanel(customerId, planData.data, serverConfig, newExpirationDate);
  }
  
  return { success: !updateError, newExpirationDate };
}
```

### 5. **Criar Interface de Configuração**

```typescript
// components/servers/period-config-form.tsx
export function PeriodConfigForm({ server, onSave }: PeriodConfigFormProps) {
  const [periodType, setPeriodType] = useState(server.period_calculation_type || 'days');
  const [config, setConfig] = useState(server.period_calculation_config || {});
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo de Cálculo de Período</Label>
        <Select value={periodType} onValueChange={setPeriodType}>
          <SelectItem value="days">Dias (Exato)</SelectItem>
          <SelectItem value="months">Meses (Calendário)</SelectItem>
        </Select>
      </div>
      
      {periodType === 'months' && (
        <div>
          <Label>Estratégia para Dia do Mês</Label>
          <Select 
            value={config.dayOfMonth || 'same'} 
            onValueChange={(value) => setConfig({...config, dayOfMonth: value})}
          >
            <SelectItem value="same">Manter mesmo dia</SelectItem>
            <SelectItem value="endOfMonth">Último dia do mês</SelectItem>
            <SelectItem value="fixed">Dia fixo do mês</SelectItem>
          </Select>
          
          {config.dayOfMonth === 'fixed' && (
            <Input 
              type="number" 
              min="1" 
              max="31" 
              value={config.fixedDay || 1}
              onChange={(e) => setConfig({...config, fixedDay: parseInt(e.target.value)})}
              placeholder="Dia do mês (1-31)"
            />
          )}
        </div>
      )}
      
      <Button onClick={() => onSave({ period_calculation_type: periodType, period_calculation_config: config })}>
        Salvar Configuração
      </Button>
    </div>
  );
}
```

## 🔧 Implementação Recomendada

### Fase 1: Estrutura Base (Prioridade Alta)
1. **Adicionar campos de configuração** nas tabelas `servers` e `plans`
2. **Criar serviço de cálculo de períodos** (`PeriodCalculationService`)
3. **Atualizar função de renovação manual** para usar o novo serviço
4. **Migrar dados existentes** com configurações padrão

### Fase 2: Interface e Configuração (Prioridade Média)
1. **Criar interface de configuração** para servidores
2. **Atualizar formulário de planos** para suportar tipos de período
3. **Adicionar validações** para configurações inválidas
4. **Criar documentação** para administradores

### Fase 3: Integração e Testes (Prioridade Média)
1. **Atualizar renovação automática** (The Best, NATV)
2. **Implementar sincronização** com painéis IPTV
3. **Criar testes automatizados** para diferentes cenários
4. **Monitoramento e alertas** para inconsistências

## 📋 Configurações Recomendadas por Tipo de Painel

### Painéis que usam Dias
```json
{
  "period_calculation_type": "days",
  "period_calculation_config": {
    "strict": true,
    "allowPartialDays": false
  }
}
```

### Painéis que usam Meses
```json
{
  "period_calculation_type": "months",
  "period_calculation_config": {
    "dayOfMonth": "same",
    "handleInvalidDates": "lastDayOfMonth"
  }
}
```

### Painéis Híbridos
```json
{
  "period_calculation_type": "months",
  "period_calculation_config": {
    "dayOfMonth": "fixed",
    "fixedDay": 1,
    "fallbackToDays": true
  }
}
```

## 🎯 Benefícios da Implementação

### 1. **Compatibilidade Total**
- ✅ Suporte a painéis que usam dias
- ✅ Suporte a painéis que usam meses
- ✅ Configuração flexível por servidor

### 2. **Sincronização Precisa**
- ✅ Datas consistentes entre sistema e painel
- ✅ Renovações refletidas corretamente
- ✅ Redução de problemas de expiração

### 3. **Facilidade de Configuração**
- ✅ Interface amigável para configurar servidores
- ✅ Validações automáticas
- ✅ Configurações pré-definidas para painéis conhecidos

### 4. **Manutenibilidade**
- ✅ Código organizado e reutilizável
- ✅ Fácil adição de novos tipos de painel
- ✅ Testes automatizados para validação

## 🚨 Considerações Importantes

### 1. **Migração de Dados**
- **Backup obrigatório** antes da migração
- **Teste em ambiente de desenvolvimento** primeiro
- **Migração gradual** por servidor/painel

### 2. **Compatibilidade com Integrações**
- **The Best**: Já usa meses, precisa ajustar para usar o novo serviço
- **NATV**: Verificar se usa dias ou meses
- **Outros painéis**: Configurar individualmente

### 3. **Monitoramento**
- **Alertas para inconsistências** entre sistema e painel
- **Logs detalhados** de cálculos de período
- **Dashboard de monitoramento** para renovações

## 📈 Próximos Passos

1. **Aprovação da arquitetura** proposta
2. **Implementação da Fase 1** (estrutura base)
3. **Testes com painéis existentes** 
4. **Rollout gradual** por servidor
5. **Monitoramento e ajustes** conforme necessário

Esta solução garante que o sistema HubControl seja compatível com qualquer tipo de painel IPTV, independente de como eles calculam períodos de validade, mantendo a sincronização perfeita entre o sistema interno e os painéis externos.