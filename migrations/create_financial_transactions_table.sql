-- Migração para criar tabela de transações financeiras
-- Execute este SQL no SQL Editor do Supabase

-- Criar tabela financial_transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_financial_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION update_financial_transactions_updated_at();

-- Inserir algumas categorias padrão
INSERT INTO financial_transactions (type, description, amount, category, date, notes) VALUES
('receita', 'Exemplo de Receita', 1000.00, 'Vendas', CURRENT_DATE, 'Transação de exemplo - pode ser removida'),
('despesa', 'Exemplo de Despesa', -500.00, 'Operacional', CURRENT_DATE, 'Transação de exemplo - pode ser removida')
ON CONFLICT DO NOTHING;

-- Comentários para documentar a tabela
COMMENT ON TABLE financial_transactions IS 'Tabela para controle de transações financeiras (receitas e despesas)';
COMMENT ON COLUMN financial_transactions.type IS 'Tipo da transação: receita ou despesa';
COMMENT ON COLUMN financial_transactions.description IS 'Descrição da transação';
COMMENT ON COLUMN financial_transactions.amount IS 'Valor da transação (positivo para receitas, negativo para despesas)';
COMMENT ON COLUMN financial_transactions.category IS 'Categoria da transação';
COMMENT ON COLUMN financial_transactions.date IS 'Data da transação';
COMMENT ON COLUMN financial_transactions.notes IS 'Observações adicionais sobre a transação';

-- Verificar se a tabela foi criada corretamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'financial_transactions'
ORDER BY ordinal_position;