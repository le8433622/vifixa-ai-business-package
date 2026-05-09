-- Subscription/Care Plan tables
-- For recurring maintenance plans

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('month', 'quarter', 'year')),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  popular BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'expired', 'trialing')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Customers can view own subscriptions"
  ON public.customer_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Customers can insert own subscription"
  ON public.customer_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Customers can update own subscription"
  ON public.customer_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Seed default plans
INSERT INTO public.subscription_plans (name, description, price, interval, features, popular) VALUES
  ('Cơ bản', 'Gói bảo trì cơ bản cho thiết bị gia đình', 199000, 'month', '["Vệ sinh điều hòa 1 lần/năm", "Giảm 10% dịch vụ sửa chữa", "Ưu tiên xếp lịch", "Nhắc bảo trì định kỳ"]'::jsonb, FALSE),
  ('Cao cấp', 'Gói bảo trì toàn diện cho gia đình', 499000, 'month', '["Vệ sinh điều hòa 2 lần/năm", "Giảm 20% dịch vụ sửa chữa", "Ưu tiên khẩn cấp 24/7", "Kiểm tra thiết bị định kỳ", "Bảo hành mở rộng 12 tháng"]'::jsonb, TRUE),
  ('Gia đình', 'Gói bảo vệ toàn bộ thiết bị trong nhà', 999000, 'month', '["Vệ sinh điều hòa 4 lần/năm", "Giảm 30% dịch vụ sửa chữa", "Ưu tiên khẩn cấp 24/7", "Kiểm tra toàn bộ thiết bị", "Bảo hành mở rộng 24 tháng", "Hỗ trợ khẩn cấp miễn phí"]'::jsonb, FALSE)
ON CONFLICT DO NOTHING;
