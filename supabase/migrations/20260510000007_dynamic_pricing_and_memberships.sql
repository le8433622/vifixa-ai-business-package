-- PHASE 1: DYNAMIC PRICING & MEMBERSHIPS
-- Task 1.1: Dynamic Pricing Engine
-- Task 1.2: Customer Membership Plans
-- Task 1.3: Ads & Promotion System

-- ============================================
-- 1. DYNAMIC PRICING CONFIGURATION
-- ============================================

-- Bảng cấu hình dynamic pricing theo khu vực, thời gian, kỹ năng
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('surge', 'location', 'skill', 'emergency', 'time_based', 'demand')),
    is_active BOOLEAN DEFAULT true,
    
    -- Điều kiện áp dụng
    location_ids UUID[] DEFAULT NULL, -- NULL = tất cả
    service_categories TEXT[] DEFAULT NULL, -- NULL = tất cả
    worker_skill_levels INT[] DEFAULT NULL, -- [1,2,3,4,5]
    time_ranges JSONB DEFAULT NULL, -- {"start": "18:00", "end": "22:00", "days": ["sat", "sun"]}
    demand_threshold DECIMAL(5,2) DEFAULT NULL, -- Áp dụng khi demand > threshold
    
    -- Hệ số giá
    multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0 CHECK (multiplier >= 1.0 AND multiplier <= 5.0),
    fixed_surcharge DECIMAL(10,2) DEFAULT 0 CHECK (fixed_surcharge >= 0),
    
    -- Priority (ưu tiên rule nào khi nhiều rule trùng)
    priority INT DEFAULT 100,
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_active ON public.pricing_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_pricing_rules_type ON public.pricing_rules(rule_type);
CREATE INDEX idx_pricing_rules_location ON public.pricing_rules USING GIN(location_ids);

-- Bảng theo dõi demand real-time để trigger surge pricing
CREATE TABLE IF NOT EXISTS public.demand_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id),
    service_category VARCHAR(100),
    
    -- Metrics trong khung thời gian
    time_window TIMESTAMPTZ NOT NULL,
    orders_count INT DEFAULT 0,
    available_workers_count INT DEFAULT 0,
    pending_orders_count INT DEFAULT 0,
    avg_response_time_seconds INT DEFAULT 0,
    
    -- Demand score (0-100)
    demand_score DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_demand_metrics_time ON public.demand_metrics(time_window DESC);
CREATE INDEX idx_demand_metrics_location ON public.demand_metrics(location_id, time_window DESC);

-- ============================================
-- 2. CUSTOMER MEMBERSHIP PLANS
-- ============================================

-- Bảng gói membership cho khách hàng
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    
    -- Pricing
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0, -- Discount cho yearly
    currency VARCHAR(3) DEFAULT 'VND',
    
    -- Features
    features JSONB NOT NULL DEFAULT '{}', -- {priority_booking: true, discount_percent: 10, free_diagnostics: 2, vip_support: true}
    max_bookings_per_month INT DEFAULT NULL, -- NULL = unlimited
    discount_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Limits
    priority_level INT DEFAULT 1, -- Higher = more priority
    dedicated_support BOOLEAN DEFAULT false,
    free_cancellations INT DEFAULT 0,
    
    -- Visibility
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng subscription của khách hàng
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.membership_plans(id),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
    
    -- Billing
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ DEFAULT NULL,
    cancel_reason TEXT DEFAULT NULL,
    
    -- Payment
    last_payment_at TIMESTAMPTZ DEFAULT NULL,
    last_payment_amount DECIMAL(10,2) DEFAULT 0,
    next_billing_date TIMESTAMPTZ DEFAULT NULL,
    
    -- Usage tracking
    bookings_used_this_month INT DEFAULT 0,
    free_diagnostics_used INT DEFAULT 0,
    free_cancellations_used INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_subscriptions_user ON public.customer_subscriptions(user_id);
CREATE INDEX idx_customer_subscriptions_status ON public.customer_subscriptions(status);
CREATE INDEX idx_customer_subscriptions_period ON public.customer_subscriptions(current_period_end);

-- ============================================
-- 3. ADS & PROMOTION SYSTEM FOR WORKERS
-- ============================================

