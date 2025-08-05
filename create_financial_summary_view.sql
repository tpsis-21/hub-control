-- Criar view financial_summary com a coluna correta
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT
    DATE_TRUNC('month', transaction_date) as month,
    SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'despesa' THEN ABS(amount) ELSE 0 END) as total_expenses,
    SUM(CASE WHEN type = 'receita' THEN amount ELSE amount END) as net_profit,
    COUNT(CASE WHEN type = 'receita' THEN 1 END) as income_count,
    COUNT(CASE WHEN type = 'despesa' THEN 1 END) as expense_count,
    COUNT(*) as total_transactions
FROM public.financial_transactions
GROUP BY month
ORDER BY month DESC;

COMMENT ON VIEW financial_summary IS 'View para relatórios financeiros mensais consolidados';

-- Verificar se a view foi criada
SELECT 'View financial_summary criada com sucesso!' as status;
SELECT * FROM financial_summary LIMIT 5;