// API Route — Search locations via Nominatim
// GET /api/locations/search?q=Quận 7&limit=5

import { NextRequest, NextResponse } from 'next/server';

interface NominatimItem {
  lat: string
  lon: string
  display_name: string
  type: string
  category: string
  osm_id: number
  osm_type: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limit = Math.min(Number(searchParams.get('limit')) || 5, 20);

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${limit}&accept-language=vi`,
      { headers: { 'User-Agent': 'VifixaAI/1.0' } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
    }

    const data = await response.json();
    const results = (data || []).map((item: NominatimItem) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      display_name: item.display_name,
      type: item.type,
      category: item.category,
      osm_id: item.osm_id,
      osm_type: item.osm_type,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
