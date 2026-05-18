-- RLS for commission_rates
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_rates_select" ON public.commission_rates
  FOR SELECT USING (true);

CREATE POLICY "commission_rates_insert" ON public.commission_rates
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "commission_rates_update" ON public.commission_rates
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "commission_rates_delete" ON public.commission_rates
  FOR DELETE USING (auth.role() = 'service_role');
