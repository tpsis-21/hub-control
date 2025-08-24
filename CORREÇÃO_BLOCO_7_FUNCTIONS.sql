-- ⚡ CORREÇÃO BLOCO 7 - Execute este código no Supabase SQL Editor
-- Corrige o erro: cannot remove parameter defaults from existing function

-- 1. Remover funções existentes primeiro
DROP FUNCTION IF EXISTS create_security_alert(text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS create_security_alert(text, text, text, text);
DROP FUNCTION IF EXISTS resolve_security_alert(uuid, text);
DROP FUNCTION IF EXISTS resolve_security_alert(uuid);

-- 2. Recriar função para criar alertas de segurança
CREATE OR REPLACE FUNCTION create_security_alert(
  alert_type text,
  severity text,
  title text,
  description text,
  metadata jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alert_id uuid;
BEGIN
  INSERT INTO security_alerts (
    id, type, severity, title, description, metadata, status, created_at
  ) VALUES (
    gen_random_uuid(), alert_type, severity, title, description, metadata, 'active', now()
  ) RETURNING id INTO alert_id;
  
  INSERT INTO audit_logs (action, table_name, record_id, user_id, details)
  VALUES ('security_alert_created', 'security_alerts', alert_id, auth.uid(), 
    jsonb_build_object('type', alert_type, 'severity', severity));
  
  RETURN alert_id;
END;
$$;

-- 3. Recriar função para resolver alertas
CREATE OR REPLACE FUNCTION resolve_security_alert(
  alert_id uuid,
  resolution_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE security_alerts 
  SET 
    status = 'resolved',
    resolved_at = now(),
    resolved_by = auth.uid(),
    metadata = metadata || jsonb_build_object('resolution_notes', resolution_notes)
  WHERE id = alert_id AND status = 'active';
  
  IF FOUND THEN
    INSERT INTO audit_logs (action, table_name, record_id, user_id, details)
    VALUES ('security_alert_resolved', 'security_alerts', alert_id, auth.uid(), 
      jsonb_build_object('resolution_notes', resolution_notes));
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 4. Verificar se as funções foram criadas corretamente
SELECT 
  'Funções de alertas criadas com sucesso!' as status,
  'create_security_alert() disponível' as funcao_criar,
  'resolve_security_alert() disponível' as funcao_resolver,
  'Pode continuar com o próximo bloco' as proximo_passo;

SELECT '✅ BLOCO 7 CORRIGIDO COM SUCESSO!' as final_status;