-- 🎓 SISTEMA DE TRACKING DE TREINAMENTO DE SEGURANÇA - HUB CONTROL
-- Sistema para monitorar progresso, certificações e compliance de treinamento
-- Criado para garantir que toda a equipe esteja adequadamente treinada

-- =====================================================
-- 1. TABELAS DE TREINAMENTO
-- =====================================================

-- Tabela para módulos de treinamento
CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'security_fundamentals', 'secure_development', 'monitoring', 'incident_response'
    
    -- Configurações do Módulo
    is_mandatory BOOLEAN DEFAULT FALSE,
    applies_to_roles TEXT[] DEFAULT ARRAY['user'], -- Roles que devem fazer o treinamento
    difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    estimated_duration_minutes INTEGER DEFAULT 30,
    
    -- Conteúdo
    content_type TEXT DEFAULT 'interactive', -- 'video', 'interactive', 'document', 'quiz'
    content_url TEXT,
    materials JSONB, -- Links, documentos, recursos adicionais
    
    -- Avaliação
    has_quiz BOOLEAN DEFAULT TRUE,
    passing_score INTEGER DEFAULT 80, -- Score mínimo para aprovação
    max_attempts INTEGER DEFAULT 3,
    
    -- Certificação
    certificate_valid_months INTEGER DEFAULT 12, -- Validade do certificado
    requires_renewal BOOLEAN DEFAULT TRUE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela para progresso de treinamento dos usuários
CREATE TABLE IF NOT EXISTS user_training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    
    -- Status do Treinamento
    status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'failed', 'expired'
    progress_percentage INTEGER DEFAULT 0,
    
    -- Tentativas
    attempts_count INTEGER DEFAULT 0,
    current_attempt INTEGER DEFAULT 0,
    
    -- Scores
    best_score INTEGER DEFAULT 0,
    latest_score INTEGER DEFAULT 0,
    passing_score_required INTEGER,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER DEFAULT 0,
    
    -- Certificação
    certificate_issued_at TIMESTAMP WITH TIME ZONE,
    certificate_expires_at TIMESTAMP WITH TIME ZONE,
    certificate_number TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, module_id),
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT valid_score CHECK (best_score >= 0 AND best_score <= 100),
    CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed', 'expired'))
);

-- Tabela para sessões de treinamento
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    progress_id UUID NOT NULL REFERENCES user_training_progress(id) ON DELETE CASCADE,
    
    -- Sessão
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Progresso na Sessão
    progress_before INTEGER DEFAULT 0,
    progress_after INTEGER DEFAULT 0,
    sections_completed TEXT[], -- Seções completadas nesta sessão
    
    -- Interações
    interactions_count INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    quiz_score INTEGER,
    
    -- Metadados
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para avaliações e quizzes
CREATE TABLE IF NOT EXISTS training_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    session_id UUID REFERENCES training_sessions(id),
    
    -- Avaliação
    assessment_type TEXT DEFAULT 'quiz', -- 'quiz', 'practical', 'simulation'
    attempt_number INTEGER DEFAULT 1,
    
    -- Resultados
    total_questions INTEGER,
    correct_answers INTEGER,
    score INTEGER, -- Percentual
    passed BOOLEAN DEFAULT FALSE,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_taken_minutes INTEGER,
    
    -- Detalhes
    questions_data JSONB, -- Perguntas e respostas
    feedback TEXT,
    areas_for_improvement TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para certificados emitidos
CREATE TABLE IF NOT EXISTS training_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    
    -- Certificado
    certificate_type TEXT DEFAULT 'completion', -- 'completion', 'proficiency', 'mastery'
    title TEXT NOT NULL,
    description TEXT,
    
    -- Validade
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_valid BOOLEAN DEFAULT TRUE,
    
    -- Score e Performance
    final_score INTEGER,
    completion_time_hours INTEGER,
    attempts_used INTEGER,
    
    -- Verificação
    verification_code TEXT,
    digital_signature TEXT,
    
    -- Metadados
    issued_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para requisitos de treinamento por role
