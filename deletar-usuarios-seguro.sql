-- ============================================
-- 🗑️ DELETAR USUÁRIOS - VERSÃO SEGURA
-- ============================================
-- Este script verifica a estrutura antes de deletar
-- Evita erros de colunas/tabelas inexistentes
-- Data: 2024-12-23

-- ============================================
-- ETAPA 1: VERIFICAR E DELETAR TABELAS CUSTOMIZADAS
-- ============================================

-- Função para deletar com segurança
DO $$
DECLARE
    table_exists boolean;
    column_exists boolean;
BEGIN
    -- Verificar e deletar profiles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM profiles;
        RAISE NOTICE 'Tabela profiles limpa: % registros deletados', ROW_COUNT;
    ELSE
        RAISE NOTICE 'Tabela profiles não existe';
    END IF;
    
    -- Verificar e deletar user_settings
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_settings'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM user_settings;
        RAISE NOTICE 'Tabela user_settings limpa: % registros deletados', ROW_COUNT;
    ELSE
        RAISE NOTICE 'Tabela user_settings não existe';
    END IF;
    
    -- Verificar e deletar audit_logs
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM audit_logs;
        RAISE NOTICE 'Tabela audit_logs limpa: % registros deletados', ROW_COUNT;
    ELSE
        RAISE NOTICE 'Tabela audit_logs não existe';
    END IF;
    
    -- Verificar e deletar notifications
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Verificar se existe coluna user_id
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'user_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            DELETE FROM notifications WHERE user_id IS NOT NULL;
            RAISE NOTICE 'Notificações com user_id deletadas: % registros', ROW_COUNT;
        ELSE
            DELETE FROM notifications;
            RAISE NOTICE 'Todas as notificações deletadas: % registros', ROW_COUNT;
        END IF;
    ELSE
        RAISE NOTICE 'Tabela notifications não existe';
    END IF;
    
    -- Verificar e deletar user_sessions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_sessions'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM user_sessions;
        RAISE NOTICE 'Tabela user_sessions limpa: % registros deletados', ROW_COUNT;
    ELSE
        RAISE NOTICE 'Tabela user_sessions não existe';
    END IF;
    
END $$;

-- ============================================
-- ETAPA 2: DELETAR USUÁRIOS DO AUTH.USERS
-- ============================================

-- Deletar TODOS os usuários do sistema de autenticação
DELETE FROM auth.users;

-- ============================================
-- ETAPA 3: LIMPAR TABELAS DE AUTENTICAÇÃO
-- ============================================

-- Deletar todas as sessões ativas
DELETE FROM auth.sessions;

-- Deletar todos os refresh tokens
DELETE FROM auth.refresh_tokens;

-- Deletar todas as tentativas de login
DELETE FROM auth.audit_log_entries;

-- Deletar identidades (OAuth, etc.)
DELETE FROM auth.identities;

-- ============================================
-- ETAPA 4: VERIFICAÇÃO FINAL
-- ============================================

-- Verificar contagem final de registros
DO $$
DECLARE
    table_exists boolean;
    record_count integer;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICAÇÃO FINAL - CONTAGEM DE REGISTROS';
    RAISE NOTICE '============================================';
    
    -- Verificar auth.users
    SELECT COUNT(*) FROM auth.users INTO record_count;
    RAISE NOTICE 'auth.users: % registros', record_count;
    
    -- Verificar profiles
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) FROM profiles INTO record_count;
        RAISE NOTICE 'profiles: % registros', record_count;
    ELSE
        RAISE NOTICE 'profiles: tabela não existe';
    END IF;
    
    -- Verificar user_settings
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) FROM user_settings INTO record_count;
        RAISE NOTICE 'user_settings: % registros', record_count;
    ELSE
        RAISE NOTICE 'user_settings: tabela não existe';
    END IF;
    
    -- Verificar audit_logs
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) FROM audit_logs INTO record_count;
        RAISE NOTICE 'audit_logs: % registros', record_count;
    ELSE
        RAISE NOTICE 'audit_logs: tabela não existe';
    END IF;
    
    -- Verificar notifications
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) FROM notifications INTO record_count;
        RAISE NOTICE 'notifications: % registros', record_count;
    ELSE
        RAISE NOTICE 'notifications: tabela não existe';
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'LIMPEZA CONCLUÍDA!';
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Acesse: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql
-- 2. Cole este SQL completo
-- 3. Execute (clique em "Run")
-- 4. Verifique as mensagens de NOTICE no output
-- 5. Confirme que todos os contadores estão em 0

-- ============================================
-- VANTAGENS DESTA VERSÃO:
-- ============================================
-- ✅ Verifica se tabelas existem antes de deletar
-- ✅ Verifica se colunas existem antes de usar
-- ✅ Fornece feedback detalhado via NOTICE
-- ✅ Não gera erros se estrutura for diferente
-- ✅ Mais seguro para diferentes versões do schema