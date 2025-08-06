-- 🚀 Script de Otimização Pós-Limpeza
-- Execute APÓS a limpeza de tabelas para otimizar performance

-- ==========================================
-- 1. ANÁLISE INICIAL DO BANCO
-- ==========================================

-- Verificar tamanho atual do banco
SELECT 
    'TAMANHO DO BANCO' as metrica,
    pg_size_pretty(pg_database_size(current_database())) as valor,
    'Tamanho total do banco de dados' as descricao;

-- Verificar tabelas maiores
SELECT 
    'TABELAS MAIORES' as categoria,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as tamanho,
    pg_size_pretty(pg_relation_size('public.'||table_name)) as tamanho_dados,
    pg_size_pretty(pg_total_relation_size('public.'||table_name) - pg_relation_size('public.'||table_name)) as tamanho_indices
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size('public.'||table_name) DESC
LIMIT 10;

-- ==========================================
-- 2. LIMPEZA DE ESPAÇO MORTO (VACUUM)
-- ==========================================

-- Vacuum completo nas tabelas principais
VACUUM ANALYZE profiles;
VACUUM ANALYZE user_settings;
VACUUM ANALYZE system_config;
VACUUM ANALYZE audit_logs;
VACUUM ANALYZE mfa_tokens;
VACUUM ANALYZE security_alerts;
VACUUM ANALYZE financial_transactions;
VACUUM ANALYZE in_app_notifications;
VACUUM ANALYZE payments;

-- Verificar estatísticas de vacuum
SELECT 
    'ESTATÍSTICAS VACUUM' as categoria,
    schemaname,
    relname as tabela,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY last_vacuum DESC NULLS LAST;

-- ==========================================
-- 3. REINDEXAÇÃO INTELIGENTE
-- ==========================================

-- Verificar índices que precisam de reindexação
SELECT 
    'ÍNDICES PARA REINDEXAR' as categoria,
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamanho_indice
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 100  -- Índices pouco usados
ORDER BY pg_relation_size(indexrelid) DESC;

-- Reindexar tabelas principais (execute com cuidado em produção)
-- REINDEX TABLE profiles;
-- REINDEX TABLE user_settings;
-- REINDEX TABLE system_config;
-- REINDEX TABLE audit_logs;
-- REINDEX TABLE financial_transactions;

-- ==========================================
-- 4. ATUALIZAÇÃO DE ESTATÍSTICAS
-- ==========================================

-- Atualizar estatísticas do planejador de consultas
ANALYZE profiles;
ANALYZE user_settings;
ANALYZE system_config;
ANALYZE audit_logs;
ANALYZE mfa_tokens;
ANALYZE security_alerts;
ANALYZE financial_transactions;
ANALYZE in_app_notifications;
ANALYZE payments;

-- Verificar estatísticas atualizadas
SELECT 
    'ESTATÍSTICAS ATUALIZADAS' as categoria,
    schemaname,
    tablename,
    n_tup_ins as inserções,
    n_tup_upd as atualizações,
    n_tup_del as exclusões,
    n_live_tup as registros_ativos,
    n_dead_tup as registros_mortos
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ==========================================
-- 5. OTIMIZAÇÃO DE ÍNDICES
-- ==========================================

-- Verificar índices não utilizados
SELECT 
    'ÍNDICES NÃO UTILIZADOS' as categoria,
    schemaname,
    tablename,
    indexname,
    idx_scan as vezes_usado,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamanho
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Verificar índices duplicados ou redundantes
SELECT 
    'VERIFICAÇÃO DE ÍNDICES DUPLICADOS' as categoria,
    t.relname as tabela,
    array_agg(i.relname) as indices,
    array_agg(pg_get_indexdef(i.oid)) as definicoes
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relkind = 'r'
GROUP BY t.relname, ix.indkey
HAVING COUNT(*) > 1;

-- ==========================================
-- 6. VERIFICAÇÃO DE FRAGMENTAÇÃO
-- ==========================================

-- Verificar fragmentação das tabelas
SELECT 
    'FRAGMENTAÇÃO' as categoria,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho_total,
    ROUND(
        (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) * 100.0 / 
        NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0), 2
    ) as percentual_indices
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==========================================
-- 7. CONFIGURAÇÕES DE PERFORMANCE
-- ==========================================

-- Verificar configurações atuais importantes
SELECT 
    'CONFIGURAÇÕES PERFORMANCE' as categoria,
    name as parametro,
    setting as valor_atual,
    unit as unidade,
    short_desc as descricao
