-- Migration: Update TheBest Dashboard View
-- Description: Atualiza view thebest_dashboard para incluir dados dos mapeamentos
-- Date: 2025-01-14
-- Author: Sistema de Integração TheBest ↔ HubControl

-- =====================================================
-- 1. REMOVER VIEW EXISTENTE (SE HOUVER)
-- =====================================================

DROP VIEW IF EXISTS thebest_dashboard;

-- =====================================================
-- 2. CRIAR NOVA VIEW COM MAPEAMENTOS
-- =====================================================

CREATE VIEW thebest_dashboard AS
SELECT 
  -- Dados do pacote TheBest
  tp.id,
  tp.thebest_package_id as thebest_package_id,
  tp.package_name as package_name,
  CASE 
    WHEN NOT tp.is_active THEN 'inactive'
    WHEN NOT tp.is_available THEN 'unavailable'
    ELSE 'active'
  END as package_status,
  tp.price as thebest_price,
  tp.currency,
  tp.billing_cycle,
  tp.next_due_date,
  tp.created_at,
  tp.updated_at,
  tp.synced_at,
  tp.user_id,
  
  -- Contadores de renovações
  COALESCE(renewal_stats.total_renewals, 0) as total_renewals,
  COALESCE(renewal_stats.pending_renewals, 0) as pending_renewals,
  COALESCE(renewal_stats.completed_renewals, 0) as completed_renewals,
  COALESCE(renewal_stats.last_renewal_date, null) as last_renewal_date,
  COALESCE(renewal_stats.total_renewal_amount, 0) as total_renewal_amount
  
FROM thebest_packages tp

-- Join com estatísticas de renovações
LEFT JOIN (
  SELECT 
    package_id,
    COUNT(*) as total_renewals,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_renewals,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_renewals,
    MAX(renewal_date) as last_renewal_date,
    SUM(amount) as total_renewal_amount
  FROM thebest_renewals
  GROUP BY package_id
) renewal_stats ON renewal_stats.package_id = tp.id

-- Ordenação padrão
ORDER BY 
  tp.user_id,
  CASE 
    WHEN tp.status = 'active' THEN 0
    WHEN tp.status = 'pending' THEN 1
    WHEN tp.status = 'suspended' THEN 2
    ELSE 3
  END,
  tp.package_name;

-- =====================================================
-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON VIEW thebest_dashboard IS 'Dashboard completo dos pacotes TheBest com informações de mapeamento para planos HubControl';

-- =====================================================
-- 4. CRIAR VIEW DE ESTATÍSTICAS RESUMIDAS
-- =====================================================

CREATE VIEW thebest_mapping_summary AS
SELECT 
  tp.config_id,
  
  -- Contadores de pacotes
  COUNT(tp.id) as total_packages,
  COUNT(CASE WHEN tp.is_active = true THEN 1 END) as active_packages,
  COUNT(CASE WHEN tp.is_active = false THEN 1 END) as inactive_packages,
  COUNT(CASE WHEN tp.is_available = false THEN 1 END) as unavailable_packages,
  COUNT(CASE WHEN tp.is_available = true THEN 1 END) as available_packages,
  
  -- Contadores de renovações
  COUNT(tr.id) as total_renewals,
  COUNT(CASE WHEN tr.status = 'pending' THEN 1 END) as pending_renewals,
  COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) as completed_renewals,
  
  -- Datas importantes
  MIN(tp.created_at) as first_package_created,
  MAX(tp.created_at) as last_package_created,
  MAX(tr.created_at) as last_renewal_created,
  MAX(tp.synced_at) as last_sync_at,
  
  -- Estatísticas de preços
  MIN(tp.price) as min_package_price,
  MAX(tp.price) as max_package_price,
  ROUND(AVG(tp.price), 2) as avg_package_price,
  
  -- Estatísticas de renovações
  MIN(tr.amount) as min_renewal_amount,
  MAX(tr.amount) as max_renewal_amount,
  ROUND(AVG(tr.amount), 2) as avg_renewal_amount,
  SUM(tr.amount) as total_renewal_amount,
  
  -- Timestamp da consulta
  NOW() as generated_at
  
FROM thebest_packages tp
LEFT JOIN thebest_renewals tr ON tr.package_id = tp.id
GROUP BY tp.config_id
ORDER BY tp.config_id;

