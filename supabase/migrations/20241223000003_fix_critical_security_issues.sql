-- Migration: Fix Critical Security Issues
-- Data: 2024-12-23
-- Descrição: Corrige vulnerabilidades críticas de segurança identificadas na auditoria

-- ============================================================================
-- 1. CRIAR TABELA PARA CONFIGURAÇÕES SEGURAS
-- ============================================================================

-- Tabela para armazenar configurações sensíveis de forma segura
CREATE TABLE IF NOT EXISTS secure_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value_encrypted TEXT, -- Valor criptografado
    config_description TEXT,
    is_sensitive BOOLEAN DEFAULT TRUE,
    environment TEXT DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_secure_configs_key ON secure_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_secure_configs_environment ON secure_configs(environment);
CREATE INDEX IF NOT EXISTS idx_secure_configs_sensitive ON secure_configs(is_sensitive);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_secure_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_secure_configs_updated_at ON secure_configs;
CREATE TRIGGER trigger_secure_configs_updated_at
    BEFORE UPDATE ON secure_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_secure_configs_updated_at();

-- ============================================================================
-- 2. FUNÇÕES PARA GERENCIAMENTO SEGURO DE CONFIGURAÇÕES
-- ============================================================================

-- Função para criptografar valores sensíveis (usando pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION encrypt_config_value(
    p_value TEXT,
    p_key TEXT DEFAULT 'default_encryption_key_change_in_production'
)
RETURNS TEXT AS $$
BEGIN
    -- Em produção, a chave deve vir de uma variável de ambiente
    -- Esta é apenas uma implementação de exemplo
    RETURN encode(encrypt(p_value::bytea, p_key, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para descriptografar valores sensíveis
CREATE OR REPLACE FUNCTION decrypt_config_value(
    p_encrypted_value TEXT,
    p_key TEXT DEFAULT 'default_encryption_key_change_in_production'
)
RETURNS TEXT AS $$
BEGIN
    -- Registrar acesso para auditoria
    UPDATE secure_configs 
    SET 
        last_accessed = NOW(),
        access_count = access_count + 1
    WHERE config_value_encrypted = p_encrypted_value;
    
    -- Descriptografar valor
    RETURN convert_from(decrypt(decode(p_encrypted_value, 'base64'), p_key, 'aes'), 'UTF8');
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro de descriptografia
        INSERT INTO audit_logs (
            table_name,
            action,
            severity,
            description,
            metadata
        ) VALUES (
            'secure_configs',
            'DECRYPT_ERROR',
            'HIGH',
            'Erro ao descriptografar configuração',
            jsonb_build_object(
                'error_message', SQLERRM,
                'error_state', SQLSTATE
            )
        );
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para inserir configuração segura
CREATE OR REPLACE FUNCTION insert_secure_config(
    p_key TEXT,
    p_value TEXT,
    p_description TEXT DEFAULT NULL,
    p_is_sensitive BOOLEAN DEFAULT TRUE,
    p_environment TEXT DEFAULT 'production'
)
RETURNS UUID AS $$
DECLARE
    config_id UUID;
    encrypted_value TEXT;
BEGIN
    -- Verificar permissões
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE (user_id = auth.uid() OR id = auth.uid()) 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Apenas administradores podem inserir configurações seguras';
    END IF;
    
    -- Criptografar valor se sensível
    IF p_is_sensitive THEN
        encrypted_value = encrypt_config_value(p_value);
    ELSE
        encrypted_value = p_value;
    END IF;
    
    -- Inserir configuração
    INSERT INTO secure_configs (
        config_key,
        config_value_encrypted,
        config_description,
        is_sensitive,
        environment,
        created_by
    ) VALUES (
        p_key,
        encrypted_value,
        p_description,
        p_is_sensitive,
        p_environment,
        auth.uid()
    ) RETURNING id INTO config_id;
    
    -- Log da ação
    PERFORM log_sensitive_action(
        'CONFIG_CREATE',
        'secure_configs',
        config_id::TEXT,
        'Configuração segura criada: ' || p_key,
        jsonb_build_object(
            'config_key', p_key,
            'is_sensitive', p_is_sensitive,
            'environment', p_environment
        ),
        'HIGH'
    );
    
    RETURN config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter configuração segura
CREATE OR REPLACE FUNCTION get_secure_config(
    p_key TEXT,
    p_environment TEXT DEFAULT 'production'
)
RETURNS TEXT AS $$
DECLARE
    config_record RECORD;
    decrypted_value TEXT;
BEGIN
    -- Buscar configuração
    SELECT * INTO config_record
    FROM secure_configs
    WHERE config_key = p_key
    AND environment = p_environment;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Descriptografar se necessário
    IF config_record.is_sensitive THEN
        decrypted_value = decrypt_config_value(config_record.config_value_encrypted);
    ELSE
        decrypted_value = config_record.config_value_encrypted;
    END IF;
    
    -- Log do acesso para configurações sensíveis
    IF config_record.is_sensitive THEN
        PERFORM log_sensitive_action(
            'CONFIG_ACCESS',
            'secure_configs',
            config_record.id::TEXT,
            'Acesso a configuração sensível: ' || p_key,
            jsonb_build_object(
                'config_key', p_key,
                'environment', p_environment
            ),
            'MEDIUM'
        );
    END IF;
    
    RETURN decrypted_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. POLÍTICAS RLS PARA CONFIGURAÇÕES SEGURAS
-- ============================================================================

ALTER TABLE secure_configs ENABLE ROW LEVEL SECURITY;

-- Apenas administradores podem ver configurações
CREATE POLICY "secure_configs_select_admin" ON secure_configs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE (user_id = auth.uid() OR id = auth.uid()) 
            AND role = 'admin'
        )
    );

-- Apenas administradores podem inserir configurações
CREATE POLICY "secure_configs_insert_admin" ON secure_configs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE (user_id = auth.uid() OR id = auth.uid()) 
            AND role = 'admin'
        )
    );

