-- Correção para recursão infinita nas políticas RLS da tabela profiles
-- O problema está na política que consulta a própria tabela profiles dentro da condição USING

-- Remover todas as políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all configs" ON system_config;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;

-- Criar políticas simples sem recursão
-- Política básica para usuários verem seus próprios perfis
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para usuários atualizarem seus próprios perfis
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para inserção de perfis (apenas o próprio usuário)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política simples para admins (usando auth.jwt() em vez de consulta recursiva)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    auth.uid() = id
  );

-- Corrigir políticas de outras tabelas que também tinham recursão (apenas se existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') THEN
    DROP POLICY IF EXISTS "Admins can manage all configs" ON system_config;
    CREATE POLICY "Admins can manage all configs" ON system_config
      FOR ALL USING (
        is_public = true OR 
        (auth.jwt() ->> 'role') = 'admin'
      );
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
    CREATE POLICY "Admins can view all audit logs" ON audit_logs
      FOR SELECT USING (
        auth.uid() = user_id OR 
        (auth.jwt() ->> 'role') = 'admin'
      );
  END IF;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;