-- Comentário da view de resumo
COMMENT ON VIEW thebest_mapping_summary IS 'Resumo estatístico dos mapeamentos TheBest por configuração';

-- =====================================================
-- 5. CRIAR VIEW DE PROBLEMAS DE MAPEAMENTO
-- =====================================================

CREATE VIEW thebest_mapping_issues AS
SELECT 
  tp.id as package_id,
  tp.thebest_package_id as thebest_package_id,
  tp.package_name as package_name,
  tp.price,
  tp.currency,
  CASE 
    WHEN NOT tp.is_active THEN 'inactive'
    WHEN NOT tp.is_available THEN 'unavailable'
    ELSE 'active'
  END as status,
  tp.user_id,
  
  -- Status do pacote
  CASE 
    WHEN NOT tp.is_active THEN 'INACTIVE_PACKAGE'
    WHEN NOT tp.is_available THEN 'UNAVAILABLE_PACKAGE'
    WHEN tp.price IS NULL OR tp.price <= 0 THEN 'INVALID_PRICE'
    WHEN tp.package_name IS NULL OR tp.package_name = '' THEN 'MISSING_NAME'
    ELSE 'OK'
  END as package_status,
  
  -- Problemas identificados
  ARRAY_REMOVE(ARRAY[
    CASE WHEN NOT tp.is_active THEN 'Pacote inativo' END,
    CASE WHEN NOT tp.is_available THEN 'Pacote indisponível' END,
    CASE WHEN tp.price IS NULL OR tp.price <= 0 THEN 'Preço inválido ou ausente' END,
    CASE WHEN tp.package_name IS NULL OR tp.package_name = '' THEN 'Nome do pacote ausente' END,
    CASE WHEN tp.synced_at IS NULL THEN 'Nunca sincronizado' END,
    CASE WHEN tp.synced_at < NOW() - INTERVAL '7 days' THEN 'Sincronização desatualizada' END
  ], NULL) as issues,
  
  -- Contadores de renovações
  renewal_stats.total_renewals,
  renewal_stats.pending_renewals,
  renewal_stats.completed_renewals,
  renewal_stats.last_renewal_date,
  renewal_stats.total_renewal_amount,
  
  -- Datas
  tp.created_at as package_created_at,
  tp.synced_at as last_sync_at,
  tp.updated_at as package_updated_at
  
FROM thebest_packages tp
LEFT JOIN (
  SELECT 
    package_id,
    COUNT(*) as total_renewals,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_renewals,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_renewals,
    MAX(renewal_date) as last_renewal_date,
    SUM(amount) as total_renewal_amount
  FROM thebest_renewals
  GROUP BY package_id
) renewal_stats ON renewal_stats.package_id = tp.id

-- Filtrar apenas pacotes com problemas
WHERE (
  (NOT tp.is_active OR NOT tp.is_available)  -- Status problemáticos
  OR tp.price IS NULL OR tp.price <= 0  -- Preço inválido
  OR tp.package_name IS NULL OR tp.package_name = ''  -- Nome ausente
  OR tp.synced_at IS NULL  -- Nunca sincronizado
  OR tp.synced_at < NOW() - INTERVAL '7 days'  -- Sincronização desatualizada
)

ORDER BY 
  CASE 
    WHEN NOT tp.is_active THEN 1
    WHEN NOT tp.is_available THEN 2
    WHEN tp.price IS NULL OR tp.price <= 0 THEN 4
    ELSE 5
  END,
  tp.user_id,
  tp.package_name;

-- Comentário da view de problemas
COMMENT ON VIEW thebest_mapping_issues IS 'Identifica problemas e incompatibilidades nos mapeamentos TheBest';

-- =====================================================
-- 6. REGISTRAR MIGRAÇÃO
-- =====================================================

-- Migração registrada automaticamente pelo Supabase

-- Log da migração
-- Migration 20250114000003_update_thebest_dashboard_view completed successfully
-- Views criadas:
-- - thebest_dashboard (atualizada com mapeamentos)
-- - thebest_mapping_summary (estatísticas por configuração)
-- - thebest_mapping_issues (problemas de mapeamento)
-- Próximo passo: Implementar funções de sincronização