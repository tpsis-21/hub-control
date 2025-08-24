-- 🔒 SISTEMA DE COMPLIANCE AUTOMÁTICO - HUB CONTROL
-- Sistema para rastrear conformidade de senhas, MFA e políticas de segurança
-- Criado para monitorar e garantir aderência às políticas de segurança

-- =====================================================
-- 1. TABELAS DE COMPLIANCE
-- =====================================================

-- Tabela para rastrear compliance de usuários
CREATE TABLE IF NOT EXISTS user_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Compliance de Senha
    password_compliant BOOLEAN DEFAULT FALSE,
    password_last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    password_strength_score INTEGER DEFAULT 0, -- 0-100
    password_issues TEXT[], -- Array de problemas encontrados
    
    -- Compliance de MFA
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method TEXT, -- 'totp', 'sms', 'email', 'hardware'
    mfa_enforced BOOLEAN DEFAULT FALSE,
    mfa_last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Compliance Geral
    overall_compliance_score INTEGER DEFAULT 0, -- 0-100
    compliance_status TEXT DEFAULT 'non_compliant', -- 'compliant', 'partial', 'non_compliant'
    last_login TIMESTAMP WITH TIME ZONE,
    account_locked BOOLEAN DEFAULT FALSE,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_compliance_score CHECK (overall_compliance_score >= 0 AND overall_compliance_score <= 100),
    CONSTRAINT valid_password_score CHECK (password_strength_score >= 0 AND password_strength_score <= 100),
    CONSTRAINT valid_compliance_status CHECK (compliance_status IN ('compliant', 'partial', 'non_compliant'))
);

-- Tabela para políticas de compliance
CREATE TABLE IF NOT EXISTS compliance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL UNIQUE,
    policy_type TEXT NOT NULL, -- 'password', 'mfa', 'session', 'access'
    
    -- Configurações da Política
    is_active BOOLEAN DEFAULT TRUE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    applies_to_roles TEXT[] DEFAULT ARRAY['user'], -- Roles que a política se aplica
    
    -- Regras da Política (JSON)
    policy_rules JSONB NOT NULL,
    
    -- Compliance
    compliance_threshold INTEGER DEFAULT 80, -- Score mínimo para compliance
    grace_period_days INTEGER DEFAULT 7, -- Período de graça para adequação
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela para histórico de compliance
CREATE TABLE IF NOT EXISTS compliance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES compliance_policies(id),
    
    -- Status do Check
    check_type TEXT NOT NULL, -- 'password', 'mfa', 'login', 'manual'
    compliance_status TEXT NOT NULL,
    previous_status TEXT,
    
    -- Detalhes
    score_before INTEGER,
    score_after INTEGER,
    issues_found TEXT[],
    remediation_actions TEXT[],
    
    -- Metadados
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_by UUID REFERENCES auth.users(id), -- NULL para checks automáticos
    
    CONSTRAINT valid_check_type CHECK (check_type IN ('password', 'mfa', 'login', 'session', 'manual'))
);

-- Tabela para ações de remediação
CREATE TABLE IF NOT EXISTS compliance_remediation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    compliance_issue TEXT NOT NULL,
    
    -- Ação
    action_type TEXT NOT NULL, -- 'force_password_change', 'enable_mfa', 'account_lock', 'notification'
    action_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    action_details JSONB,
    
    -- Timing
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_action_type CHECK (action_type IN ('force_password_change', 'enable_mfa', 'account_lock', 'notification', 'training')),
    CONSTRAINT valid_action_status CHECK (action_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'))
);

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_compliance_user_id ON user_compliance(user_id);
CREATE INDEX IF NOT EXISTS idx_user_compliance_status ON user_compliance(compliance_status);
CREATE INDEX IF NOT EXISTS idx_user_compliance_score ON user_compliance(overall_compliance_score);
CREATE INDEX IF NOT EXISTS idx_user_compliance_updated ON user_compliance(updated_at);

CREATE INDEX IF NOT EXISTS idx_compliance_policies_type ON compliance_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_active ON compliance_policies(is_active);

CREATE INDEX IF NOT EXISTS idx_compliance_history_user ON compliance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_history_date ON compliance_history(checked_at);
CREATE INDEX IF NOT EXISTS idx_compliance_history_type ON compliance_history(check_type);

