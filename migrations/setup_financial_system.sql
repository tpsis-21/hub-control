-- Script completo para configurar o sistema financeiro
-- Execute este SQL no SQL Editor do Supabase

-- 1. Criar tabela financial_transactions
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

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);

-- 3. Trigger para atualizar updated_at automaticamente
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

-- 4. Criar view financial_summary
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
  DATE_TRUNC('month', date) as month,
  SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN type = 'receita' THEN amount ELSE -amount END) as net_profit,
  COUNT(CASE WHEN type = 'receita' THEN 1 END) as income_count,
  COUNT(CASE WHEN type = 'despesa' THEN 1 END) as expense_count,
  COUNT(*) as total_transactions
FROM financial_transactions
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;

-- 5. Função para sincronizar pagamentos com transações financeiras
CREATE OR REPLACE FUNCTION sync_payment_to_financial()
RETURNS TRIGGER AS $$
BEGIN
  -- Só criar transação financeira se o pagamento foi confirmado/pago
  IF NEW.status = 'Pago' AND (OLD IS NULL OR OLD.status != 'Pago') THEN
    INSERT INTO financial_transactions (
      type,
      description,
      amount,
      category,
      date,
      notes
    ) VALUES (
      'receita',
      'Pagamento - ' || COALESCE((SELECT name FROM plans WHERE id = NEW.plan_id), 'Plano não encontrado'),
      NEW.amount,
      'Pagamentos',
      NEW.date::DATE,
      'Pagamento automático do cliente ID: ' || NEW.client_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS sync_payments_to_financial ON payments;
CREATE TRIGGER sync_payments_to_financial
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION sync_payment_to_financial();

-- 7. Inserir dados de exemplo
INSERT INTO financial_transactions (type, description, amount, category, date, notes) VALUES
('receita', 'Exemplo de Receita', 1000.00, 'Vendas', CURRENT_DATE, 'Transação de exemplo - pode ser removida'),
('despesa', 'Exemplo de Despesa', -500.00, 'Operacional', CURRENT_DATE, 'Transação de exemplo - pode ser removida')
ON CONFLICT DO NOTHING;

-- 8. Sincronizar pagamentos existentes
INSERT INTO financial_transactions (type, description, amount, category, date, notes)
SELECT 
  'receita',
  'Pagamento - ' || COALESCE(p.name, 'Plano não encontrado'),
  pay.amount,
  'Pagamentos',
  pay.date::DATE,
  'Sincronização inicial - Cliente ID: ' || pay.client_id
FROM payments pay
LEFT JOIN plans p ON p.id = pay.plan_id
WHERE pay.status = 'Pago'
ON CONFLICT DO NOTHING;

-- 9. Comentários para documentação
COMMENT ON TABLE financial_transactions IS 'Tabela para controle de transações financeiras (receitas e despesas)';
COMMENT ON COLUMN financial_transactions.type IS 'Tipo da transação: receita ou despesa';
COMMENT ON COLUMN financial_transactions.description IS 'Descrição da transação';
COMMENT ON COLUMN financial_transactions.amount IS 'Valor da transação (positivo para receitas, negativo para despesas)';
COMMENT ON COLUMN financial_transactions.category IS 'Categoria da transação';
COMMENT ON COLUMN financial_transactions.date IS 'Data da transação';
COMMENT ON COLUMN financial_transactions.notes IS 'Observações adicionais sobre a transação';

-- Verificação final
SELECT 'Setup financeiro concluído com sucesso!' as status;
SELECT COUNT(*) as total_transactions FROM financial_transactions;
SELECT * FROM financial_summary LIMIT 5;