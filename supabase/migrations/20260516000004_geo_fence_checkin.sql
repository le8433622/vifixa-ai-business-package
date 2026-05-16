-- Phase 2.5: Geo-fence Check-in & Location Analytics
-- GAP-1: Geo-fence Check-in — Worker check-in validation by GPS proximity
-- GAP-2: Location Analytics — Admin view orders/disputes by geographic area

-- ========== 1. Check-in columns on orders ==========
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS check_in_radius_km NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC;

-- ========== 2. Check-in events table ==========
CREATE TABLE IF NOT EXISTS check_in_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  distance_to_job_km NUMERIC NOT NULL,
  within_radius BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_in_events_order ON check_in_events(order_id);
CREATE INDEX IF NOT EXISTS idx_check_in_events_worker ON check_in_events(worker_id);

ALTER TABLE check_in_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own check-in events"
  ON check_in_events FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Admins can view all check-in events"
  ON check_in_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 3. validate_check_in RPC ==========
CREATE OR REPLACE FUNCTION validate_check_in(
  order_uuid UUID,
  worker_lat NUMERIC,
  worker_lng NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_lat NUMERIC;
  v_order_lng NUMERIC;
  v_radius_km NUMERIC;
  v_distance_km NUMERIC;
  v_result JSONB;
BEGIN
  -- Get order location and radius
  SELECT location_lat, location_lng, COALESCE(check_in_radius_km, 0.5)
  INTO v_order_lat, v_order_lng, v_radius_km
  FROM orders
  WHERE id = order_uuid;

  IF v_order_lat IS NULL OR v_order_lng IS NULL THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Order has no location set'
    );
  END IF;

  -- Calculate haversine distance
  SELECT 6371 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(v_order_lat - worker_lat) / 2), 2) +
    COS(RADIANS(worker_lat)) * COS(RADIANS(v_order_lat)) *
    POWER(SIN(RADIANS(v_order_lng - worker_lng) / 2), 2)
  )) INTO v_distance_km;

  v_result := jsonb_build_object(
    'valid', v_distance_km <= v_radius_km,
    'distance_km', ROUND(v_distance_km::NUMERIC, 3),
    'radius_km', v_radius_km,
    'within_radius', v_distance_km <= v_radius_km
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_check_in TO authenticated, service_role;

-- ========== 4. record_check_in RPC ==========
CREATE OR REPLACE FUNCTION record_check_in(
  order_uuid UUID,
  worker_lat NUMERIC,
  worker_lng NUMERIC,
  distance_km NUMERIC,
  within_radius BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_worker_id UUID;
  v_result JSONB;
BEGIN
  -- Get worker ID from orders
  SELECT worker_id INTO v_worker_id FROM orders WHERE id = order_uuid;

  -- Insert check-in event
  INSERT INTO check_in_events (order_id, worker_id, lat, lng, distance_to_job_km, within_radius)
  VALUES (order_uuid, v_worker_id, worker_lat, worker_lng, distance_km, within_radius);

  -- Update order check-in fields
  UPDATE orders SET
    check_in_at = NOW(),
    check_in_lat = worker_lat,
    check_in_lng = worker_lng
  WHERE id = order_uuid;

  v_result := jsonb_build_object(
    'success', TRUE,
    'checked_in_at', NOW()
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION record_check_in TO authenticated, service_role;

-- ========== 5. Location Analytics — order distribution by grid ==========
CREATE OR REPLACE FUNCTION get_location_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_districts JSONB;
  v_total_orders INT;
BEGIN
  SELECT COUNT(*) INTO v_total_orders FROM orders WHERE location_lat IS NOT NULL;

  -- Group orders by rough district grid (HCMC area)
  SELECT jsonb_agg(sub)
  INTO v_districts
  FROM (
    SELECT
      CASE
        WHEN location_lat >= 10.80 AND location_lat <= 10.85 AND location_lng >= 106.65 AND location_lng <= 106.70 THEN 'Quận 1'
        WHEN location_lat >= 10.76 AND location_lat <= 10.80 AND location_lng >= 106.67 AND location_lng <= 106.72 THEN 'Quận 3'
        WHEN location_lat >= 10.75 AND location_lat <= 10.80 AND location_lng >= 106.70 AND location_lng <= 106.75 THEN 'Quận 4'
        WHEN location_lat >= 10.78 AND location_lat <= 10.83 AND location_lng >= 106.62 AND location_lng <= 106.67 THEN 'Quận 5'
        WHEN location_lat >= 10.74 AND location_lat <= 10.78 AND location_lng >= 106.63 AND location_lng <= 106.68 THEN 'Quận 7'
        WHEN location_lat >= 10.82 AND location_lat <= 10.88 AND location_lng >= 106.68 AND location_lng <= 106.74 THEN 'Bình Thạnh'
        WHEN location_lat >= 10.84 AND location_lat <= 10.90 AND location_lng >= 106.60 AND location_lng <= 106.66 THEN 'Tân Bình'
        WHEN location_lat >= 10.78 AND location_lat <= 10.84 AND location_lng >= 106.58 AND location_lng <= 106.64 THEN 'Tân Phú'
        ELSE 'Khác'
      END AS district,
      COUNT(*)::INT AS order_count
    FROM orders
    WHERE location_lat IS NOT NULL
    GROUP BY district
    ORDER BY order_count DESC
  ) sub;

  RETURN jsonb_build_object(
    'total_orders', v_total_orders,
    'districts', COALESCE(v_districts, '[]'::JSONB)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_location_analytics TO authenticated, service_role;
