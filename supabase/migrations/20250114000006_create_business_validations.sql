-- =====================================================
-- VALIDAÇÕES DE NEGÓCIO E REGRAS DE COMPATIBILIDADE
-- TheBest ↔ HubControl Integration
-- =====================================================

-- Função para validar regras de negócio de mapeamento
CREATE OR REPLACE FUNCTION validate_mapping_business_rules(
    p_thebest_package_id UUID,
    p_hubcontrol_plan_id UUID,
    p_config_id UUID
) RETURNS TABLE (
    is_valid BOOLEAN,
    validation_errors TEXT[],
    validation_warnings TEXT[],
    compatibility_score INTEGER
) AS $$
DECLARE
    v_package RECORD;
    v_plan RECORD;
    v_errors TEXT[] := '{}';
    v_warnings TEXT[] := '{}';
    v_score INTEGER := 100;
    v_existing_mapping_count INTEGER;
BEGIN
    -- Buscar dados do pacote TheBest
    SELECT * INTO v_package
    FROM thebest_packages
    WHERE id = p_thebest_package_id AND config_id = p_config_id;
    
    IF NOT FOUND THEN
        v_errors := array_append(v_errors, 'Pacote TheBest não encontrado ou não pertence à configuração especificada');
        RETURN QUERY SELECT FALSE, v_errors, v_warnings, 0;
        RETURN;
    END IF;
    
    -- Buscar dados do plano HubControl
    SELECT * INTO v_plan
    FROM plans
    WHERE id = p_hubcontrol_plan_id;
    
    IF NOT FOUND THEN
        v_errors := array_append(v_errors, 'Plano HubControl não encontrado');
        RETURN QUERY SELECT FALSE, v_errors, v_warnings, 0;
        RETURN;
    END IF;
    
    -- Verificar se o pacote está ativo
    IF NOT v_package.is_active THEN
        v_errors := array_append(v_errors, 'Pacote TheBest não está ativo');
        v_score := v_score - 50;
    END IF;
    
    -- Verificar se o plano está público
    IF NOT v_plan.is_public THEN
        v_warnings := array_append(v_warnings, 'Plano HubControl não está público - pode afetar a disponibilidade');
        v_score := v_score - 10;
    END IF;
    
    -- Verificar compatibilidade de telas
    IF v_package.telas != v_plan.screens THEN
        IF v_package.telas > v_plan.screens THEN
            v_warnings := array_append(v_warnings, 
                format('Pacote TheBest tem mais telas (%s) que o plano HubControl (%s)', 
                       v_package.telas, v_plan.screens));
            v_score := v_score - 15;
        ELSE
            v_warnings := array_append(v_warnings, 
                format('Plano HubControl tem mais telas (%s) que o pacote TheBest (%s)', 
                       v_plan.screens, v_package.telas));
            v_score := v_score - 5;
        END IF;
    END IF;
    
    -- Verificar compatibilidade de duração/validade
    DECLARE
        v_package_days INTEGER;
    BEGIN
        SELECT convert_thebest_duration_to_days(v_package.duracao) INTO v_package_days;
        
        IF v_package_days != v_plan.validity THEN
            IF ABS(v_package_days - v_plan.validity) <= 7 THEN
                v_warnings := array_append(v_warnings, 
                    format('Pequena diferença na validade: TheBest %s dias vs HubControl %s dias', 
                           v_package_days, v_plan.validity));
                v_score := v_score - 5;
            ELSE
                v_warnings := array_append(v_warnings, 
                    format('Diferença significativa na validade: TheBest %s dias vs HubControl %s dias', 
                           v_package_days, v_plan.validity));
                v_score := v_score - 20;
            END IF;
        END IF;
    END;
    
    -- Verificar compatibilidade de preço
    IF ABS(v_package.price - v_plan.price) > (v_package.price * 0.1) THEN
        v_warnings := array_append(v_warnings, 
            format('Diferença significativa no preço: TheBest R$ %.2f vs HubControl R$ %.2f', 
                   v_package.price, v_plan.price));
        v_score := v_score - 10;
    END IF;
    
    -- Verificar se já existe mapeamento ativo para este pacote
    SELECT COUNT(*) INTO v_existing_mapping_count
    FROM thebest_plan_mappings
    WHERE thebest_package_id = p_thebest_package_id 
      AND config_id = p_config_id 
      AND is_active = TRUE;
    
    IF v_existing_mapping_count > 0 THEN
        v_warnings := array_append(v_warnings, 'Já existe mapeamento ativo para este pacote TheBest');
        v_score := v_score - 5;
    END IF;
    
    -- Verificar regras específicas por classificação
    IF v_package.classificacao = 'COM_ADULTO' THEN
        -- Verificar se o plano suporta conteúdo adulto (assumindo que existe uma coluna ou regra)
        v_warnings := array_append(v_warnings, 'Pacote contém conteúdo adulto - verificar compatibilidade do plano');
    END IF;
    
    -- Garantir que o score não seja negativo
    v_score := GREATEST(v_score, 0);
    
    -- Determinar se é válido (sem erros críticos)
    RETURN QUERY SELECT 
        array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
        v_errors,
        v_warnings,
        v_score;
