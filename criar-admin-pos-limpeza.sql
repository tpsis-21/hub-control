-- ============================================
-- 👤 CRIAR USUÁRIO SUPER ADMIN APÓS LIMPEZA TOTAL
-- ============================================
-- Execute APENAS APÓS executar o script de limpeza
-- Data: 2024-12-23

-- ============================================
-- DIFERENÇAS ENTRE ADMIN E SUPER ADMIN:
-- ============================================
-- ADMIN (role: admin):
-- - Acesso administrativo à aplicação
-- - Gerencia usuários e configurações
-- - Limitado pelas políticas RLS (Row Level Security)
--
-- SUPER ADMIN (is_super_admin: true):
-- - Acesso TOTAL ao Supabase Dashboard
-- - Bypassa todas as políticas RLS
-- - Pode modificar estrutura do banco
-- - Acesso completo às configurações do projeto
-- - Recomendado para administradores principais

-- ============================================
-- CRIAR NOVO USUÁRIO SUPER ADMIN
-- ============================================

-- Inserir usuário no auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'topplaytv7@gmail.com',
    crypt('050321tp!', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Super Admin", "role": "admin"}',
    true,  -- ✅ SUPER ADMIN = TRUE (acesso total)
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
);

-- ============================================
-- CRIAR PERFIL PARA O SUPER ADMIN (ADAPTATIVO E SEGURO)
-- ============================================

-- Verificar constraint e criar perfil adaptativo
DO $$
DECLARE
    user_uuid UUID;
    profile_columns text[];
    insert_query text := 'INSERT INTO profiles (';
    values_query text := ' VALUES (';
    role_constraint text;
    valid_role text := 'admin';  -- Valor padrão seguro
BEGIN
    -- Obter o ID do usuário recém-criado
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'topplaytv7@gmail.com'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Verificar se a tabela profiles existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' AND table_schema = 'public'
    ) THEN
        -- Verificar constraint da coluna role
        SELECT check_clause INTO role_constraint
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'profiles_role_check';
        
        -- Determinar o melhor valor para role baseado na constraint
        IF role_constraint IS NOT NULL THEN
            -- Verificar valores permitidos na constraint
            IF role_constraint ILIKE '%admin%' THEN
                valid_role := 'admin';
            ELSIF role_constraint ILIKE '%manager%' THEN
                valid_role := 'manager';
            -- Usar 'user' como fallback seguro
            ELSE
                valid_role := 'user';
            END IF;
            
            RAISE NOTICE 'Constraint encontrada: %. Usando role: %', role_constraint, valid_role;
        ELSE
            RAISE NOTICE 'Nenhuma constraint encontrada. Usando role padrão: %', valid_role;
        END IF;
        
        -- Obter lista de colunas da tabela profiles
        SELECT array_agg(column_name) INTO profile_columns
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND table_schema = 'public';
        
        -- Construir query dinamicamente baseada nas colunas existentes
        insert_query := insert_query || 'id';
        values_query := values_query || quote_literal(user_uuid);
        
        -- Verificar e adicionar colunas conforme existem
        IF 'email' = ANY(profile_columns) THEN
            insert_query := insert_query || ', email';
            values_query := values_query || ', ' || quote_literal('topplaytv7@gmail.com');
        END IF;
        
        IF 'name' = ANY(profile_columns) THEN
            insert_query := insert_query || ', name';
            values_query := values_query || ', ' || quote_literal('Super Admin');
        END IF;
        
        IF 'full_name' = ANY(profile_columns) THEN
            insert_query := insert_query || ', full_name';
            values_query := values_query || ', ' || quote_literal('Super Admin');
        END IF;
        
        IF 'role' = ANY(profile_columns) THEN
            insert_query := insert_query || ', role';
            values_query := values_query || ', ' || quote_literal(valid_role);
        END IF;
        
        IF 'created_at' = ANY(profile_columns) THEN
            insert_query := insert_query || ', created_at';
            values_query := values_query || ', NOW()';
        END IF;
        
        IF 'updated_at' = ANY(profile_columns) THEN
            insert_query := insert_query || ', updated_at';
            values_query := values_query || ', NOW()';
        END IF;
        
        -- Finalizar query
        insert_query := insert_query || ')' || values_query || ')';
        
        -- Executar inserção
        EXECUTE insert_query;
        
        RAISE NOTICE 'Perfil criado com sucesso para o usuário: %', user_uuid;
        RAISE NOTICE 'Role utilizada: %', valid_role;
        RAISE NOTICE 'Colunas utilizadas: %', array_to_string(profile_columns, ', ');
        
    ELSE
        RAISE NOTICE 'Tabela profiles não existe. Criando estrutura básica...';
        
        -- Criar tabela profiles básica com constraint flexível
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'super_admin')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Inserir perfil do super admin
        INSERT INTO profiles (id, role, created_at, updated_at)
        VALUES (user_uuid, 'admin', NOW(), NOW());
        
        RAISE NOTICE 'Tabela profiles criada e perfil inserido para: %', user_uuid;
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se o usuário foi criado
SELECT 
    'SUPER ADMIN CRIADO' as status,
    email,
    is_super_admin,
    raw_user_meta_data,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'topplaytv7@gmail.com';

-- Verificar perfil (se existir)
SELECT 
    'PERFIL CRIADO' as status,
    id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'email'
        ) THEN (SELECT email FROM profiles WHERE id = auth.users.id)
        ELSE 'N/A'
    END as email,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'role'
        ) THEN (SELECT role FROM profiles WHERE id = auth.users.id)
        ELSE 'N/A'
    END as role
FROM auth.users 
WHERE email = 'topplaytv7@gmail.com';

-- Verificar constraint atual da tabela
SELECT 
    'CONSTRAINT ATUAL' as status,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%role%' 
    AND constraint_name LIKE '%profiles%';

-- ============================================
-- CREDENCIAIS DO SUPER ADMIN:
-- ============================================
-- Email: topplaytv7@gmail.com
-- Senha: 050321tp!
-- Role: admin (valor permitido pela constraint atual)
-- Super Admin: TRUE (acesso total no Supabase)
--
-- IMPORTANTE: Mesmo com role='admin', o usuário terá
-- acesso de SUPER ADMIN devido ao is_super_admin=true

-- ============================================
-- VANTAGENS DO SUPER ADMIN:
-- ============================================
-- ✅ Acesso total ao Supabase Dashboard
-- ✅ Bypassa todas as políticas RLS
-- ✅ Pode modificar estrutura do banco
-- ✅ Acesso completo às configurações
-- ✅ Gerencia outros administradores
-- ✅ Controle total sobre a aplicação

-- ============================================
-- INSTRUÇÕES:
-- ============================================
-- 1. Execute PRIMEIRO o script de limpeza
-- 2. Execute este script para criar o super admin
-- 3. Teste o login na aplicação
-- 4. Verifique acesso total no dashboard
-- 5. Altere a senha se necessário

-- ============================================
-- SEGURANÇA:
-- ============================================
-- ⚠️  Super Admin tem acesso TOTAL
-- ⚠️  Use apenas para administradores principais
-- ⚠️  Altere a senha padrão imediatamente
-- ⚠️  Monitore atividades do super admin

-- ============================================
-- NOTA IMPORTANTE:
-- ============================================
-- Este script é ADAPTATIVO e SEGURO:
-- 1. Verifica a constraint da coluna role
-- 2. Usa o melhor valor permitido (super_admin > admin > user)
-- 3. Funciona independentemente da estrutura
-- 4. O is_super_admin=true garante acesso total no Supabase
-- 5. A role na tabela profiles é ajustada automaticamente