-- Bảng gói quảng cáo/boost cho thợ
CREATE TABLE IF NOT EXISTS public.worker_ad_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    
    -- Types
    package_type VARCHAR(50) NOT NULL CHECK (package_type IN ('pay_per_boost', 'subscription', 'featured_badge', 'top_position')),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    duration_days INT DEFAULT 1, -- 1 day for pay-per-boost, 30 for subscription
    
    -- Benefits
    benefits JSONB NOT NULL DEFAULT '{}', -- {boost_factor: 2.0, show_in_top_n: 5, badge_icon: 'star', impressions_guaranteed: 1000}
    boost_factor DECIMAL(5,2) DEFAULT 1.0, -- Nhân hệ số hiển thị
    priority_score_bonus INT DEFAULT 0,
    
    -- Limits
    max_uses_per_purchase INT DEFAULT 1,
    
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng mua và sử dụng ad packages
CREATE TABLE IF NOT EXISTS public.worker_ad_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.worker_ad_packages(id),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'refunded')),
    
    -- Usage
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_count INT DEFAULT 0,
    remaining_uses INT DEFAULT 1,
    
    -- Performance tracking
    impressions_count INT DEFAULT 0,
    clicks_count INT DEFAULT 0,
    conversions_count INT DEFAULT 0,
    
    payment_id UUID REFERENCES public.payments(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worker_ad_purchases_worker ON public.worker_ad_purchases(worker_id);
CREATE INDEX idx_worker_ad_purchases_status ON public.worker_ad_purchases(status, expires_at);

-- Bảng boost sessions (khi worker kích hoạt boost)
CREATE TABLE IF NOT EXISTS public.worker_boost_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ad_purchase_id UUID REFERENCES public.worker_ad_purchases(id),
    
    -- Session info
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Current boost factor
    current_boost_factor DECIMAL(5,2) DEFAULT 1.0,
    current_priority_bonus INT DEFAULT 0,
    
    -- Stats during session
    profile_views INT DEFAULT 0,
    job_suggestions_received INT DEFAULT 0,
    jobs_won INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worker_boost_sessions_active ON public.worker_boost_sessions(worker_id, is_active) WHERE is_active = true;
CREATE INDEX idx_worker_boost_sessions_time ON public.worker_boost_sessions(started_at, ends_at);

-- ============================================
-- 4. ENHANCE EXISTING TABLES
-- ============================================

-- Thêm columns vào orders để hỗ trợ dynamic pricing
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS dynamic_multiplier DECIMAL(5,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS applied_pricing_rules UUID[],
ADD COLUMN IF NOT EXISTS surge_charge DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS membership_discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2);

-- Thêm columns vào profiles cho worker ads
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_boost_factor DECIMAL(5,2) DEFAULT 1.0;

-- ============================================
-- 5. INSERT DEFAULT DATA
-- ============================================

-- Default pricing rules
INSERT INTO public.pricing_rules (name, rule_type, multiplier, priority, description) VALUES
('Giờ cao điểm tối (18:00-22:00)', 'time_based', 1.3, 50, 'Tăng giá 30% vào giờ cao điểm buổi tối'),
('Cuối tuần (Thứ 7, CN)', 'time_based', 1.2, 60, 'Tăng giá 20% vào cuối tuần'),
('Khẩn cấp (trong vòng 2h)', 'emergency', 1.5, 30, 'Phí khẩn cấp 50% cho dịch vụ trong 2h'),
('Kỹ năng cao (Level 4-5)', 'skill', 1.4, 70, 'Thợ level cao có giá cao hơn 40%'),
('Khu vực trung tâm', 'location', 1.25, 80, 'Khu vực trung tâm thành phố tăng 25%');

-- Default membership plans
INSERT INTO public.membership_plans (name, slug, price_monthly, price_yearly, features, discount_percent, priority_level, display_order) VALUES
('Cơ bản', 'basic', 0, 0, '{"priority_booking": false, "discount_percent": 0, "free_diagnostics": 0, "vip_support": false}', 0, 1, 1),
('Bạc', 'silver', 99000, 990000, '{"priority_booking": true, "discount_percent": 5, "free_diagnostics": 1, "vip_support": false}', 5, 2, 2),
('Vàng', 'gold', 249000, 2490000, '{"priority_booking": true, "discount_percent": 10, "free_diagnostics": 3, "vip_support": true}', 10, 3, 3),
('Bạch kim', 'platinum', 499000, 4990000, '{"priority_booking": true, "discount_percent": 15, "free_diagnostics": 5, "vip_support": true, "dedicated_manager": true}', 15, 4, 4);

-- Default worker ad packages
INSERT INTO public.worker_ad_packages (name, slug, package_type, price, duration_days, benefits, boost_factor, display_order) VALUES
('Boost 1 đơn', 'boost-single', 'pay_per_boost', 50000, 1, '{"boost_factor": 2.0, "duration_hours": 24}', 2.0, 1),
('Boost tuần', 'boost-weekly', 'subscription', 250000, 7, '{"boost_factor": 1.5, "show_in_top_n": 10}', 1.5, 2),
('Badge Nổi bật', 'featured-badge', 'featured_badge', 500000, 30, '{"badge_icon": "star", "profile_highlight": true}', 1.3, 3),
('Top vị trí', 'top-position', 'top_position', 1000000, 30, '{"show_in_top_n": 3, "boost_factor": 3.0}', 3.0, 4);

-- ============================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================

-- Function tính dynamic price cho order
CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
    p_base_price DECIMAL,
    p_location_id UUID,
    p_service_category VARCHAR,
    p_worker_id UUID,
    p_is_emergency BOOLEAN DEFAULT false
)
RETURNS TABLE (
    final_price DECIMAL,
    multiplier DECIMAL,
    applied_rules UUID[],
    breakdown JSONB
) AS $$
DECLARE
    v_multiplier DECIMAL := 1.0;
    v_fixed_surcharge DECIMAL := 0;
    v_applied_rules UUID[] := ARRAY[]::UUID[];
    v_breakdown JSONB := '{}'::jsonb;
    r RECORD;
