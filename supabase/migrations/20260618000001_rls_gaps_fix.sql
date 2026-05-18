-- Phase 25: Production launch — RLS gaps
-- demand_metrics, ledger, transactions were missing RLS policies
-- 2026-05-18

ALTER TABLE public.demand_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_policy WHERE polname = 'demand_metrics_select') THEN
    CREATE POLICY demand_metrics_select ON public.demand_metrics FOR SELECT USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policy WHERE polname = 'demand_metrics_insert') THEN
    CREATE POLICY demand_metrics_insert ON public.demand_metrics FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_policy WHERE polname = 'ledger_select') THEN
    CREATE POLICY ledger_select ON public.ledger FOR SELECT USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policy WHERE polname = 'ledger_insert') THEN
    CREATE POLICY ledger_insert ON public.ledger FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_policy WHERE polname = 'transactions_select') THEN
    CREATE POLICY transactions_select ON public.transactions FOR SELECT
      USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin') OR auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policy WHERE polname = 'transactions_insert') THEN
    CREATE POLICY transactions_insert ON public.transactions FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;