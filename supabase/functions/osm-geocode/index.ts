// OSM Geocode Edge Function — Nominatim proxy with caching
// Rate-limited: 1 req/s to Nominatim, cached in location_cache table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'VifixaAI/1.0 (business-package)';

interface GeocodeRequest {
  query?: string;
  lat?: number;
  lng?: number;
  type: 'search' | 'reverse';
  limit?: number;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GeocodeRequest = await req.json();
    const { type, query, lat, lng, limit = 5 } = body;

    if (type === 'search' && !query) {
      return jsonResponse({ error: 'query is required for search' }, 400);
    }
    if (type === 'reverse' && (lat === undefined || lng === undefined)) {
      return jsonResponse({ error: 'lat and lng are required for reverse' }, 400);
    }

    const cacheKey = type === 'search'
      ? `search:${query!.toLowerCase().trim()}`
      : `reverse:${lat!.toFixed(6)}:${lng!.toFixed(6)}`;

    // Check cache first
    const { data: cached } = await supabase
      .from('location_cache')
      .select('result')
      .eq('query_text', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return jsonResponse({ results: cached.result, cached: true });
    }

    // Build Nominatim URL
    let url: string;
    if (type === 'search') {
      url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query!)}&format=json&limit=${limit}&accept-language=vi`;
    } else {
      url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      return jsonResponse({ error: 'Nominatim request failed' }, 502);
    }

    const data = await response.json();
    const results = type === 'reverse' ? [data] : data;

    // Cache result
    await supabase
      .from('location_cache')
      .upsert({
        query_text: cacheKey,
        result: results,
        lat: type === 'reverse' ? lat : null,
        lng: type === 'reverse' ? lng : null,
        display_name: results[0]?.display_name || '',
        place_type: results[0]?.type || '',
        osm_id: results[0]?.osm_id || null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'query_text', ignoreDuplicates: false });

    return jsonResponse({ results, cached: false });
  } catch (err) {
    console.error('osm-geocode error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
