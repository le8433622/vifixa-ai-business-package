-- P0.1: Enable PostGIS + add location columns
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS location_lng DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS location_geo GEOMETRY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS location_accuracy TEXT CHECK (location_accuracy IN ('gps', 'manual', 'approximate'));

-- Add location columns to workers
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS home_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS home_lng DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS service_area_polygon GEOMETRY(POLYGON, 4326),
  ADD COLUMN IF NOT EXISTS max_service_radius_km DECIMAL(5,2) DEFAULT 10.0;

-- Add home location to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS home_lng DECIMAL(10,7);

-- Indexes for spatial queries
CREATE INDEX IF NOT EXISTS idx_orders_location_geo ON public.orders USING GIST (location_geo);
CREATE INDEX IF NOT EXISTS idx_workers_home ON public.workers(home_lat, home_lng);
CREATE INDEX IF NOT EXISTS idx_workers_service_area ON public.workers USING GIST (service_area_polygon);

-- Upgrade locations table
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS geometry GEOMETRY(POLYGON, 4326),
  ADD COLUMN IF NOT EXISTS coordinates GEOMETRY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS place_type TEXT CHECK (place_type IN ('province', 'district', 'ward', 'custom_zone')),
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS bounding_box JSONB,
  ADD COLUMN IF NOT EXISTS osm_id BIGINT,
  ADD COLUMN IF NOT EXISTS osm_type TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB;

CREATE INDEX IF NOT EXISTS idx_locations_geometry ON public.locations USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON public.locations USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON public.locations(parent_id);
