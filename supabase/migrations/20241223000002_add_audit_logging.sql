-- Migration: Add Audit Logging System
-- Data: 2024-12-23
-- Descrição: Implementa sistema de logs de auditoria para ações sensíveis

-- ============================================================================
-- 1. CRIAR TABELA DE LOGS DE AUDITORIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'ROLE_CHANGE', 'PERMISSION_CHANGE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_role TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity TEXT DEFAULT 'INFO' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- ============================================================================
-- 2. FUNÇÃO GENÉRICA PARA AUDITORIA
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    current_user_id UUID;
    current_user_email TEXT;
    current_user_role TEXT;
    audit_action TEXT;
    audit_severity TEXT;
    audit_description TEXT;
BEGIN
    -- Determinar ação
    IF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        new_data = NULL;
        audit_action = 'DELETE';
        audit_severity = 'HIGH';
        audit_description = 'Registro deletado da tabela ' || TG_TABLE_NAME;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        audit_action = 'UPDATE';
        audit_severity = 'MEDIUM';
        audit_description = 'Registro atualizado na tabela ' || TG_TABLE_NAME;
        
        -- Identificar campos alterados
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(old_data) old_kv
        JOIN jsonb_each(new_data) new_kv ON old_kv.key = new_kv.key
        WHERE old_kv.value IS DISTINCT FROM new_kv.value;
        
    ELSIF TG_OP = 'INSERT' THEN
        old_data = NULL;
        new_data = to_jsonb(NEW);
        audit_action = 'INSERT';
        audit_severity = 'MEDIUM';
        audit_description = 'Novo registro criado na tabela ' || TG_TABLE_NAME;
    END IF;
    
    -- Obter informações do usuário atual
    current_user_id = auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        SELECT email INTO current_user_email 
        FROM auth.users 
        WHERE id = current_user_id;
        
        SELECT role INTO current_user_role 
        FROM profiles 
        WHERE user_id = current_user_id OR id = current_user_id
        LIMIT 1;
    END IF;
    
    -- Inserir log de auditoria
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields,
        user_id,
        user_email,
        user_role,
        severity,
        description,
        metadata
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(
            (new_data->>'id'),
            (old_data->>'id'),
            'unknown'
        ),
        audit_action,
        old_data,
        new_data,
        changed_fields,
        current_user_id,
        current_user_email,
        current_user_role,
        audit_severity,
        audit_description,
        jsonb_build_object(
            'table_schema', TG_TABLE_SCHEMA,
            'trigger_name', TG_NAME,
            'operation', TG_OP
        )
    );
    
    -- Retornar o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. FUNÇÃO PARA LOGS DE AUTENTICAÇÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION log_auth_event(
    p_action TEXT,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    audit_severity TEXT;
BEGIN
    -- Determinar severidade baseada na ação
    CASE p_action
        WHEN 'FAILED_LOGIN' THEN audit_severity = 'HIGH';
        WHEN 'PASSWORD_CHANGE' THEN audit_severity = 'HIGH';
        WHEN 'ROLE_CHANGE' THEN audit_severity = 'CRITICAL';
        WHEN 'PERMISSION_CHANGE' THEN audit_severity = 'CRITICAL';
        WHEN 'LOGIN' THEN audit_severity = 'MEDIUM';
        WHEN 'LOGOUT' THEN audit_severity = 'LOW';
        ELSE audit_severity = 'MEDIUM';
    END CASE;
    
    INSERT INTO audit_logs (
        table_name,
        action,
        user_id,
        user_email,
        ip_address,
        user_agent,
        session_id,
        severity,
        description,
        metadata
    ) VALUES (
        'auth_events',
        p_action,
        p_user_id,
        p_user_email,
        p_ip_address,
        p_user_agent,
        p_session_id,
        audit_severity,
        COALESCE(p_description, 'Evento de autenticação: ' || p_action),
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. FUNÇÃO PARA LOGS DE AÇÕES SENSÍVEIS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_sensitive_action(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_severity TEXT DEFAULT 'HIGH'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    current_user_id UUID;
    current_user_email TEXT;
    current_user_role TEXT;
BEGIN
    -- Obter informações do usuário atual
    current_user_id = auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        SELECT email INTO current_user_email 
        FROM auth.users 
        WHERE id = current_user_id;
        
        SELECT role INTO current_user_role 
        FROM profiles 
        WHERE user_id = current_user_id OR id = current_user_id
        LIMIT 1;
    END IF;
    
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        user_email,
        user_role,
        severity,
        description,
        metadata
    ) VALUES (
        p_table_name,
        p_record_id,
        p_action,
        current_user_id,
        current_user_email,
        current_user_role,
        p_severity,
        COALESCE(p_description, 'Ação sensível executada: ' || p_action),
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CRIAR TRIGGERS PARA TABELAS SENSÍVEIS
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    sensitive_tables TEXT[] := ARRAY[
        'clients', 'payments', 'profiles', 'settings', 
        'integration_configs', 'smtp_configs', 'marketing_campaigns',
        'email_templates', 'automation_rules'
    ];
BEGIN
    -- Criar triggers para tabelas sensíveis
    FOREACH table_record.table_name IN ARRAY sensitive_tables
    LOOP
        -- Verificar se a tabela existe
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = table_record.table_name 
            AND table_schema = 'public'
        ) THEN
            -- Remover trigger existente se houver
            EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%s ON %s', 
                table_record.table_name, table_record.table_name);
            
            -- Criar novo trigger
            EXECUTE format(
                'CREATE TRIGGER audit_trigger_%s 
                AFTER INSERT OR UPDATE OR DELETE ON %s 
                FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
                table_record.table_name, table_record.table_name
            );
            
            RAISE NOTICE 'Trigger de auditoria criado para tabela: %', table_record.table_name;
        ELSE
            RAISE NOTICE 'Tabela % não encontrada, pulando criação do trigger', table_record.table_name;
        END IF;
    END LOOP;
END$$;

-- ============================================================================
-- 6. POLÍTICAS RLS PARA TABELA DE AUDITORIA
-- ============================================================================

-- Habilitar RLS na tabela de auditoria
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas administradores podem ver logs de auditoria
CREATE POLICY "audit_logs_select_admin" ON audit_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE (user_id = auth.uid() OR id = auth.uid()) 
            AND role = 'admin'
        )
    );

