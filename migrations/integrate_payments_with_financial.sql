-- Migração para integrar pagamentos com sistema financeiro
-- Execute este SQL no SQL Editor do Supabase APÓS criar a tabela financial_transactions

-- Função para sincronizar pagamentos com transações financeiras
CREATE OR REPLACE FUNCTION sync_payment_to_financial()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um pagamento é inserido ou atualizado para 'Pago'
  IF (TG_OP = 'INSERT' AND NEW.status = 'Pago') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'Pago' AND NEW.status = 'Pago') THEN
    
    -- Inserir transação financeira correspondente
    INSERT INTO financial_transactions (
      type,
      description,
      amount,
      category,
      date,
      notes
    ) VALUES (
      'receita',
      'Pagamento - ' || (SELECT name FROM plans WHERE id = NEW.plan_id),
      NEW.amount,
      'Pagamentos',
      NEW.date,
      'Pagamento automático do cliente ID: ' || NEW.client_id
    )
    ON CONFLICT DO NOTHING;
    
  END IF;
  
  -- Quando um pagamento é cancelado ou revertido
  IF TG_OP = 'UPDATE' AND OLD.status = 'Pago' AND NEW.status != 'Pago' THEN
    
    -- Inserir transação de estorno
    INSERT INTO financial_transactions (
      type,
      description,
      amount,
      category,
      date,
      notes
    ) VALUES (
      'despesa',
      'Estorno de pagamento - Cliente ID: ' || NEW.client_id,
      -NEW.amount,
      'Estornos',
      CURRENT_DATE,
      'Estorno automático. Payment ID: ' || NEW.id || ' - Status alterado de Pago para ' || NEW.status
    );
    
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronizar pagamentos automaticamente
DROP TRIGGER IF EXISTS sync_payments_to_financial ON payments;
CREATE TRIGGER sync_payments_to_financial
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_to_financial();

-- Sincronizar pagamentos existentes que já estão como 'Pago'
-- (Execute apenas uma vez após criar a estrutura)
INSERT INTO financial_transactions (
  type,
  description,
  amount,
  category,
  date,
  notes
)
SELECT 
  'receita' as type,
  'Pagamento recebido - Cliente ID: ' || client_id as description,
  amount,
  'Assinaturas IPTV' as category,
  date,
  'Pagamento histórico sincronizado. Payment ID: ' || id ||
  CASE 
    WHEN payment_method IS NOT NULL THEN ' - Método: ' || payment_method
    ELSE ''
  END ||
  CASE 
    WHEN transaction_id IS NOT NULL THEN ' - Transaction: ' || transaction_id
    ELSE ''
  END as notes
FROM payments 
WHERE status = 'Pago'
ON CONFLICT DO NOTHING;

-- Comentários para documentar as funções
COMMENT ON FUNCTION sync_payment_to_financial() IS 'Função para sincronizar automaticamente pagamentos com transações financeiras';

-- Verificar sincronização
SELECT 
  'Pagamentos Pagos' as tipo,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM payments 
WHERE status = 'Pago'

UNION ALL

SELECT 
  'Transações Receita (Assinaturas)' as tipo,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM financial_transactions 
WHERE type = 'receita' AND category = 'Assinaturas IPTV';

-- Criar view para relatórios financeiros consolidados
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
GROUP BY month
ORDER BY month DESC;

COMMENT ON VIEW financial_summary IS 'View para relatórios financeiros mensais consolidados';