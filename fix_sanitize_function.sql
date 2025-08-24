-- Correção da função sanitize_profile_data
-- Remove referência ao campo 'company' que não existe

CREATE OR REPLACE FUNCTION sanitize_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Sanitizar apenas campos que existem na tabela profiles
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := sanitize_html(NEW.full_name);
  END IF;
  
  -- Remover referência ao campo 'company' que não existe
  -- IF NEW.company IS NOT NULL THEN
  --   NEW.company := sanitize_html(NEW.company);
  -- END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS sanitize_profiles_trigger ON profiles;
CREATE TRIGGER sanitize_profiles_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sanitize_profile_data();

SELECT 'Função sanitize_profile_data corrigida com sucesso!' as status;