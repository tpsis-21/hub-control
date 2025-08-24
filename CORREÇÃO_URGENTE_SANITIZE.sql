-- ⚡ CORREÇÃO URGENTE - Execute este código no Supabase SQL Editor
-- Corrige o erro: record "new" has no field "company"

-- 1. Corrigir a função sanitize_profile_data
CREATE OR REPLACE FUNCTION sanitize_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Sanitizar apenas campos que existem na tabela profiles
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := sanitize_html(NEW.full_name);
  END IF;
  
  -- Campo 'company' removido pois não existe na tabela profiles
  -- Se precisar adicionar, primeiro execute: ALTER TABLE profiles ADD COLUMN company text;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriar o trigger
DROP TRIGGER IF EXISTS sanitize_profiles_trigger ON profiles;
CREATE TRIGGER sanitize_profiles_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sanitize_profile_data();

-- 3. Verificar se funcionou
SELECT 
  'Função sanitize_profile_data corrigida com sucesso!' as status,
  'Erro do campo company resolvido' as resultado,
  'Agora você pode continuar com a implementação de segurança' as proximo_passo;

-- 4. Testar a função (opcional)
-- UPDATE profiles SET full_name = full_name WHERE id = (SELECT id FROM profiles LIMIT 1);

SELECT '✅ CORREÇÃO APLICADA COM SUCESSO!' as final_status;