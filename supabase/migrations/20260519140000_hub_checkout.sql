-- Checkout integrado ao Hub Control (pedidos + preferências de gateway)

-- URL Cakto opcional por plano (redirect após escolha do plano)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS cakto_url TEXT;

COMMENT ON COLUMN public.plans.cakto_url IS 'Link de checkout Cakto para este plano (opcional).';

-- Preferências de checkout por revendedor (1 linha por user_id)
CREATE TABLE IF NOT EXISTS public.checkout_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_gateway_pix TEXT NOT NULL DEFAULT 'gates2b'
    CHECK (active_gateway_pix IN ('gates2b', 'cakto')),
  active_gateway_card TEXT NOT NULL DEFAULT 'gates2b'
    CHECK (active_gateway_card IN ('gates2b', 'cakto')),
  cakto_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_renewal_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.checkout_settings IS 'Gateway e renovação automática no checkout do cliente (Hub Control).';

-- Pedidos de checkout (PIX/cartão/Cakto)
CREATE TABLE IF NOT EXISTS public.checkout_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  server_id UUID REFERENCES public.servers(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('gates2b', 'cakto')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'card')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  amount NUMERIC(12, 2) NOT NULL,
  external_reference TEXT NOT NULL UNIQUE,
  gates2b_transaction_id TEXT,
  gates2b_payment_id TEXT,
  fulfillment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'completed', 'failed', 'skipped', 'manual')),
  fulfillment_result JSONB,
  renewal_attempted BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_orders_client ON public.checkout_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_checkout_orders_reseller ON public.checkout_orders(reseller_user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_orders_status ON public.checkout_orders(status);
CREATE INDEX IF NOT EXISTS idx_checkout_orders_external_ref ON public.checkout_orders(external_reference);

COMMENT ON TABLE public.checkout_orders IS 'Pedidos gerados pela área do cliente / checkout Hub Control.';

ALTER TABLE public.checkout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_orders ENABLE ROW LEVEL SECURITY;

-- Revendedor gerencia suas preferências
CREATE POLICY "checkout_settings_own" ON public.checkout_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "checkout_settings_admin" ON public.checkout_settings
  FOR ALL TO authenticated
  USING (public.hub_control_is_admin())
  WITH CHECK (public.hub_control_is_admin());

-- Revendedor vê pedidos dos seus clientes (via servidor ou manager_id)
CREATE POLICY "checkout_orders_select_own" ON public.checkout_orders
  FOR SELECT TO authenticated
  USING (
    reseller_user_id = auth.uid()
    OR public.hub_control_is_admin()
  );

-- Inserção/atualização via service role nas API routes (sem policy INSERT para authenticated por ora)
