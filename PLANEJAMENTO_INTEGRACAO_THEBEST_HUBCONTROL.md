# 📋 Planejamento Detalhado: Integração TheBest ↔ HubControl

## 🎯 Objetivo
Implementar um sistema robusto de ligação entre os pacotes do TheBest (identificados por IDs externos) e os planos cadastrados no HubControl, garantindo que:
- ✅ Pacotes existentes sejam mapeados corretamente
- ✅ Novos pacotes sejam automaticamente ligados
- ✅ A estrutura seja escalável e maintível
- ✅ Não haja perda de funcionalidades existentes

## 🔍 Análise da Situação Atual

### Estrutura TheBest
```sql
-- Tabela thebest_packages
CREATE TABLE thebest_packages (
  id UUID PRIMARY KEY,
  config_id UUID REFERENCES thebest_configs(id),
  external_id TEXT NOT NULL,                    -- ID do pacote no TheBest
  classificacao thebest_package_classification,  -- COM_ADULTO/SEM_ADULTO
  duracao thebest_package_duration,             -- 1_MES/3_MESES/6_MESES/12_MESES
  telas INTEGER,                                -- Número de telas
  creditos INTEGER,                             -- Créditos do pacote
  name TEXT,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true
);
```

### Estrutura HubControl
```sql
-- Tabela plan_groups (Grupos de Planos)
CREATE TABLE plan_groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Tabela plans (Planos)
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  validity INTEGER NOT NULL,                    -- Validade em dias
  screens INTEGER NOT NULL,                     -- Número de telas
  panel_plan_id TEXT,                          -- ID único de 2 dígitos (10-99)
  restrictions TEXT,
  send_welcome_message BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  group_id UUID REFERENCES plan_groups(id),    -- Grupo do plano
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Problema Identificado
- ❌ **Não há ligação direta** entre `thebest_packages.external_id` e `plans.id`
- ❌ **View thebest_dashboard falha** no LEFT JOIN por falta de correspondência
- ❌ **Novos pacotes TheBest** não são automaticamente ligados a planos
- ❌ **Estruturas diferentes**: TheBest usa enum para duração, HubControl usa dias

## 🏗️ Arquitetura da Solução

### Opção 1: Tabela de Mapeamento (RECOMENDADA)

#### Vantagens:
- ✅ **Flexibilidade total**: Um pacote TheBest pode mapear para múltiplos planos
- ✅ **Não invasiva**: Não altera estruturas existentes
- ✅ **Auditoria completa**: Histórico de todas as ligações
- ✅ **Configuração granular**: Mapeamento por usuário/configuração
- ✅ **Fácil manutenção**: Interface dedicada para gerenciar mapeamentos

#### Estrutura:
```sql
-- Nova tabela para mapeamento
CREATE TABLE thebest_plan_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  thebest_package_id UUID NOT NULL REFERENCES thebest_packages(id) ON DELETE CASCADE,
  hubcontrol_plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES thebest_configs(id) ON DELETE CASCADE,
  
  -- Configurações do mapeamento
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,              -- Mapeamento padrão para o pacote
  
  -- Configurações de sincronização
  sync_price BOOLEAN DEFAULT true,               -- Sincronizar preço
  sync_validity BOOLEAN DEFAULT true,            -- Sincronizar validade
  sync_screens BOOLEAN DEFAULT true,             -- Sincronizar telas
  
  -- Override de valores (opcional)
  override_price DECIMAL(10,2),                  -- Preço customizado
  override_validity INTEGER,                     -- Validade customizada (dias)
  override_screens INTEGER,                      -- Telas customizadas
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_package_plan_config UNIQUE(thebest_package_id, hubcontrol_plan_id, config_id),
  CONSTRAINT unique_default_mapping UNIQUE(thebest_package_id, config_id) WHERE is_default = true
);
```

### Opção 2: Campo Direto na Tabela Plans

#### Vantagens:
- ✅ **Simplicidade**: Ligação direta 1:1
- ✅ **Performance**: Menos JOINs necessários

#### Desvantagens:
- ❌ **Limitação**: Apenas 1:1 (um plano = um pacote)
- ❌ **Invasiva**: Altera estrutura existente
- ❌ **Menos flexível**: Dificulta cenários complexos

## 🚀 Plano de Implementação (Opção 1 - Recomendada)

### Fase 1: Estrutura Base

#### 1.1 Criar Tabela de Mapeamento
```sql
-- Arquivo: migration-thebest-plan-mapping.sql
CREATE TABLE thebest_plan_mappings (
  -- [estrutura completa acima]
);