BEGIN
    -- Get worker skill level
    SELECT skill_level INTO v_multiplier
    FROM public.profiles
    WHERE id = p_worker_id;
    
    -- Apply active pricing rules
    FOR r IN 
        SELECT * FROM public.pricing_rules
        WHERE is_active = true
        AND (location_ids IS NULL OR p_location_id = ANY(location_ids))
        AND (service_categories IS NULL OR p_service_category = ANY(service_categories))
        AND (worker_skill_levels IS NULL OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = p_worker_id 
            AND skill_level = ANY(worker_skill_levels)
        ))
        ORDER BY priority ASC
    LOOP
        v_multiplier := v_multiplier * r.multiplier;
        v_fixed_surcharge := v_fixed_surcharge + COALESCE(r.fixed_surcharge, 0);
        v_applied_rules := array_append(v_applied_rules, r.id);
        v_breakdown := v_breakdown || jsonb_build_object(r.name, jsonb_build_object(
            'multiplier', r.multiplier,
            'surcharge', r.fixed_surcharge
        ));
    END LOOP;
    
    -- Emergency surcharge
    IF p_is_emergency THEN
        v_multiplier := v_multiplier * 1.5;
        v_breakdown := v_breakdown || '{"emergency": {"multiplier": 1.5}}'::jsonb;
    END IF;
    
    final_price := (p_base_price * v_multiplier) + v_fixed_surcharge;
    multiplier := v_multiplier;
    applied_rules := v_applied_rules;
    breakdown := v_breakdown;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function cập nhật demand metrics (gọi bởi cron hoặc trigger)
CREATE OR REPLACE FUNCTION public.update_demand_metrics()
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.demand_metrics (
        location_id, 
        service_category, 
        time_window, 
        orders_count, 
        available_workers_count, 
        pending_orders_count,
        demand_score
    )
    SELECT 
        o.location_id,
        o.service_category,
        date_trunc('hour', o.created_at) as time_window,
        COUNT(*) FILTER (WHERE o.status IN ('pending', 'assigned')) as orders_count,
        (SELECT COUNT(*) FROM public.profiles p WHERE p.role = 'worker' AND p.is_available = true AND p.location_id = o.location_id) as available_workers_count,
        COUNT(*) FILTER (WHERE o.status = 'pending') as pending_orders_count,
        -- Demand score calculation: higher when more orders and fewer workers
        LEAST(100, (COUNT(*) FILTER (WHERE o.status = 'pending') * 100.0 / 
            GREATEST(1, (SELECT COUNT(*) FROM public.profiles p WHERE p.role = 'worker' AND p.is_available = true AND p.location_id = o.location_id)))) as demand_score
    FROM public.orders o
    WHERE o.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY o.location_id, o.service_category, date_trunc('hour', o.created_at)
    ON CONFLICT (id) DO UPDATE SET
        orders_count = EXCLUDED.orders_count,
        available_workers_count = EXCLUDED.available_workers_count,
        pending_orders_count = EXCLUDED.pending_orders_count,
        demand_score = EXCLUDED.demand_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger tự động cập nhật featured status khi ad purchase expires
