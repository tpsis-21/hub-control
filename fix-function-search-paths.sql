-- =====================================================
-- CORREÇÃO: Funções com Search Path Mutável
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Problema: 54+ funções com search_path mutável
-- Impacto: MÉDIO - Possível SQL injection
-- =====================================================

-- 1. Verificar funções atuais com search_path mutável
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN '⚠️ SEARCH_PATH MUTÁVEL'
        WHEN 'search_path=' = ANY(p.proconfig) THEN '✅ SEARCH_PATH FIXO'
        ELSE '❓ CONFIGURAÇÃO PERSONALIZADA'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proconfig IS NULL
ORDER BY 
    CASE 
        WHEN p.proname ILIKE '%security%' OR p.proname ILIKE '%auth%' OR p.proname ILIKE '%password%' THEN 1
        WHEN p.proname ILIKE '%trigger%' OR p.proname ILIKE '%sync%' THEN 2
        ELSE 3
    END,
    p.proname;

-- =====================================================
-- FASE 1: CORREÇÕES CRÍTICAS (Funções de Segurança)
-- =====================================================

-- 2.1 Funções de Validação de Senha
ALTER FUNCTION public.validate_password_strength(text) 
SET search_path = '';

ALTER FUNCTION public.validate_strong_password(text) 
SET search_path = '';

-- 2.2 Funções de Segurança e Alertas
ALTER FUNCTION public.create_security_alert(text, text, jsonb) 
SET search_path = '';

ALTER FUNCTION public.resolve_security_alert(uuid, text) 
SET search_path = '';

-- 2.3 Funções de Rate Limiting
ALTER FUNCTION public.check_rate_limit(text, integer, interval) 
SET search_path = '';

-- 2.4 Funções de Detecção de Atividade Suspeita
ALTER FUNCTION public.detect_suspicious_activity(uuid, inet, text) 
SET search_path = '';

-- =====================================================
-- FASE 2: CORREÇÕES DE AUTENTICAÇÃO E AUTORIZAÇÃO
-- =====================================================

-- 2.5 Funções de Autenticação
ALTER FUNCTION public.handle_new_user() 
SET search_path = '';

ALTER FUNCTION public.update_user_last_seen() 
SET search_path = '';

ALTER FUNCTION public.validate_user_permissions(uuid, text) 
SET search_path = '';

-- 2.6 Funções de Perfil e Sessão
ALTER FUNCTION public.update_profile_updated_at() 
SET search_path = '';

ALTER FUNCTION public.handle_profile_changes() 
SET search_path = '';

-- =====================================================
-- FASE 3: CORREÇÕES DE TRIGGERS E AUTOMAÇÃO
-- =====================================================

-- 2.7 Triggers de Auditoria
ALTER FUNCTION public.audit_trigger_function() 
SET search_path = '';

ALTER FUNCTION public.log_data_changes() 
SET search_path = '';

-- 2.8 Triggers de Sincronização
ALTER FUNCTION public.sync_user_data() 
SET search_path = '';

ALTER FUNCTION public.update_mapping_statistics() 
SET search_path = '';

ALTER FUNCTION public.calculate_quality_scores() 
SET search_path = '';

-- 2.9 Triggers de Validação
ALTER FUNCTION public.validate_mapping_data() 
SET search_path = '';

ALTER FUNCTION public.check_data_integrity() 
SET search_path = '';

-- =====================================================
-- FASE 4: CORREÇÕES DE ANÁLISE E RELATÓRIOS
-- =====================================================

-- 2.10 Funções de Analytics
ALTER FUNCTION public.calculate_user_analytics() 
SET search_path = '';

ALTER FUNCTION public.generate_daily_reports() 
SET search_path = '';

ALTER FUNCTION public.update_dashboard_metrics() 
SET search_path = '';

-- 2.11 Funções de Mapeamento
ALTER FUNCTION public.process_mapping_quality() 
SET search_path = '';

ALTER FUNCTION public.analyze_mapping_completeness() 
SET search_path = '';

ALTER FUNCTION public.update_mapping_rankings() 
SET search_path = '';

-- =====================================================
-- CORREÇÕES ADICIONAIS (Funções Restantes)
-- =====================================================

-- 2.12 Outras funções importantes
ALTER FUNCTION public.cleanup_old_sessions() 
SET search_path = '';

ALTER FUNCTION public.archive_old_data() 
SET search_path = '';

ALTER FUNCTION public.send_notification(uuid, text, jsonb) 
SET search_path = '';

ALTER FUNCTION public.process_background_tasks() 
SET search_path = '';

-- =====================================================
-- SCRIPT GENÉRICO PARA FUNÇÕES RESTANTES
-- =====================================================

-- 3. Para aplicar a todas as funções restantes, execute:
/*
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
            AND p.proconfig IS NULL
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = ''''', 
                      func_record.nspname, 
                      func_record.proname, 
                      func_record.args);
        
        RAISE NOTICE 'Corrigido: %.%(%)', 
                     func_record.nspname, 
                     func_record.proname, 
                     func_record.args;
    END LOOP;
END $$;
*/

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- 4. Verificar correções aplicadas
SELECT 
    COUNT(*) as total_funcoes,
    COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) as funcoes_com_search_path_mutavel,
    COUNT(CASE WHEN 'search_path=' = ANY(p.proconfig) THEN 1 END) as funcoes_corrigidas,
    CASE 
        WHEN COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) = 0 THEN '✅ TODAS CORRIGIDAS'
        ELSE '⚠️ AINDA EXISTEM FUNÇÕES PARA CORRIGIR'
    END as status_geral
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- 5. Listar funções ainda não corrigidas (se houver)
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    '⚠️ PRECISA SER CORRIGIDA' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proconfig IS NULL
ORDER BY p.proname;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Todas as funções com search_path fixo ('')
-- ✅ Proteção contra SQL injection
-- ✅ Maior segurança nas operações do banco
-- =====================================================

-- NOTAS IMPORTANTES:
-- 1. search_path = '' força uso de nomes totalmente qualificados
-- 2. Previne manipulação maliciosa do search_path
-- 3. Pode quebrar funções que dependem de search_path específico
-- 4. Testar funcionalidade após aplicar correções

-- ROLLBACK (se necessário):
-- Para reverter uma função específica:
-- ALTER FUNCTION public.nome_da_funcao(argumentos) RESET search_path;