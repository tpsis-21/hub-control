-- Criação da tabela financial_transactions
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON public.financial_transactions(category);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at ON public.financial_transactions(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON public.financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns dados de exemplo
INSERT INTO public.financial_transactions (type, description, amount, category, transaction_date, notes) VALUES
('income', 'Pagamento de cliente - Plano Premium', 150.00, 'Assinaturas IPTV', CURRENT_DATE - INTERVAL '1 day', 'Pagamento via PIX'),
('income', 'Pagamento de cliente - Plano Básico', 80.00, 'Assinaturas IPTV', CURRENT_DATE - INTERVAL '2 days', 'Pagamento via cartão'),
('expense', 'Servidor dedicado', 200.00, 'Infraestrutura', CURRENT_DATE - INTERVAL '3 days', 'Pagamento mensal do servidor'),
('expense', 'Licenças de software', 50.00, 'Software', CURRENT_DATE - INTERVAL '5 days', 'Renovação anual'),
('income', 'Pagamento de cliente - Plano Standard', 120.00, 'Assinaturas IPTV', CURRENT_DATE - INTERVAL '7 days', 'Pagamento via boleto')
ON CONFLICT DO NOTHING;

COMMIT;