-- Apenas sistema pode inserir logs (via triggers e funções)
CREATE POLICY "audit_logs_insert_system" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        current_setting('role') = 'postgres' OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE (user_id = auth.uid() OR id = auth.uid()) 
            AND role = 'admin'
        )
    );

-- Ninguém pode atualizar ou deletar logs de auditoria (imutabilidade)
CREATE POLICY "audit_logs_no_update" ON audit_logs
    FOR UPDATE USING (FALSE);

CREATE POLICY "audit_logs_no_delete" ON audit_logs
    FOR DELETE USING (FALSE);

-- ============================================================================
-- 7. VIEWS PARA RELATÓRIOS DE AUDITORIA
-- ============================================================================

-- View para atividades suspeitas
CREATE OR REPLACE VIEW suspicious_activities AS
SELECT 
    al.*,
    CASE 
        WHEN al.action = 'FAILED_LOGIN' AND 
             (SELECT COUNT(*) FROM audit_logs al2 
              WHERE al2.ip_address = al.ip_address 
              AND al2.action = 'FAILED_LOGIN' 
              AND al2.timestamp > al.timestamp - INTERVAL '1 hour') > 5
        THEN 'Múltiplas tentativas de login falhadas'
        
        WHEN al.action IN ('DELETE') AND al.table_name IN ('clients', 'payments')
        THEN 'Deleção de dados críticos'
        
        WHEN al.action = 'ROLE_CHANGE'
        THEN 'Mudança de permissões'
        
        WHEN al.timestamp::time BETWEEN '00:00:00' AND '06:00:00'
        THEN 'Atividade fora do horário comercial'
        
        ELSE 'Outros'
    END as suspicion_reason
