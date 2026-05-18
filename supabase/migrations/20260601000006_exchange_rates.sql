-- Exchange Rates for Multi-currency support
-- Phase 23: USD / THB / IDR alongside VND
-- Rates are fetched from an external API daily; this table caches them

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL CHECK (from_currency IN ('VND', 'USD', 'THB', 'IDR')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('VND', 'USD', 'THB', 'IDR')),
  rate NUMERIC NOT NULL CHECK (rate > 0),
  source TEXT DEFAULT 'manual',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (from_currency, to_currency)
);

-- Seed: approximate rates (as of 2026-05-18)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, source) VALUES
  ('USD', 'VND', 25450, 'sbv'),
  ('THB', 'VND', 695,  'bank'),
  ('IDR', 'VND', 1.58, 'bank'),
  ('VND', 'USD', 0.000039, 'sbv'),
  ('VND', 'THB', 0.00144, 'bank'),
  ('VND', 'IDR', 0.633,   'bank')
ON CONFLICT (from_currency, to_currency) DO NOTHING;

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_rates_select" ON public.exchange_rates
  FOR SELECT USING (true);

GRANT SELECT ON public.exchange_rates TO service_role, authenticated;
