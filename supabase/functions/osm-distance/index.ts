// OSM Distance Edge Function — Calculate distances between points
// Uses Haversine formula (fallback if PostGIS not available)

import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

interface DistanceRequest {
  origin: { lat: number; lng: number };
  destinations: Array<{ lat: number; lng: number; id: string }>;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateDuration(distanceKm: number): number {
  // Average speed: 30 km/h in city, 50 km/h highway
  const speed = distanceKm > 10 ? 50 : 30;
  return Math.round((distanceKm / speed) * 60);
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { origin, destinations }: DistanceRequest = await req.json();

    if (!origin || !destinations || !Array.isArray(destinations)) {
      return jsonResponse({ error: 'origin and destinations are required' }, 400);
    }

    if (origin.lat === undefined || origin.lng === undefined) {
      return jsonResponse({ error: 'origin must have lat and lng' }, 400);
    }

    const results = destinations.map((dest) => {
      if (dest.lat === undefined || dest.lng === undefined) {
        return { id: dest.id, error: 'missing coordinates' };
      }

      const distanceKm = haversineDistance(
        origin.lat, origin.lng,
        dest.lat, dest.lng
      );
      const durationMin = estimateDuration(distanceKm);

      return {
        id: dest.id,
        distance_km: Math.round(distanceKm * 100) / 100,
        duration_min: durationMin,
      };
    });

    return jsonResponse({
      origin,
      results,
      nearest: results
        .filter((r: any) => r.distance_km !== undefined)
        .sort((a: any, b: any) => a.distance_km - b.distance_km)[0] || null,
    });
  } catch (err) {
    console.error('osm-distance error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
