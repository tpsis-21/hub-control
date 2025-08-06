-- =====================================================
-- MIGRAÇÕES DE SEGURANÇA CONSOLIDADAS - HUB CONTROL
-- =====================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql

-- IMPORTANTE: Execute as seções uma por vez e verifique os resultados

-- =====================================================
-- 1. CORREÇÃO DE POLÍTICAS RLS PERMISSIVAS
-- =====================================================

-- Remover políticas permissivas existentes
DO $$
BEGIN
    -- Clients table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        DROP POLICY IF EXISTS "allow_all" ON clients;
        DROP POLICY IF EXISTS "allow_all_operations" ON clients;
        DROP POLICY IF EXISTS "open_access" ON clients;
        DROP POLICY IF EXISTS "total_access" ON clients;
        DROP POLICY IF EXISTS "allow_all_access" ON clients;
        
        -- Criar políticas restritivas para clients
        CREATE POLICY "clients_select_policy" ON clients
            FOR SELECT USING (
                auth.uid() = created_by OR 
                auth.uid() = manager_id OR
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
            
        CREATE POLICY "clients_insert_policy" ON clients
            FOR INSERT WITH CHECK (
                auth.uid() = created_by OR
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
            
        CREATE POLICY "clients_update_policy" ON clients
            FOR UPDATE USING (
                auth.uid() = created_by OR 
                auth.uid() = manager_id OR
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
            
        CREATE POLICY "clients_delete_policy" ON clients
            FOR DELETE USING (
                auth.uid() = created_by OR
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
    END IF;
    
    -- Payments table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        DROP POLICY IF EXISTS "allow_all" ON payments;
        DROP POLICY IF EXISTS "allow_all_operations" ON payments;
        DROP POLICY IF EXISTS "open_access" ON payments;
        DROP POLICY IF EXISTS "total_access" ON payments;
        DROP POLICY IF EXISTS "allow_all_access" ON payments;
        
        -- Criar políticas restritivas para payments
        CREATE POLICY "payments_select_policy" ON payments
            FOR SELECT USING (
                auth.uid() = created_by OR
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
            
        CREATE POLICY "payments_insert_policy" ON payments
            FOR INSERT WITH CHECK (
                auth.uid() = created_by OR
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
            
        CREATE POLICY "payments_update_policy" ON payments
            FOR UPDATE USING (
                auth.uid() = created_by OR
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
            
        CREATE POLICY "payments_delete_policy" ON payments
            FOR DELETE USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
    END IF;
    
    -- Integration configs table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_configs') THEN
        DROP POLICY IF EXISTS "integration_configs_select_policy" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_insert_policy" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_update_policy" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_delete_policy" ON integration_configs;
        
        -- Criar políticas restritivas para integration_configs (apenas admins)
        CREATE POLICY "integration_configs_admin_only" ON integration_configs
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
    END IF;
END $$;

-- =====================================================
-- 2. SISTEMA DE AUDITORIA
-- =====================================================

-- Criar extensão se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'AUTH', 'SENSITIVE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    severity TEXT DEFAULT 'INFO' CHECK (severity IN ('LOW', 'INFO', 'WARN', 'HIGH', 'CRITICAL')),
    description TEXT,
    metadata JSONB
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para audit_logs
DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_update_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete_policy" ON audit_logs;

CREATE POLICY "audit_logs_select_policy" ON audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "audit_logs_insert_policy" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "audit_logs_no_update_policy" ON audit_logs
    FOR UPDATE USING (false);

CREATE POLICY "audit_logs_no_delete_policy" ON audit_logs
    FOR DELETE USING (false);

-- =====================================================
-- 3. CONFIGURAÇÕES SEGURAS
-- =====================================================

-- Criar extensão de criptografia
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela para configurações seguras
CREATE TABLE IF NOT EXISTS secure_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    encrypted_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE secure_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para secure_configs (apenas admins)
DROP POLICY IF EXISTS "secure_configs_admin_only" ON secure_configs;
CREATE POLICY "secure_configs_admin_only" ON secure_configs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
    );

-- =====================================================
-- 4. RATE LIMITING
-- =====================================================

-- Tabela para rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL, -- IP, user_id, etc.
    action TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Habilitar RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Política RLS para rate_limits (sistema apenas)
DROP POLICY IF EXISTS "rate_limits_system_only" ON rate_limits;
CREATE POLICY "rate_limits_system_only" ON rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 5. FUNÇÕES DE SEGURANÇA
-- =====================================================

-- Função para validar senhas fortes
CREATE OR REPLACE FUNCTION validate_strong_password(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Mínimo 8 caracteres
    IF LENGTH(password) < 8 THEN
        RETURN FALSE;
    END IF;
    
    -- Deve conter pelo menos uma letra maiúscula
    IF password !~ '[A-Z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Deve conter pelo menos uma letra minúscula
    IF password !~ '[a-z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Deve conter pelo menos um número
    IF password !~ '[0-9]' THEN
        RETURN FALSE;
    END IF;
    
    -- Deve conter pelo menos um caractere especial
    IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_action TEXT,
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
    current_attempts INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Limpar registros antigos
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 hour';
    
    -- Verificar se está bloqueado
    IF EXISTS (
        SELECT 1 FROM rate_limits 
        WHERE identifier = p_identifier 
        AND action = p_action 
        AND blocked_until > NOW()
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Obter tentativas atuais na janela
    SELECT attempts, rate_limits.window_start INTO current_attempts, window_start
    FROM rate_limits
    WHERE identifier = p_identifier 
    AND action = p_action 
    AND rate_limits.window_start > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    IF current_attempts IS NULL THEN
        -- Primeira tentativa na janela
        INSERT INTO rate_limits (identifier, action, attempts, window_start)
        VALUES (p_identifier, p_action, 1, NOW());
        RETURN TRUE;
    ELSIF current_attempts < p_max_attempts THEN
        -- Incrementar tentativas
        UPDATE rate_limits 
        SET attempts = attempts + 1
        WHERE identifier = p_identifier 
        AND action = p_action 
        AND rate_limits.window_start = window_start;
        RETURN TRUE;
    ELSE
        -- Bloquear por 1 hora
        UPDATE rate_limits 
        SET blocked_until = NOW() + INTERVAL '1 hour'
        WHERE identifier = p_identifier 
        AND action = p_action 
        AND rate_limits.window_start = window_start;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. INSERIR CONFIGURAÇÕES PADRÃO
-- =====================================================

-- Inserir configurações de segurança padrão
INSERT INTO secure_configs (key, encrypted_value, description) VALUES
('max_login_attempts', crypt('5', gen_salt('bf')), 'Máximo de tentativas de login antes do bloqueio'),
('session_timeout_minutes', crypt('60', gen_salt('bf')), 'Tempo limite da sessão em minutos'),
('require_mfa', crypt('false', gen_salt('bf')), 'Exigir autenticação de dois fatores'),
('password_min_length', crypt('8', gen_salt('bf')), 'Comprimento mínimo da senha')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 7. VIEWS DE MONITORAMENTO
-- =====================================================

-- View para atividades suspeitas
CREATE OR REPLACE VIEW suspicious_activities AS
SELECT 
    table_name,
    action,
    user_email,
    ip_address,
    created_at,
    severity,
    description
FROM audit_logs
WHERE severity IN ('HIGH', 'CRITICAL')
   OR action = 'DELETE'
   OR (action = 'UPDATE' AND array_length(changed_fields, 1) > 5)
ORDER BY created_at DESC;

-- View para resumo de atividades por usuário
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    user_email,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
    COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
    COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
    MAX(created_at) as last_activity
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_email
ORDER BY total_actions DESC;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar tabelas com RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Migrações de segurança aplicadas com sucesso!' as status;