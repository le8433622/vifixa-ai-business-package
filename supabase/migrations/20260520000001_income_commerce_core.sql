-- Vifixa Income Commerce Core
-- Adds income/offer/demand/profit/experiment/correction/learning primitives.
-- Safe additive migration: does not modify existing tables.

CREATE TABLE IF NOT EXISTS public.income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset','skill','time','location','relationship','inventory','service_capacity')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  location JSONB DEFAULT '{}'::jsonb,
  availability JSONB DEFAULT '{}'::jsonb,
  trust_score NUMERIC DEFAULT 0.5 CHECK (trust_score >= 0 AND trust_score <= 1),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','paused','verified','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commerce_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES auth.users(id) NOT NULL,
  income_source_id UUID REFERENCES public.income_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_customer TEXT,
  price_amount NUMERIC NOT NULL CHECK (price_amount >= 0),
  currency TEXT DEFAULT 'VND' CHECK (currency IN ('VND','USD')),
  cost_estimate JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence JSONB DEFAULT '[]'::jsonb,
  constraints JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','testing','active','paused','killed','scaled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commerce_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  raw_text TEXT NOT NULL,
  normalized_need TEXT NOT NULL,
  location JSONB DEFAULT '{}'::jsonb,
  budget_amount NUMERIC,
  currency TEXT DEFAULT 'VND' CHECK (currency IN ('VND','USD')),
  constraints JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','qualified','matched','converted','lost')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commerce_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID REFERENCES public.commerce_demands(id) ON DELETE CASCADE NOT NULL,
  offer_id UUID REFERENCES public.commerce_offers(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  reasons JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested','accepted','rejected','expired','converted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commerce_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.commerce_offers(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  channel TEXT,
  budget_limit NUMERIC DEFAULT 0 CHECK (budget_limit >= 0),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','completed','stopped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commerce_experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES public.commerce_experiments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  offer_patch JSONB DEFAULT '{}'::jsonb,
  budget_limit NUMERIC DEFAULT 0 CHECK (budget_limit >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  offer_id UUID REFERENCES public.commerce_offers(id) ON DELETE SET NULL,
  experiment_id UUID REFERENCES public.commerce_experiments(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.commerce_experiment_variants(id) ON DELETE SET NULL,
  revenue NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  profit_margin NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'VND' CHECK (currency IN ('VND','USD')),
  breakdown JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.correction_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  profit_record_id UUID REFERENCES public.profit_records(id) ON DELETE CASCADE,
  loss_drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT,
  hypotheses JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_hypothesis JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed','testing','applied','failed','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  hypothesis TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrections_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_decision TEXT NOT NULL CHECK (final_decision IN ('test','scale','pause','kill','revise')),
  lesson TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commerce_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  offer_id UUID REFERENCES public.commerce_offers(id) ON DELETE SET NULL,
  experiment_id UUID REFERENCES public.commerce_experiments(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('test','scale','pause','kill','revise')),
  reason TEXT NOT NULL,
  risk_score NUMERIC DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 1),
  expected_net_profit NUMERIC DEFAULT 0,
  confidence NUMERIC DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  created_by TEXT DEFAULT 'system' CHECK (created_by IN ('system','ai','admin','partner')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_sources_partner ON public.income_sources(partner_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_type ON public.income_sources(type);
CREATE INDEX IF NOT EXISTS idx_commerce_offers_partner ON public.commerce_offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_commerce_offers_status ON public.commerce_offers(status);
CREATE INDEX IF NOT EXISTS idx_commerce_demands_user ON public.commerce_demands(user_id);
CREATE INDEX IF NOT EXISTS idx_commerce_demands_status ON public.commerce_demands(status);
CREATE INDEX IF NOT EXISTS idx_profit_records_offer ON public.profit_records(offer_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_owner ON public.learning_records(owner_id);

ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correction_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_decisions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_from_jwt()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', '') = 'admin'
     OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
     OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
$$;

CREATE POLICY "Partners manage own income sources" ON public.income_sources
  FOR ALL USING (auth.uid() = partner_id OR public.is_admin_from_jwt())
  WITH CHECK (auth.uid() = partner_id OR public.is_admin_from_jwt());

CREATE POLICY "Users can view active income sources" ON public.income_sources
  FOR SELECT USING (status IN ('active','verified') OR auth.uid() = partner_id OR public.is_admin_from_jwt());

CREATE POLICY "Partners manage own commerce offers" ON public.commerce_offers
  FOR ALL USING (auth.uid() = partner_id OR public.is_admin_from_jwt())
  WITH CHECK (auth.uid() = partner_id OR public.is_admin_from_jwt());

CREATE POLICY "Users can view active offers" ON public.commerce_offers
  FOR SELECT USING (status IN ('testing','active','scaled') OR auth.uid() = partner_id OR public.is_admin_from_jwt());

CREATE POLICY "Users manage own demands" ON public.commerce_demands
  FOR ALL USING (auth.uid() = user_id OR public.is_admin_from_jwt())
  WITH CHECK (auth.uid() = user_id OR public.is_admin_from_jwt());

CREATE POLICY "Participants view matches" ON public.commerce_matches
  FOR SELECT USING (
    public.is_admin_from_jwt()
    OR EXISTS (SELECT 1 FROM public.commerce_demands d WHERE d.id = demand_id AND d.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.commerce_offers o WHERE o.id = offer_id AND o.partner_id = auth.uid())
  );

CREATE POLICY "Admins manage matches" ON public.commerce_matches
  FOR ALL USING (public.is_admin_from_jwt())
  WITH CHECK (public.is_admin_from_jwt());

CREATE POLICY "Owners manage experiments" ON public.commerce_experiments
  FOR ALL USING (auth.uid() = owner_id OR public.is_admin_from_jwt())
  WITH CHECK (auth.uid() = owner_id OR public.is_admin_from_jwt());

CREATE POLICY "Owners manage experiment variants" ON public.commerce_experiment_variants
  FOR ALL USING (
    public.is_admin_from_jwt()
    OR EXISTS (
      SELECT 1 FROM public.commerce_experiments e
      WHERE e.id = experiment_id AND e.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin_from_jwt()
    OR EXISTS (
      SELECT 1 FROM public.commerce_experiments e
      WHERE e.id = experiment_id AND e.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners manage profit records" ON public.profit_records
  FOR ALL USING (auth.uid() = owner_id OR public.is_admin_from_jwt())
  WITH CHECK (auth.uid() = owner_id OR public.is_admin_from_jwt());

CREATE POLICY "Owners manage correction cycles" ON public.correction_cycles
  FOR ALL USING (auth.uid() = owner_id OR public.is_admin_from_jwt())
  WITH CHECK (auth.uid() = owner_id OR public.is_admin_from_jwt());

CREATE POLICY "Owners manage learning records" ON public.learning_records
  FOR ALL USING (auth.uid() = owner_id OR public.is_admin_from_jwt())
  WITH CHECK (auth.uid() = owner_id OR public.is_admin_from_jwt());

CREATE POLICY "Owners view commerce decisions" ON public.commerce_decisions
  FOR SELECT USING (auth.uid() = owner_id OR public.is_admin_from_jwt());

CREATE POLICY "Admins insert commerce decisions" ON public.commerce_decisions
  FOR INSERT WITH CHECK (public.is_admin_from_jwt() OR auth.uid() = owner_id);