-- Índices para performance
CREATE INDEX idx_thebest_mappings_package_id ON thebest_plan_mappings(thebest_package_id);
CREATE INDEX idx_thebest_mappings_plan_id ON thebest_plan_mappings(hubcontrol_plan_id);
CREATE INDEX idx_thebest_mappings_config_id ON thebest_plan_mappings(config_id);
CREATE INDEX idx_thebest_mappings_active ON thebest_plan_mappings(is_active) WHERE is_active = true;
```

#### 1.2 Função de Conversão de Duração
```sql
-- Função para converter enum TheBest para dias
CREATE OR REPLACE FUNCTION convert_thebest_duration_to_days(duration thebest_package_duration)
RETURNS INTEGER AS $$
BEGIN
  CASE duration
    WHEN '1_MES' THEN RETURN 30;
    WHEN '3_MESES' THEN RETURN 90;
    WHEN '6_MESES' THEN RETURN 180;
    WHEN '12_MESES' THEN RETURN 365;
    ELSE RETURN 30; -- Default
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### 1.3 Função de Auto-Mapeamento
```sql
-- Função para criar mapeamentos automáticos baseados em similaridade
CREATE OR REPLACE FUNCTION auto_map_thebest_packages(p_config_id UUID)
RETURNS INTEGER AS $$
DECLARE
  package_record RECORD;
  plan_record RECORD;
  mapped_count INTEGER := 0;
  target_validity INTEGER;
BEGIN
  -- Para cada pacote TheBest sem mapeamento
  FOR package_record IN 
    SELECT tp.* FROM thebest_packages tp
    WHERE tp.config_id = p_config_id
    AND tp.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM thebest_plan_mappings tpm 
      WHERE tpm.thebest_package_id = tp.id 
      AND tpm.is_active = true
    )
  LOOP
    -- Converter duração para dias
    target_validity := convert_thebest_duration_to_days(package_record.duracao);
    
    -- Buscar plano compatível (mesmo número de telas e validade similar)
    SELECT * INTO plan_record
    FROM plans p
    WHERE p.screens = package_record.telas
    AND ABS(p.validity - target_validity) <= 5  -- Tolerância de 5 dias
    AND p.is_public = true
    ORDER BY ABS(p.validity - target_validity), p.created_at
    LIMIT 1;
    
    -- Se encontrou plano compatível, criar mapeamento
    IF FOUND THEN
      INSERT INTO thebest_plan_mappings (
        thebest_package_id,
        hubcontrol_plan_id,
        config_id,
        is_active,
        is_default,
        sync_price,
        sync_validity,
        sync_screens
      ) VALUES (
        package_record.id,
        plan_record.id,
        p_config_id,
        true,
        true,
        true,
        true,
        true
      );
      
      mapped_count := mapped_count + 1;
    END IF;
  END LOOP;
  
  RETURN mapped_count;
END;
$$ LANGUAGE plpgsql;
```

### Fase 2: Interface de Gerenciamento

#### 2.1 Componente de Mapeamento
```typescript
// src/components/integrations/thebest-plan-mapping.tsx
interface TheBestPlanMapping {
  id: string;
  thebest_package_id: string;
  hubcontrol_plan_id: string;
  config_id: string;
  is_active: boolean;
  is_default: boolean;
  sync_price: boolean;
  sync_validity: boolean;
  sync_screens: boolean;
  override_price?: number;
  override_validity?: number;
  override_screens?: number;
  
  // Dados relacionados
  thebest_package?: TheBestPackage;
  hubcontrol_plan?: Plan;
}

export function TheBestPlanMappingManager() {
  // Interface para:
  // - Listar mapeamentos existentes
  // - Criar novos mapeamentos
  // - Editar mapeamentos
  // - Auto-mapear pacotes
  // - Visualizar pacotes sem mapeamento
}
```

