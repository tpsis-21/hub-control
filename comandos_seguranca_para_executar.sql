COMMENT ON VIEW public.thebest_dashboard IS 'Dashboard de pacotes TheBest - View sem SECURITY DEFINER';

END IF;

END $$;

IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_sessions') THEN
        CREATE VIEW public.analytics_device_metrics AS
        SELECT 
            device_type,
            browser,
            os,
            environment,
            COUNT(DISTINCT session_id) as sessions,
            COUNT(DISTINCT user_id) as users,
            AVG(duration_seconds) as avg_session_duration
        FROM analytics_sessions 
        WHERE device_type IS NOT NULL
        GROUP BY device_type, browser, os, environment
        ORDER BY sessions DESC;

COMMENT ON VIEW public.analytics_device_metrics IS 'Métricas de dispositivos analytics - View sem SECURITY DEFINER';

END IF;

END $$;

IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        CREATE VIEW public.user_activity_summary AS
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

COMMENT ON VIEW public.user_activity_summary IS 'Resumo de atividade do usuário - View sem SECURITY DEFINER';

END IF;

END $$;

IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_events') THEN
        CREATE VIEW public.analytics_popular_pages AS
        SELECT 
            page_url,
            environment,
            COUNT(*) as page_views,
            COUNT(DISTINCT user_id) as unique_visitors,
            COUNT(DISTINCT session_id) as sessions
        FROM analytics_events 
        WHERE event_type = 'navigation' 
            AND page_url IS NOT NULL
        GROUP BY page_url, environment
        ORDER BY page_views DESC;

COMMENT ON VIEW public.analytics_popular_pages IS 'Páginas mais populares analytics - View sem SECURITY DEFINER';

END IF;

END $$;

IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_events') THEN
        CREATE VIEW public.analytics_daily_active_users AS
        SELECT 
            DATE(created_at) as date,
            environment,
            COUNT(DISTINCT user_id) as daily_active_users,
            COUNT(DISTINCT session_id) as sessions,
            COUNT(*) as events
        FROM analytics_events 
        WHERE user_id IS NOT NULL
        GROUP BY DATE(created_at), environment
        ORDER BY date DESC;

COMMENT ON VIEW public.analytics_daily_active_users IS 'Usuários ativos diários analytics - View sem SECURITY DEFINER';

END IF;

END $$;

DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;

DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;

DROP POLICY IF EXISTS "empresas_delete_policy" ON public.empresas;

ELSE
            -- Se não tem user_id, criar política mais permissiva
            CREATE POLICY "empresas_select_policy" ON public.empresas
              FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "empresas_admin_policy" ON public.empresas
              FOR ALL USING (
                EXISTS (
                  SELECT 1 FROM public.profiles 
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );

END IF;

END IF;

END $$;

DROP POLICY IF EXISTS "in_app_notifications_insert_policy" ON public.in_app_notifications;

DROP POLICY IF EXISTS "in_app_notifications_update_policy" ON public.in_app_notifications;

DROP POLICY IF EXISTS "in_app_notifications_delete_policy" ON public.in_app_notifications;

END IF;

END $$;

DROP POLICY IF EXISTS "users_insert_policy" ON public.users;

DROP POLICY IF EXISTS "users_update_policy" ON public.users;

DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

END IF;

END $$;

DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;

DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;

DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;

END IF;

END $$;