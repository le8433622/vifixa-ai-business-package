-- ============================================
-- DEMAND PRICING ENGINE MIGRATION
-- Migration: 20260511000008_create_demand_pricing
-- Description: Create demand_cache table and supporting structures
-- ============================================

-- ============================================
-- 1. DEMAND CACHE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.demand_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Service category for cache key
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'electrical', 'plumbing', 'air_conditioning', 'appliance_repair',
        'carpentry', 'painting', 'cleaning', 'moving', 'handyman',
        'landscaping', 'HVAC', 'security_systems', 'water_heater', 'general'
    )),
    -- Make category unique for upsert operations
    UNIQUE(category),
    
    -- Demand score (0-1 scale)
    demand_score DECIMAL(5,4) NOT NULL CHECK (demand_score >= 0 AND demand_score <= 1),
    
    -- Optional: Store factors that contributed to demand score
    factors JSONB DEFAULT '{}',
    
    -- Cache expiry timestamp
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on category + expiry for fast lookups
CREATE INDEX IF NOT EXISTS idx_demand_cache_category_expiry 
ON public.demand_cache(category, expires_at DESC);

-- Index on category only for efficient queries
CREATE INDEX IF NOT EXISTS idx_demand_cache_category 
ON public.demand_cache(category);

-- Index on expires_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_demand_cache_expires 
ON public.demand_cache(expires_at ASC);

-- ============================================
-- 2. UPsert FUNCTION FOR DEMAND CACHE
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_demand_cache(
    p_category VARCHAR,
    p_demand_score DECIMAL,
    p_expires_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.demand_cache (category, demand_score, expires_at)
    VALUES (p_category, p_demand_score, p_expires_at)
    ON CONFLICT (category) 
    DO UPDATE SET
        demand_score = EXCLUDED.demand_score,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.upsert_demand_cache IS 'Upsert demand cache entry for pricing calculations';

-- ============================================
-- 3. CACHE CLEANUP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_demand_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.demand_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_demand_cache IS 'Remove expired cache entries - run via scheduled cron';

-- ============================================
-- 4. GET CURRENT DEMAND SCORE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.get_current_demand_score(p_category VARCHAR)
RETURNS TABLE (
    category VARCHAR,
    demand_score DECIMAL,
    expires_at TIMESTAMPTZ,
    cache_hit BOOLEAN
) AS $$
BEGIN
    -- Check if valid cached data exists
    RETURN QUERY
    SELECT 
        dc.category,
        dc.demand_score,
        dc.expires_at,
        true as cache_hit
    FROM public.demand_cache dc
    WHERE dc.category = p_category
    AND dc.expires_at > NOW()
    ORDER BY dc.updated_at DESC
    LIMIT 1;
    
    -- No cache found
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p_category::VARCHAR,
            0::DECIMAL,
            NULL::TIMESTAMPTZ,
            false as cache_hit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_current_demand_score IS 'Get current demand score from cache or default';

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE public.demand_cache ENABLE ROW LEVEL SECURITY;

-- Admin read/write access
CREATE POLICY "Admins can read demand cache" ON public.demand_cache
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can write demand cache" ON public.demand_cache
    FOR ALL USING (is_admin());

-- Public can write (for automated caching via functions)
CREATE POLICY "Public can insert/cache demand scores" ON public.demand_cache
    FOR INSERT WITH CHECK (true);

-- System function updates are allowed via SECURITY DEFINER
-- This allows upsert_demand_cache to work without auth constraints

-- ============================================
-- 6. AUTO-UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_demand_cache_updated_at
    BEFORE UPDATE ON public.demand_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- 7. INITIAL DATA (TEST ENTRIES)
-- ============================================

INSERT INTO public.demand_cache (category, demand_score, expires_at, factors)
SELECT 
    category,
    CASE 
        WHEN category IN ('electrical', 'plumbing') THEN 0.2 -- Normal
        WHEN category IN ('air_conditioning', 'hvac') THEN 0.3 -- Moderate
        ELSE 0.15 -- Most categories normal
    END as base_demand_score,
    NOW() + INTERVAL '5 minutes',
    jsonb_build_object(
        'calculation_method', 'default_base',
        'note', 'Initial cache entries for demonstration'
    ) as initial_factors
FROM unnest(ARRAY[
    'electrical', 'plumbing', 'air_conditioning', 'appliance_repair',
    'carpentry', 'painting', 'cleaning', 'handyman',
    'HVAC', 'general'
]) as t(category)
ON CONFLICT (category) DO NOTHING;

COMMENT ON TABLE public.demand_cache IS 'Real-time demand score cache for surge pricing engine - 5 minute TTL';

-- ============================================
-- 8. USAGE VIEWS (OPTIONAL)
-- ============================================

-- View of active demand cache
CREATE OR REPLACE VIEW public.v_active_demand_cache AS
SELECT 
    id,
    category,
    demand_score,
    expires_at,
    factors,
    created_at,
    (NOW() <= expires_at) as is_fresh,
    EXTRACT(EPOCH FROM (expires_at - NOW())) as ttl_seconds
FROM public.demand_cache
WHERE expires_at > NOW();

COMMENT ON VIEW public.v_active_demand_cache IS 'Current active demand scores with TTL metadata';

-- Summary view by category
CREATE OR REPLACE VIEW public.v_demand_summary AS
SELECT 
    category,
    COUNT(*) as active_caches,
    ROUND(AVG(demand_score)::numeric, 4) as avg_demand_score,
    ROUND(MIN(demand_score)::numeric, 4) as min_demand_score,
    ROUND(MAX(demand_score)::numeric, 4) as max_demand_score
FROM public.demand_cache
WHERE expires_at > NOW()
GROUP BY category
ORDER BY avg_demand_score DESC;

COMMENT ON VIEW public.v_demand_summary IS 'Demand score summary statistics by service category';
