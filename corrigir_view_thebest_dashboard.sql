-- =====================================================
-- CORREÇÃO DA VIEW thebest_dashboard
-- =====================================================
-- Problema: A view original tentava usar a tabela 'packages' que não existe
-- Solução: Usar 'thebest_packages' que é a tabela correta
-- =====================================================

-- 1. Remover a view existente (se houver)
DROP VIEW IF EXISTS public.thebest_dashboard;

-- 2. Criar a view corrigida usando as tabelas corretas
CREATE OR REPLACE VIEW public.thebest_dashboard AS 
SELECT 
    tp.thebest_package_id as package_id,
    tp.package_name as name,
    COALESCE(p.name, 'Plano não encontrado') as plan_description,
    COALESCE(p.price, 0) as price,
    tp.status,
    tp.created_at,
    tp.currency,
    tp.billing_cycle,
    COUNT(tp.id) as total_subscriptions,
    SUM(CASE WHEN tp.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
    SUM(CASE WHEN tp.status = 'suspended' THEN 1 ELSE 0 END) as suspended_subscriptions,
    SUM(CASE WHEN tp.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions
FROM thebest_packages tp
LEFT JOIN plans p ON p.panel_plan_id = tp.thebest_package_id
GROUP BY 
    tp.thebest_package_id, 
    tp.package_name, 
    p.name, 
    p.price, 
    tp.status, 
    tp.created_at, 
    tp.currency, 
    tp.billing_cycle
ORDER BY tp.created_at DESC;

-- 3. Adicionar comentário explicativo
COMMENT ON VIEW public.thebest_dashboard IS 'Dashboard de pacotes TheBest - View corrigida usando thebest_packages e plans';

-- 4. Testar a view (execute após criar a view)
SELECT 
    package_id,
    name,
    plan_description,
    price,
    status,
    total_subscriptions,
    active_subscriptions,
    suspended_subscriptions,
    cancelled_subscriptions
FROM public.thebest_dashboard 
LIMIT 10;

-- =====================================================
-- INSTRUÇÕES:
-- 1. Copie todo este código
-- 2. Cole no SQL Editor do Supabase
-- 3. Execute o script completo
-- 4. A view será criada sem erros
-- =====================================================