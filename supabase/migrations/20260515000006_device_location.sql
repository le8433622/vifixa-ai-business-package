-- P0.6: Add geo-location columns to device_profiles
ALTER TABLE public.device_profiles
  ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS location_lng DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS location_address TEXT;

CREATE INDEX IF NOT EXISTS idx_device_profiles_location ON public.device_profiles(location_lat, location_lng);
