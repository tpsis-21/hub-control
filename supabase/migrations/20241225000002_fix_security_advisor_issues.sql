-- =====================================================
-- CORREÇÃO DE PROBLEMAS DO SUPABASE SECURITY ADVISOR
-- =====================================================
-- Migration para corrigir:
-- 1. Views com SECURITY DEFINER (5 views)
-- 2. Tabelas públicas sem RLS (4 tabelas)
--
-- Data: 2024-12-25
-- Migration: 20241225000002_fix_security_advisor_issues
-- =====================================================

-- =====================================================
-- PARTE 1: CORREÇÃO DE VIEWS COM SECURITY DEFINER
-- =====================================================

-- 1.1 Corrigir thebest_dashboard
-- Verificar se existe e recriar sem SECURITY DEFINER
DO $$
BEGIN
    -- Remover view se existir
    DROP VIEW IF EXISTS public.thebest_dashboard;
    
    -- Recriar apenas se as tabelas base existirem
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thebest_packages') THEN
        CREATE VIEW public.thebest_dashboard AS
        SELECT 
          p.id,
          p.user_id,
          p.thebest_package_id,
          p.package_name,
          p.status,
          p.price,
          p.currency,
          p.billing_cycle,
          p.next_due_date,
          p.created_at,
          p.updated_at,
          p.synced_at,
          COALESCE(COUNT(r.id), 0) as renewal_count,
          MAX(r.renewal_date) as last_renewal_date
        FROM thebest_packages p
        LEFT JOIN thebest_renewals r ON p.id = r.package_id
        GROUP BY p.id, p.user_id, p.thebest_package_id, p.package_name, 
                 p.status, p.price, p.currency, p.billing_cycle, 
                 p.next_due_date, p.created_at, p.updated_at, p.synced_at;
                 
        COMMENT ON VIEW public.thebest_dashboard IS 'Dashboard de pacotes TheBest - View sem SECURITY DEFINER';
    END IF;
END $$;

-- 1.2 Corrigir analytics_device_metrics
DO $$
BEGIN
    DROP VIEW IF EXISTS public.analytics_device_metrics;
    
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

-- 1.3 Corrigir user_activity_summary
DO $$
BEGIN
    DROP VIEW IF EXISTS public.user_activity_summary;
    
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

-- 1.4 Corrigir analytics_popular_pages
DO $$
BEGIN
    DROP VIEW IF EXISTS public.analytics_popular_pages;
    
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

-- 1.5 Corrigir analytics_daily_active_users
DO $$
BEGIN
    DROP VIEW IF EXISTS public.analytics_daily_active_users;
    
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

-- =====================================================
-- PARTE 2: HABILITAR RLS EM TABELAS PÚBLICAS
-- =====================================================

-- 2.1 Habilitar RLS na tabela empresas (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'empresas') THEN
        -- Habilitar RLS
        ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
        
        -- Remover políticas existentes
        DROP POLICY IF EXISTS "empresas_select_policy" ON public.empresas;
        DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
        DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
        DROP POLICY IF EXISTS "empresas_delete_policy" ON public.empresas;
        
        -- Criar políticas baseadas em user_id (assumindo que a coluna existe)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'empresas' AND column_name = 'user_id') THEN
            -- Política para visualização
            CREATE POLICY "empresas_select_policy" ON public.empresas
              FOR SELECT USING (
                user_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.profiles 
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );
            
            -- Política para inserção
            CREATE POLICY "empresas_insert_policy" ON public.empresas
              FOR INSERT WITH CHECK (
                user_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.profiles 
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );
            
            -- Política para atualização
            CREATE POLICY "empresas_update_policy" ON public.empresas
              FOR UPDATE USING (
                user_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.profiles 
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );
            
            -- Política para exclusão
            CREATE POLICY "empresas_delete_policy" ON public.empresas
              FOR DELETE USING (
                user_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.profiles 
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );
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

-- 2.2 Habilitar RLS na tabela in_app_notifications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'in_app_notifications') THEN
        ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
        
        -- Remover políticas existentes
        DROP POLICY IF EXISTS "in_app_notifications_select_policy" ON public.in_app_notifications;
        DROP POLICY IF EXISTS "in_app_notifications_insert_policy" ON public.in_app_notifications;
        DROP POLICY IF EXISTS "in_app_notifications_update_policy" ON public.in_app_notifications;
        DROP POLICY IF EXISTS "in_app_notifications_delete_policy" ON public.in_app_notifications;
        
        -- Política para visualização
        CREATE POLICY "in_app_notifications_select_policy" ON public.in_app_notifications
          FOR SELECT USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Política para inserção
        CREATE POLICY "in_app_notifications_insert_policy" ON public.in_app_notifications
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            ) OR
            user_id = auth.uid()
          );
        
        -- Política para atualização
        CREATE POLICY "in_app_notifications_update_policy" ON public.in_app_notifications
          FOR UPDATE USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Política para exclusão
        CREATE POLICY "in_app_notifications_delete_policy" ON public.in_app_notifications
          FOR DELETE USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
    END IF;
END $$;

-- 2.3 Habilitar RLS na tabela users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Remover políticas existentes
        DROP POLICY IF EXISTS "users_select_policy" ON public.users;
        DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
        DROP POLICY IF EXISTS "users_update_policy" ON public.users;
        DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
        
        -- Política para visualização
        CREATE POLICY "users_select_policy" ON public.users
          FOR SELECT USING (
            id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Política para inserção
        CREATE POLICY "users_insert_policy" ON public.users
          FOR INSERT WITH CHECK (
            id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Política para atualização
        CREATE POLICY "users_update_policy" ON public.users
          FOR UPDATE USING (
            id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Política para exclusão (apenas admin)
        CREATE POLICY "users_delete_policy" ON public.users
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
    END IF;
END $$;

-- 2.4 Habilitar RLS na tabela expenses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
        
        -- Remover políticas existentes
        DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
        DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
        DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
        DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;
        
        -- Política para visualização
        CREATE POLICY "expenses_select_policy" ON public.expenses
          FOR SELECT USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Política para inserção
        CREATE POLICY "expenses_insert_policy" ON public.expenses
          FOR INSERT WITH CHECK (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Política para atualização
        CREATE POLICY "expenses_update_policy" ON public.expenses
          FOR UPDATE USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Política para exclusão
        CREATE POLICY "expenses_delete_policy" ON public.expenses
          FOR DELETE USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
    END IF;
END $$;

-- =====================================================
-- PARTE 3: VERIFICAÇÕES FINAIS
-- =====================================================

-- Inserir log da migration
INSERT INTO public.migration_logs (migration_name, description, executed_at)
VALUES (
  '20241225000002_fix_security_advisor_issues',
  'Correção de problemas do Supabase Security Advisor: views com SECURITY DEFINER e tabelas sem RLS',
  NOW()
) ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

-- Esta migration corrige os seguintes problemas:
-- ✅ Views com SECURITY DEFINER removidas e recriadas
-- ✅ RLS habilitado em tabelas públicas
-- ✅ Políticas RLS implementadas com isolamento por usuário
-- ✅ Verificações condicionais para evitar erros
-- ✅ Suporte para administradores via tabela profiles
--
-- Próximos passos:
-- 1. Executar Supabase Security Advisor novamente
-- 2. Verificar se todos os problemas foram resolvidos
-- 3. Testar funcionalidade das aplicações
-- 4. Monitorar logs de erro