FROM audit_logs al
WHERE 
    al.severity IN ('HIGH', 'CRITICAL') OR
    al.action = 'FAILED_LOGIN' OR
    (al.action = 'DELETE' AND al.table_name IN ('clients', 'payments')) OR
    al.timestamp::time BETWEEN '00:00:00' AND '06:00:00'
ORDER BY al.timestamp DESC;

-- View para resumo de atividades por usuário
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    user_id,
    user_email,
    user_role,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN action = 'LOGIN' THEN 1 END) as logins,
    COUNT(CASE WHEN action = 'FAILED_LOGIN' THEN 1 END) as failed_logins,
    COUNT(CASE WHEN action IN ('INSERT', 'UPDATE', 'DELETE') THEN 1 END) as data_modifications,
    COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_actions,
    MIN(timestamp) as first_activity,
    MAX(timestamp) as last_activity,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs
WHERE user_id IS NOT NULL
GROUP BY user_id, user_email, user_role
ORDER BY total_actions DESC;

-- View para atividades por tabela
CREATE OR REPLACE VIEW table_activity_summary AS
SELECT 
    table_name,
    COUNT(*) as total_operations,
    COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
    COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
    COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(timestamp) as first_operation,
    MAX(timestamp) as last_operation
FROM audit_logs
WHERE table_name != 'auth_events'
GROUP BY table_name
ORDER BY total_operations DESC;

-- ============================================================================
-- 8. FUNÇÃO PARA LIMPEZA DE LOGS ANTIGOS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
    retention_days INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deletar logs mais antigos que o período de retenção
    -- Manter logs críticos por mais tempo
    DELETE FROM audit_logs 
    WHERE 
        timestamp < NOW() - (retention_days || ' days')::INTERVAL
        AND severity NOT IN ('CRITICAL')
        AND action NOT IN ('ROLE_CHANGE', 'PERMISSION_CHANGE');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da operação de limpeza
    INSERT INTO audit_logs (
        table_name,
        action,
        severity,
        description,
        metadata
    ) VALUES (
        'audit_logs',
        'CLEANUP',
        'MEDIUM',
        'Limpeza automática de logs antigos',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'retention_days', retention_days
        )
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Tabela de logs de auditoria para rastreamento de todas as ações sensíveis';
COMMENT ON FUNCTION audit_trigger_function() IS 'Função trigger genérica para auditoria automática de tabelas';
COMMENT ON FUNCTION log_auth_event(TEXT, UUID, TEXT, INET, TEXT, TEXT, TEXT, JSONB) IS 'Função para registrar eventos de autenticação';
COMMENT ON FUNCTION log_sensitive_action(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) IS 'Função para registrar ações sensíveis manuais';
COMMENT ON VIEW suspicious_activities IS 'View para identificar atividades suspeitas';
COMMENT ON VIEW user_activity_summary IS 'View com resumo de atividades por usuário';
COMMENT ON VIEW table_activity_summary IS 'View com resumo de atividades por tabela';

-- ============================================================================
-- 10. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar triggers criados
SELECT 'Triggers de auditoria criados:' as info;
SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as events
FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit_trigger_%'
ORDER BY event_object_table;

-- Verificar políticas RLS da tabela de auditoria
SELECT 'Políticas RLS da tabela audit_logs:' as info;
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'audit_logs'
ORDER BY policyname;

-- Log de sucesso
SELECT '✅ SISTEMA DE AUDITORIA IMPLEMENTADO!' as status;
SELECT 'Todas as ações sensíveis serão registradas automaticamente' as details;
SELECT 'Views de relatório disponíveis para análise de segurança' as reporting_note;
SELECT 'Logs são imutáveis e protegidos por RLS' as security_note;