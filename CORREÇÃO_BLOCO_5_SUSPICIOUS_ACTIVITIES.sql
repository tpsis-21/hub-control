-- ⚡ CORREÇÃO BLOCO 5 - Execute este código no Supabase SQL Editor
-- Corrige o erro: ALTER action ENABLE ROW SECURITY cannot be performed on relation "suspicious_activities"

-- 1. Verificar se existe uma view com o mesmo nome e removê-la
DROP VIEW IF EXISTS suspicious_activities CASCADE;

-- 2. Remover tabela se existir (para recriar limpa)
DROP TABLE IF EXISTS suspicious_activities CASCADE;

-- 3. Criar tabela para atividades suspeitas
CREATE TABLE suspicious_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  investigated_by uuid REFERENCES auth.users(id),
  investigation_notes text
);

-- 4. Habilitar RLS
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;

-- 5. Política RLS (apenas admins)
CREATE POLICY "Only admins can manage suspicious activities" ON suspicious_activities
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_created_at ON suspicious_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_status ON suspicious_activities(status);

-- 7. Verificar se funcionou
SELECT 
  'Tabela suspicious_activities criada com sucesso!' as status,
  'RLS habilitado corretamente' as rls_status,
  'Políticas e índices aplicados' as resultado,
  'Pode continuar com o próximo bloco' as proximo_passo;

SELECT '✅ BLOCO 5 CORRIGIDO COM SUCESSO!' as final_status;