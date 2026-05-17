-- Ensure app_settings table exists for AI config and other settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admin full access (uses JWT helper)
DROP POLICY IF EXISTS "Admin full access app_settings" ON public.app_settings;
CREATE POLICY "Admin full access app_settings"
  ON public.app_settings FOR ALL
  USING (public.is_admin_from_jwt());

-- Seed default AI config
INSERT INTO public.app_settings (key, value) VALUES
  ('ai_model', '{"provider": "nvidia", "model": "meta/llama3-8b-instruct", "temperature": 0.7, "max_tokens": 2048}'::jsonb),
  ('ai_prompts', '{"diagnosis": "Bạn là chuyên gia chẩn đoán thiết bị gia dụng. Hãy phân tích triệu chứng và đưa ra chẩn đoán chính xác.", "warranty": "Bạn là chuyên gia bảo hành. Xác định điều kiện bảo hành dựa trên thông tin thiết bị.", "quality": "Bạn là giám sát chất lượng. Đánh giá chất lượng dịch vụ dựa trên phản hồi và dữ liệu công việc."}'::jsonb),
  ('ai_quality', '{"min_quality_score": 70, "auto_approve_threshold": 85, "require_photo_review": true}'::jsonb),
  ('ai_api_keys', '{"nvidia": "", "openai": "", "anthropic": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
