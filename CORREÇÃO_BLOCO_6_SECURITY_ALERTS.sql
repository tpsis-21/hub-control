-- ⚡ CORREÇÃO BLOCO 6 - Execute este código no Supabase SQL Editor
-- Corrige o erro: column "status" does not exist

-- 1. Verificar estrutura atual da tabela security_alerts
-- Se a tabela não existir, criar ela primeiro
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (
    'BRUTE_FORCE_ATTEMPT',
    'SUSPICIOUS_LOGIN', 
    'PRIVILEGE_ESCALATION',
    'DATA_BREACH_ATTEMPT',
    'UNUSUAL_ACTIVITY',
    'MFA_BYPASS_ATTEMPT'
  )),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  details jsonb NOT NULL,
  user_email text,
  ip_address inet,
  user_agent text,
  is_resolved boolean DEFAULT false
);

-- 2. Adicionar coluna status se não existir
ALTER TABLE security_alerts 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive'));

-- 3. Atualizar estrutura da tabela security_alerts
ALTER TABLE security_alerts 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS auto_resolved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;

-- 4. Habilitar RLS se não estiver habilitado
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- 6. Política RLS para security_alerts
DROP POLICY IF EXISTS "Only admins can manage security alerts" ON security_alerts;
CREATE POLICY "Only admins can manage security alerts" ON security_alerts
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. Verificar se funcionou
SELECT 
  'Tabela security_alerts atualizada com sucesso!' as status,
  'Coluna status adicionada' as coluna_status,
  'Índices criados corretamente' as indices,
  'Políticas RLS aplicadas' as rls,
  'Pode continuar com o próximo bloco' as proximo_passo;

SELECT '✅ BLOCO 6 CORRIGIDO COM SUCESSO!' as final_status;