CREATE OR REPLACE FUNCTION public.sync_worker_featured_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = 'expired' AND OLD.status = 'active' THEN
        UPDATE public.profiles
        SET is_featured = false, featured_until = NULL
        WHERE id = NEW.worker_id;
    END IF;
    
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active') THEN
        UPDATE public.profiles
        SET 
            is_featured = true,
            featured_until = GREATEST(featured_until, NEW.expires_at),
            current_boost_factor = GREATEST(current_boost_factor, 
                (SELECT boost_factor FROM public.worker_ad_packages WHERE id = NEW.package_id))
        WHERE id = NEW.worker_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_worker_featured_status
AFTER INSERT OR UPDATE ON public.worker_ad_purchases
FOR EACH ROW EXECUTE FUNCTION public.sync_worker_featured_status();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Pricing rules: public read, admin write
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pricing rules are viewable by everyone" ON public.pricing_rules
    FOR SELECT USING (true);
CREATE POLICY "Pricing rules manageable by admins" ON public.pricing_rules
    FOR ALL USING (public.is_admin(auth.uid()));

-- Membership plans: public read, admin write
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membership plans viewable by everyone" ON public.membership_plans
    FOR SELECT USING (true);
CREATE POLICY "Membership plans manageable by admins" ON public.membership_plans
    FOR ALL USING (public.is_admin(auth.uid()));

-- Customer subscriptions: users can see their own
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.customer_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all subscriptions" ON public.customer_subscriptions
    FOR ALL USING (public.is_admin(auth.uid()));

-- Worker ad packages: public read, admin write
ALTER TABLE public.worker_ad_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ad packages viewable by everyone" ON public.worker_ad_packages
    FOR SELECT USING (true);
CREATE POLICY "Ad packages manageable by admins" ON public.worker_ad_packages
    FOR ALL USING (public.is_admin(auth.uid()));

-- Worker ad purchases: workers can see their own
ALTER TABLE public.worker_ad_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers can view own ad purchases" ON public.worker_ad_purchases
    FOR SELECT USING (auth.uid() = worker_id);
CREATE POLICY "Workers can create own ad purchases" ON public.worker_ad_purchases
    FOR INSERT WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "Admins can manage all ad purchases" ON public.worker_ad_purchases
    FOR ALL USING (public.is_admin(auth.uid()));

-- Boost sessions: workers can see their own
ALTER TABLE public.worker_boost_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers can view own boost sessions" ON public.worker_boost_sessions
    FOR SELECT USING (auth.uid() = worker_id);
CREATE POLICY "Workers can create own boost sessions" ON public.worker_boost_sessions
    FOR INSERT WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "Admins can manage all boost sessions" ON public.worker_boost_sessions
    FOR ALL USING (public.is_admin(auth.uid()));

COMMENT ON TABLE public.pricing_rules IS 'Dynamic pricing rules for surge, location, skill-based pricing';
COMMENT ON TABLE public.membership_plans IS 'Customer membership subscription plans';
COMMENT ON TABLE public.customer_subscriptions IS 'Active customer subscriptions to membership plans';
COMMENT ON TABLE public.worker_ad_packages IS 'Advertising/boost packages for workers';
COMMENT ON TABLE public.worker_ad_purchases IS 'Worker purchases of ad packages';
COMMENT ON TABLE public.worker_boost_sessions IS 'Active boost sessions when workers activate their packages';
COMMENT ON TABLE public.demand_metrics IS 'Real-time demand metrics for surge pricing triggers';
