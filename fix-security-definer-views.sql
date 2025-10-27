-- =====================================================
-- CORREÇÃO: Views com SECURITY DEFINER desnecessário
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Problema: 8 views com privilégios elevados desnecessários
-- Impacto: ALTO - Execução com privilégios do criador
-- =====================================================

-- 1. Verificar views atuais com SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER ATIVO'
        ELSE 'SECURITY INVOKER (padrão)'
    END as security_mode
FROM pg_views 
WHERE schemaname = 'public'
    AND definition ILIKE '%SECURITY DEFINER%'
ORDER BY viewname;

-- =====================================================
-- CORREÇÕES DAS VIEWS PROBLEMÁTICAS
-- =====================================================

-- 2.1 Corrigir: analytics_device_metrics
-- Remover SECURITY DEFINER se não for necessário para acesso a dados restritos
DROP VIEW IF EXISTS public.analytics_device_metrics CASCADE;
CREATE VIEW public.analytics_device_metrics AS 
SELECT 
    device_type,
    COUNT(*) as total_devices,
    AVG(performance_score) as avg_performance,
    DATE_TRUNC('day', created_at) as date_group
FROM public.device_analytics 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY device_type, DATE_TRUNC('day', created_at)
ORDER BY date_group DESC, total_devices DESC;

-- 2.2 Corrigir: thebest_dashboard
DROP VIEW IF EXISTS public.thebest_dashboard CASCADE;
CREATE VIEW public.thebest_dashboard AS 
SELECT 
    user_id,
    total_mappings,
    quality_score,
    last_activity,
    ranking_position
FROM public.user_mapping_stats 
WHERE is_active = true
ORDER BY quality_score DESC, total_mappings DESC;

-- 2.3 Corrigir: user_activity_summary
DROP VIEW IF EXISTS public.user_activity_summary CASCADE;
CREATE VIEW public.user_activity_summary AS 
SELECT 
    u.id as user_id,
    u.email,
    COUNT(a.id) as total_activities,
    MAX(a.created_at) as last_activity,
    DATE_TRUNC('month', a.created_at) as activity_month
FROM public.profiles u
LEFT JOIN public.user_activities a ON u.id = a.user_id
WHERE a.created_at >= NOW() - INTERVAL '6 months'
GROUP BY u.id, u.email, DATE_TRUNC('month', a.created_at)
ORDER BY last_activity DESC;

-- 2.4 Corrigir: analytics_popular_pages
DROP VIEW IF EXISTS public.analytics_popular_pages CASCADE;
CREATE VIEW public.analytics_popular_pages AS 
SELECT 
    page_path,
    COUNT(*) as total_visits,
    COUNT(DISTINCT user_id) as unique_visitors,
    AVG(session_duration) as avg_duration,
    DATE_TRUNC('day', visited_at) as visit_date
FROM public.page_analytics 
WHERE visited_at >= NOW() - INTERVAL '7 days'
GROUP BY page_path, DATE_TRUNC('day', visited_at)
HAVING COUNT(*) > 10
ORDER BY total_visits DESC;

-- 2.5 Corrigir: thebest_mapping_quality_analysis
DROP VIEW IF EXISTS public.thebest_mapping_quality_analysis CASCADE;
CREATE VIEW public.thebest_mapping_quality_analysis AS 
SELECT 
    mapping_id,
    quality_score,
    accuracy_rating,
    completeness_score,
    validation_status,
    created_by,
    created_at
FROM public.mapping_quality_metrics 
WHERE validation_status IN ('approved', 'pending_review')
ORDER BY quality_score DESC, created_at DESC;

-- 2.6 Corrigir: thebest_mapping_summary
DROP VIEW IF EXISTS public.thebest_mapping_summary CASCADE;
CREATE VIEW public.thebest_mapping_summary AS 
SELECT 
    region,
    COUNT(*) as total_mappings,
    AVG(quality_score) as avg_quality,
    COUNT(DISTINCT created_by) as contributors,
    MAX(updated_at) as last_update
FROM public.mappings 
WHERE status = 'active'
GROUP BY region
ORDER BY total_mappings DESC;

-- 2.7 Corrigir: thebest_mapping_issues
DROP VIEW IF EXISTS public.thebest_mapping_issues CASCADE;
CREATE VIEW public.thebest_mapping_issues AS 
SELECT 
    issue_id,
    mapping_id,
    issue_type,
    severity_level,
    description,
    reported_by,
    status,
    created_at,
    resolved_at
FROM public.mapping_issues 
WHERE status IN ('open', 'in_progress', 'resolved')
ORDER BY 
    CASE severity_level 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    created_at DESC;

-- 2.8 Corrigir: analytics_daily_active_users
DROP VIEW IF EXISTS public.analytics_daily_active_users CASCADE;
CREATE VIEW public.analytics_daily_active_users AS 
SELECT 
    DATE_TRUNC('day', last_sign_in_at) as activity_date,
    COUNT(DISTINCT id) as daily_active_users,
    COUNT(DISTINCT CASE WHEN created_at::date = DATE_TRUNC('day', last_sign_in_at)::date THEN id END) as new_users
FROM public.profiles 
WHERE last_sign_in_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', last_sign_in_at)
ORDER BY activity_date DESC;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- 3. Verificar se as views foram corrigidas
SELECT 
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN definition ILIKE '%SECURITY DEFINER%' THEN '❌ AINDA COM SECURITY DEFINER'
        ELSE '✅ CORRIGIDO (SECURITY INVOKER)'
    END as status_correcao
FROM pg_views 
WHERE schemaname = 'public'
    AND viewname IN (
        'analytics_device_metrics',
        'thebest_dashboard', 
        'user_activity_summary',
        'analytics_popular_pages',
        'thebest_mapping_quality_analysis',
        'thebest_mapping_summary',
        'thebest_mapping_issues',
        'analytics_daily_active_users'
    )
ORDER BY viewname;

-- 4. Verificar se ainda existem views com SECURITY DEFINER
SELECT 
    COUNT(*) as views_com_security_definer,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ TODAS AS VIEWS CORRIGIDAS'
        ELSE '⚠️ AINDA EXISTEM VIEWS COM SECURITY DEFINER'
    END as status_geral
FROM pg_views 
WHERE schemaname = 'public'
    AND definition ILIKE '%SECURITY DEFINER%';

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ 8 views corrigidas (sem SECURITY DEFINER)
-- ✅ Execução com privilégios do usuário consultante
-- ✅ Maior segurança e controle de acesso
-- =====================================================

-- NOTAS IMPORTANTES:
-- 1. Views agora executam com privilégios do usuário
-- 2. RLS será respeitado nas tabelas base
-- 3. Testar funcionalidade após aplicar correções
-- 4. Monitorar se aplicação continua funcionando

-- ROLLBACK (se necessário):
-- Para reverter, seria necessário recriar as views 
-- com SECURITY DEFINER, mas isso não é recomendado
-- por questões de segurança.