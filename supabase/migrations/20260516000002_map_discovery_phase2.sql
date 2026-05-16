-- Phase 2: Map Discovery
-- Worker location tracking, online status, geo-matching, real-time tracking

-- ========== 1. Worker online tracking ==========
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('online', 'offline', 'busy', 'idle')) DEFAULT 'offline';

CREATE INDEX IF NOT EXISTS idx_workers_online ON workers(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_workers_location ON workers(location_lat, location_lng);

-- ========== 2. Worker location history for tracking ==========
CREATE TABLE IF NOT EXISTS worker_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  accuracy NUMERIC,
  heading NUMERIC,
  speed NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_loc_history_worker ON worker_location_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_loc_history_time ON worker_location_history(worker_id, recorded_at DESC);

ALTER TABLE worker_location_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'worker_location_history' AND policyname = 'Workers can insert own location') THEN
    CREATE POLICY "Workers can insert own location"
      ON worker_location_history FOR INSERT
      WITH CHECK (auth.uid() = worker_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'worker_location_history' AND policyname = 'Customers can view assigned worker location') THEN
    CREATE POLICY "Customers can view assigned worker location"
      ON worker_location_history FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM orders
        WHERE orders.worker_id = worker_location_history.worker_id
        AND orders.customer_id = auth.uid()
        AND orders.status IN ('in_progress', 'matched')
      ));
  END IF;
END $$;

-- ========== 3. Geo-matching function ==========
CREATE OR REPLACE FUNCTION find_nearest_worker(
  customer_lat NUMERIC,
  customer_lng NUMERIC,
  required_skills JSONB DEFAULT '[]'::jsonb,
  max_distance_km NUMERIC DEFAULT 20
)
RETURNS TABLE(
  worker_id UUID,
  full_name TEXT,
  trust_score INTEGER,
  distance_km NUMERIC,
  rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.full_name,
    w.trust_score::INTEGER,
    haversine_distance(customer_lat, customer_lng, w.location_lat, w.location_lng) AS distance_km,
    w.rating_avg
  FROM workers w
  WHERE
    w.is_online = TRUE
    AND w.is_verified = TRUE
    AND w.location_lat IS NOT NULL
    AND w.location_lng IS NOT NULL
    AND haversine_distance(customer_lat, customer_lng, w.location_lat, w.location_lng) <= max_distance_km
    AND (
      required_skills = '[]'::jsonb
      OR w.skills @> required_skills
    )
  ORDER BY
    trust_score DESC,
    distance_km ASC,
    rating_avg DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION find_nearest_worker TO service_role;
GRANT EXECUTE ON FUNCTION find_nearest_worker TO authenticated;

-- ========== 4. OSRM route caching (for ETA) ==========
CREATE TABLE IF NOT EXISTS route_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_lat NUMERIC NOT NULL,
  from_lng NUMERIC NOT NULL,
  to_lat NUMERIC NOT NULL,
  to_lng NUMERIC NOT NULL,
  distance_km NUMERIC,
  duration_minutes NUMERIC,
  polyline TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_route_cache_coords
  ON route_cache(from_lat, from_lng, to_lat, to_lng);

ALTER TABLE route_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read route cache"
  ON route_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage route cache"
  ON route_cache FOR ALL
  USING (auth.role() = 'service_role');