#### 2.2 Serviço de Mapeamento
```typescript
// src/services/thebest-mapping.service.ts
export class TheBestMappingService {
  // Buscar mapeamentos por configuração
  static async getMappingsByConfig(configId: string): Promise<TheBestPlanMapping[]>
  
  // Criar mapeamento
  static async createMapping(mapping: CreateMappingRequest): Promise<TheBestPlanMapping>
  
  // Auto-mapear pacotes
  static async autoMapPackages(configId: string): Promise<{ mapped: number; unmapped: TheBestPackage[] }>
  
  // Sincronizar dados do pacote para o plano
  static async syncPackageToPlans(packageId: string): Promise<void>
  
  // Buscar pacotes sem mapeamento
  static async getUnmappedPackages(configId: string): Promise<TheBestPackage[]>
}
```

### Fase 3: Atualização da View Dashboard

#### 3.1 Nova View com Mapeamento
```sql
-- Atualizar view thebest_dashboard
CREATE OR REPLACE VIEW thebest_dashboard AS
SELECT 
  tp.id,
  tp.external_id as thebest_package_id,
  tp.name as package_name,
  tp.classificacao,
  tp.duracao,
  tp.telas,
  tp.creditos,
  tp.price as thebest_price,
  tp.currency,
  tp.is_active,
  tp.is_available,
  tp.created_at,
  tp.updated_at,
  
  -- Dados do plano mapeado (via mapeamento padrão)
  COALESCE(p.name, 'Plano não mapeado') as plan_description,
  COALESCE(p.price, 0) as plan_price,
  COALESCE(p.validity, 0) as plan_validity,
  COALESCE(p.screens, 0) as plan_screens,
  p.panel_plan_id,
  
  -- Informações do mapeamento
  tpm.id as mapping_id,
  tpm.is_active as mapping_active,
  tpm.sync_price,
  tpm.sync_validity,
  tpm.sync_screens,
  tpm.override_price,
  tpm.override_validity,
  tpm.override_screens,
  
  -- Contadores de assinaturas (exemplo)
  COUNT(CASE WHEN tps.status = 'active' THEN 1 END) as active_subscriptions,
  COUNT(CASE WHEN tps.status = 'suspended' THEN 1 END) as suspended_subscriptions,
  COUNT(CASE WHEN tps.status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
  COUNT(CASE WHEN tps.status = 'pending' THEN 1 END) as pending_subscriptions
  
FROM thebest_packages tp
LEFT JOIN thebest_plan_mappings tpm ON (
  tpm.thebest_package_id = tp.id 
  AND tpm.is_active = true 
  AND tpm.is_default = true
)
LEFT JOIN plans p ON p.id = tpm.hubcontrol_plan_id
LEFT JOIN thebest_package_subscriptions tps ON tps.package_id = tp.id
GROUP BY 
  tp.id, tp.external_id, tp.name, tp.classificacao, tp.duracao, 
  tp.telas, tp.creditos, tp.price, tp.currency, tp.is_active, 
  tp.is_available, tp.created_at, tp.updated_at,
  p.name, p.price, p.validity, p.screens, p.panel_plan_id,
  tpm.id, tpm.is_active, tpm.sync_price, tpm.sync_validity, 
  tpm.sync_screens, tpm.override_price, tpm.override_validity, tpm.override_screens;
```

### Fase 4: Automação e Sincronização

#### 4.1 Trigger para Novos Pacotes
```sql
-- Trigger para auto-mapear novos pacotes
CREATE OR REPLACE FUNCTION trigger_auto_map_new_package()
RETURNS TRIGGER AS $$
BEGIN
  -- Tentar auto-mapear o novo pacote
  PERFORM auto_map_thebest_packages(NEW.config_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_map_thebest_package
  AFTER INSERT ON thebest_packages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_map_new_package();
```

