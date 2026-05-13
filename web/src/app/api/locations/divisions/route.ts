// API Route — Vietnam administrative divisions
// GET /api/locations/divisions?type=province
// GET /api/locations/divisions?type=district&parent_code=VN-SG
// GET /api/locations/divisions?type=ward&parent_code=SG-Q1

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const parentCode = searchParams.get('parent_code');
    const region = searchParams.get('region');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let query = supabase
      .from('vietnam_administrative_divisions')
      .select('code, name, name_short, type, parent_code, region, center_lat, center_lng, level')
      .eq('is_active', true)
      .order('name');

    if (type && ['province', 'district', 'ward'].includes(type)) {
      query = query.eq('type', type);
    }
    if (parentCode) {
      query = query.eq('parent_code', parentCode);
    }
    if (region && ['north', 'central', 'south', 'highlands'].includes(region)) {
      query = query.eq('region', region);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ divisions: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
