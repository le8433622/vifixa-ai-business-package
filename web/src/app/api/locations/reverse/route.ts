// API Route — Reverse geocode (lat/lng → address)
// GET /api/locations/reverse?lat=10.8231&lng=106.6297

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
      { headers: { 'User-Agent': 'VifixaAI/1.0' } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Reverse geocoding failed' }, { status: 502 });
    }

    const data = await response.json();

    return NextResponse.json({
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      display_name: data.display_name,
      address: data.address || {},
      type: data.type,
      osm_id: data.osm_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
