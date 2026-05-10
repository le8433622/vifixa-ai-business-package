-- Create locations table for dynamic pricing and demand metrics
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    -- Optional: add more fields like latitude, longitude, radius, etc.
    -- For now, we just need an id and a name for reference.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
-- Locations are viewable by everyone (for pricing rules and demand metrics)
CREATE POLICY "Locations are viewable by everyone" ON public.locations
    FOR SELECT USING (true);

-- Locations manageable by admins
CREATE POLICY "Locations manageable by admins" ON public.locations
    FOR ALL USING (is_admin());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_name ON public.locations(name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER handle_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.handle_locations_updated_at();

COMMENT ON TABLE public.locations IS 'Geographical locations for dynamic pricing and demand metrics';