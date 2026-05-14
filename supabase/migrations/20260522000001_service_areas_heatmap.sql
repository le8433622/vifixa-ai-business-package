-- Service Areas — Worker vẽ vùng phục vụ trên bản đồ
-- Heatmap — Lưu tọa độ đơn hàng để phân tích nhu cầu

-- ========== 1. SERVICE AREAS ==========
CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Khu vực của tôi',
  geometry JSONB NOT NULL, -- GeoJSON Polygon/MultiPolygon
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10, -- Bán kính mặc định
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id)
);

CREATE INDEX IF NOT EXISTS idx_service_areas_worker ON public.service_areas(worker_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_active ON public.service_areas(is_active);

ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Worker can manage own service area" ON public.service_areas
  FOR ALL USING (auth.uid() = worker_id);

CREATE POLICY "Service role can manage service areas" ON public.service_areas
  FOR ALL USING (auth.role() = 'service_role');

GRANT ALL ON public.service_areas TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.service_areas TO authenticated;

-- Function: check if a point is within a worker's service area
CREATE OR REPLACE FUNCTION public.is_in_service_area(
  p_worker_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS BOOLEAN AS $$
DECLARE
  v_area public.service_areas;
  v_center_lat DOUBLE PRECISION;
  v_center_lng DOUBLE PRECISION;
  v_radius_km DOUBLE PRECISION;
BEGIN
  SELECT * INTO v_area FROM public.service_areas
  WHERE worker_id = p_worker_id AND is_active = true;

  IF NOT FOUND THEN RETURN true; END IF; -- No area = whole city

  -- Nếu có GeoJSON polygon, kiểm tra điểm trong polygon
  -- (đơn giản hóa: dùng khoảng cách từ center)
  v_center_lat := COALESCE(v_area.center_lat, p_lat);
  v_center_lng := COALESCE(v_area.center_lng, p_lng);
  v_radius_km := COALESCE(v_area.radius_km, 10);

  RETURN public.calculate_distance(v_center_lat, v_center_lng, p_lat, p_lng) <= v_radius_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: haversine distance
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371;
  dLat DOUBLE PRECISION;
  dLng DOUBLE PRECISION;
  a DOUBLE PRECISION;
BEGIN
  dLat := (lat2 - lat1) * PI() / 180;
  dLng := (lng2 - lng1) * PI() / 180;
  a := SIN(dLat/2)^2 + COS(lat1 * PI()/180) * COS(lat2 * PI()/180) * SIN(dLng/2)^2;
  RETURN R * 2 * ATAN2(SQRT(a), SQRT(1-a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION public.is_in_service_area(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_distance(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role, authenticated;

-- ========== 2. ORDER LOCATIONS (HEATMAP) ==========
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_orders_location ON public.orders(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_orders_category_loc ON public.orders(category, location_lat, location_lng);

-- Heatmap view: đếm số đơn theo khu vực
CREATE OR REPLACE VIEW public.order_heatmap AS
SELECT
  category,
  ROUND(location_lat::NUMERIC, 3) AS lat_grid,
  ROUND(location_lng::NUMERIC, 3) AS lng_grid,
  COUNT(*)::INT AS order_count,
  AVG(final_price)::NUMERIC(12,0) AS avg_price
FROM public.orders
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
  AND status = 'completed'
GROUP BY category, ROUND(location_lat::NUMERIC, 3), ROUND(location_lng::NUMERIC, 3)
ORDER BY order_count DESC;

GRANT SELECT ON public.order_heatmap TO service_role, authenticated;