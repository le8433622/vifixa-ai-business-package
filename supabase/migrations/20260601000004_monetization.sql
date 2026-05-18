-- Phase 22: Monetization Engine
-- Commission engine, membership plans, worker boost
-- 2026-06-01

-- ========== 1. Commission Engine ==========

CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  rate NUMERIC NOT NULL CHECK (rate >= 0 AND rate <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'waived')),
  collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Commission rates by service type
CREATE TABLE IF NOT EXISTS public.commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL UNIQUE,
  rate NUMERIC NOT NULL CHECK (rate >= 0 AND rate <= 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.commission_rates (service_type, rate, description) VALUES
('repair', 15, 'Sửa chữa & bảo trì'),
('cleaning', 12, 'Dọn dẹp nhà cửa'),
('deep_cleaning', 12, 'Tổng vệ sinh'),
('delivery', 18, 'Giao hàng & logistics'),
('moving', 10, 'Chuyển nhà'),
('elder_care', 15, 'Chăm sóc người già'),
('child_care', 15, 'Trông trẻ'),
('pet_care', 15, 'Chăm thú cưng'),
('tutoring', 20, 'Gia sư'),
('massage', 18, 'Massage & làm đẹp');

-- RLS
CREATE POLICY "Admins can view all commissions"
  ON public.commissions FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Workers can view own commissions"
  ON public.commissions FOR SELECT
  USING (auth.uid() = worker_id);

-- Trigger: auto-calculate commission when order is completed
CREATE OR REPLACE FUNCTION public.calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_rate NUMERIC;
  v_commission NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.worker_id IS NOT NULL THEN
    -- Get commission rate for this service
    SELECT rate INTO v_rate FROM public.commission_rates WHERE service_type = NEW.category;
    IF v_rate IS NULL THEN v_rate := 15; END IF; -- default 15%

    v_commission := (NEW.final_price * v_rate / 100)::NUMERIC(12,0);

    -- Deduct from worker earnings ledger
    INSERT INTO public.worker_earnings (worker_id, order_id, amount, type, description)
    VALUES (NEW.worker_id, NEW.id, -v_commission, 'commission', 'Phí nền tảng ' || v_rate || '%');

    -- Insert commission record
    INSERT INTO public.commissions (order_id, worker_id, amount, rate)
    VALUES (NEW.id, NEW.worker_id, v_commission, v_rate);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_calculate_commission ON public.orders;
CREATE TRIGGER trigger_calculate_commission
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_commission();

-- ========== 2. Membership Plans ==========

CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT DEFAULT 'VND',
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly')),
  discount_rate NUMERIC DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 50),
  free_inspections INT DEFAULT 0,
  priority_support BOOLEAN DEFAULT false,
  device_insurance BOOLEAN DEFAULT false,
  sla_hours INT DEFAULT 24,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.membership_plans (name, slug, price, interval, discount_rate, free_inspections, priority_support, device_insurance, sla_hours, features) VALUES
('Cơ bản', 'basic', 99000, 'monthly', 5, 1, false, false, 48, '["Giảm 5% dịch vụ", "Nhắc bảo trì định kỳ", "1 lần kiểm tra/năm"]'::jsonb),
('Gia đình', 'family', 199000, 'monthly', 10, 2, true, true, 24, '["Giảm 10% dịch vụ", "2 lần kiểm tra/năm", "Ưu tiên thợ", "Bảo hiểm thiết bị"]'::jsonb),
('Premium', 'premium', 499000, 'monthly', 15, 0, true, true, 4, '["Giảm 15% dịch vụ", "Không giới hạn kiểm tra", "Thợ VIP", "Bảo hiểm toàn diện", "Hỗ trợ 24/7"]'::jsonb),
('B2B Cơ bản', 'b2b-basic', 1500000, 'monthly', 10, 2, true, false, 24, '["Bảo trì văn phòng", "2 lần/tháng", "SLA 24h"]'::jsonb),
('B2B Chuyên', 'b2b-pro', 5000000, 'monthly', 15, 0, true, false, 4, '["Bảo trì không giới hạn", "SLA 4h", "Dashboard riêng"]'::jsonb);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.membership_plans FOR SELECT
  USING (is_active = true);

-- User subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'grace_period')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  renewed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_method TEXT,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- ========== 3. Worker Boost ==========

CREATE TABLE IF NOT EXISTS public.worker_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  service_type TEXT NOT NULL,
  district TEXT,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  amount_paid NUMERIC NOT NULL CHECK (amount_paid > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.worker_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own boosts"
  ON public.worker_boosts FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Admins can view all boosts"
  ON public.worker_boosts FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Boost pricing
CREATE TABLE IF NOT EXISTS public.boost_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_days INT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'VND',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.boost_pricing (duration_days, price) VALUES
(1, 50000),
(3, 125000),
(7, 250000),
(30, 800000);

ALTER TABLE public.boost_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view boost pricing"
  ON public.boost_pricing FOR SELECT
  USING (is_active = true);

-- ========== 4. Commission auto-split from payment ==========

-- Worker earnings ledger (if not exists)
CREATE TABLE IF NOT EXISTS public.worker_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earning', 'commission', 'tip', 'boost_fee', 'adjustment')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.worker_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own earnings"
  ON public.worker_earnings FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Admins can view all earnings"
  ON public.worker_earnings FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- ========== 5. B2B accounts ==========

CREATE TABLE IF NOT EXISTS public.b2b_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_address TEXT,
  tax_id TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  plan_id UUID REFERENCES public.membership_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.b2b_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage B2B accounts"
  ON public.b2b_accounts FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));