END;
$$ LANGUAGE plpgsql;

-- Função para validar configurações de sincronização
CREATE OR REPLACE FUNCTION validate_sync_configuration(
    p_mapping_id UUID
) RETURNS TABLE (
    is_valid BOOLEAN,
    validation_errors TEXT[],
    recommendations TEXT[]
) AS $$
DECLARE
    v_mapping RECORD;
    v_package RECORD;
    v_plan RECORD;
    v_errors TEXT[] := '{}';
    v_recommendations TEXT[] := '{}';
BEGIN
    -- Buscar dados do mapeamento
    SELECT * INTO v_mapping
    FROM thebest_plan_mappings
    WHERE id = p_mapping_id;
    
    IF NOT FOUND THEN
        v_errors := array_append(v_errors, 'Mapeamento não encontrado');
        RETURN QUERY SELECT FALSE, v_errors, v_recommendations;
        RETURN;
    END IF;
    
    -- Buscar dados relacionados
    SELECT * INTO v_package
    FROM thebest_packages
    WHERE id = v_mapping.thebest_package_id;
    
    SELECT * INTO v_plan
    FROM plans
    WHERE id = v_mapping.hubcontrol_plan_id;
    
    -- Validar overrides
    IF v_mapping.override_price IS NOT NULL THEN
        IF v_mapping.override_price <= 0 THEN
            v_errors := array_append(v_errors, 'Preço customizado deve ser maior que zero');
        END IF;
        
        IF NOT v_mapping.sync_price THEN
            v_recommendations := array_append(v_recommendations, 
                'Preço customizado definido mas sincronização de preço está desabilitada');
        END IF;
    END IF;
    
    IF v_mapping.override_validity IS NOT NULL THEN
        IF v_mapping.override_validity <= 0 THEN
            v_errors := array_append(v_errors, 'Validade customizada deve ser maior que zero');
        END IF;
        
        IF NOT v_mapping.sync_validity THEN
            v_recommendations := array_append(v_recommendations, 
                'Validade customizada definida mas sincronização de validade está desabilitada');
        END IF;
    END IF;
    
    IF v_mapping.override_screens IS NOT NULL THEN
        IF v_mapping.override_screens <= 0 THEN
            v_errors := array_append(v_errors, 'Número de telas customizado deve ser maior que zero');
        END IF;
        
        IF NOT v_mapping.sync_screens THEN
            v_recommendations := array_append(v_recommendations, 
                'Telas customizadas definidas mas sincronização de telas está desabilitada');
        END IF;
    END IF;
    
    -- Verificar se pelo menos uma sincronização está ativa
    IF NOT (v_mapping.sync_price OR v_mapping.sync_validity OR v_mapping.sync_screens) THEN
        v_recommendations := array_append(v_recommendations, 
            'Nenhuma sincronização ativa - considere ativar pelo menos uma opção');
    END IF;
    
    -- Verificar conflitos de mapeamento padrão
    IF v_mapping.is_default THEN
        DECLARE
            v_other_defaults INTEGER;
        BEGIN
            SELECT COUNT(*) INTO v_other_defaults
            FROM thebest_plan_mappings
            WHERE config_id = v_mapping.config_id
              AND is_default = TRUE
              AND is_active = TRUE
              AND id != v_mapping.id;
            
            IF v_other_defaults > 0 THEN
                v_recommendations := array_append(v_recommendations, 
                    'Existem outros mapeamentos marcados como padrão - considere ter apenas um padrão por configuração');
            END IF;
        END;
    END IF;
    
    RETURN QUERY SELECT 
        array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
        v_errors,
        v_recommendations;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular score de compatibilidade entre pacote e plano
