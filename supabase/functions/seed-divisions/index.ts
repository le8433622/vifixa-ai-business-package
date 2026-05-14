// Seed Divisions — Populates vietnam_administrative_divisions with districts and wards
// Uses OSM Overpass API to fetch administrative boundaries
// Run: supabase functions serve seed-divisions --env-file .env.local
// Then: curl -X POST http://localhost:54321/functions/v1/seed-divisions -H "Authorization: Bearer <anon-key>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/auth-helper.ts';

const PROVINCES: Record<string, { name: string; osm_relation: number }> = {
  'VN-SG': { name: 'Thành phố Hồ Chí Minh', osm_relation: 1973756 },
  'VN-HN': { name: 'Thành phố Hà Nội', osm_relation: 1903516 },
  'VN-DN': { name: 'Thành phố Đà Nẵng', osm_relation: 1891418 },
  'VN-CT': { name: 'Thành phố Cần Thơ', osm_relation: 1887520 },
  'VN-HP': { name: 'Thành phố Hải Phòng', osm_relation: 1903517 },
  'VN-BD': { name: 'Tỉnh Bình Dương', osm_relation: 1903518 },
  'VN-DNai': { name: 'Tỉnh Đồng Nai', osm_relation: 1903519 },
  'VN-BV': { name: 'Tỉnh Bà Rịa - Vũng Tàu', osm_relation: 1903520 },
  'VN-LA': { name: 'Tỉnh Long An', osm_relation: 1903521 },
  'VN-TN': { name: 'Tỉnh Tây Ninh', osm_relation: 1903522 },
  'VN-BN': { name: 'Tỉnh Bắc Ninh', osm_relation: 1903523 },
  'VN-HY': { name: 'Tỉnh Hưng Yên', osm_relation: 1903524 },
  'VN-HD': { name: 'Tỉnh Hải Dương', osm_relation: 1903525 },
  'VN-VP': { name: 'Tỉnh Vĩnh Phúc', osm_relation: 1903526 },
  'VN-QN': { name: 'Tỉnh Quảng Ninh', osm_relation: 1903527 },
  'VN-QNam': { name: 'Tỉnh Quảng Nam', osm_relation: 1903528 },
  'VN-KH': { name: 'Tỉnh Khánh Hòa', osm_relation: 1903529 },
  'VN-AG': { name: 'Tỉnh An Giang', osm_relation: 1903530 },
  'VN-KG': { name: 'Tỉnh Kiên Giang', osm_relation: 1903531 },
  'VN-TG': { name: 'Tỉnh Tiền Giang', osm_relation: 1903532 },
  'VN-BT': { name: 'Tỉnh Bến Tre', osm_relation: 1903533 },
  'VN-VL': { name: 'Tỉnh Vĩnh Long', osm_relation: 1903534 },
  'VN-DT': { name: 'Tỉnh Đồng Tháp', osm_relation: 1903535 },
  'VN-CM': { name: 'Tỉnh Cà Mau', osm_relation: 1903536 },
  'VN-ST': { name: 'Tỉnh Sóc Trăng', osm_relation: 1903537 },
  'VN-BL': { name: 'Tỉnh Bạc Liêu', osm_relation: 1903538 },
  'VN-LD': { name: 'Tỉnh Lâm Đồng', osm_relation: 1903539 },
  'VN-DL': { name: 'Tỉnh Đắk Lắk', osm_relation: 1903540 },
  'VN-GL': { name: 'Tỉnh Gia Lai', osm_relation: 1903541 },
  'VN-KT': { name: 'Tỉnh Kon Tum', osm_relation: 1903542 },
  'VN-NA': { name: 'Tỉnh Nghệ An', osm_relation: 1903543 },
  'VN-TH': { name: 'Tỉnh Thanh Hóa', osm_relation: 1903544 },
  'VN-TTH': { name: 'Tỉnh Thừa Thiên Huế', osm_relation: 1903545 },
  'VN-BTh': { name: 'Tỉnh Bình Thuận', osm_relation: 1903546 },
};

interface OsmElement {
  type: string;
  id: number;
  tags: Record<string, string>;
  center?: { lat: number; lon: number };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const started = Date.now();
    const logs: string[] = [];
    function log(m: string) { logs.push(m); console.log(m); }

    log('=== SEEDING VIETNAM ADMINISTRATIVE DIVISIONS ===');

