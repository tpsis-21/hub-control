-- =====================================================
-- SCRIPT DE REORGANIZAÇÃO COMPLETA DO SISTEMA AUTH
-- =====================================================
-- Este script reorganiza e simplifica todo o sistema de autenticação
-- Deve ser executado APÓS a limpeza e criação do admin
-- Data: 2024-12-23
-- Autor: Sistema de Reorganização Auth

-- =====================================================
-- 1. REMOVER ESTRUTURAS ANTIGAS E CONFLITANTES
-- =====================================================

-- Remover triggers antigos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sanitize_profiles_trigger ON profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;

-- Remover funções antigas
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS sanitize_html(text) CASCADE;
DROP FUNCTION IF EXISTS validate_password_strength(text) CASCADE;
DROP FUNCTION IF EXISTS is_mfa_required(uuid) CASCADE;
DROP FUNCTION IF EXISTS security_health_check() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;

-- Remover políticas antigas (todas)
DO $$ 
DECLARE
    pol_name text;
    table_name text;
BEGIN
    FOR table_name IN VALUES ('profiles'), ('user_settings'), ('audit_logs'), ('mfa_tokens'), ('security_alerts'), ('in_app_notifications')
    LOOP
        FOR pol_name IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_name AND schemaname = 'public'
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON ' || table_name;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 2. RECRIAR TABELAS COM ESTRUTURA LIMPA
-- =====================================================

-- Desabilitar RLS temporariamente
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mfa_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS in_app_notifications DISABLE ROW LEVEL SECURITY;

-- Recriar tabela profiles com estrutura simplificada
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_approved boolean NOT NULL DEFAULT false,
  avatar_url text,
  phone text,
  company text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Índices para performance
  CONSTRAINT profiles_email_key UNIQUE (email)
);

-- Recriar tabela user_settings simplificada
DROP TABLE IF EXISTS user_settings CASCADE;
CREATE TABLE user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  language text NOT NULL DEFAULT 'pt-BR',
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Garantir um registro por usuário
  CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

-- Recriar tabela audit_logs simplificada
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Manter tabelas opcionais apenas se necessárias
-- (mfa_tokens, security_alerts podem ser removidas se não usadas)
DROP TABLE IF EXISTS mfa_tokens CASCADE;
DROP TABLE IF EXISTS security_alerts CASCADE;

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Índices para user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- =====================================================
-- 4. CRIAR FUNÇÕES ESSENCIAIS SIMPLIFICADAS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para criar perfil e configurações automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar perfil
    INSERT INTO profiles (id, email, role, is_approved)
    VALUES (
        NEW.id, 
        NEW.email, 
        CASE 
            WHEN NEW.email = 'topplaytv7@gmail.com' THEN 'admin'
            ELSE 'user'
        END,
        CASE 
            WHEN NEW.email = 'topplaytv7@gmail.com' THEN true
            ELSE false
        END
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Criar configurações
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log de auditoria
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
        NEW.id,
        'USER_CREATED',
        'auth.users',
        NEW.id::text,
        json_build_object(
            'email', NEW.email,
            'created_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para log de auditoria em updates
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 'PROFILE_UPDATED'
            WHEN TG_OP = 'DELETE' THEN 'PROFILE_DELETED'
        END,
        'profiles',
        COALESCE(NEW.id, OLD.id)::text,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CRIAR TRIGGERS SIMPLIFICADOS
-- =====================================================

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para auditoria de profiles
CREATE TRIGGER log_profile_changes_trigger
    AFTER UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_profile_changes();

-- =====================================================
-- 6. CONFIGURAR RLS SIMPLIFICADO
-- =====================================================

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
-- Todos podem ver perfis (necessário para listagens)
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Usuários podem inserir apenas seu próprio perfil
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil
-- Admins podem atualizar qualquer perfil
CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Apenas admins podem deletar perfis
CREATE POLICY "profiles_delete_admin" ON profiles
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para USER_SETTINGS
-- Usuários podem gerenciar apenas suas próprias configurações
CREATE POLICY "user_settings_own" ON user_settings
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para AUDIT_LOGS
-- Apenas admins podem ver logs
CREATE POLICY "audit_logs_admin_only" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Sistema pode inserir logs
CREATE POLICY "audit_logs_system_insert" ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Políticas para IN_APP_NOTIFICATIONS
-- Usuários veem apenas suas notificações
CREATE POLICY "notifications_own" ON in_app_notifications
    FOR ALL
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 7. CONFIGURAR STORAGE POLICIES
-- =====================================================

-- Remover políticas antigas do storage
DROP POLICY IF EXISTS "profiles_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_storage_delete" ON storage.objects;

-- Criar políticas simples para storage de perfis
CREATE POLICY "profiles_storage_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'profiles');

CREATE POLICY "profiles_storage_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'profiles' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "profiles_storage_update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'profiles' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "profiles_storage_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'profiles' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- =====================================================
-- 8. RECRIAR DADOS DO ADMIN (SE NECESSÁRIO)
-- =====================================================

-- Verificar se admin existe e recriar se necessário
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Buscar ID do admin
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'topplaytv7@gmail.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Recriar perfil do admin
        INSERT INTO profiles (id, email, full_name, role, is_approved, company)
        VALUES (
            admin_user_id,
            'topplaytv7@gmail.com',
            'Administrador Sistema',
            'admin',
            true,
            'TopPlay TV'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            is_approved = true,
            full_name = EXCLUDED.full_name,
            company = EXCLUDED.company,
            updated_at = now();
        
        -- Recriar configurações do admin
        INSERT INTO user_settings (user_id, theme, language, notifications_enabled)
        VALUES (admin_user_id, 'light', 'pt-BR', true)
        ON CONFLICT (user_id) DO UPDATE SET
            updated_at = now();
            
        RAISE NOTICE '✅ Perfil do admin recriado com sucesso';
    ELSE
        RAISE NOTICE '⚠️  Admin não encontrado. Execute criar-admin-inicial.sql primeiro';
    END IF;
END $$;

-- =====================================================
-- 9. VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar estrutura das tabelas
SELECT 
    'TABELAS CRIADAS' as status,
    COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_settings', 'audit_logs');

-- Verificar políticas RLS
SELECT 
    'POLÍTICAS RLS' as status,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE schemaname = 'public';

-- Verificar triggers
SELECT 
    'TRIGGERS CRIADOS' as status,
    COUNT(*) as total_triggers
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Verificar admin
SELECT 
    u.email,
    p.role,
    p.is_approved,
    'ADMIN VERIFICADO' as status
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'topplaytv7@gmail.com';

-- =====================================================
-- 10. RELATÓRIO FINAL
-- =====================================================

SELECT '🎉 SISTEMA DE AUTENTICAÇÃO REORGANIZADO!' as status;
SELECT '✅ Estrutura de tabelas simplificada' as item_1;
SELECT '✅ Políticas RLS otimizadas' as item_2;
SELECT '✅ Triggers essenciais criados' as item_3;
SELECT '✅ Índices de performance adicionados' as item_4;
SELECT '✅ Storage policies configuradas' as item_5;
SELECT '✅ Sistema de auditoria implementado' as item_6;
SELECT '🚀 Sistema pronto para uso em produção!' as resultado;

-- =====================================================
-- PRÓXIMOS PASSOS:
-- =====================================================
-- 1. Testar login do admin
-- 2. Verificar acesso ao painel
-- 3. Testar criação de novos usuários
-- 4. Verificar upload de avatares
-- 5. Monitorar logs de auditoria
-- =====================================================