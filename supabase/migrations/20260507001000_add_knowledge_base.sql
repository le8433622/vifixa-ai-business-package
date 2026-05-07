-- Knowledge base for Vifixa AI diagnosis

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  diagnosis TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'emergency')),
  recommended_skills TEXT[] DEFAULT '{}',
  estimated_min_price DECIMAL(10,2),
  estimated_max_price DECIMAL(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON public.knowledge_base(is_active);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge base"
  ON public.knowledge_base FOR SELECT
  USING (true);

GRANT SELECT ON public.knowledge_base TO authenticated, anon;
GRANT ALL ON public.knowledge_base TO service_role;

-- Sample knowledge base entries
INSERT INTO public.knowledge_base (category, subcategory, diagnosis, severity, recommended_skills, estimated_min_price, estimated_max_price, description) VALUES
  ('engine', 'khong_khoi_dong', 'Hỏng bộ khởi động (starter motor)', 'medium', ARRAY['Cơ khí động cơ', 'Điện ô tô'], 500000, 2000000, 'Bộ khởi động bị hỏng hoặc mòn chổi than, cần thay thế hoặc sửa chữa'),
  ('engine', 'khong_khoi_dong', 'Hết bình ắc quy', 'low', ARRAY['Điện ô tô'], 300000, 1500000, 'Bình ắc quy yếu hoặc hết điện, cần sạc hoặc thay mới'),
  ('engine', 'khoi_dong_kho', 'Bugi kém chất lượng', 'low', ARRAY['Cơ khí động cơ'], 200000, 800000, 'Bugi cũ hoặc kém chất lượng, cần thay thế bugi mới'),
  ('plumbing', 'ro_ri', 'Rò rỉ ống nước', 'medium', ARRAY['Sửa ống nước', 'Hàn ống'], 300000, 2000000, 'Ống nước bị nứt hoặc hở mối nối, cần hàn hoặc thay ống mới'),
  ('plumbing', 'nghet', 'Tắc nghẽn đường ống', 'medium', ARRAY['Thông tắc cống', 'Sửa ống nước'], 200000, 1500000, 'Đường ống bị tắc do rác hoặc cặn bẩn, cần thông tắc'),
  ('electrical', 'mat_dien', 'CB/chìa bị nhảy', 'low', ARRAY['Thợ điện'], 150000, 500000, 'CB tự động bị nhảy do quá tải hoặc chập điện, cần kiểm tra và reset'),
  ('electrical', 'chap_dien', 'Chập điện cục bộ', 'high', ARRAY['Thợ điện'], 300000, 3000000, 'Chập điện do dây dẫn hở hoặc thiết bị hỏng, cần kiểm tra và sửa chữa'),
  ('air_conditioner', 'khong_lanh', 'Thiếu gas lạnh', 'medium', ARRAY['Sửa máy lạnh'], 400000, 2000000, 'Máy lạnh thiếu gas do rò rỉ, cần nạp gas và kiểm tra rò rỉ'),
  ('air_conditioner', 'khong_lanh', 'Hỏng block/compressor', 'high', ARRAY['Sửa máy lạnh'], 2000000, 8000000, 'Block máy lạnh bị hỏng, cần thay thế block mới'),
  ('washing_machine', 'khong_quay', 'Đứt dây curoa', 'medium', ARRAY['Sửa máy giặt'], 300000, 1200000, 'Dây curoa máy giặt bị đứt, cần thay thế dây mới'),
  ('washing_machine', 'khong_xa', 'Tắc bơm xả', 'low', ARRAY['Sửa máy giặt'], 200000, 800000, 'Bơm xả bị tắc do dị vật, cần vệ sinh bơm xả');
