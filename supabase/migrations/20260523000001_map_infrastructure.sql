-- Phase A: MAP Infrastructure — Thêm tọa độ cho mọi object
-- Mục tiêu: mọi thứ đều có vị trí địa lý

-- ========== 1. ORDERS — Thêm tọa độ ==========
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_accuracy TEXT DEFAULT 'approximate' CHECK (location_accuracy IN ('exact', 'approximate', 'district', 'city'));

CREATE INDEX IF NOT EXISTS idx_orders_location ON public.orders(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_orders_category_loc ON public.orders(category, location_lat, location_lng);

COMMENT ON COLUMN public.orders.location_lat IS 'Vĩ độ nơi cần sửa chữa';
COMMENT ON COLUMN public.orders.location_lng IS 'Kinh độ nơi cần sửa chữa';
COMMENT ON COLUMN public.orders.location_address IS 'Địa chỉ văn bản nơi cần sửa';
COMMENT ON COLUMN public.orders.location_accuracy IS 'Độ chính xác: exact=GPS, approximate=ước lượng, district=theo quận, city=theo thành phố';

-- ========== 2. PROFILES — Thêm vị trí nhà ==========
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_lat DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_lng DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_address TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_home_location ON public.profiles(home_lat, home_lng);

COMMENT ON COLUMN public.profiles.home_lat IS 'Vĩ độ nhà của user';
COMMENT ON COLUMN public.profiles.home_lng IS 'Kinh độ nhà của user';

-- ========== 3. WORKERS — Thêm bán kính phục vụ ==========
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS service_radius_km DOUBLE PRECISION DEFAULT 20;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS max_travel_km DOUBLE PRECISION DEFAULT 30;

COMMENT ON COLUMN public.workers.service_radius_km IS 'Bán kính phục vụ mặc định (km)';
COMMENT ON COLUMN public.workers.max_travel_km IS 'Khoảng cách tối đa thợ sẵn sàng đi (km)';

-- ========== 4. SERVICE AREAS (nếu chưa có) ==========
CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT 'Khu vực của tôi',
  geometry JSONB NOT NULL,
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id)
);

CREATE INDEX IF NOT EXISTS idx_service_areas_worker ON public.service_areas(worker_id);

ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Worker can manage own service area" ON public.service_areas;
CREATE POLICY "Worker can manage own service area" ON public.service_areas
  FOR ALL USING (auth.uid() = worker_id);

GRANT ALL ON public.service_areas TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.service_areas TO authenticated;

-- ========== 5. HÀM HỖ TRỢ ==========

-- Haversine distance
CREATE OR REPLACE FUNCTION public.haversine_distance(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE R DOUBLE PRECISION := 6371; dLat DOUBLE PRECISION; dLng DOUBLE PRECISION; a DOUBLE PRECISION;
BEGIN
  dLat := (lat2 - lat1) * PI() / 180;
  dLng := (lng2 - lng1) * PI() / 180;
  a := SIN(dLat/2)^2 + COS(lat1 * PI()/180) * COS(lat2 * PI()/180) * SIN(dLng/2)^2;
  RETURN R * 2 * ATAN2(SQRT(a), SQRT(1-a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION public.haversine_distance(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role, authenticated;

-- ========== 6. VIEW: Order Heatmap ==========
DROP VIEW IF EXISTS public.order_heatmap;
CREATE VIEW public.order_heatmap AS
SELECT
  category,
  ROUND(location_lat::NUMERIC, 2) AS lat_grid,
  ROUND(location_lng::NUMERIC, 2) AS lng_grid,
  COUNT(*)::INT AS order_count,
  ROUND(AVG(COALESCE(final_price, estimated_price, 0))::NUMERIC, 0) AS avg_price
FROM public.orders
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
  AND status = 'completed'
GROUP BY category, ROUND(location_lat::NUMERIC, 2), ROUND(location_lng::NUMERIC, 2)
ORDER BY order_count DESC;

GRANT SELECT ON public.order_heatmap TO service_role, authenticated;