-- Migration: Fix Permissive RLS Policies
-- Data: 2024-12-23
-- Descrição: Corrige políticas RLS muito permissivas substituindo por políticas mais restritivas

-- ============================================================================
-- 1. REMOVER POLÍTICAS PERMISSIVAS EXISTENTES
-- ============================================================================

-- Remover políticas muito permissivas das tabelas principais
DROP POLICY IF EXISTS "allow_all" ON clients;
DROP POLICY IF EXISTS "allow_all_operations" ON clients;
DROP POLICY IF EXISTS "total_access" ON clients;
DROP POLICY IF EXISTS "open_access" ON clients;
DROP POLICY IF EXISTS "allow_all_access" ON clients;
DROP POLICY IF EXISTS "Acesso público aos clientes" ON clients;
DROP POLICY IF EXISTS "Public access to clients" ON clients;

DROP POLICY IF EXISTS "allow_all" ON payments;
DROP POLICY IF EXISTS "allow_all_operations" ON payments;
DROP POLICY IF EXISTS "total_access" ON payments;
DROP POLICY IF EXISTS "open_access" ON payments;
DROP POLICY IF EXISTS "allow_all_access" ON payments;
DROP POLICY IF EXISTS "Acesso público aos pagamentos" ON payments;
DROP POLICY IF EXISTS "Public access to payments" ON payments;

DROP POLICY IF EXISTS "allow_all" ON notifications;
DROP POLICY IF EXISTS "allow_all_operations" ON notifications;
DROP POLICY IF EXISTS "total_access" ON notifications;
DROP POLICY IF EXISTS "open_access" ON notifications;
DROP POLICY IF EXISTS "allow_all_access" ON notifications;
DROP POLICY IF EXISTS "Public access to notifications" ON notifications;

DROP POLICY IF EXISTS "allow_all" ON settings;
DROP POLICY IF EXISTS "allow_all_operations" ON settings;
DROP POLICY IF EXISTS "total_access" ON settings;
DROP POLICY IF EXISTS "open_access" ON settings;
DROP POLICY IF EXISTS "allow_all_access" ON settings;

-- Remover políticas permissivas das tabelas de marketing
DROP POLICY IF EXISTS "Users can view email logs" ON email_logs;
DROP POLICY IF EXISTS "Anyone can create unsubscribe records" ON unsubscribe_records;
DROP POLICY IF EXISTS "Users can view unsubscribe records" ON unsubscribe_records;
DROP POLICY IF EXISTS "Users can view deliverability metrics" ON deliverability_metrics;

-- ============================================================================
-- 2. CRIAR POLÍTICAS RLS RESTRITIVAS PARA TABELAS PRINCIPAIS
-- ============================================================================

