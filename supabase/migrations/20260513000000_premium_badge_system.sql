-- Vifixa AI v2.0 Premium Worker Badge System
-- Revenue Booster #3: $29/$49/$99 monthly badge tiers

-- ============================================
-- 1. PREMIUM BADGE PACKAGES
-- ============================================
-- Extend worker_ad_packages with premium badge tiers
INSERT INTO public.worker_ad_packages (name, slug, package_type, price, duration_days, benefits, boost_factor, priority_score_bonus, max_uses_per_purchase, display_order)
VALUES
    ('Huy hiệu Bạc', 'premium-silver', 'featured_badge', 725000, 30,
     '{"badge_icon": "badge-check", "badge_color": "silver", "badge_label": "Đã xác thực", "boost_factor": 1.1, "show_in_top": false}'::jsonb,
     1.1, 5, 1, 1),
    ('Huy hiệu Vàng', 'premium-gold', 'featured_badge', 1225000, 30,
     '{"badge_icon": "crown", "badge_color": "gold", "badge_label": "Chuyên gia", "boost_factor": 1.25, "show_in_top": true, "priority_matching": true}'::jsonb,
     1.25, 15, 1, 2),
    ('Huy hiệu Bạch Kim', 'premium-platinum', 'featured_badge', 2475000, 30,
     '{"badge_icon": "gem", "badge_color": "platinum", "badge_label": "VIP", "boost_factor": 1.5, "show_in_top": true, "priority_matching": true, "featured_profile": true}'::jsonb,
     1.5, 30, 1, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. STRIPE PRICE IDS FOR BADGE TIERS
-- ============================================
ALTER TABLE public.worker_ad_packages
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT DEFAULT NULL;

-- ============================================
-- 3. FUNCTION: GET WORKER ACTIVE BADGE
-- ============================================
CREATE OR REPLACE FUNCTION public.get_worker_active_badge(p_worker_id UUID)
RETURNS TABLE (
    badge_id UUID,
    badge_name VARCHAR,
    badge_slug VARCHAR,
    badge_icon TEXT,
    badge_color TEXT,
    badge_label TEXT,
    boost_factor DECIMAL,
    priority_bonus INT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wap.id AS badge_id,
        wap.name AS badge_name,
        wap.slug AS badge_slug,
        wap.benefits->>'badge_icon' AS badge_icon,
        wap.benefits->>'badge_color' AS badge_color,
        wap.benefits->>'badge_label' AS badge_label,
        wap.boost_factor,
        wap.priority_score_bonus AS priority_bonus,
        wapurchase.expires_at,
        (wapurchase.status = 'active' AND wapurchase.expires_at > NOW()) AS is_active
    FROM public.worker_ad_purchases wapurchase
    JOIN public.worker_ad_packages wap ON wap.id = wapurchase.package_id
    WHERE wapurchase.worker_id = p_worker_id
      AND wapurchase.status = 'active'
      AND wap.package_type = 'featured_badge'
      AND wapurchase.expires_at > NOW()
    ORDER BY wap.boost_factor DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 4. FUNCTION: LIST WORKERS WITH ACTIVE BADGES
-- ============================================
CREATE OR REPLACE FUNCTION public.get_workers_with_badges(p_limit INT DEFAULT 20, p_offset INT DEFAULT 0)
RETURNS TABLE (
    worker_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    trust_score INT,
    badge_name VARCHAR,
    badge_slug VARCHAR,
    badge_icon TEXT,
    badge_color TEXT,
    badge_label TEXT,
    boost_factor DECIMAL,
    priority_bonus INT,
    avg_rating DECIMAL,
    total_orders INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS worker_id,
        p.full_name,
        p.avatar_url,
        w.trust_score,
        wap.name AS badge_name,
        wap.slug AS badge_slug,
        wap.benefits->>'badge_icon' AS badge_icon,
        wap.benefits->>'badge_color' AS badge_color,
        wap.benefits->>'badge_label' AS badge_label,
        wap.boost_factor,
        wap.priority_score_bonus AS priority_bonus,
        w.avg_rating,
        w.total_orders
    FROM public.profiles p
    JOIN public.workers w ON w.user_id = p.id
    LEFT JOIN public.worker_ad_purchases wapurchase 
        ON wapurchase.worker_id = p.id 
        AND wapurchase.status = 'active' 
        AND wapurchase.expires_at > NOW()
    LEFT JOIN public.worker_ad_packages wap 
        ON wap.id = wapurchase.package_id 
        AND wap.package_type = 'featured_badge'
    WHERE p.role = 'worker'
    AND w.is_verified = true
    ORDER BY 
        wap.priority_score_bonus DESC NULLS LAST,
        wap.boost_factor DESC NULLS LAST,
        w.trust_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 5. ENHANCE MATCHING: ADD BADGE SORTING
-- ============================================
CREATE OR REPLACE FUNCTION public.get_workers_sorted_by_badge(p_category TEXT DEFAULT NULL)
RETURNS TABLE (
    worker_id UUID,
    full_name TEXT,
    trust_score INT,
    avg_rating DECIMAL,
    total_orders INT,
    badge_slug VARCHAR,
    badge_label TEXT,
    badge_color TEXT,
    boost_factor DECIMAL,
    sort_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS worker_id,
        p.full_name,
        w.trust_score,
        w.avg_rating,
        w.total_orders,
        wap.slug AS badge_slug,
        wap.benefits->>'badge_label' AS badge_label,
        wap.benefits->>'badge_color' AS badge_color,
        COALESCE(wap.boost_factor, 1.0) AS boost_factor,
        (COALESCE(w.trust_score, 0) * COALESCE(wap.boost_factor, 1.0))::DECIMAL AS sort_score
    FROM public.profiles p
    JOIN public.workers w ON w.user_id = p.id
    LEFT JOIN public.worker_ad_purchases wapurchase 
        ON wapurchase.worker_id = p.id 
        AND wapurchase.status = 'active' 
        AND wapurchase.expires_at > NOW()
    LEFT JOIN public.worker_ad_packages wap 
        ON wap.id = wapurchase.package_id 
        AND wap.package_type = 'featured_badge'
    WHERE p.role = 'worker'
    AND w.is_verified = true
    ORDER BY sort_score DESC, w.trust_score DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 6. RLS: ALLOW READING WORKER AD PACKAGES
-- ============================================
ALTER TABLE public.worker_ad_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_ad_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active ad packages" ON public.worker_ad_packages;
CREATE POLICY "Anyone can view active ad packages" ON public.worker_ad_packages
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Workers can view own purchases" ON public.worker_ad_purchases;
CREATE POLICY "Workers can view own purchases" ON public.worker_ad_purchases
    FOR SELECT USING (auth.uid() = worker_id);

DROP POLICY IF EXISTS "Workers can insert own purchases" ON public.worker_ad_purchases;
CREATE POLICY "Workers can insert own purchases" ON public.worker_ad_purchases
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- ============================================
-- 7. INDEXES FOR BADGE QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_worker_ad_purchases_badge_active 
ON public.worker_ad_purchases(worker_id, status, expires_at);

COMMENT ON TABLE public.worker_ad_packages IS 'Premium badge tiers and ad packages for workers - Revenue Booster #3';