-- Apenas administradores podem atualizar configurações
CREATE POLICY "secure_configs_update_admin" ON secure_configs
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE (user_id = auth.uid() OR id = auth.uid()) 
            AND role = 'admin'
        )
    );

-- Configurações não podem ser deletadas (apenas desabilitadas)
CREATE POLICY "secure_configs_no_delete" ON secure_configs
    FOR DELETE USING (FALSE);

-- ============================================================================
-- 4. TABELA PARA CONTROLE DE RATE LIMITING
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- IP, user_id, etc.
    action TEXT NOT NULL, -- login, api_call, etc.
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_duration INTERVAL DEFAULT '1 hour',
    max_attempts INTEGER DEFAULT 5,
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON rate_limits(blocked_until);

-- ============================================================================
-- 5. FUNÇÃO PARA VERIFICAR RATE LIMITING
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_action TEXT,
    p_max_attempts INTEGER DEFAULT 5,
    p_window_duration INTERVAL DEFAULT '1 hour',
    p_block_duration INTERVAL DEFAULT '1 hour'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMPTZ;
    blocked_until TIMESTAMPTZ;
BEGIN
    -- Verificar se está bloqueado
    SELECT rate_limits.blocked_until INTO blocked_until
    FROM rate_limits
    WHERE identifier = p_identifier
    AND action = p_action
    AND blocked_until > NOW();
    
    IF blocked_until IS NOT NULL THEN
        -- Log da tentativa bloqueada
        PERFORM log_sensitive_action(
            'RATE_LIMIT_BLOCKED',
            'rate_limits',
            p_identifier,
            'Tentativa bloqueada por rate limiting',
            jsonb_build_object(
                'action', p_action,
                'blocked_until', blocked_until
            ),
            'HIGH'
        );
        RETURN FALSE;
    END IF;
    
    -- Limpar registros antigos
    DELETE FROM rate_limits
    WHERE identifier = p_identifier
    AND action = p_action
    AND window_start < NOW() - p_window_duration;
    
    -- Verificar contagem atual
    SELECT count, rate_limits.window_start INTO current_count, window_start
    FROM rate_limits
    WHERE identifier = p_identifier
    AND action = p_action
    AND window_start > NOW() - p_window_duration;
    
    IF current_count IS NULL THEN
        -- Primeiro acesso na janela
        INSERT INTO rate_limits (
            identifier,
            action,
            count,
            window_start,
            window_duration,
            max_attempts
        ) VALUES (
            p_identifier,
            p_action,
            1,
            NOW(),
            p_window_duration,
            p_max_attempts
        );
        RETURN TRUE;
    ELSIF current_count < p_max_attempts THEN
        -- Incrementar contagem
        UPDATE rate_limits
        SET 
            count = count + 1,
            updated_at = NOW()
        WHERE identifier = p_identifier
        AND action = p_action
        AND window_start = window_start;
        RETURN TRUE;
    ELSE
        -- Limite excedido, bloquear
        UPDATE rate_limits
        SET 
            blocked_until = NOW() + p_block_duration,
            updated_at = NOW()
        WHERE identifier = p_identifier
        AND action = p_action
        AND window_start = window_start;
        
        -- Log do bloqueio
        PERFORM log_sensitive_action(
            'RATE_LIMIT_EXCEEDED',
            'rate_limits',
            p_identifier,
            'Rate limit excedido, bloqueando acesso',
            jsonb_build_object(
                'action', p_action,
                'attempts', current_count,
                'max_attempts', p_max_attempts,
                'block_duration', p_block_duration
            ),
            'CRITICAL'
        );
        
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. FUNÇÃO PARA VALIDAÇÃO DE SENHAS FORTES
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_strong_password(
    p_password TEXT
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    is_valid BOOLEAN := TRUE;
    errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Verificar comprimento mínimo
    IF length(p_password) < 12 THEN
        is_valid := FALSE;
        errors := array_append(errors, 'Senha deve ter pelo menos 12 caracteres');
    END IF;
    
    -- Verificar se contém letra maiúscula
    IF p_password !~ '[A-Z]' THEN
        is_valid := FALSE;
        errors := array_append(errors, 'Senha deve conter pelo menos uma letra maiúscula');
    END IF;
    
    -- Verificar se contém letra minúscula
    IF p_password !~ '[a-z]' THEN
        is_valid := FALSE;
        errors := array_append(errors, 'Senha deve conter pelo menos uma letra minúscula');
    END IF;
    
    -- Verificar se contém número
    IF p_password !~ '[0-9]' THEN
        is_valid := FALSE;
        errors := array_append(errors, 'Senha deve conter pelo menos um número');
    END IF;
    
    -- Verificar se contém caractere especial
    IF p_password !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?]' THEN
        is_valid := FALSE;
        errors := array_append(errors, 'Senha deve conter pelo menos um caractere especial');
    END IF;
    
    -- Verificar padrões comuns fracos
    IF p_password ~* '(password|123456|qwerty|admin|user|test)' THEN
        is_valid := FALSE;
        errors := array_append(errors, 'Senha contém padrões comuns inseguros');
    END IF;
    
    -- Verificar sequências
    IF p_password ~ '(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)' THEN
        is_valid := FALSE;
        errors := array_append(errors, 'Senha não deve conter sequências simples');
    END IF;
    
    result := jsonb_build_object(
        'is_valid', is_valid,
        'errors', errors,
        'strength_score', CASE 
            WHEN is_valid THEN 
                LEAST(100, 
                    (length(p_password) * 2) + 
                    (CASE WHEN p_password ~ '[A-Z]' THEN 10 ELSE 0 END) +
                    (CASE WHEN p_password ~ '[a-z]' THEN 10 ELSE 0 END) +
                    (CASE WHEN p_password ~ '[0-9]' THEN 10 ELSE 0 END) +
                    (CASE WHEN p_password ~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?]' THEN 15 ELSE 0 END)
                )
            ELSE 0 
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. FUNÇÃO PARA SANITIZAÇÃO DE DADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION sanitize_input(
    p_input TEXT,
    p_type TEXT DEFAULT 'general' -- general, email, phone, numeric, alphanumeric
)
RETURNS TEXT AS $$
BEGIN
    IF p_input IS NULL THEN
        RETURN NULL;
    END IF;
    
    CASE p_type
        WHEN 'email' THEN
            -- Remover caracteres perigosos para email
            RETURN lower(trim(regexp_replace(p_input, '[^a-zA-Z0-9@._-]', '', 'g')));
        
        WHEN 'phone' THEN
            -- Manter apenas números, +, -, (, ), espaços
            RETURN trim(regexp_replace(p_input, '[^0-9+\-() ]', '', 'g'));
        
        WHEN 'numeric' THEN
            -- Manter apenas números e ponto decimal
            RETURN trim(regexp_replace(p_input, '[^0-9.]', '', 'g'));
        
        WHEN 'alphanumeric' THEN
            -- Manter apenas letras e números
            RETURN trim(regexp_replace(p_input, '[^a-zA-Z0-9]', '', 'g'));
        
        ELSE
            -- Sanitização geral - remover caracteres perigosos
            RETURN trim(regexp_replace(
                regexp_replace(
                    regexp_replace(p_input, '<[^>]*>', '', 'g'), -- Remove HTML tags
                    '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g' -- Remove caracteres de controle
                ),
                '(script|javascript|vbscript|onload|onerror)', '', 'gi' -- Remove scripts
            ));
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 8. INSERIR CONFIGURAÇÕES PADRÃO SEGURAS
-- ============================================================================

-- Inserir configurações de segurança padrão
DO $$
BEGIN
    -- Configurações de rate limiting
    PERFORM insert_secure_config(
        'max_login_attempts',
        '5',
        'Máximo de tentativas de login por hora',
        FALSE,
        'production'
    );
    
    PERFORM insert_secure_config(
        'login_block_duration',
        '1 hour',
        'Duração do bloqueio após exceder tentativas de login',
        FALSE,
        'production'
    );
    
    PERFORM insert_secure_config(
        'session_timeout',
        '24 hours',
        'Tempo limite da sessão',
        FALSE,
        'production'
    );
    
    PERFORM insert_secure_config(
        'password_min_length',
        '12',
        'Comprimento mínimo da senha',
        FALSE,
        'production'
    );
    
    PERFORM insert_secure_config(
        'require_mfa',
        'true',
        'Exigir autenticação multifator para administradores',
        FALSE,
        'production'
    );
    
    -- Configuração de exemplo para chave de criptografia (deve ser alterada)
    PERFORM insert_secure_config(
        'encryption_key',
        'CHANGE_THIS_IN_PRODUCTION_' || gen_random_uuid()::TEXT,
        'Chave de criptografia para dados sensíveis - DEVE SER ALTERADA EM PRODUÇÃO',
        TRUE,
        'production'
    );
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Configurações já existem, pulando inserção';
END$$;

-- ============================================================================
-- 9. VIEWS PARA MONITORAMENTO DE SEGURANÇA
-- ============================================================================

-- View para monitorar tentativas de acesso bloqueadas
CREATE OR REPLACE VIEW blocked_access_attempts AS
SELECT 
    identifier,
    action,
    count as attempts,
    blocked_until,
    EXTRACT(EPOCH FROM (blocked_until - NOW())) / 60 as minutes_remaining,
    created_at,
    updated_at
FROM rate_limits
WHERE blocked_until > NOW()
ORDER BY blocked_until DESC;

-- View para configurações sensíveis (sem valores)
CREATE OR REPLACE VIEW secure_configs_summary AS
SELECT 
    id,
    config_key,
    config_description,
    is_sensitive,
    environment,
    created_at,
    updated_at,
    last_accessed,
    access_count,
    CASE 
        WHEN is_sensitive THEN '[ENCRYPTED]'
        ELSE config_value_encrypted
    END as config_value_display
FROM secure_configs
ORDER BY config_key;

-- ============================================================================
-- 10. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE secure_configs IS 'Armazenamento seguro de configurações sensíveis com criptografia';
COMMENT ON TABLE rate_limits IS 'Controle de rate limiting para prevenir ataques de força bruta';
COMMENT ON FUNCTION encrypt_config_value(TEXT, TEXT) IS 'Criptografa valores sensíveis usando AES';
COMMENT ON FUNCTION decrypt_config_value(TEXT, TEXT) IS 'Descriptografa valores sensíveis com auditoria';
COMMENT ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTERVAL, INTERVAL) IS 'Verifica e aplica rate limiting';
COMMENT ON FUNCTION validate_strong_password(TEXT) IS 'Valida força da senha com critérios rigorosos';
COMMENT ON FUNCTION sanitize_input(TEXT, TEXT) IS 'Sanitiza entrada de dados para prevenir injeções';

-- ============================================================================
-- 11. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar tabelas criadas
SELECT 'Tabelas de segurança criadas:' as info;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name IN ('secure_configs', 'rate_limits')
AND table_schema = 'public';

-- Verificar funções de segurança
SELECT 'Funções de segurança criadas:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'encrypt_config_value', 'decrypt_config_value', 'insert_secure_config',
    'get_secure_config', 'check_rate_limit', 'validate_strong_password',
    'sanitize_input'
)
AND routine_schema = 'public';

-- Log de sucesso
SELECT '✅ CORREÇÕES CRÍTICAS DE SEGURANÇA IMPLEMENTADAS!' as status;
SELECT 'Sistema de configurações seguras com criptografia ativo' as config_security;
SELECT 'Rate limiting implementado para prevenir ataques' as rate_limiting;
SELECT 'Validação de senhas fortes e sanitização de dados ativa' as input_validation;
SELECT '⚠️ LEMBRE-SE: Alterar chave de criptografia em produção!' as warning;