#### 4.2 Sincronização Bidirecional
```sql
-- Função para sincronizar dados do TheBest para HubControl
CREATE OR REPLACE FUNCTION sync_thebest_to_hubcontrol(p_mapping_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  mapping_record RECORD;
  package_record RECORD;
BEGIN
  -- Buscar mapeamento e pacote
  SELECT tpm.*, tp.* INTO mapping_record, package_record
  FROM thebest_plan_mappings tpm
  JOIN thebest_packages tp ON tp.id = tpm.thebest_package_id
  WHERE tpm.id = p_mapping_id AND tpm.is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Atualizar plano com dados do pacote
  UPDATE plans SET
    price = CASE 
      WHEN mapping_record.sync_price THEN 
        COALESCE(mapping_record.override_price, package_record.price)
      ELSE price 
    END,
    validity = CASE 
      WHEN mapping_record.sync_validity THEN 
        COALESCE(mapping_record.override_validity, convert_thebest_duration_to_days(package_record.duracao))
      ELSE validity 
    END,
    screens = CASE 
      WHEN mapping_record.sync_screens THEN 
        COALESCE(mapping_record.override_screens, package_record.telas)
      ELSE screens 
    END,
    updated_at = NOW()
  WHERE id = mapping_record.hubcontrol_plan_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
```

## 📊 Estratégia de Migração

### Etapa 1: Preparação
1. **Backup completo** do banco de dados
2. **Análise dos dados existentes**:
   - Quantos pacotes TheBest existem?
   - Quantos planos HubControl existem?
   - Quais são as similaridades?

### Etapa 2: Implementação Gradual
1. **Criar estrutura** (tabela de mapeamento + funções)
2. **Executar auto-mapeamento** para dados existentes
3. **Revisar mapeamentos** criados automaticamente
4. **Ajustar mapeamentos** manualmente quando necessário
5. **Atualizar view** thebest_dashboard
6. **Testar funcionalidades**

### Etapa 3: Interface de Usuário
1. **Desenvolver componente** de gerenciamento de mapeamentos
2. **Integrar na página** de configurações TheBest
3. **Adicionar alertas** para pacotes não mapeados
4. **Implementar dashboard** de status de mapeamentos

### Etapa 4: Automação
1. **Ativar triggers** para novos pacotes
2. **Implementar sincronização** automática
3. **Configurar alertas** para falhas de sincronização
4. **Documentar processo** para usuários

## 🔧 Configurações Avançadas

