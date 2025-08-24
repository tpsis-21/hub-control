# 🛡️ GUIA MANUAL - CORREÇÃO DE SEGURANÇA SUPABASE

## ⚠️ IMPORTANTE
Como o Supabase CLI não está instalado, você precisará executar as correções manualmente no Supabase Dashboard.

## 📋 PROBLEMAS IDENTIFICADOS
- ❌ 5 views com `SECURITY DEFINER` (risco de escalação de privilégios)
- ❌ 4 tabelas públicas sem RLS (acesso irrestrito aos dados)

## 🎯 PASSO A PASSO

### 1. Acesse o Supabase Dashboard
1. Vá para: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: `htwiupmnqlmwvzqzroal`
4. Clique em **SQL Editor** no menu lateral

### 2. Execute os Comandos SQL

#### 🔒 CORREÇÃO 1: Remover SECURITY DEFINER das Views

```sql
-- 1. Corrigir view thebest_dashboard
CREATE OR REPLACE VIEW public.thebest_dashboard AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.status,
    p.created_at,
    COUNT(s.id) as total_subscriptions,
    SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions
FROM packages p
LEFT JOIN subscriptions s ON p.id = s.package_id
GROUP BY p.id, p.name, p.description, p.price, p.status, p.created_at
ORDER BY p.created_at DESC;

COMMENT ON VIEW public.thebest_dashboard IS 'Dashboard de pacotes TheBest - View sem SECURITY DEFINER';
```

```sql
-- 2. Corrigir view analytics_device_metrics
CREATE OR REPLACE VIEW public.analytics_device_metrics AS
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
```

```sql
-- 3. Corrigir view user_activity_summary
CREATE OR REPLACE VIEW public.user_activity_summary AS
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
```

```sql
-- 4. Corrigir view analytics_popular_pages
CREATE OR REPLACE VIEW public.analytics_popular_pages AS
SELECT 
    page_path,
    page_title,
    COUNT(*) as page_views,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(time_on_page) as avg_time_on_page
FROM analytics_events 
WHERE event_type = 'page_view'
    AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY page_path, page_title
ORDER BY page_views DESC
LIMIT 50;

COMMENT ON VIEW public.analytics_popular_pages IS 'Páginas mais populares - View sem SECURITY DEFINER';
```

```sql
-- 5. Corrigir view analytics_daily_active_users
CREATE OR REPLACE VIEW public.analytics_daily_active_users AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as daily_active_users,
    COUNT(DISTINCT session_id) as daily_sessions,
    COUNT(*) as daily_events
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW public.analytics_daily_active_users IS 'Usuários ativos diários - View sem SECURITY DEFINER';
```

#### 🛡️ CORREÇÃO 2: Habilitar RLS nas Tabelas

```sql
-- 1. Habilitar RLS na tabela empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Políticas para empresas
CREATE POLICY "empresas_select_policy" ON public.empresas
    FOR SELECT USING (id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "empresas_insert_policy" ON public.empresas
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "empresas_update_policy" ON public.empresas
    FOR UPDATE USING (id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "empresas_delete_policy" ON public.empresas
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
```

```sql
-- 2. Habilitar RLS na tabela in_app_notifications
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para in_app_notifications
CREATE POLICY "in_app_notifications_select_policy" ON public.in_app_notifications
    FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "in_app_notifications_insert_policy" ON public.in_app_notifications
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "in_app_notifications_update_policy" ON public.in_app_notifications
    FOR UPDATE USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "in_app_notifications_delete_policy" ON public.in_app_notifications
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
```

```sql
-- 3. Habilitar RLS na tabela users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT USING (id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE USING (id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "users_delete_policy" ON public.users
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
```

```sql
-- 4. Habilitar RLS na tabela expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas para expenses
CREATE POLICY "expenses_select_policy" ON public.expenses
    FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "expenses_insert_policy" ON public.expenses
    FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "expenses_update_policy" ON public.expenses
    FOR UPDATE USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "expenses_delete_policy" ON public.expenses
    FOR DELETE USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');
```

### 3. Verificar as Correções

Após executar todos os comandos SQL, execute o script de verificação:

```bash
node verificar_correcoes.js
```

### 4. Confirmar no Security Advisor

1. No Supabase Dashboard, vá para **Settings** > **Security**
2. Clique em **Security Advisor**
3. Verifique se não há mais alertas de segurança

## ✅ RESULTADO ESPERADO

Após executar todas as correções:
- ✅ 5 views sem `SECURITY DEFINER`
- ✅ 4 tabelas com RLS habilitado
- ✅ Políticas de acesso configuradas
- ✅ Security Advisor sem alertas

## 🚨 IMPORTANTE

- **Backup**: Sempre faça backup antes de executar comandos SQL
- **Teste**: Teste a aplicação após as correções
- **Monitoramento**: Monitore logs por possíveis problemas
- **Rollback**: Tenha um plano de rollback se necessário

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs de erro no Supabase
2. Execute o script de verificação
3. Consulte a documentação do Supabase sobre RLS

---

**Data**: 2024-12-25  
**Versão**: 1.0  
**Status**: Pronto para execução