FROM pg_settings
WHERE name IN (
    'shared_buffers',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem',
    'checkpoint_completion_target',
    'wal_buffers',
    'default_statistics_target'
)
ORDER BY name;

-- ==========================================
-- 8. LIMPEZA DE LOGS ANTIGOS
-- ==========================================

-- Limpar logs de auditoria antigos (mais de 90 dias)
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '90 days'
  AND action NOT IN ('login', 'logout', 'password_change', 'mfa_setup');

-- Verificar resultado da limpeza
SELECT 
    'LIMPEZA DE LOGS' as categoria,
    COUNT(*) as total_logs_restantes,
    MIN(created_at) as log_mais_antigo,
    MAX(created_at) as log_mais_recente
FROM audit_logs;

-- ==========================================
-- 9. OTIMIZAÇÃO DE CONSULTAS FREQUENTES
-- ==========================================

-- Criar índices para consultas frequentes se não existirem

-- Índice para consultas de auditoria por usuário e data
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date 
ON audit_logs(user_id, created_at DESC);

-- Índice para consultas de transações financeiras por status
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status 
ON financial_transactions(status, created_at DESC);

-- Índice para consultas de notificações não lidas
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON in_app_notifications(user_id, read_at) 
WHERE read_at IS NULL;

-- Índice para consultas de alertas de segurança ativos
CREATE INDEX IF NOT EXISTS idx_security_alerts_active 
ON security_alerts(status, created_at DESC) 
WHERE status = 'active';

-- ==========================================
-- 10. VERIFICAÇÃO FINAL DE INTEGRIDADE
-- ==========================================

-- Verificar integridade referencial
SELECT 
    'INTEGRIDADE REFERENCIAL' as categoria,
    conname as constraint_name,
    conrelid::regclass as tabela,
    confrelid::regclass as tabela_referenciada
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace;

-- Verificar políticas RLS ativas
SELECT 
    'POLÍTICAS RLS ATIVAS' as categoria,
    schemaname,
    tablename,
    COUNT(*) as total_politicas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY total_politicas DESC;

-- Verificar saúde da segurança
SELECT security_health_check();

-- ==========================================
-- 11. RELATÓRIO FINAL DE OTIMIZAÇÃO
-- ==========================================

SELECT 
    '🎉 OTIMIZAÇÃO CONCLUÍDA' as status,
    pg_size_pretty(pg_database_size(current_database())) as tamanho_final,
    (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    ) as total_tabelas,
    (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE schemaname = 'public'
    ) as total_indices,
    (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) as total_politicas_rls;

-- ==========================================
-- 12. RECOMENDAÇÕES DE MONITORAMENTO
-- ==========================================

/*
📊 MÉTRICAS PARA MONITORAMENTO CONTÍNUO:

1. 📈 PERFORMANCE:
   - Tempo de resposta das consultas principais
   - Uso de CPU e memória
   - Taxa de cache hit dos índices
   - Frequência de vacuum automático

2. 💾 ARMAZENAMENTO:
   - Crescimento do banco de dados
   - Fragmentação das tabelas
   - Uso de espaço pelos índices
   - Logs de auditoria acumulados

3. 🔒 SEGURANÇA:
   - Cobertura de políticas RLS
   - Alertas de segurança ativos
   - Tentativas de acesso não autorizado
   - Configurações de MFA

4. 🔧 MANUTENÇÃO:
   - Índices não utilizados
   - Estatísticas desatualizadas
   - Configurações de performance
   - Integridade referencial

📅 CRONOGRAMA DE MANUTENÇÃO RECOMENDADO:

- DIÁRIO: Verificar alertas de segurança
- SEMANAL: Analisar performance das consultas
- MENSAL: Executar vacuum e analyze completo
- TRIMESTRAL: Revisar e otimizar índices
- SEMESTRAL: Auditoria completa de segurança
- ANUAL: Revisão da arquitetura do banco

🚀 PRÓXIMOS PASSOS:

1. Configurar monitoramento automático
2. Implementar alertas de performance
3. Documentar procedimentos de manutenção
4. Treinar equipe em boas práticas
5. Estabelecer rotinas de backup
6. Planejar crescimento futuro

✅ VERIFICAÇÕES FINAIS:

□ Todas as consultas críticas estão performando bem
□ Políticas RLS estão funcionando corretamente
□ Índices estão sendo utilizados eficientemente
□ Não há alertas de segurança pendentes
□ Backup está funcionando corretamente
□ Monitoramento está configurado
□ Documentação está atualizada
□ Equipe foi treinada nos novos procedimentos

🎯 OBJETIVO ALCANÇADO:
Banco de dados otimizado, seguro e pronto para produção!
*/