    let totalDistricts = 0;
    let totalWards = 0;

    for (const [provinceCode, info] of Object.entries(PROVINCES)) {
      log(`\n--- ${info.name} (${provinceCode}) ---`);

      // Fetch districts from OSM Overpass
      const overpassQuery = `[out:json];rel(${info.osm_relation});map_to_area;foreach{>;};out center;`;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

      const response = await fetch(overpassUrl);
      if (!response.ok) {
        log(`  SKIP ${info.name} — Overpass returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const elements = data.elements as OsmElement[] || [];

      // Filter for district-level admin boundaries
      const districts = elements.filter(
        (e: OsmElement) => e.type === 'relation' && (
          e.tags.admin_level === '8' ||
          e.tags.admin_level === '7' ||
          e.tags.type === 'boundary'
        )
      );

      log(`  Found ${districts.length} districts`);

      for (const district of districts) {
        const districtName = district.tags['name:vi'] || district.tags.name || '';
        if (!districtName) continue;

        const districtCode = `${provinceCode}-D${String(district.id).slice(-4)}`;

        // Check if already exists
        const { data: existing } = await supabase
          .from('vietnam_administrative_divisions')
          .select('id')
          .eq('code', districtCode)
          .maybeSingle();

        if (existing) {
          log(`  ↳ ${districtName} — already exists`);
          // Still count wards if needed
          continue;
        }

        // Determine district type
        const districtType = districtName.includes('Quận') || districtName.includes('Huyện')
          ? 'district'
          : district.tags.admin_level === '7'
            ? 'district'
            : 'district';

        const { error: insertError } = await supabase
          .from('vietnam_administrative_divisions')
          .insert({
            code: districtCode,
            name: districtName,
            name_short: districtName.replace(/^(Quận|Huyện|Thị xã|Thành phố)\s*/, ''),
            type: districtType,
            parent_code: provinceCode,
            level: 2,
            center_lat: district.center?.lat || null,
            center_lng: district.center?.lon || null,
            osm_relation_id: district.id,
          });

        if (insertError) {
          log(`  ✗ ${districtName} — ${insertError.message}`);
          continue;
        }

        totalDistricts++;
        log(`  ✓ ${districtName} (${districtCode})`);

        // Rate limit: 1 req/s to Overpass
        await new Promise(r => setTimeout(r, 1100));

        // Fetch wards for this district
        const wardQuery = `[out:json];area(${district.id})->.a;(relation(area.a)[admin_level~"9|10"];);out center;`;
        const wardUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(wardQuery)}`;

        try {
          const wardResponse = await fetch(wardUrl);
          if (!wardResponse.ok) continue;

          const wardData = await wardResponse.json();
          const wardElements = wardData.elements as OsmElement[] || [];

          let wardCount = 0;
          for (const ward of wardElements) {
            if (ward.type !== 'relation' && ward.type !== 'way') continue;
            const wardName = ward.tags['name:vi'] || ward.tags.name || '';
            if (!wardName) continue;

            const wardCode = `${districtCode}-W${String(ward.id).slice(-4)}`;

            const wardType = wardName.includes('Phường')
              ? 'ward'
              : wardName.includes('Xã')
                ? 'ward'
                : 'ward';

            const { error: wError } = await supabase
              .from('vietnam_administrative_divisions')
              .insert({
                code: wardCode,
                name: wardName,
                name_short: wardName.replace(/^(Phường|Xã|Thị trấn)\s*/, ''),
                type: wardType,
                parent_code: districtCode,
                level: 3,
                center_lat: ward.center?.lat || null,
                center_lng: ward.center?.lon || null,
                osm_relation_id: ward.id,
              });

            if (!wError) {
              wardCount++;
              totalWards++;
            }
          }

          log(`    ↳ ${wardCount} wards`);
        } catch {
          log(`    ↳ 0 wards (fetch failed)`);
        }

        // Rate limit between districts
        await new Promise(r => setTimeout(r, 500));
      }

      // Rate limit between provinces
      await new Promise(r => setTimeout(r, 2000));
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log(`\n✅ COMPLETE in ${elapsed}s`);
    log(`  Districts: ${totalDistricts}`);
    log(`  Wards: ${totalWards}`);

    return jsonResponse({ success: true, logs, totalDistricts, totalWards, elapsed });
  } catch (err) {
    console.error('seed-divisions error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