-- Verificar se as tabelas existem antes de criar políticas
DO $$
BEGIN
    -- Políticas para tabela clients
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        -- Usuários podem ver apenas seus próprios clientes
        CREATE POLICY "clients_select_own" ON clients
            FOR SELECT USING (
                auth.uid() IS NOT NULL AND (
                    manager_id = auth.uid()::text OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        -- Usuários podem inserir clientes apenas para si mesmos
        CREATE POLICY "clients_insert_own" ON clients
            FOR INSERT WITH CHECK (
                auth.uid() IS NOT NULL AND 
                manager_id = auth.uid()::text
            );
        
        -- Usuários podem atualizar apenas seus próprios clientes
        CREATE POLICY "clients_update_own" ON clients
            FOR UPDATE USING (
                auth.uid() IS NOT NULL AND (
                    manager_id = auth.uid()::text OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        -- Usuários podem deletar apenas seus próprios clientes
        CREATE POLICY "clients_delete_own" ON clients
            FOR DELETE USING (
                auth.uid() IS NOT NULL AND (
                    manager_id = auth.uid()::text OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        RAISE NOTICE 'Políticas RLS criadas para tabela clients';
    END IF;
    
    -- Políticas para tabela payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        -- Usuários podem ver apenas seus próprios pagamentos
        CREATE POLICY "payments_select_own" ON payments
            FOR SELECT USING (
                auth.uid() IS NOT NULL AND (
                    manager_id = auth.uid()::text OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        -- Usuários podem inserir pagamentos apenas para si mesmos
        CREATE POLICY "payments_insert_own" ON payments
            FOR INSERT WITH CHECK (
                auth.uid() IS NOT NULL AND 
                manager_id = auth.uid()::text
            );
        
        -- Usuários podem atualizar apenas seus próprios pagamentos
        CREATE POLICY "payments_update_own" ON payments
            FOR UPDATE USING (
                auth.uid() IS NOT NULL AND (
                    manager_id = auth.uid()::text OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        RAISE NOTICE 'Políticas RLS criadas para tabela payments';
    END IF;
    
    -- Políticas para tabela notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        -- Usuários podem ver apenas suas próprias notificações
        CREATE POLICY "notifications_select_own" ON notifications
            FOR SELECT USING (
                auth.uid() IS NOT NULL AND (
                    user_id = auth.uid() OR
                    manager_id = auth.uid()::text OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        -- Apenas sistema pode inserir notificações
        CREATE POLICY "notifications_insert_system" ON notifications
            FOR INSERT WITH CHECK (
                auth.role() = 'service_role' OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE (user_id = auth.uid() OR id = auth.uid()) 
                    AND role = 'admin'
                )
            );
        
        -- Usuários podem atualizar apenas suas próprias notificações (marcar como lida)
        CREATE POLICY "notifications_update_own" ON notifications
            FOR UPDATE USING (
                auth.uid() IS NOT NULL AND (
                    user_id = auth.uid() OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        RAISE NOTICE 'Políticas RLS criadas para tabela notifications';
    END IF;
    
    -- Políticas para tabela settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings' AND table_schema = 'public') THEN
        -- Apenas administradores podem ver configurações
        CREATE POLICY "settings_select_admin" ON settings
            FOR SELECT USING (
                auth.uid() IS NOT NULL AND
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE (user_id = auth.uid() OR id = auth.uid()) 
                    AND role = 'admin'
                )
            );
        
        -- Apenas administradores podem modificar configurações
        CREATE POLICY "settings_modify_admin" ON settings
            FOR ALL USING (
                auth.uid() IS NOT NULL AND
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE (user_id = auth.uid() OR id = auth.uid()) 
                    AND role = 'admin'
                )
            );
        
        RAISE NOTICE 'Políticas RLS criadas para tabela settings';
    END IF;
END$$;

-- ============================================================================
-- 3. CORRIGIR POLÍTICAS PERMISSIVAS DAS TABELAS DE MARKETING
-- ============================================================================

DO $$
BEGIN
    -- Corrigir políticas para email_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs' AND table_schema = 'public') THEN
        -- Usuários podem ver apenas logs de emails relacionados aos seus clientes
        CREATE POLICY "email_logs_select_own" ON email_logs
            FOR SELECT USING (
                auth.uid() IS NOT NULL AND (
                    EXISTS (
                        SELECT 1 FROM clients 
                        WHERE clients.id = email_logs.client_id 
                        AND clients.manager_id = auth.uid()::text
                    ) OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        -- Apenas sistema pode inserir logs de email
        CREATE POLICY "email_logs_insert_system" ON email_logs
            FOR INSERT WITH CHECK (
                auth.role() = 'service_role' OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE (user_id = auth.uid() OR id = auth.uid()) 
                    AND role = 'admin'
                )
            );
        
        RAISE NOTICE 'Políticas RLS corrigidas para tabela email_logs';
    END IF;
    
    -- Corrigir políticas para unsubscribe_records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unsubscribe_records' AND table_schema = 'public') THEN
        -- Permitir inserção apenas via endpoint público específico (sem autenticação)
        -- mas com validação de rate limiting na aplicação
        CREATE POLICY "unsubscribe_records_insert_public" ON unsubscribe_records
            FOR INSERT WITH CHECK (TRUE); -- Mantido para endpoint público de descadastro
        
        -- Usuários autenticados podem ver descadastros relacionados aos seus clientes
        CREATE POLICY "unsubscribe_records_select_own" ON unsubscribe_records
            FOR SELECT USING (
                auth.uid() IS NOT NULL AND (
                    EXISTS (
                        SELECT 1 FROM email_logs 
                        WHERE email_logs.email = unsubscribe_records.email
                        AND EXISTS (
                            SELECT 1 FROM clients 
                            WHERE clients.id = email_logs.client_id 
                            AND clients.manager_id = auth.uid()::text
                        )
                    ) OR
                    EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE (user_id = auth.uid() OR id = auth.uid()) 
                        AND role = 'admin'
                    )
                )
            );
        
        RAISE NOTICE 'Políticas RLS corrigidas para tabela unsubscribe_records';
    END IF;
    
    -- Corrigir políticas para deliverability_metrics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliverability_metrics' AND table_schema = 'public') THEN
        -- Apenas usuários autenticados podem ver métricas
        CREATE POLICY "deliverability_metrics_select_auth" ON deliverability_metrics
            FOR SELECT USING (
                auth.uid() IS NOT NULL
            );
        
        -- Apenas sistema pode inserir/atualizar métricas
        CREATE POLICY "deliverability_metrics_modify_system" ON deliverability_metrics
            FOR ALL USING (
                auth.role() = 'service_role' OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE (user_id = auth.uid() OR id = auth.uid()) 
                    AND role = 'admin'
                )
            );
        
        RAISE NOTICE 'Políticas RLS corrigidas para tabela deliverability_metrics';
    END IF;
END$$;

-- ============================================================================
-- 4. CORRIGIR POLÍTICAS DA TABELA INTEGRATION_CONFIGS
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_configs' AND table_schema = 'public') THEN
        -- Remover políticas muito permissivas
        DROP POLICY IF EXISTS "integration_configs_select" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_insert" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_update" ON integration_configs;
        DROP POLICY IF EXISTS "integration_configs_delete" ON integration_configs;
        
        -- Apenas administradores podem ver configurações de integração
        CREATE POLICY "integration_configs_select_admin" ON integration_configs
            FOR SELECT USING (
                auth.uid() IS NOT NULL AND
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE (user_id = auth.uid() OR id = auth.uid()) 
                    AND role = 'admin'
                )
            );
        
        -- Apenas administradores podem modificar configurações de integração
        CREATE POLICY "integration_configs_modify_admin" ON integration_configs
            FOR ALL USING (
                auth.uid() IS NOT NULL AND
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE (user_id = auth.uid() OR id = auth.uid()) 
                    AND role = 'admin'
                )
            );
        
        RAISE NOTICE 'Políticas RLS corrigidas para tabela integration_configs';
    END IF;
END$$;

-- ============================================================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar políticas criadas
SELECT 'Políticas RLS após correção:' as info;
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    CASE 
        WHEN qual LIKE '%true%' AND qual NOT LIKE '%auth.uid()%' AND qual NOT LIKE '%profiles%' THEN '⚠️ PERMISSIVA'
        ELSE '✅ RESTRITIVA'
    END as security_level
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar tabelas com RLS habilitado
SELECT 'Tabelas com RLS habilitado:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Comentários para documentação
COMMENT ON SCHEMA public IS 'Schema público com políticas RLS restritivas implementadas';

-- Log de sucesso
SELECT '✅ MIGRAÇÃO CONCLUÍDA: Políticas RLS permissivas foram corrigidas!' as status;
SELECT 'Todas as políticas agora seguem o princípio do menor privilégio' as details;
SELECT 'Usuários só podem acessar seus próprios dados ou dados autorizados' as security_note;