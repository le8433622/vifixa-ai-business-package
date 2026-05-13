-- P0.5: Location cache table for geocoding rate-limit
CREATE TABLE IF NOT EXISTS public.location_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  result JSONB NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  display_name TEXT,
  place_type TEXT,
  osm_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.location_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read cache" ON public.location_cache FOR SELECT USING (true);
CREATE POLICY "System can write cache" ON public.location_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update cache" ON public.location_cache FOR UPDATE USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_location_cache_query ON public.location_cache(lower(query_text));
CREATE INDEX IF NOT EXISTS idx_location_cache_expires ON public.location_cache(expires_at);