CREATE TABLE IF NOT EXISTS role_training_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL,
    module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    
    -- Requisitos
    is_mandatory BOOLEAN DEFAULT TRUE,
    deadline_days INTEGER, -- Dias para completar após contratação/mudança de role
    renewal_frequency_months INTEGER DEFAULT 12,
    
    -- Compliance
    compliance_weight DECIMAL(3,2) DEFAULT 1.0, -- Peso no cálculo de compliance
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(role_name, module_id)
);

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_mandatory ON training_modules(is_mandatory);
CREATE INDEX IF NOT EXISTS idx_training_modules_active ON training_modules(is_active);

CREATE INDEX IF NOT EXISTS idx_user_training_progress_user ON user_training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_training_progress_module ON user_training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_training_progress_status ON user_training_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_training_progress_expires ON user_training_progress(certificate_expires_at);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_module ON training_sessions(module_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_start);

CREATE INDEX IF NOT EXISTS idx_training_assessments_user ON training_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_assessments_module ON training_assessments(module_id);
CREATE INDEX IF NOT EXISTS idx_training_assessments_passed ON training_assessments(passed);

CREATE INDEX IF NOT EXISTS idx_training_certificates_user ON training_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_training_certificates_expires ON training_certificates(expires_at);
CREATE INDEX IF NOT EXISTS idx_training_certificates_valid ON training_certificates(is_valid);

-- =====================================================
-- 3. FUNÇÕES DE TREINAMENTO
-- =====================================================

