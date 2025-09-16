-- Verificar se ainda há problemas na tabela profiles
SELECT COUNT(*) as total_profiles FROM profiles;

-- Verificar se há IDs duplicados
SELECT id, COUNT(*) FROM profiles GROUP BY id HAVING COUNT(*) > 1;

-- Verificar se há user_id duplicados
SELECT user_id, COUNT(*) FROM profiles WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) > 1;

-- Verificar estrutura atual
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Verificar status do RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Verificar políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';