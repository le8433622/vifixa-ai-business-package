-- Service Area Polygon Containment
-- Phase 22-2: Geo-fence matching using polygon geometry
-- Bổ sung point-in-polygon check cho service_areas.geometry (GeoJSON)

-- Ray-casting point-in-polygon algorithm (PL/pgSQL)
-- Returns true if point (p_lat, p_lng) is inside the GeoJSON polygon
CREATE OR REPLACE FUNCTION public.point_in_polygon(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_geometry JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_type TEXT;
  v_coords JSONB;
  v_ring JSONB;
  v_n INT;
  v_inside BOOLEAN := false;
  v_j INT;
  v_xi DOUBLE PRECISION;
  v_yi DOUBLE PRECISION;
  v_xj DOUBLE PRECISION;
  v_yj DOUBLE PRECISION;
  v_intersect BOOLEAN;
BEGIN
  IF p_geometry IS NULL THEN RETURN true; END IF;

  v_type := p_geometry->>'type';

  -- Support Polygon and MultiPolygon
  IF v_type = 'Polygon' THEN
    v_coords := p_geometry->'coordinates';
    -- First ring = outer boundary
    v_ring := v_coords->0;
  ELSIF v_type = 'MultiPolygon' THEN
    -- Check each polygon
    FOR i IN 0 .. jsonb_array_length(p_geometry->'coordinates') - 1 LOOP
      v_ring := (p_geometry->'coordinates'->i)->0;
      IF public.point_in_polygon(p_lat, p_lng, jsonb_build_object('type', 'Polygon', 'coordinates', jsonb_build_array(v_ring))) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  ELSE
    -- Unknown type, fallback to true
    RETURN true;
  END IF;

  IF v_ring IS NULL THEN RETURN true; END IF;

  v_n := jsonb_array_length(v_ring);
  v_j := v_n - 1;

  -- Ray-casting algorithm
  FOR i IN 0 .. v_n - 1 LOOP
    v_xi := (v_ring->i->0)::TEXT::DOUBLE PRECISION;
    v_yi := (v_ring->i->1)::TEXT::DOUBLE PRECISION;
    v_xj := (v_ring->v_j->0)::TEXT::DOUBLE PRECISION;
    v_yj := (v_ring->v_j->1)::TEXT::DOUBLE PRECISION;

    -- GeoJSON is [lng, lat], so index 0 = lng, index 1 = lat
    IF ((v_yi > p_lat) != (v_yj > p_lat)) THEN
      v_intersect := p_lng < (v_xj - v_xi) * (p_lat - v_yi) / (v_yj - v_yi) + v_xi;
      IF v_intersect THEN
        v_inside := NOT v_inside;
      END IF;
    END IF;

    v_j := i;
  END LOOP;

  RETURN v_inside;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION public.point_in_polygon(DOUBLE PRECISION, DOUBLE PRECISION, JSONB) TO service_role, authenticated;

-- Update is_in_service_area to use polygon geometry when available
CREATE OR REPLACE FUNCTION public.is_in_service_area(
  p_worker_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS BOOLEAN AS $$
DECLARE
  v_area public.service_areas;
BEGIN
  SELECT * INTO v_area FROM public.service_areas
  WHERE worker_id = p_worker_id AND is_active = true;

  IF NOT FOUND THEN RETURN true; END IF;

  -- If polygon geometry exists, use precise polygon containment
  IF v_area.geometry IS NOT NULL AND v_area.geometry != 'null'::jsonb AND jsonb_typeof(v_area.geometry) = 'object' THEN
    RETURN public.point_in_polygon(p_lat, p_lng, v_area.geometry);
  END IF;

  -- Fallback: radius-based check
  IF v_area.center_lat IS NOT NULL AND v_area.center_lng IS NOT NULL THEN
    RETURN public.calculate_distance(v_area.center_lat, v_area.center_lng, p_lat, p_lng) <= COALESCE(v_area.radius_km, 10);
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_in_service_area(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;

-- RPC: Find all workers whose service area contains a point
CREATE OR REPLACE FUNCTION public.find_workers_in_area(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_service_type TEXT DEFAULT NULL
) RETURNS TABLE (
  worker_id UUID,
  full_name TEXT,
  phone TEXT,
  rating_avg DOUBLE PRECISION,
  trust_score DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  skills TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS worker_id,
    p.full_name,
    p.phone,
    w.rating_avg,
    w.trust_score,
    public.calculate_distance(COALESCE(sa.center_lat, 0), COALESCE(sa.center_lng, 0), p_lat, p_lng) AS distance_km,
    w.skills
  FROM public.profiles p
  JOIN public.workers w ON w.user_id = p.id
  LEFT JOIN public.service_areas sa ON sa.worker_id = p.id AND sa.is_active = true
  WHERE p.role = 'worker'
    AND p.is_active = true
    AND (p_service_type IS NULL OR w.skills @> ARRAY[p_service_type])
    AND public.is_in_service_area(p.id, p_lat, p_lng)
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.find_workers_in_area(DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO service_role, authenticated;

COMMENT ON FUNCTION public.point_in_polygon IS 'Ray-casting point-in-polygon check for GeoJSON [lng, lat] polygons';
COMMENT ON FUNCTION public.find_workers_in_area IS 'Find all workers whose service area contains the given point';
