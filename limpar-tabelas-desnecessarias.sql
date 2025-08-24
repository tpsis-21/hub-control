-- ============================================
-- 🧹 LIMPEZA DE TABELAS DESNECESSÁRIAS
-- ============================================
-- Remove tabelas que não são essenciais para o funcionamento básico
-- Mantém apenas: profiles, user_settings, system_config, audit_logs
-- Data: 2024-12-23

-- ============================================
-- VERIFICAÇÃO INICIAL - LISTAR TODAS AS TABELAS
-- ============================================

-- Consulta para ver todas as tabelas existentes
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- ETAPA 1: DELETAR TABELAS DE MARKETING
-- ============================================

-- Tabelas de marketing e automação (geralmente desnecessárias)
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS automation_rules CASCADE;
DROP TABLE IF EXISTS campaign_recipients CASCADE;
DROP TABLE IF EXISTS email_deliveries CASCADE;

-- ============================================
-- ETAPA 2: DELETAR TABELAS DE NOTIFICAÇÕES COMPLEXAS
-- ============================================

-- Manter apenas notifications básica, remover sistema complexo
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_recipients CASCADE;
DROP TABLE IF EXISTS notification_deliveries CASCADE;
DROP TABLE IF EXISTS notification_channels CASCADE;
DROP TABLE IF EXISTS notification_rules CASCADE;

-- ============================================
-- ETAPA 3: DELETAR TABELAS DE COMPLIANCE AVANÇADO
-- ============================================

-- Remover sistema de compliance complexo
DROP TABLE IF EXISTS compliance_reports CASCADE;
DROP TABLE IF EXISTS compliance_findings CASCADE;
DROP TABLE IF EXISTS compliance_frameworks CASCADE;
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS data_classification CASCADE;

-- ============================================
-- ETAPA 4: DELETAR TABELAS DE INTEGRAÇÕES
-- ============================================

-- Remover integrações específicas
DROP TABLE IF EXISTS integration_configs CASCADE;
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS external_services CASCADE;

-- ============================================
-- ETAPA 5: DELETAR TABELAS DE UPLOADS AVANÇADOS
-- ============================================

-- Manter upload básico, remover auditoria complexa
DROP TABLE IF EXISTS file_uploads_audit CASCADE;
DROP TABLE IF EXISTS file_metadata CASCADE;
DROP TABLE IF EXISTS file_permissions CASCADE;

-- ============================================
-- ETAPA 6: DELETAR TABELAS DE CONHECIMENTO
-- ============================================

-- Remover base de conhecimento se não for usada
DROP TABLE IF EXISTS knowledge_base CASCADE;
DROP TABLE IF EXISTS knowledge_categories CASCADE;
DROP TABLE IF EXISTS knowledge_tags CASCADE;

-- ============================================
-- ETAPA 7: DELETAR TABELAS DE SEGURANÇA AVANÇADA
-- ============================================

-- Manter segurança básica, remover MFA complexo
DROP TABLE IF EXISTS mfa_tokens CASCADE;
DROP TABLE IF EXISTS security_alerts CASCADE;
DROP TABLE IF EXISTS security_incidents CASCADE;
DROP TABLE IF EXISTS threat_detection CASCADE;

-- ============================================
-- ETAPA 8: DELETAR ENUMS DESNECESSÁRIOS
-- ============================================

-- Remover tipos enum que não são mais usados
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;
DROP TYPE IF EXISTS delivery_status CASCADE;
DROP TYPE IF EXISTS recipient_type CASCADE;
DROP TYPE IF EXISTS audit_event_type CASCADE;
DROP TYPE IF EXISTS compliance_framework CASCADE;
DROP TYPE IF EXISTS data_classification CASCADE;
DROP TYPE IF EXISTS severity_level CASCADE;
DROP TYPE IF EXISTS compliance_status CASCADE;
DROP TYPE IF EXISTS finding_type CASCADE;
DROP TYPE IF EXISTS finding_status CASCADE;

-- ============================================
-- ETAPA 9: LIMPAR FUNÇÕES DESNECESSÁRIAS
-- ============================================

-- Remover funções relacionadas às tabelas deletadas
DROP FUNCTION IF EXISTS validate_mfa_code(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS generate_mfa_backup_codes(uuid) CASCADE;
DROP FUNCTION IF EXISTS send_notification(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS process_automation_rule(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_compliance_report() CASCADE;

-- ============================================
-- VERIFICAÇÃO FINAL - TABELAS RESTANTES
-- ============================================

-- Listar tabelas que devem permanecer
SELECT 
    'TABELAS RESTANTES' as status,
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Contar registros nas tabelas essenciais
SELECT 
    'profiles' as tabela,
    COUNT(*) as registros
FROM profiles

UNION ALL

SELECT 
    'user_settings' as tabela,
    COUNT(*) as registros
FROM user_settings

UNION ALL

SELECT 
    'audit_logs' as tabela,
    COUNT(*) as registros
FROM audit_logs

UNION ALL

SELECT 
    'notifications' as tabela,
    COUNT(*) as registros
FROM notifications;

-- ============================================
-- TABELAS ESSENCIAIS QUE DEVEM PERMANECER:
-- ============================================
-- ✅ profiles - Perfis de usuários
-- ✅ user_settings - Configurações de usuário
-- ✅ system_config - Configurações do sistema
-- ✅ audit_logs - Logs básicos de auditoria
-- ✅ notifications - Notificações simples
-- ✅ file_uploads - Uploads básicos (se existir)
-- ✅ servers - Servidores (se for parte do negócio)
-- ✅ clients - Clientes (se for parte do negócio)

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Acesse: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/sql
-- 2. Execute PRIMEIRO a consulta de verificação inicial
-- 3. Analise quais tabelas existem
-- 4. Execute as etapas de limpeza uma por vez
-- 5. Verifique o resultado final

-- ============================================
-- AVISO IMPORTANTE:
-- ============================================
-- ⚠️  ESTA AÇÃO É IRREVERSÍVEL!
-- ⚠️  TABELAS E DADOS SERÃO PERDIDOS!
-- ⚠️  FAÇA BACKUP SE NECESSÁRIO!
-- ⚠️  TESTE EM AMBIENTE DE DESENVOLVIMENTO!

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Sistema mais limpo e simples
-- Apenas tabelas essenciais
-- Melhor performance
-- Mais fácil de manter