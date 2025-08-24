-- ============================================
-- 🗑️ DELETAR TODOS OS USUÁRIOS - LIMPEZA TOTAL
-- ============================================
-- ATENÇÃO: Este script remove TODOS os usuários e dados!
-- Execute no Supabase SQL Editor com cuidado!
-- Data: 2024-12-23

-- ============================================
-- ETAPA 1: DELETAR DADOS DAS TABELAS CUSTOMIZADAS
-- ============================================

-- Deletar todos os perfis
DELETE FROM profiles;

-- Deletar todas as configurações de usuário
DELETE FROM user_settings;

-- Deletar todos os logs de auditoria
DELETE FROM audit_logs;

-- Deletar todas as notificações (sem filtro por user_id)
DELETE FROM notifications;

-- Deletar sessões de usuário (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        DELETE FROM user_sessions;
    END IF;
END $$;

-- ============================================
-- ETAPA 2: DELETAR USUÁRIOS DO AUTH.USERS
-- ============================================

-- Deletar TODOS os usuários do sistema de autenticação
-- Isso inclui o admin e qualquer outro usuário
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
-- ETAPA 4: RESETAR SEQUÊNCIAS (OPCIONAL)
-- ============================================

-- Resetar sequências para começar do zero
-- (Descomente se quiser resetar IDs)

ALTER SEQUENCE auth.refresh_tokens_id_seq RESTART WITH 1;
ALTER SEQUENCE auth.audit_log_entries_instance_id_seq RESTART WITH 1;

-- ============================================
-- ETAPA 5: VERIFICAÇÃO
-- ============================================

-- Verificar se todos os usuários foram deletados
SELECT 
    'auth.users' as tabela,
    COUNT(*) as total_registros
FROM auth.users

UNION ALL

SELECT 
    'profiles' as tabela,
    COUNT(*) as total_registros
FROM profiles

UNION ALL

SELECT 
    'user_settings' as tabela,
    COUNT(*) as total_registros
FROM user_settings

UNION ALL

SELECT 
    'audit_logs' as tabela,
    COUNT(*) as total_registros
FROM audit_logs

UNION ALL

SELECT 
    'notifications' as tabela,
    COUNT(*) as total_registros
FROM notifications;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Todas as tabelas devem mostrar 0 registros
-- auth.users: 0
-- profiles: 0
-- user_settings: 0
-- audit_logs: 0
-- notifications: 0

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Acesse: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql
-- 2. Cole este SQL completo
-- 3. Execute (clique em "Run")
-- 4. Verifique os resultados da consulta final
-- 5. Todos os contadores devem estar em 0

-- ============================================
-- AVISO IMPORTANTE:
-- ============================================
-- ⚠️  ESTA AÇÃO É IRREVERSÍVEL!
-- ⚠️  TODOS OS USUÁRIOS SERÃO DELETADOS!
-- ⚠️  TODOS OS DADOS SERÃO PERDIDOS!
-- ⚠️  USE APENAS EM DESENVOLVIMENTO!

-- ============================================
-- APÓS A EXECUÇÃO:
-- ============================================
-- O sistema ficará completamente limpo
-- Nenhum usuário poderá fazer login
-- Será necessário criar novos usuários
-- Todas as sessões serão invalidadas

-- ============================================
-- CORREÇÕES APLICADAS:
-- ============================================
-- ✅ Removido filtro WHERE user_id da tabela notifications
-- ✅ Adicionada verificação de existência para user_sessions
-- ✅ Incluída tabela notifications na verificação final