### Grupos Automáticos para Pacotes TheBest
```sql
-- Criar grupos específicos para pacotes TheBest
INSERT INTO plan_groups (name, description) VALUES 
('TheBest - Com Adulto', 'Planos TheBest com conteúdo adulto'),
('TheBest - Sem Adulto', 'Planos TheBest sem conteúdo adulto');

-- Função para associar planos aos grupos corretos
CREATE OR REPLACE FUNCTION assign_thebest_plan_to_group(p_plan_id UUID, p_classification thebest_package_classification)
RETURNS VOID AS $$
DECLARE
  target_group_id UUID;
BEGIN
  -- Buscar grupo apropriado
  SELECT id INTO target_group_id
  FROM plan_groups
  WHERE name = CASE p_classification
    WHEN 'COM_ADULTO' THEN 'TheBest - Com Adulto'
    WHEN 'SEM_ADULTO' THEN 'TheBest - Sem Adulto'
  END;
  
  -- Atualizar plano
  IF target_group_id IS NOT NULL THEN
    UPDATE plans SET group_id = target_group_id WHERE id = p_plan_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Validações de Negócio
```sql
-- Função para validar mapeamento
CREATE OR REPLACE FUNCTION validate_thebest_mapping(
  p_package_id UUID,
  p_plan_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  package_record RECORD;
  plan_record RECORD;
BEGIN
  -- Buscar dados
  SELECT * INTO package_record FROM thebest_packages WHERE id = p_package_id;
  SELECT * INTO plan_record FROM plans WHERE id = p_plan_id;
  
  -- Validações
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pacote ou plano não encontrado';
  END IF;
  
  -- Validar compatibilidade de telas
  IF package_record.telas != plan_record.screens THEN
    RAISE WARNING 'Número de telas incompatível: TheBest=%, HubControl=%', 
      package_record.telas, plan_record.screens;
  END IF;
  
  -- Validar validade (tolerância de 10 dias)
  IF ABS(convert_thebest_duration_to_days(package_record.duracao) - plan_record.validity) > 10 THEN
    RAISE WARNING 'Validade muito diferente: TheBest=% dias, HubControl=% dias',
      convert_thebest_duration_to_days(package_record.duracao), plan_record.validity;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
```

## 📈 Monitoramento e Métricas

### Dashboard de Status
```sql
-- View para monitoramento de mapeamentos
CREATE VIEW thebest_mapping_status AS
SELECT 
  tc.name as config_name,
  COUNT(tp.id) as total_packages,
  COUNT(tpm.id) as mapped_packages,
  COUNT(tp.id) - COUNT(tpm.id) as unmapped_packages,
  ROUND(COUNT(tpm.id)::DECIMAL / NULLIF(COUNT(tp.id), 0) * 100, 2) as mapping_percentage
FROM thebest_configs tc
LEFT JOIN thebest_packages tp ON tp.config_id = tc.id AND tp.is_active = true
LEFT JOIN thebest_plan_mappings tpm ON tpm.thebest_package_id = tp.id AND tpm.is_active = true
WHERE tc.is_active = true
GROUP BY tc.id, tc.name;
```

### Alertas Automáticos
```sql
-- Função para detectar problemas de mapeamento
CREATE OR REPLACE FUNCTION check_mapping_health()
RETURNS TABLE(
  issue_type TEXT,
  description TEXT,
  count INTEGER
) AS $$
BEGIN
  -- Pacotes sem mapeamento
  RETURN QUERY
  SELECT 
    'unmapped_packages'::TEXT,
    'Pacotes TheBest sem mapeamento'::TEXT,
    COUNT(*)::INTEGER
  FROM thebest_packages tp
  WHERE tp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM thebest_plan_mappings tpm 
    WHERE tpm.thebest_package_id = tp.id AND tpm.is_active = true
  );
  
  -- Mapeamentos inativos
  RETURN QUERY
  SELECT 
    'inactive_mappings'::TEXT,
    'Mapeamentos desativados'::TEXT,
    COUNT(*)::INTEGER
  FROM thebest_plan_mappings
  WHERE is_active = false;
  
  -- Planos órfãos (mapeados para pacotes inexistentes)
  RETURN QUERY
  SELECT 
    'orphaned_mappings'::TEXT,
    'Mapeamentos para pacotes inexistentes'::TEXT,
    COUNT(*)::INTEGER
  FROM thebest_plan_mappings tpm
  WHERE tpm.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM thebest_packages tp 
    WHERE tp.id = tpm.thebest_package_id AND tp.is_active = true
  );
END;
$$ LANGUAGE plpgsql;
```

## 🎯 Próximos Passos

### Imediatos (Semana 1)
1. **Revisar e aprovar** este planejamento
2. **Criar estrutura base** (tabela + funções)
3. **Executar auto-mapeamento** nos dados existentes
4. **Testar view atualizada**

### Curto Prazo (Semanas 2-3)
1. **Desenvolver interface** de gerenciamento
2. **Implementar validações** de negócio
3. **Criar documentação** para usuários
4. **Testes em ambiente de desenvolvimento**

### Médio Prazo (Mês 1)
1. **Deploy em produção**
2. **Treinamento de usuários**
3. **Monitoramento de performance**
4. **Ajustes baseados em feedback**

### Longo Prazo (Meses 2-3)
1. **Otimizações de performance**
2. **Funcionalidades avançadas**
3. **Integração com outros sistemas**
4. **Automação completa**

## ⚠️ Considerações Importantes

### Riscos e Mitigações
1. **Perda de dados**: Backup completo antes de qualquer alteração
2. **Performance**: Índices adequados e queries otimizadas
3. **Complexidade**: Interface intuitiva e documentação clara
4. **Manutenção**: Automação máxima para reduzir trabalho manual

### Requisitos de Aprovação
- [ ] **Estrutura da solução** aprovada
- [ ] **Estratégia de migração** validada
- [ ] **Interface de usuário** especificada
- [ ] **Cronograma** acordado
- [ ] **Recursos necessários** disponibilizados

---

**📝 Nota**: Este planejamento foi elaborado considerando a estrutura atual do sistema e as melhores práticas de desenvolvimento. Aguardo sua aprovação para iniciar a implementação.

**🔄 Última atualização**: Janeiro 2025
**👨‍💻 Responsável**: Assistente de Desenvolvimento
**📋 Status**: Aguardando Aprovação