-- Função para iniciar um módulo de treinamento
CREATE OR REPLACE FUNCTION start_training_module(user_id_param UUID, module_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    module_data RECORD;
    progress_record RECORD;
    result JSONB;
BEGIN
    -- Verificar se o módulo existe e está ativo
    SELECT * INTO module_data
    FROM training_modules
    WHERE id = module_id_param AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Módulo não encontrado ou inativo',
            'module_id', module_id_param
        );
    END IF;
    
    -- Verificar se já existe progresso
    SELECT * INTO progress_record
    FROM user_training_progress
    WHERE user_id = user_id_param AND module_id = module_id_param;
    
    IF FOUND THEN
        -- Atualizar progresso existente
        UPDATE user_training_progress
        SET 
            status = CASE 
                WHEN status = 'completed' AND certificate_expires_at > NOW() THEN 'completed'
                ELSE 'in_progress'
            END,
            last_accessed_at = NOW(),
            updated_at = NOW()
        WHERE user_id = user_id_param AND module_id = module_id_param;
    ELSE
        -- Criar novo progresso
        INSERT INTO user_training_progress (
            user_id, module_id, status, passing_score_required, started_at, last_accessed_at
        )
        VALUES (
            user_id_param, module_id_param, 'in_progress', module_data.passing_score, NOW(), NOW()
        );
    END IF;
    
    -- Criar sessão de treinamento
    INSERT INTO training_sessions (
        user_id, module_id, progress_id, session_start
    )
    SELECT 
        user_id_param, 
        module_id_param, 
        utp.id,
        NOW()
    FROM user_training_progress utp
    WHERE utp.user_id = user_id_param AND utp.module_id = module_id_param;
    
    result := jsonb_build_object(
        'success', true,
        'module_id', module_id_param,
        'module_title', module_data.title,
        'estimated_duration', module_data.estimated_duration_minutes,
        'has_quiz', module_data.has_quiz,
        'passing_score', module_data.passing_score,
        'started_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar progresso do treinamento
CREATE OR REPLACE FUNCTION update_training_progress(
    user_id_param UUID, 
    module_id_param UUID, 
    progress_percent INTEGER,
    time_spent INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    progress_record RECORD;
    result JSONB;
BEGIN
    -- Validar parâmetros
    IF progress_percent < 0 OR progress_percent > 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Progresso deve estar entre 0 e 100'
        );
    END IF;
    
    -- Atualizar progresso
    UPDATE user_training_progress
    SET 
        progress_percentage = progress_percent,
        time_spent_minutes = time_spent_minutes + time_spent,
        last_accessed_at = NOW(),
        updated_at = NOW(),
        status = CASE 
            WHEN progress_percent = 100 THEN 'completed'
            WHEN progress_percent > 0 THEN 'in_progress'
            ELSE status
        END,
        completed_at = CASE 
            WHEN progress_percent = 100 AND completed_at IS NULL THEN NOW()
            ELSE completed_at
        END
    WHERE user_id = user_id_param AND module_id = module_id_param
    RETURNING * INTO progress_record;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Progresso não encontrado. Inicie o módulo primeiro.'
        );
    END IF;
    
    -- Se completou, verificar se precisa de certificado
    IF progress_percent = 100 THEN
        PERFORM issue_training_certificate(user_id_param, module_id_param);
    END IF;
    
    result := jsonb_build_object(
        'success', true,
        'progress_percentage', progress_record.progress_percentage,
        'status', progress_record.status,
        'time_spent_minutes', progress_record.time_spent_minutes,
        'completed', progress_record.status = 'completed'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar avaliação
CREATE OR REPLACE FUNCTION submit_training_assessment(
    user_id_param UUID,
    module_id_param UUID,
    total_questions INTEGER,
    correct_answers INTEGER,
    time_taken INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    module_data RECORD;
    progress_record RECORD;
    score INTEGER;
    passed BOOLEAN;
    attempt_number INTEGER;
    result JSONB;
BEGIN
    -- Buscar dados do módulo
    SELECT * INTO module_data
    FROM training_modules
    WHERE id = module_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Módulo não encontrado'
        );
    END IF;
    
    -- Calcular score
    score := ROUND((correct_answers::DECIMAL / total_questions) * 100);
    passed := score >= module_data.passing_score;
    
    -- Buscar progresso atual
    SELECT * INTO progress_record
    FROM user_training_progress
    WHERE user_id = user_id_param AND module_id = module_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Progresso não encontrado. Inicie o módulo primeiro.'
        );
    END IF;
    
    -- Determinar número da tentativa
    attempt_number := progress_record.attempts_count + 1;
    
    -- Verificar se excedeu tentativas máximas
    IF attempt_number > module_data.max_attempts THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Número máximo de tentativas excedido'
        );
    END IF;
    
    -- Registrar avaliação
    INSERT INTO training_assessments (
        user_id, module_id, attempt_number, total_questions, correct_answers,
        score, passed, completed_at, time_taken_minutes
    )
    VALUES (
        user_id_param, module_id_param, attempt_number, total_questions, correct_answers,
        score, passed, NOW(), time_taken
    );
    
    -- Atualizar progresso
    UPDATE user_training_progress
    SET 
        attempts_count = attempt_number,
        current_attempt = attempt_number,
        latest_score = score,
        best_score = GREATEST(best_score, score),
        status = CASE 
            WHEN passed THEN 'completed'
            WHEN attempt_number >= module_data.max_attempts THEN 'failed'
            ELSE 'in_progress'
        END,
        completed_at = CASE 
            WHEN passed AND completed_at IS NULL THEN NOW()
            ELSE completed_at
        END,
        updated_at = NOW()
    WHERE user_id = user_id_param AND module_id = module_id_param;
    
    -- Se passou, emitir certificado
    IF passed THEN
        PERFORM issue_training_certificate(user_id_param, module_id_param);
    END IF;
    
    result := jsonb_build_object(
        'success', true,
        'score', score,
        'passed', passed,
        'passing_score', module_data.passing_score,
        'attempt_number', attempt_number,
        'max_attempts', module_data.max_attempts,
        'can_retry', attempt_number < module_data.max_attempts AND NOT passed
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para emitir certificado
CREATE OR REPLACE FUNCTION issue_training_certificate(user_id_param UUID, module_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    module_data RECORD;
    progress_record RECORD;
    certificate_number TEXT;
    expires_at TIMESTAMP WITH TIME ZONE;
    result JSONB;
BEGIN
    -- Buscar dados do módulo e progresso
    SELECT tm.*, utp.best_score, utp.time_spent_minutes, utp.attempts_count
    INTO module_data
    FROM training_modules tm
    JOIN user_training_progress utp ON tm.id = utp.module_id
    WHERE tm.id = module_id_param AND utp.user_id = user_id_param AND utp.status = 'completed';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Módulo não completado ou não encontrado'
        );
    END IF;
    
    -- Gerar número do certificado
    certificate_number := 'CERT-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)) || '-' || 
                         TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(module_data.id::TEXT, 4, '0');
    
    -- Calcular data de expiração
    IF module_data.requires_renewal THEN
        expires_at := NOW() + (module_data.certificate_valid_months || ' months')::INTERVAL;
    ELSE
        expires_at := NULL;
    END IF;
    
    -- Verificar se já existe certificado válido
    IF EXISTS (
        SELECT 1 FROM training_certificates 
        WHERE user_id = user_id_param AND module_id = module_id_param 
        AND is_valid = TRUE AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Certificado válido já existe'
        );
    END IF;
    
    -- Invalidar certificados anteriores
    UPDATE training_certificates
    SET is_valid = FALSE
    WHERE user_id = user_id_param AND module_id = module_id_param;
    
    -- Emitir novo certificado
    INSERT INTO training_certificates (
        certificate_number, user_id, module_id, title, expires_at,
        final_score, completion_time_hours, attempts_used,
        verification_code
    )
    VALUES (
        certificate_number, user_id_param, module_id_param, 
        'Certificado de Conclusão - ' || module_data.title,
        expires_at, module_data.best_score, 
        CEIL(module_data.time_spent_minutes / 60.0),
        module_data.attempts_count,
        UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 12))
    );
    
    -- Atualizar progresso com dados do certificado
    UPDATE user_training_progress
    SET 
        certificate_issued_at = NOW(),
        certificate_expires_at = expires_at,
        certificate_number = certificate_number
    WHERE user_id = user_id_param AND module_id = module_id_param;
    
    result := jsonb_build_object(
        'success', true,
        'certificate_number', certificate_number,
        'issued_at', NOW(),
        'expires_at', expires_at,
        'final_score', module_data.best_score
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar compliance de treinamento do usuário
CREATE OR REPLACE FUNCTION check_user_training_compliance(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    user_role TEXT;
    required_modules RECORD;
    compliance_score DECIMAL := 0;
    total_weight DECIMAL := 0;
    completed_mandatory INTEGER := 0;
    total_mandatory INTEGER := 0;
    expired_certificates INTEGER := 0;
    result JSONB;
BEGIN
    -- Buscar role do usuário
    SELECT role INTO user_role
    FROM user_profiles
    WHERE user_id = user_id_param
    LIMIT 1;
    
    IF user_role IS NULL THEN
        user_role := 'user'; -- Default role
    END IF;
    
    -- Calcular compliance baseado nos requisitos do role
    FOR required_modules IN
        SELECT 
            rtr.module_id,
            rtr.is_mandatory,
            rtr.compliance_weight,
            tm.title,
            utp.status,
            utp.certificate_expires_at
        FROM role_training_requirements rtr
        JOIN training_modules tm ON rtr.module_id = tm.id
        LEFT JOIN user_training_progress utp ON rtr.module_id = utp.module_id AND utp.user_id = user_id_param
        WHERE rtr.role_name = user_role AND tm.is_active = TRUE
    LOOP
        total_weight := total_weight + required_modules.compliance_weight;
        
        IF required_modules.is_mandatory THEN
            total_mandatory := total_mandatory + 1;
            
            IF required_modules.status = 'completed' THEN
                -- Verificar se não expirou
                IF required_modules.certificate_expires_at IS NULL OR 
                   required_modules.certificate_expires_at > NOW() THEN
                    completed_mandatory := completed_mandatory + 1;
                    compliance_score := compliance_score + required_modules.compliance_weight;
                ELSE
                    expired_certificates := expired_certificates + 1;
                END IF;
            END IF;
        ELSE
            -- Módulos opcionais também contam para o score
            IF required_modules.status = 'completed' AND 
               (required_modules.certificate_expires_at IS NULL OR 
                required_modules.certificate_expires_at > NOW()) THEN
                compliance_score := compliance_score + (required_modules.compliance_weight * 0.5);
            END IF;
        END IF;
    END LOOP;
    
    -- Calcular percentual de compliance
    IF total_weight > 0 THEN
        compliance_score := (compliance_score / total_weight) * 100;
    END IF;
    
    result := jsonb_build_object(
        'user_id', user_id_param,
        'role', user_role,
        'compliance_score', ROUND(compliance_score, 2),
        'mandatory_completed', completed_mandatory,
        'mandatory_total', total_mandatory,
        'mandatory_compliance_rate', CASE 
            WHEN total_mandatory > 0 THEN ROUND((completed_mandatory::DECIMAL / total_mandatory) * 100, 2)
            ELSE 100
        END,
        'expired_certificates', expired_certificates,
        'compliance_status', CASE 
            WHEN compliance_score >= 90 THEN 'excellent'
            WHEN compliance_score >= 80 THEN 'good'
            WHEN compliance_score >= 70 THEN 'adequate'
            WHEN compliance_score >= 60 THEN 'needs_improvement'
            ELSE 'non_compliant'
        END,
        'checked_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. VIEWS DE TREINAMENTO
-- =====================================================

-- View para dashboard de treinamento
CREATE OR REPLACE VIEW training_dashboard AS
SELECT 
    -- Métricas Gerais
    COUNT(DISTINCT utp.user_id) as total_users_enrolled,
    COUNT(DISTINCT tm.id) as total_modules,
    COUNT(DISTINCT tm.id) FILTER (WHERE tm.is_mandatory = TRUE) as mandatory_modules,
    
    -- Progresso
    COUNT(*) FILTER (WHERE utp.status = 'completed') as completed_trainings,
    COUNT(*) FILTER (WHERE utp.status = 'in_progress') as in_progress_trainings,
    COUNT(*) FILTER (WHERE utp.status = 'not_started') as not_started_trainings,
    
    -- Compliance
    ROUND(
        (COUNT(*) FILTER (WHERE utp.status = 'completed')::DECIMAL / 
         NULLIF(COUNT(*), 0)) * 100, 2
    ) as completion_rate,
    
    -- Certificados
    COUNT(DISTINCT tc.id) as total_certificates_issued,
    COUNT(DISTINCT tc.id) FILTER (WHERE tc.expires_at > NOW() OR tc.expires_at IS NULL) as valid_certificates,
    COUNT(DISTINCT tc.id) FILTER (WHERE tc.expires_at <= NOW()) as expired_certificates,
    
    -- Scores
    ROUND(AVG(utp.best_score), 2) as avg_score,
    ROUND(AVG(utp.time_spent_minutes), 2) as avg_time_spent_minutes,
    
    -- Última Atualização
    MAX(utp.updated_at) as last_updated
FROM training_modules tm
LEFT JOIN user_training_progress utp ON tm.id = utp.module_id
LEFT JOIN training_certificates tc ON utp.user_id = tc.user_id AND utp.module_id = tc.module_id
WHERE tm.is_active = TRUE;

-- View para usuários com treinamento pendente
CREATE OR REPLACE VIEW users_pending_training AS
SELECT 
    u.id as user_id,
    u.email,
    up.name,
    up.role,
    
    -- Módulos Obrigatórios Pendentes
    COUNT(rtr.module_id) as mandatory_modules_total,
    COUNT(rtr.module_id) FILTER (
        WHERE utp.status IS NULL OR utp.status NOT IN ('completed')
    ) as mandatory_modules_pending,
    
    -- Certificados Expirados
    COUNT(tc.id) FILTER (WHERE tc.expires_at <= NOW()) as expired_certificates,
    
    -- Próximas Expirações (30 dias)
    COUNT(tc.id) FILTER (
        WHERE tc.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    ) as certificates_expiring_soon,
    
    -- Compliance Score
    COALESCE(
        ROUND(
            (COUNT(rtr.module_id) FILTER (WHERE utp.status = 'completed')::DECIMAL / 
             NULLIF(COUNT(rtr.module_id), 0)) * 100, 2
        ), 0
    ) as compliance_percentage
    
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN role_training_requirements rtr ON up.role = rtr.role_name
LEFT JOIN user_training_progress utp ON u.id = utp.user_id AND rtr.module_id = utp.module_id
LEFT JOIN training_certificates tc ON u.id = tc.user_id AND rtr.module_id = tc.module_id AND tc.is_valid = TRUE
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, up.name, up.role
HAVING 
    COUNT(rtr.module_id) FILTER (
        WHERE utp.status IS NULL OR utp.status NOT IN ('completed')
    ) > 0
    OR COUNT(tc.id) FILTER (WHERE tc.expires_at <= NOW()) > 0
ORDER BY compliance_percentage ASC, mandatory_modules_pending DESC;

-- View para certificados próximos ao vencimento
CREATE OR REPLACE VIEW certificates_expiring_soon AS
SELECT 
    tc.id,
    tc.certificate_number,
    u.email,
    up.name,
    up.role,
    tm.title as module_title,
    tc.expires_at,
    EXTRACT(DAYS FROM (tc.expires_at - NOW()))::INTEGER as days_until_expiry,
    
    CASE 
        WHEN tc.expires_at <= NOW() THEN 'expired'
        WHEN tc.expires_at <= NOW() + INTERVAL '7 days' THEN 'critical'
        WHEN tc.expires_at <= NOW() + INTERVAL '30 days' THEN 'warning'
        ELSE 'normal'
    END as urgency_level
    
FROM training_certificates tc
JOIN auth.users u ON tc.user_id = u.id
JOIN user_profiles up ON u.id = up.user_id
JOIN training_modules tm ON tc.module_id = tm.id
WHERE 
    tc.is_valid = TRUE
    AND tc.expires_at IS NOT NULL
    AND tc.expires_at <= NOW() + INTERVAL '60 days'
ORDER BY tc.expires_at ASC;

-- =====================================================
-- 5. DADOS INICIAIS - MÓDULOS DE TREINAMENTO
-- =====================================================

-- Inserir módulos de treinamento baseados no SECURITY_TRAINING_PROGRAM.md
INSERT INTO training_modules (
    module_code, title, description, category, is_mandatory, applies_to_roles,
    difficulty_level, estimated_duration_minutes, has_quiz, passing_score
)
VALUES 
    (
        'SEC_FUND_001',
        'Fundamentos de Segurança da Informação',
        'Conceitos básicos de segurança, tipos de ameaças, princípios de confidencialidade, integridade e disponibilidade.',
        'security_fundamentals',
        true,
        ARRAY['user', 'operator', 'supervisor', 'admin'],
        'beginner',
        45,
        true,
        80
    ),
    (
        'SEC_DEV_001',
        'Desenvolvimento Seguro - Fundamentos',
        'Práticas de desenvolvimento seguro, validação de entrada, sanitização de dados.',
        'secure_development',
        true,
        ARRAY['operator', 'supervisor', 'admin'],
        'intermediate',
        60,
        true,
        85
    ),
    (
        'SEC_DEV_002',
        'Row Level Security (RLS) no Supabase',
        'Implementação e configuração de RLS, políticas de segurança, verificação com security_verification.sql.',
        'secure_development',
        true,
        ARRAY['supervisor', 'admin'],
        'advanced',
        90,
        true,
        90
    ),
    (
        'SEC_MON_001',
        'Monitoramento e Alertas de Segurança',
        'Dashboard de segurança, sistema de alertas, views de monitoramento (suspicious_activities, security_alerts).',
        'monitoring',
        true,
        ARRAY['operator', 'supervisor', 'admin'],
        'intermediate',
        75,
        true,
        85
    ),
    (
        'SEC_INC_001',
        'Resposta a Incidentes de Segurança',
        'Procedimentos de resposta a incidentes, escalação, documentação, recuperação.',
        'incident_response',
        true,
        ARRAY['supervisor', 'admin'],
        'advanced',
        120,
        true,
        90
    ),
    (
        'SEC_ADV_001',
        'Segurança Avançada - OWASP Top 10',
        'Vulnerabilidades mais comuns, técnicas de prevenção, testes de segurança.',
        'security_fundamentals',
        false,
        ARRAY['supervisor', 'admin'],
        'advanced',
        180,
        true,
        95
    )
ON CONFLICT (module_code) DO NOTHING;

-- Inserir requisitos por role
INSERT INTO role_training_requirements (role_name, module_id, is_mandatory, deadline_days, compliance_weight)
SELECT 
    role_name,
    tm.id,
    true,
    CASE 
        WHEN role_name = 'admin' THEN 7
        WHEN role_name = 'supervisor' THEN 14
        WHEN role_name = 'operator' THEN 21
        ELSE 30
    END,
    CASE 
        WHEN tm.category = 'security_fundamentals' THEN 1.0
        WHEN tm.category = 'secure_development' THEN 1.2
        WHEN tm.category = 'monitoring' THEN 1.1
        WHEN tm.category = 'incident_response' THEN 1.3
        ELSE 1.0
    END
FROM training_modules tm
CROSS JOIN (
    VALUES ('user'), ('operator'), ('supervisor'), ('admin')
) AS roles(role_name)
WHERE 
    tm.is_mandatory = true
    AND role_name = ANY(tm.applies_to_roles)
ON CONFLICT (role_name, module_id) DO NOTHING;

-- =====================================================
-- 6. FUNÇÃO DE TESTE
-- =====================================================

-- Função para testar o sistema de treinamento
CREATE OR REPLACE FUNCTION test_training_system()
RETURNS JSONB AS $$
DECLARE
    test_user_id UUID;
    test_module_id UUID;
    start_result JSONB;
    progress_result JSONB;
    assessment_result JSONB;
    compliance_result JSONB;
    final_result JSONB;
BEGIN
    -- Buscar usuário e módulo de teste
    SELECT id INTO test_user_id FROM auth.users WHERE deleted_at IS NULL LIMIT 1;
    SELECT id INTO test_module_id FROM training_modules WHERE is_active = TRUE LIMIT 1;
    
    IF test_user_id IS NULL OR test_module_id IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Usuário ou módulo de teste não encontrado',
            'timestamp', NOW()
        );
    END IF;
    
    -- Testar início do módulo
    start_result := start_training_module(test_user_id, test_module_id);
    
    -- Testar atualização de progresso
    progress_result := update_training_progress(test_user_id, test_module_id, 100, 45);
    
    -- Testar avaliação
    assessment_result := submit_training_assessment(test_user_id, test_module_id, 10, 9, 15);
    
    -- Testar compliance
    compliance_result := check_user_training_compliance(test_user_id);
    
    -- Compilar resultado final
    final_result := jsonb_build_object(
        'test_completed_at', NOW(),
        'test_user_id', test_user_id,
        'test_module_id', test_module_id,
        'start_module', start_result,
        'update_progress', progress_result,
        'submit_assessment', assessment_result,
        'check_compliance', compliance_result,
        'dashboard_summary', (
            SELECT row_to_json(td.*) FROM training_dashboard td
        )
    );
    
    RETURN final_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. COMENTÁRIOS E GRANTS
-- =====================================================

COMMENT ON TABLE training_modules IS 'Módulos de treinamento de segurança disponíveis';
COMMENT ON TABLE user_training_progress IS 'Progresso individual dos usuários nos módulos';
COMMENT ON TABLE training_sessions IS 'Sessões de treinamento dos usuários';
COMMENT ON TABLE training_assessments IS 'Avaliações e quizzes realizados';
COMMENT ON TABLE training_certificates IS 'Certificados emitidos';
COMMENT ON TABLE role_training_requirements IS 'Requisitos de treinamento por role';

-- Grants para usuários autenticados
GRANT SELECT ON training_dashboard TO authenticated;
GRANT SELECT ON users_pending_training TO authenticated;
GRANT SELECT ON certificates_expiring_soon TO authenticated;

GRANT EXECUTE ON FUNCTION start_training_module(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_training_progress(UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_training_assessment(UUID, UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_training_compliance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION test_training_system() TO authenticated;

-- Log de criação
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Tracking de Treinamento criado com sucesso!';
    RAISE NOTICE '🎓 Módulos inseridos: Fundamentos, Desenvolvimento Seguro, RLS, Monitoramento, Resposta a Incidentes';
    RAISE NOTICE '📊 Views disponíveis: training_dashboard, users_pending_training, certificates_expiring_soon';
    RAISE NOTICE '🔧 Funções disponíveis: start_training_module(), update_training_progress(), submit_training_assessment()';
    RAISE NOTICE '📋 Requisitos por role configurados automaticamente';
    RAISE NOTICE '🧪 Execute test_training_system() para testar o sistema';
END $$;