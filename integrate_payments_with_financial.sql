-- Integração de pagamentos com transações financeiras

-- Função para sincronizar pagamento com transação financeira
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

-- Trigger para sincronizar pagamentos automaticamente
DROP TRIGGER IF EXISTS trigger_sync_payment_to_financial ON public.payments;
CREATE TRIGGER trigger_sync_payment_to_financial
    AFTER INSERT OR UPDATE OF status ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_payment_to_financial();

-- Sincronizar pagamentos existentes com status 'Pago'
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

-- Criar view para resumo financeiro mensal
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

COMMIT;