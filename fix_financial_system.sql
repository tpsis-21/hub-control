-- Script para corrigir o sistema financeiro
-- Execute este SQL no SQL Editor do Supabase

BEGIN;

-- 1. Criar tabela financial_transactions se não existir
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Função para sincronizar pagamento com transação financeira
CREATE OR REPLACE FUNCTION sync_payment_to_financial()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'Pago', criar transação financeira
    IF NEW.status = 'Pago' AND (OLD.status IS NULL OR OLD.status != 'Pago') THEN
        INSERT INTO public.financial_transactions (
            type,
            description,
            amount,
            category,
            date,
            notes
        ) VALUES (
            'income',
            'Pagamento recebido - ' || COALESCE((SELECT name FROM clients WHERE id = NEW.client_id), 'Cliente'),
            NEW.amount,
            'Assinaturas IPTV',
            NEW.date::DATE,
            'Pagamento ID: ' || NEW.id || ' - Método: ' || COALESCE(NEW.payment_method, 'Não informado')
        );
    END IF;
    
    -- Se o status mudou de 'Pago' para outro (cancelamento/estorno), criar transação de estorno
    IF OLD.status = 'Pago' AND NEW.status != 'Pago' THEN
        INSERT INTO public.financial_transactions (
            type,
            description,
            amount,
            category,
            date,
            notes
        ) VALUES (
            'expense',
            'Estorno de pagamento - ' || COALESCE((SELECT name FROM clients WHERE id = NEW.client_id), 'Cliente'),
            NEW.amount,
            'Estornos',
            CURRENT_DATE,
            'Estorno do pagamento ID: ' || NEW.id || ' - Status alterado para: ' || NEW.status
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para sincronizar pagamentos automaticamente
DROP TRIGGER IF EXISTS trigger_sync_payment_to_financial ON public.payments;
CREATE TRIGGER trigger_sync_payment_to_financial
    AFTER INSERT OR UPDATE OF status ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_payment_to_financial();

-- 4. Sincronizar pagamentos existentes com status 'Pago'
INSERT INTO public.financial_transactions (
    type,
    description,
    amount,
    category,
    date,
    notes
)
SELECT
    'income' as type,
    'Pagamento recebido - ' || COALESCE(c.name, 'Cliente') as description,
    p.amount,
    'Assinaturas IPTV' as category,
    p.date::DATE as date,
    'Pagamento ID: ' || p.id || ' - Método: ' || COALESCE(p.payment_method, 'Não informado') as notes
FROM public.payments p
LEFT JOIN public.clients c ON p.client_id = c.id
WHERE p.status = 'Pago'
AND NOT EXISTS (
    SELECT 1 FROM public.financial_transactions ft
    WHERE ft.notes LIKE '%Pagamento ID: ' || p.id || '%'
)
ON CONFLICT DO NOTHING;

-- 5. Criar view para resumo financeiro mensal
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT
    DATE_TRUNC('month', date) as month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_profit,
    COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
    COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count,
    COUNT(*) as total_transactions
FROM public.financial_transactions
GROUP BY month
ORDER BY month DESC;

-- 6. Inserir dados de exemplo se a tabela estiver vazia
INSERT INTO public.financial_transactions (type, description, amount, category, date, notes)
SELECT 'income', 'Exemplo de Receita', 1000.00, 'Vendas', CURRENT_DATE, 'Transação de exemplo'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_transactions)
UNION ALL
SELECT 'expense', 'Exemplo de Despesa', 500.00, 'Operacional', CURRENT_DATE, 'Transação de exemplo'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_transactions);

-- 7. Comentários para documentação
COMMENT ON TABLE financial_transactions IS 'Tabela para controle de transações financeiras (receitas e despesas)';
COMMENT ON COLUMN financial_transactions.type IS 'Tipo da transação: income ou expense';
COMMENT ON COLUMN financial_transactions.description IS 'Descrição da transação';
COMMENT ON COLUMN financial_transactions.amount IS 'Valor da transação';
COMMENT ON COLUMN financial_transactions.category IS 'Categoria da transação';
COMMENT ON COLUMN financial_transactions.date IS 'Data da transação';
COMMENT ON COLUMN financial_transactions.notes IS 'Observações adicionais sobre a transação';
COMMENT ON VIEW financial_summary IS 'View para relatórios financeiros mensais consolidados';

-- 8. Verificação final
SELECT 'Sistema financeiro configurado com sucesso!' as status;
SELECT COUNT(*) as total_transacoes FROM financial_transactions;
SELECT * FROM financial_summary LIMIT 5;

COMMIT;