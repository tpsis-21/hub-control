-- =====================================================
-- CORREÇÃO DAS MIGRAÇÕES DE SEGURANÇA - HUB CONTROL
-- =====================================================
-- Este script corrige os erros encontrados no script original

-- Primeiro, vamos verificar a estrutura das tabelas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'payments', 'integration_configs', 'profiles')
ORDER BY table_name, ordinal_position;

-- =====================================================
-- CORREÇÃO DE POLÍTICAS RLS - VERSÃO CORRIGIDA
-- =====================================================

-- Remover políticas permissivas existentes e criar novas com campos corretos
DO $$
BEGIN
    -- Clients table - usando campos que realmente existem
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        -- Remover políticas antigas
        DROP POLICY IF EXISTS "allow_all" ON clients;
        DROP POLICY IF EXISTS "allow_all_operations" ON clients;
        DROP POLICY IF EXISTS "open_access" ON clients;
        DROP POLICY IF EXISTS "total_access" ON clients;
        DROP POLICY IF EXISTS "allow_all_access" ON clients;
        DROP POLICY IF EXISTS "clients_select_policy" ON clients;
        DROP POLICY IF EXISTS "clients_insert_policy" ON clients;
        DROP POLICY IF EXISTS "clients_update_policy" ON clients;
        DROP POLICY IF EXISTS "clients_delete_policy" ON clients;
        
        -- Verificar se a coluna 'created_by' existe, senão usar 'user_id' ou outro campo
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'created_by') THEN
            -- Usar created_by se existir
            CREATE POLICY "clients_select_policy" ON clients
                FOR SELECT USING (
                    auth.uid() = created_by OR 
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
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
                
            CREATE POLICY "clients_delete_policy" ON clients
                FOR DELETE USING (
                    auth.uid() = created_by OR
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'user_id') THEN
            -- Usar user_id se created_by não existir
            CREATE POLICY "clients_select_policy" ON clients
                FOR SELECT USING (
                    auth.uid() = user_id OR 
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
                
            CREATE POLICY "clients_insert_policy" ON clients
                FOR INSERT WITH CHECK (
                    auth.uid() = user_id OR
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
                
            CREATE POLICY "clients_update_policy" ON clients
                FOR UPDATE USING (
                    auth.uid() = user_id OR 
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
                
            CREATE POLICY "clients_delete_policy" ON clients
                FOR DELETE USING (
                    auth.uid() = user_id OR
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
        ELSE
            -- Se não houver campo de proprietário, apenas admins podem acessar
            CREATE POLICY "clients_admin_only" ON clients
                FOR ALL USING (
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
        END IF;
    END IF;
    
    -- Payments table - verificação similar
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        -- Remover políticas antigas
        DROP POLICY IF EXISTS "allow_all" ON payments;
        DROP POLICY IF EXISTS "allow_all_operations" ON payments;
        DROP POLICY IF EXISTS "open_access" ON payments;
        DROP POLICY IF EXISTS "total_access" ON payments;
        DROP POLICY IF EXISTS "allow_all_access" ON payments;
        DROP POLICY IF EXISTS "payments_select_policy" ON payments;
        DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
        DROP POLICY IF EXISTS "payments_update_policy" ON payments;
        DROP POLICY IF EXISTS "payments_delete_policy" ON payments;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'created_by') THEN
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
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'user_id') THEN
            CREATE POLICY "payments_select_policy" ON payments
                FOR SELECT USING (
                    auth.uid() = user_id OR
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
                
            CREATE POLICY "payments_insert_policy" ON payments
                FOR INSERT WITH CHECK (
                    auth.uid() = user_id OR
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
                
            CREATE POLICY "payments_update_policy" ON payments
                FOR UPDATE USING (
                    auth.uid() = user_id OR
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
                
            CREATE POLICY "payments_delete_policy" ON payments
                FOR DELETE USING (
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
        ELSE
            CREATE POLICY "payments_admin_only" ON payments
                FOR ALL USING (
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
                );
        END IF;
    END IF;
    
    -- Integration configs table - apenas admins
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_configs') THEN
        DROP POLICY IF EXISTS "integration_configs_select_policy" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_insert_policy" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_update_policy" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_delete_policy" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_admin_only" ON integration_configs;
        
        CREATE POLICY "integration_configs_admin_only" ON integration_configs
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
            );
    END IF;
END $$;

-- =====================================================
-- RESTO DAS MIGRAÇÕES (SEM ALTERAÇÕES)
-- =====================================================

-- Criar extensão se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Tabela para rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
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

-- Funções de segurança
CREATE OR REPLACE FUNCTION validate_strong_password(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF LENGTH(password) < 8 THEN RETURN FALSE; END IF;
    IF password !~ '[A-Z]' THEN RETURN FALSE; END IF;
    IF password !~ '[a-z]' THEN RETURN FALSE; END IF;
    IF password !~ '[0-9]' THEN RETURN FALSE; END IF;
    IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN RETURN FALSE; END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    
    IF EXISTS (
        SELECT 1 FROM rate_limits 
        WHERE identifier = p_identifier 
        AND action = p_action 
        AND blocked_until > NOW()
    ) THEN
        RETURN FALSE;
    END IF;
    
    SELECT attempts, rate_limits.window_start INTO current_attempts, window_start
    FROM rate_limits
    WHERE identifier = p_identifier 
    AND action = p_action 
    AND rate_limits.window_start > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    IF current_attempts IS NULL THEN
        INSERT INTO rate_limits (identifier, action, attempts, window_start)
        VALUES (p_identifier, p_action, 1, NOW());
        RETURN TRUE;
    ELSIF current_attempts < p_max_attempts THEN
        UPDATE rate_limits 
        SET attempts = attempts + 1
        WHERE identifier = p_identifier 
        AND action = p_action 
        AND rate_limits.window_start = window_start;
        RETURN TRUE;
    ELSE
        UPDATE rate_limits 
        SET blocked_until = NOW() + INTERVAL '1 hour'
        WHERE identifier = p_identifier 
        AND action = p_action 
        AND rate_limits.window_start = window_start;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir configurações de segurança padrão
INSERT INTO secure_configs (key, encrypted_value, description) VALUES
('max_login_attempts', crypt('5', gen_salt('bf')), 'Máximo de tentativas de login antes do bloqueio'),
('session_timeout_minutes', crypt('60', gen_salt('bf')), 'Tempo limite da sessão em minutos'),
('require_mfa', crypt('false', gen_salt('bf')), 'Exigir autenticação de dois fatores'),
('password_min_length', crypt('8', gen_salt('bf')), 'Comprimento mínimo da senha')
ON CONFLICT (key) DO NOTHING;

-- Views de monitoramento
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

SELECT 'Migrações de segurança corrigidas aplicadas com sucesso!' as status;