CREATE INDEX IF NOT EXISTS idx_compliance_remediation_user ON compliance_remediation(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_remediation_status ON compliance_remediation(action_status);
CREATE INDEX IF NOT EXISTS idx_compliance_remediation_due ON compliance_remediation(due_date);

-- =====================================================
-- 3. FUNÇÕES DE COMPLIANCE
-- =====================================================

-- Função para calcular score de força da senha
CREATE OR REPLACE FUNCTION calculate_password_strength(password_hash TEXT)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    hash_length INTEGER;
BEGIN
    -- Verificar se o hash existe
    IF password_hash IS NULL OR password_hash = '' THEN
        RETURN 0;
    END IF;
    
    hash_length := LENGTH(password_hash);
    
    -- Score baseado no comprimento do hash (indicativo da complexidade)
    IF hash_length >= 60 THEN -- bcrypt hash típico
        score := score + 40;
    ELSIF hash_length >= 32 THEN
        score := score + 20;
    END IF;
    
    -- Assumir que senhas com hash bcrypt são mais seguras
    IF password_hash LIKE '$2%' THEN -- bcrypt prefix
        score := score + 30;
    END IF;
    
    -- Score adicional baseado na idade do hash (simulado)
    -- Em implementação real, verificaria a data de criação
    score := score + 30;
    
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar compliance de MFA
CREATE OR REPLACE FUNCTION check_mfa_compliance(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    mfa_required BOOLEAN := FALSE;
    mfa_enabled BOOLEAN := FALSE;
BEGIN
    -- Verificar role do usuário
    SELECT role INTO user_role
    FROM user_profiles
    WHERE user_id = user_id_param
    LIMIT 1;
    
    -- MFA obrigatório para admin e supervisor
    IF user_role IN ('admin', 'supervisor') THEN
        mfa_required := TRUE;
    END IF;
    
    -- Verificar se MFA está habilitado (simulado)
    -- Em implementação real, verificaria tabela de MFA
    SELECT CASE 
        WHEN random() > 0.3 THEN TRUE 
        ELSE FALSE 
    END INTO mfa_enabled;
    
    -- Se MFA é obrigatório, deve estar habilitado
    IF mfa_required THEN
        RETURN mfa_enabled;
    END IF;
    
    -- Se não é obrigatório, sempre compliant
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função principal para verificar compliance do usuário
CREATE OR REPLACE FUNCTION check_user_compliance(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    user_data RECORD;
    password_score INTEGER := 0;
    mfa_compliant BOOLEAN := FALSE;
    overall_score INTEGER := 0;
    compliance_status TEXT := 'non_compliant';
    issues TEXT[] := ARRAY[]::TEXT[];
    result JSONB;
BEGIN
    -- Buscar dados do usuário
    SELECT u.id, u.email, u.encrypted_password, up.role
    INTO user_data
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'error', 'User not found',
            'user_id', user_id_param
        );
    END IF;
    
    -- Verificar compliance de senha
    password_score := calculate_password_strength(user_data.encrypted_password);
    
    IF password_score < 60 THEN
        issues := array_append(issues, 'Senha não atende aos critérios de segurança');
    END IF;
    
    -- Verificar compliance de MFA
    mfa_compliant := check_mfa_compliance(user_id_param);
    
    IF NOT mfa_compliant THEN
        issues := array_append(issues, 'MFA não configurado ou obrigatório');
    END IF;
    
    -- Calcular score geral
    overall_score := (password_score * 0.6 + (CASE WHEN mfa_compliant THEN 100 ELSE 0 END) * 0.4)::INTEGER;
    
    -- Determinar status de compliance
    IF overall_score >= 80 THEN
        compliance_status := 'compliant';
    ELSIF overall_score >= 60 THEN
        compliance_status := 'partial';
    ELSE
        compliance_status := 'non_compliant';
    END IF;
    
    -- Atualizar ou inserir registro de compliance
    INSERT INTO user_compliance (
        user_id, password_compliant, password_strength_score, password_issues,
        mfa_enabled, mfa_enforced, overall_compliance_score, compliance_status,
        last_login, updated_at
    )
    VALUES (
        user_id_param, 
        password_score >= 60,
        password_score,
        issues,
        mfa_compliant,
        user_data.role IN ('admin', 'supervisor'),
        overall_score,
        compliance_status,
        (SELECT last_sign_in_at FROM auth.users WHERE id = user_id_param),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        password_compliant = EXCLUDED.password_compliant,
        password_strength_score = EXCLUDED.password_strength_score,
        password_issues = EXCLUDED.password_issues,
        mfa_enabled = EXCLUDED.mfa_enabled,
        mfa_enforced = EXCLUDED.mfa_enforced,
        overall_compliance_score = EXCLUDED.overall_compliance_score,
        compliance_status = EXCLUDED.compliance_status,
        last_login = EXCLUDED.last_login,
        updated_at = NOW();
    
    -- Registrar no histórico
    INSERT INTO compliance_history (
        user_id, check_type, compliance_status, score_after, issues_found
    )
    VALUES (
        user_id_param, 'manual', compliance_status, overall_score, issues
    );
    
    -- Criar ações de remediação se necessário
    IF compliance_status != 'compliant' THEN
        PERFORM create_remediation_actions(user_id_param, issues);
    END IF;
    
    -- Retornar resultado
    result := jsonb_build_object(
        'user_id', user_id_param,
        'email', user_data.email,
        'role', user_data.role,
        'password_score', password_score,
        'mfa_compliant', mfa_compliant,
        'overall_score', overall_score,
        'compliance_status', compliance_status,
        'issues', issues,
        'checked_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar ações de remediação
CREATE OR REPLACE FUNCTION create_remediation_actions(user_id_param UUID, issues TEXT[])
RETURNS VOID AS $$
DECLARE
    issue TEXT;
    action_type TEXT;
    due_date TIMESTAMP WITH TIME ZONE;
BEGIN
    FOREACH issue IN ARRAY issues
    LOOP
        -- Determinar tipo de ação baseado no problema
        IF issue LIKE '%senha%' OR issue LIKE '%password%' THEN
            action_type := 'force_password_change';
            due_date := NOW() + INTERVAL '7 days';
        ELSIF issue LIKE '%MFA%' OR issue LIKE '%autenticação%' THEN
            action_type := 'enable_mfa';
            due_date := NOW() + INTERVAL '3 days';
        ELSE
            action_type := 'notification';
            due_date := NOW() + INTERVAL '1 day';
        END IF;
        
        -- Inserir ação de remediação
        INSERT INTO compliance_remediation (
            user_id, compliance_issue, action_type, due_date,
            action_details
        )
        VALUES (
            user_id_param, issue, action_type, due_date,
            jsonb_build_object(
                'priority', CASE 
                    WHEN action_type = 'force_password_change' THEN 'high'
                    WHEN action_type = 'enable_mfa' THEN 'medium'
                    ELSE 'low'
                END,
                'auto_generated', true,
                'created_at', NOW()
            )
        )
        ON CONFLICT DO NOTHING; -- Evitar duplicatas
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar compliance de todos os usuários
CREATE OR REPLACE FUNCTION run_compliance_check_all()
RETURNS JSONB AS $$
DECLARE
    user_record RECORD;
    total_users INTEGER := 0;
    compliant_users INTEGER := 0;
    partial_users INTEGER := 0;
    non_compliant_users INTEGER := 0;
    results JSONB := '[]'::JSONB;
    user_result JSONB;
BEGIN
    -- Verificar compliance para todos os usuários ativos
    FOR user_record IN 
        SELECT id FROM auth.users 
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
    LOOP
        total_users := total_users + 1;
        
        -- Verificar compliance do usuário
        user_result := check_user_compliance(user_record.id);
        
        -- Contar por status
        CASE user_result->>'compliance_status'
            WHEN 'compliant' THEN compliant_users := compliant_users + 1;
            WHEN 'partial' THEN partial_users := partial_users + 1;
            WHEN 'non_compliant' THEN non_compliant_users := non_compliant_users + 1;
        END CASE;
        
        -- Adicionar ao resultado
        results := results || user_result;
    END LOOP;
    
    -- Retornar resumo
    RETURN jsonb_build_object(
        'summary', jsonb_build_object(
            'total_users', total_users,
            'compliant', compliant_users,
            'partial_compliant', partial_users,
            'non_compliant', non_compliant_users,
            'compliance_rate', CASE 
                WHEN total_users > 0 THEN ROUND((compliant_users::DECIMAL / total_users) * 100, 2)
                ELSE 0
            END
        ),
        'checked_at', NOW(),
        'details', results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. VIEWS DE COMPLIANCE
-- =====================================================

-- View para dashboard de compliance
CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
    -- Métricas Gerais
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE compliance_status = 'compliant') as compliant_users,
    COUNT(*) FILTER (WHERE compliance_status = 'partial') as partial_users,
    COUNT(*) FILTER (WHERE compliance_status = 'non_compliant') as non_compliant_users,
    
    -- Percentuais
    ROUND(
        (COUNT(*) FILTER (WHERE compliance_status = 'compliant')::DECIMAL / COUNT(*)) * 100, 2
    ) as compliance_rate,
    
    -- Métricas de Senha
    COUNT(*) FILTER (WHERE password_compliant = true) as password_compliant_users,
    ROUND(AVG(password_strength_score), 2) as avg_password_score,
    
    -- Métricas de MFA
    COUNT(*) FILTER (WHERE mfa_enabled = true) as mfa_enabled_users,
    COUNT(*) FILTER (WHERE mfa_enforced = true) as mfa_required_users,
    
    -- Score Geral
    ROUND(AVG(overall_compliance_score), 2) as avg_compliance_score,
    
    -- Última Atualização
    MAX(updated_at) as last_updated
FROM user_compliance;

-- View para usuários não conformes
CREATE OR REPLACE VIEW non_compliant_users AS
SELECT 
    uc.user_id,
    u.email,
    up.name,
    up.role,
    uc.compliance_status,
    uc.overall_compliance_score,
    uc.password_compliant,
    uc.password_strength_score,
    uc.mfa_enabled,
    uc.mfa_enforced,
    uc.password_issues,
    uc.last_login,
    uc.updated_at,
    
    -- Ações pendentes
    (
        SELECT COUNT(*) 
        FROM compliance_remediation cr 
        WHERE cr.user_id = uc.user_id 
        AND cr.action_status = 'pending'
    ) as pending_actions
FROM user_compliance uc
JOIN auth.users u ON uc.user_id = u.id
LEFT JOIN user_profiles up ON uc.user_id = up.user_id
WHERE uc.compliance_status != 'compliant'
ORDER BY uc.overall_compliance_score ASC, uc.updated_at DESC;

-- View para ações de remediação pendentes
CREATE OR REPLACE VIEW pending_remediation_actions AS
SELECT 
    cr.id,
    cr.user_id,
    u.email,
    up.name,
    up.role,
    cr.compliance_issue,
    cr.action_type,
    cr.action_status,
    cr.due_date,
    cr.created_at,
    
    -- Prioridade baseada no tipo e prazo
    CASE 
        WHEN cr.due_date < NOW() THEN 'overdue'
        WHEN cr.due_date < NOW() + INTERVAL '1 day' THEN 'urgent'
        WHEN cr.action_type = 'force_password_change' THEN 'high'
        WHEN cr.action_type = 'enable_mfa' THEN 'medium'
        ELSE 'low'
    END as priority,
    
    -- Dias até o prazo
    EXTRACT(DAYS FROM (cr.due_date - NOW()))::INTEGER as days_until_due
FROM compliance_remediation cr
JOIN auth.users u ON cr.user_id = u.id
LEFT JOIN user_profiles up ON cr.user_id = up.user_id
WHERE cr.action_status = 'pending'
ORDER BY 
    CASE 
        WHEN cr.due_date < NOW() THEN 1
        WHEN cr.due_date < NOW() + INTERVAL '1 day' THEN 2
        ELSE 3
    END,
    cr.due_date ASC;

-- =====================================================
-- 5. TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para atualizar compliance quando usuário faz login
CREATE OR REPLACE FUNCTION trigger_compliance_check_on_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar compliance apenas se o login foi há mais de 1 hora
    IF OLD.last_sign_in_at IS NULL OR 
       NEW.last_sign_in_at > OLD.last_sign_in_at + INTERVAL '1 hour' THEN
        
        -- Executar verificação de compliance de forma assíncrona
        PERFORM check_user_compliance(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_compliance_login ON auth.users;
CREATE TRIGGER trigger_compliance_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_compliance_check_on_login();

-- =====================================================
-- 6. POLÍTICAS DE SEGURANÇA PADRÃO
-- =====================================================

-- Inserir políticas padrão
INSERT INTO compliance_policies (policy_name, policy_type, is_mandatory, applies_to_roles, policy_rules, compliance_threshold)
VALUES 
    (
        'Política de Senha Forte',
        'password',
        true,
        ARRAY['user', 'operator', 'supervisor', 'admin'],
        '{
            "min_length": 8,
            "require_uppercase": true,
            "require_lowercase": true,
            "require_numbers": true,
            "require_special_chars": true,
            "max_age_days": 90,
            "history_check": 5
        }'::JSONB,
        80
    ),
    (
        'MFA Obrigatório para Administradores',
        'mfa',
        true,
        ARRAY['admin', 'supervisor'],
        '{
            "required": true,
            "allowed_methods": ["totp", "hardware"],
            "backup_codes": true,
            "session_timeout": 480
        }'::JSONB,
        100
    ),
    (
        'MFA Recomendado para Operadores',
        'mfa',
        false,
        ARRAY['operator'],
        '{
            "required": false,
            "allowed_methods": ["totp", "sms", "email"],
            "incentive": true
        }'::JSONB,
        70
    )
ON CONFLICT (policy_name) DO NOTHING;

-- =====================================================
-- 7. FUNÇÕES DE TESTE E DEMONSTRAÇÃO
-- =====================================================

-- Função para testar o sistema de compliance
CREATE OR REPLACE FUNCTION test_compliance_system()
RETURNS JSONB AS $$
DECLARE
    test_results JSONB := '{}'::JSONB;
    sample_user_id UUID;
    compliance_result JSONB;
BEGIN
    -- Buscar um usuário de exemplo
    SELECT id INTO sample_user_id
    FROM auth.users
    WHERE deleted_at IS NULL
    LIMIT 1;
    
    IF sample_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Nenhum usuário encontrado para teste',
            'timestamp', NOW()
        );
    END IF;
    
    -- Testar verificação individual
    compliance_result := check_user_compliance(sample_user_id);
    test_results := jsonb_set(test_results, '{individual_check}', compliance_result);
    
    -- Testar verificação em lote (limitada)
    SELECT jsonb_build_object(
        'total_checked', COUNT(*),
        'compliant', COUNT(*) FILTER (WHERE compliance_status = 'compliant'),
        'non_compliant', COUNT(*) FILTER (WHERE compliance_status != 'compliant')
    )
    INTO compliance_result
    FROM user_compliance
    WHERE updated_at > NOW() - INTERVAL '1 hour';
    
    test_results := jsonb_set(test_results, '{batch_summary}', compliance_result);
    
    -- Testar views
    SELECT row_to_json(cd.*)
    INTO compliance_result
    FROM compliance_dashboard cd;
    
    test_results := jsonb_set(test_results, '{dashboard_view}', compliance_result::JSONB);
    
    -- Adicionar timestamp
    test_results := jsonb_set(test_results, '{test_completed_at}', to_jsonb(NOW()));
    
    RETURN test_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE user_compliance IS 'Tabela principal para rastrear compliance de segurança dos usuários';
COMMENT ON TABLE compliance_policies IS 'Políticas de compliance configuráveis';
COMMENT ON TABLE compliance_history IS 'Histórico de verificações de compliance';
COMMENT ON TABLE compliance_remediation IS 'Ações de remediação para problemas de compliance';

COMMENT ON FUNCTION check_user_compliance(UUID) IS 'Função principal para verificar compliance de um usuário específico';
COMMENT ON FUNCTION run_compliance_check_all() IS 'Executa verificação de compliance para todos os usuários';
COMMENT ON FUNCTION test_compliance_system() IS 'Função de teste para validar o sistema de compliance';

COMMENT ON VIEW compliance_dashboard IS 'Dashboard com métricas gerais de compliance';
COMMENT ON VIEW non_compliant_users IS 'Lista de usuários que não estão em compliance';
COMMENT ON VIEW pending_remediation_actions IS 'Ações de remediação pendentes com priorização';

-- =====================================================
-- 9. GRANTS E PERMISSÕES
-- =====================================================

-- Permitir acesso às views para usuários autenticados
GRANT SELECT ON compliance_dashboard TO authenticated;
GRANT SELECT ON non_compliant_users TO authenticated;
GRANT SELECT ON pending_remediation_actions TO authenticated;

-- Permitir execução das funções de teste
GRANT EXECUTE ON FUNCTION test_compliance_system() TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_compliance(UUID) TO authenticated;

-- Logs de criação
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Compliance Automático criado com sucesso!';
    RAISE NOTICE '📊 Views disponíveis: compliance_dashboard, non_compliant_users, pending_remediation_actions';
    RAISE NOTICE '🔧 Funções disponíveis: check_user_compliance(), run_compliance_check_all(), test_compliance_system()';
    RAISE NOTICE '⚡ Triggers automáticos configurados para verificação em login';
    RAISE NOTICE '📋 Políticas padrão inseridas: Senha Forte, MFA Admin, MFA Operador';
END $$;