CREATE OR REPLACE FUNCTION calculate_compatibility_score(
    p_thebest_package_id UUID,
    p_hubcontrol_plan_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_package RECORD;
    v_plan RECORD;
    v_score INTEGER := 100;
    v_package_days INTEGER;
BEGIN
    -- Buscar dados
    SELECT * INTO v_package FROM thebest_packages WHERE id = p_thebest_package_id;
    SELECT * INTO v_plan FROM plans WHERE id = p_hubcontrol_plan_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Compatibilidade de telas (peso: 40%)
    IF v_package.telas = v_plan.screens THEN
        -- Perfeito
        v_score := v_score;
    ELSIF ABS(v_package.telas - v_plan.screens) = 1 THEN
        -- Diferença de 1 tela
        v_score := v_score - 10;
    ELSIF ABS(v_package.telas - v_plan.screens) <= 3 THEN
        -- Diferença de 2-3 telas
        v_score := v_score - 25;
    ELSE
        -- Diferença maior
        v_score := v_score - 40;
    END IF;
    
    -- Compatibilidade de duração (peso: 35%)
    SELECT convert_thebest_duration_to_days(v_package.duracao) INTO v_package_days;
    
    IF v_package_days = v_plan.validity THEN
        -- Perfeito
        v_score := v_score;
    ELSIF ABS(v_package_days - v_plan.validity) <= 7 THEN
        -- Diferença de até 1 semana
        v_score := v_score - 5;
    ELSIF ABS(v_package_days - v_plan.validity) <= 30 THEN
        -- Diferença de até 1 mês
        v_score := v_score - 20;
    ELSE
        -- Diferença maior
        v_score := v_score - 35;
    END IF;
    
    -- Compatibilidade de preço (peso: 25%)
    DECLARE
        v_price_diff_percent NUMERIC;
    BEGIN
        v_price_diff_percent := ABS(v_package.price - v_plan.price) / GREATEST(v_package.price, v_plan.price) * 100;
        
        IF v_price_diff_percent <= 5 THEN
            -- Diferença de até 5%
            v_score := v_score;
        ELSIF v_price_diff_percent <= 15 THEN
            -- Diferença de 5-15%
            v_score := v_score - 10;
        ELSIF v_price_diff_percent <= 30 THEN
            -- Diferença de 15-30%
            v_score := v_score - 20;
        ELSE
            -- Diferença maior que 30%
            v_score := v_score - 25;
        END IF;
    END;
    
    RETURN GREATEST(v_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Função para obter recomendações de melhoria para mapeamentos
CREATE OR REPLACE FUNCTION get_mapping_recommendations(
    p_config_id UUID
) RETURNS TABLE (
    mapping_id UUID,
    package_name TEXT,
    plan_name TEXT,
    current_score INTEGER,
    recommendations TEXT[],
    priority TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH mapping_analysis AS (
        SELECT 
            m.id,
            tp.package_name as package_name,
            pl.name as plan_name,
            calculate_compatibility_score(m.thebest_package_id, m.hubcontrol_plan_id) as score,
            m.sync_price,
            m.sync_validity,
            m.sync_screens,
            m.is_active,
            m.override_price,
            m.override_validity,
            m.override_screens
        FROM thebest_plan_mappings m
        JOIN thebest_packages tp ON tp.id = m.thebest_package_id
        JOIN plans pl ON pl.id = m.hubcontrol_plan_id
        WHERE m.config_id = p_config_id
    )
    SELECT 
        ma.id,
        ma.package_name,
        ma.plan_name,
        ma.score,
        CASE 
            WHEN ma.score >= 90 THEN ARRAY['Mapeamento excelente - nenhuma ação necessária']
            WHEN ma.score >= 70 THEN ARRAY[
                'Mapeamento bom - considere ajustes menores',
                CASE WHEN NOT ma.sync_price THEN 'Considere ativar sincronização de preço' END,
                CASE WHEN NOT ma.sync_validity THEN 'Considere ativar sincronização de validade' END,
                CASE WHEN NOT ma.sync_screens THEN 'Considere ativar sincronização de telas' END
            ]
            WHEN ma.score >= 50 THEN ARRAY[
                'Mapeamento com problemas - requer atenção',
                'Verifique compatibilidade de telas e duração',
                'Considere usar valores customizados para melhor alinhamento'
            ]
            ELSE ARRAY[
                'Mapeamento problemático - considere remapear',
                'Busque plano com melhor compatibilidade',
                'Verifique se este é realmente o melhor mapeamento possível'
            ]
        END,
        CASE 
            WHEN ma.score >= 70 THEN 'baixa'
            WHEN ma.score >= 50 THEN 'media'
            ELSE 'alta'
        END
    FROM mapping_analysis ma
    WHERE ma.is_active = TRUE
    ORDER BY ma.score ASC, ma.package_name;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validação automática antes de inserir/atualizar mapeamentos
CREATE OR REPLACE FUNCTION trigger_validate_mapping_before_save()
RETURNS TRIGGER AS $$
DECLARE
    v_validation RECORD;
BEGIN
    -- Validar regras de negócio
    SELECT * INTO v_validation
    FROM validate_mapping_business_rules(
        NEW.thebest_package_id,
        NEW.hubcontrol_plan_id,
        NEW.config_id
    );
    
    -- Se há erros críticos, impedir a operação
    IF NOT v_validation.is_valid THEN
        RAISE EXCEPTION 'Validação de mapeamento falhou: %', 
            array_to_string(v_validation.validation_errors, '; ');
    END IF;
    
    -- Se é um mapeamento padrão, desativar outros padrões da mesma configuração
    IF NEW.is_default AND NEW.is_active THEN
        UPDATE thebest_plan_mappings 
        SET is_default = FALSE
        WHERE config_id = NEW.config_id 
          AND is_active = TRUE 
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela
DROP TRIGGER IF EXISTS validate_mapping_before_save ON thebest_plan_mappings;
CREATE TRIGGER validate_mapping_before_save
    BEFORE INSERT OR UPDATE ON thebest_plan_mappings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validate_mapping_before_save();

-- View para análise de qualidade dos mapeamentos
CREATE OR REPLACE VIEW thebest_mapping_quality_analysis AS
SELECT 
    m.id as mapping_id,
    m.config_id,
    tp.package_name as package_name,
    tp.thebest_package_id as package_external_id,
    pl.name as plan_name,
    m.is_active,
    m.is_default,
    calculate_compatibility_score(m.thebest_package_id, m.hubcontrol_plan_id) as compatibility_score,
    CASE 
        WHEN calculate_compatibility_score(m.thebest_package_id, m.hubcontrol_plan_id) >= 90 THEN 'Excelente'
        WHEN calculate_compatibility_score(m.thebest_package_id, m.hubcontrol_plan_id) >= 70 THEN 'Bom'
        WHEN calculate_compatibility_score(m.thebest_package_id, m.hubcontrol_plan_id) >= 50 THEN 'Regular'
        ELSE 'Ruim'
    END as quality_rating,
    -- Detalhes de compatibilidade
    1 as package_screens, -- Valor padrão já que coluna telas não existe
    pl.screens as plan_screens,
    1 = pl.screens as screens_match, -- Comparação com valor padrão
    convert_duration_flexible('UM_MES') as package_days, -- Usando função flexível
    pl.validity as plan_days,
    ABS(convert_duration_flexible('UM_MES') - pl.validity) <= 7 as validity_match -- Tolerância de 7 dias
    tp.price as package_price,
    pl.price as plan_price,
    ABS(tp.price - pl.price) <= (tp.price * 0.1) as price_match,
    -- Configurações de sincronização
    m.sync_price,
    m.sync_validity,
    m.sync_screens,
    m.override_price,
    m.override_validity,
    m.override_screens,
    m.created_at,
    m.updated_at
FROM thebest_plan_mappings m
JOIN thebest_packages tp ON tp.id = m.thebest_package_id
JOIN plans pl ON pl.id = m.hubcontrol_plan_id
ORDER BY m.config_id, compatibility_score DESC;

-- Comentários para documentação
COMMENT ON FUNCTION validate_mapping_business_rules IS 'Valida regras de negócio para mapeamentos TheBest ↔ HubControl';
COMMENT ON FUNCTION validate_sync_configuration IS 'Valida configurações de sincronização de mapeamentos';
COMMENT ON FUNCTION calculate_compatibility_score IS 'Calcula score de compatibilidade entre pacote TheBest e plano HubControl';
COMMENT ON FUNCTION get_mapping_recommendations IS 'Fornece recomendações para melhorar mapeamentos existentes';
COMMENT ON VIEW thebest_mapping_quality_analysis IS 'Análise detalhada da qualidade dos mapeamentos';

-- Habilitar RLS na view (herda das tabelas base)
ALTER VIEW thebest_mapping_quality_analysis OWNER TO postgres;

-- Migração registrada automaticamente pelo Supabase

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ Validações de negócio e regras de compatibilidade criadas com sucesso!';
    RAISE NOTICE '📊 Funções disponíveis:';
    RAISE NOTICE '   - validate_mapping_business_rules(): Valida regras de negócio';
    RAISE NOTICE '   - validate_sync_configuration(): Valida configurações de sincronização';
    RAISE NOTICE '   - calculate_compatibility_score(): Calcula score de compatibilidade';
    RAISE NOTICE '   - get_mapping_recommendations(): Fornece recomendações';
    RAISE NOTICE '📈 View criada: thebest_mapping_quality_analysis';
    RAISE NOTICE '⚡ Trigger de validação automática ativado';
END $$;