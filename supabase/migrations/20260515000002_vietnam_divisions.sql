-- P0.2: Vietnam administrative divisions + seed 34 provinces
CREATE TABLE IF NOT EXISTS public.vietnam_administrative_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_short TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('province', 'district', 'ward')),
  parent_code VARCHAR(10) REFERENCES vietnam_administrative_divisions(code),
  level INTEGER NOT NULL,
  geometry GEOMETRY(POLYGON, 4326),
  center_lat DECIMAL(10,7),
  center_lng DECIMAL(10,7),
  region TEXT CHECK (region IN ('north', 'central', 'south', 'highlands')),
  is_active BOOLEAN DEFAULT true,
  osm_relation_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vietnam_administrative_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Divisions viewable by everyone" ON public.vietnam_administrative_divisions
  FOR SELECT USING (true);

CREATE POLICY "Divisions manageable by admins" ON public.vietnam_administrative_divisions
  FOR ALL USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_divisions_parent ON vietnam_administrative_divisions(parent_code);
CREATE INDEX IF NOT EXISTS idx_divisions_type ON vietnam_administrative_divisions(type);
CREATE INDEX IF NOT EXISTS idx_divisions_geometry ON vietnam_administrative_divisions USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_divisions_region ON vietnam_administrative_divisions(region);

-- Seed 34 provinces (Phase 1: 5 | Phase 2: 12 | Phase 3: 17)
INSERT INTO vietnam_administrative_divisions (code, name, name_short, type, level, region, center_lat, center_lng) VALUES
-- Phase 1: 5 thành phố trực thuộc trung ương
('VN-SG', 'Thành phố Hồ Chí Minh', 'Hồ Chí Minh', 'province', 1, 'south', 10.8231, 106.6297),
('VN-HN', 'Thành phố Hà Nội', 'Hà Nội', 'province', 1, 'north', 21.0285, 105.8542),
('VN-DN', 'Thành phố Đà Nẵng', 'Đà Nẵng', 'province', 1, 'central', 16.0544, 108.2022),
('VN-CT', 'Thành phố Cần Thơ', 'Cần Thơ', 'province', 1, 'south', 10.0452, 105.7469),
('VN-HP', 'Thành phố Hải Phòng', 'Hải Phòng', 'province', 1, 'north', 20.8449, 106.6881),
-- Phase 2: 12 tỉnh vùng kinh tế trọng điểm
('VN-BD', 'Tỉnh Bình Dương', 'Bình Dương', 'province', 1, 'south', 11.0000, 106.6500),
('VN-DNai', 'Tỉnh Đồng Nai', 'Đồng Nai', 'province', 1, 'south', 10.9574, 107.1000),
('VN-BV', 'Tỉnh Bà Rịa - Vũng Tàu', 'Bà Rịa - Vũng Tàu', 'province', 1, 'south', 10.5000, 107.1667),
('VN-LA', 'Tỉnh Long An', 'Long An', 'province', 1, 'south', 10.5333, 106.4167),
('VN-TN', 'Tỉnh Tây Ninh', 'Tây Ninh', 'province', 1, 'south', 11.3000, 106.1000),
('VN-BN', 'Tỉnh Bắc Ninh', 'Bắc Ninh', 'province', 1, 'north', 21.1833, 106.0667),
('VN-HY', 'Tỉnh Hưng Yên', 'Hưng Yên', 'province', 1, 'north', 20.6500, 106.0667),
('VN-HD', 'Tỉnh Hải Dương', 'Hải Dương', 'province', 1, 'north', 20.9333, 106.3333),
('VN-VP', 'Tỉnh Vĩnh Phúc', 'Vĩnh Phúc', 'province', 1, 'north', 21.3000, 105.6000),
('VN-QN', 'Tỉnh Quảng Ninh', 'Quảng Ninh', 'province', 1, 'north', 21.0167, 107.2833),
('VN-QNam', 'Tỉnh Quảng Nam', 'Quảng Nam', 'province', 1, 'central', 15.5667, 108.0333),
('VN-KH', 'Tỉnh Khánh Hòa', 'Khánh Hòa', 'province', 1, 'central', 12.2500, 109.1833),
-- Phase 3: 17 tỉnh mở rộng
('VN-AG', 'Tỉnh An Giang', 'An Giang', 'province', 1, 'south', 10.3833, 105.4333),
('VN-KG', 'Tỉnh Kiên Giang', 'Kiên Giang', 'province', 1, 'south', 10.0000, 105.0833),
('VN-TG', 'Tỉnh Tiền Giang', 'Tiền Giang', 'province', 1, 'south', 10.3667, 106.3500),
('VN-BT', 'Tỉnh Bến Tre', 'Bến Tre', 'province', 1, 'south', 10.2500, 106.3667),
('VN-VL', 'Tỉnh Vĩnh Long', 'Vĩnh Long', 'province', 1, 'south', 10.2500, 105.9667),
('VN-DT', 'Tỉnh Đồng Tháp', 'Đồng Tháp', 'province', 1, 'south', 10.7000, 105.7000),
('VN-CM', 'Tỉnh Cà Mau', 'Cà Mau', 'province', 1, 'south', 9.1833, 105.1500),
('VN-ST', 'Tỉnh Sóc Trăng', 'Sóc Trăng', 'province', 1, 'south', 9.6000, 105.9667),
('VN-BL', 'Tỉnh Bạc Liêu', 'Bạc Liêu', 'province', 1, 'south', 9.2833, 105.7167),
('VN-LD', 'Tỉnh Lâm Đồng', 'Lâm Đồng', 'province', 1, 'highlands', 11.9500, 108.4333),
('VN-DL', 'Tỉnh Đắk Lắk', 'Đắk Lắk', 'province', 1, 'highlands', 12.6667, 108.0500),
('VN-GL', 'Tỉnh Gia Lai', 'Gia Lai', 'province', 1, 'highlands', 13.9833, 108.0000),
('VN-KT', 'Tỉnh Kon Tum', 'Kon Tum', 'province', 1, 'highlands', 14.3833, 108.0000),
('VN-NA', 'Tỉnh Nghệ An', 'Nghệ An', 'province', 1, 'north', 19.3333, 104.8333),
('VN-TH', 'Tỉnh Thanh Hóa', 'Thanh Hóa', 'province', 1, 'north', 19.8000, 105.7667),
('VN-TTH', 'Tỉnh Thừa Thiên Huế', 'Thừa Thiên Huế', 'province', 1, 'central', 16.3333, 107.5833),
('VN-BTh', 'Tỉnh Bình Thuận', 'Bình Thuận', 'province', 1, 'south', 10.9333, 108.1000)
ON CONFLICT (code) DO NOTHING;
