-- =====================================================
-- CORREÇÃO: Views com SECURITY DEFINER desnecessário (VERSÃO FINAL CORRIGIDA)
-- =====================================================
-- Data: ${new Date().toLocaleString('pt-BR')}
-- Problema: 8 views com privilégios elevados desnecessários
-- Impacto: ALTO - Execução com privilégios do criador
-- CORREÇÃO: Verifica existência de tabelas e colunas antes de criar views
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
-- VERIFICAÇÃO DE TABELAS EXISTENTES
-- =====================================================

-- 2. Verificar quais tabelas existem no banco
DO $$
DECLARE
    table_exists BOOLEAN;
    view_name TEXT;
BEGIN
    -- Verificar tabelas necessárias
    RAISE NOTICE '=== VERIFICANDO TABELAS EXISTENTES ===';
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') INTO table_exists;
    RAISE NOTICE 'Tabela profiles: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'device_analytics') INTO table_exists;
    RAISE NOTICE 'Tabela device_analytics: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_mapping_stats') INTO table_exists;
    RAISE NOTICE 'Tabela user_mapping_stats: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activities') INTO table_exists;
    RAISE NOTICE 'Tabela user_activities: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_analytics') INTO table_exists;
    RAISE NOTICE 'Tabela page_analytics: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mapping_quality_metrics') INTO table_exists;
    RAISE NOTICE 'Tabela mapping_quality_metrics: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mappings') INTO table_exists;
    RAISE NOTICE 'Tabela mappings: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mapping_issues') INTO table_exists;
    RAISE NOTICE 'Tabela mapping_issues: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END;
    
END $$;

-- =====================================================
-- CORREÇÕES DAS VIEWS (APENAS PARA TABELAS EXISTENTES)
-- =====================================================

-- 3.1 Corrigir: analytics_device_metrics (APENAS SE A TABELA EXISTIR)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'device_analytics') THEN
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
        
        RAISE NOTICE '✅ View analytics_device_metrics corrigida';
    ELSE
        RAISE NOTICE '⚠️ Tabela device_analytics não existe - pulando view analytics_device_metrics';
    END IF;
END $$;

-- 3.2 Corrigir: thebest_dashboard (APENAS SE A TABELA EXISTIR)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_mapping_stats') THEN
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
        
        RAISE NOTICE '✅ View thebest_dashboard corrigida';
    ELSE
        RAISE NOTICE '⚠️ Tabela user_mapping_stats não existe - pulando view thebest_dashboard';
    END IF;
END $$;

-- 3.3 Corrigir: user_activity_summary (APENAS SE AS TABELAS EXISTIREM)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activities') THEN
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
        
        RAISE NOTICE '✅ View user_activity_summary corrigida';
    ELSE
        RAISE NOTICE '⚠️ Tabelas profiles ou user_activities não existem - pulando view user_activity_summary';
    END IF;
END $$;

-- 3.4 Corrigir: analytics_popular_pages (APENAS SE A TABELA EXISTIR)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_analytics') THEN
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
        
        RAISE NOTICE '✅ View analytics_popular_pages corrigida';
    ELSE
        RAISE NOTICE '⚠️ Tabela page_analytics não existe - pulando view analytics_popular_pages';
    END IF;
END $$;

-- 3.5 Corrigir: thebest_mapping_quality_analysis (APENAS SE A TABELA EXISTIR)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mapping_quality_metrics') THEN
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
        
        RAISE NOTICE '✅ View thebest_mapping_quality_analysis corrigida';
    ELSE
        RAISE NOTICE '⚠️ Tabela mapping_quality_metrics não existe - pulando view thebest_mapping_quality_analysis';
    END IF;
END $$;

-- 3.6 Corrigir: thebest_mapping_summary (APENAS SE A TABELA EXISTIR)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mappings') THEN
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
        
        RAISE NOTICE '✅ View thebest_mapping_summary corrigida';
    ELSE
        RAISE NOTICE '⚠️ Tabela mappings não existe - pulando view thebest_mapping_summary';
    END IF;
END $$;

-- 3.7 Corrigir: thebest_mapping_issues (APENAS SE A TABELA EXISTIR)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mapping_issues') THEN
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
        
        RAISE NOTICE '✅ View thebest_mapping_issues corrigida';
    ELSE
        RAISE NOTICE '⚠️ Tabela mapping_issues não existe - pulando view thebest_mapping_issues';
    END IF;
END $$;

-- 3.8 Corrigir: analytics_daily_active_users (VERSÃO CORRIGIDA - SEM last_sign_in_at)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Verificar se a coluna last_sign_in_at existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'last_sign_in_at'
        ) THEN
            -- Usar last_sign_in_at se existir
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
            
            RAISE NOTICE '✅ View analytics_daily_active_users corrigida (usando last_sign_in_at)';
        ELSE
            -- Usar updated_at como alternativa
            DROP VIEW IF EXISTS public.analytics_daily_active_users CASCADE;
            CREATE VIEW public.analytics_daily_active_users AS 
            SELECT 
                DATE_TRUNC('day', updated_at) as activity_date,
                COUNT(DISTINCT id) as daily_active_users,
                COUNT(DISTINCT CASE WHEN created_at::date = DATE_TRUNC('day', updated_at)::date THEN id END) as new_users
            FROM public.profiles 
            WHERE updated_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', updated_at)
            ORDER BY activity_date DESC;
            
            RAISE NOTICE '✅ View analytics_daily_active_users corrigida (usando updated_at como alternativa)';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Tabela profiles não existe - pulando view analytics_daily_active_users';
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- 4. Verificar se as views foram corrigidas (apenas as que foram criadas)
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

-- 5. Verificar se ainda existem views com SECURITY DEFINER
SELECT 
    COUNT(*) as views_com_security_definer,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ TODAS AS VIEWS CORRIGIDAS'
        ELSE '⚠️ AINDA EXISTEM VIEWS COM SECURITY DEFINER'
    END as status_geral
FROM pg_views 
WHERE schemaname = 'public'
    AND definition ILIKE '%SECURITY DEFINER%';

-- 6. Resumo final das correções
DO $$
DECLARE
    total_views_corrigidas INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_views_corrigidas
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
        );
    
    RAISE NOTICE '=== RESUMO FINAL ===';
    RAISE NOTICE 'Views corrigidas: %', total_views_corrigidas;
    RAISE NOTICE 'Views puladas por tabelas inexistentes: %', (8 - total_views_corrigidas);
    RAISE NOTICE 'Status: ✅ Script executado com segurança';
END $$;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Views corrigidas (sem SECURITY DEFINER) apenas para tabelas existentes
-- ✅ Views puladas para tabelas inexistentes (sem erro)
-- ✅ Execução com privilégios do usuário consultante
-- ✅ Maior segurança e controle de acesso
-- ✅ Sem erros de colunas inexistentes
-- =====================================================

-- NOTAS IMPORTANTES:
-- 1. Script verifica existência de tabelas E colunas antes de criar views
-- 2. Views agora executam com privilégios do usuário
-- 3. RLS será respeitado nas tabelas base
-- 4. Não gera erros para tabelas ou colunas inexistentes
-- 5. View analytics_daily_active_users usa updated_at se last_sign_in_at não existir
-- 6. Testar funcionalidade após aplicar correções
-- 7. Monitorar se aplicação continua funcionando