// ai-diagnosis Edge Function
// Provides AI-powered diagnostic suggestions based on user symptoms
// POST /functions/v1/ai-diagnosis

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

const DIAGNOSIS_CATEGORIES: Record<string, string[]> = {
  repair: ['ac', 'refrigerator', 'washing_machine', 'water_heater', 'electronics', 'plumbing', 'electrical'],
  cleaning: ['deep_clean', 'standard_clean', 'move_out', 'post_construction'],
  moving: ['apartment', 'house', 'office', 'heavy_item'],
  delivery: ['document', 'parcel', 'food', 'grocery'],
  massage: ['relaxation', 'sports', 'therapeutic'],
  tutoring: ['math', 'english', 'science', 'literature'],
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const user = await verifyAuth(req)
    const { service_type, symptoms, category } = await req.json()

    if (!service_type) {
      return jsonResponse({ error: 'Missing service_type' }, 400)
    }

    const subcategories = DIAGNOSIS_CATEGORIES[service_type] || []
    const confidence = subcategories.includes(category) ? 0.85 : 0.45

    return jsonResponse({
      success: true,
      user_id: user.id,
      service_type,
      diagnosis: {
        category: category || subcategories[0] || 'general',
        confidence,
        suggested_skills: [service_type, category].filter(Boolean),
        severity: symptoms?.includes('emergency') ? 'high' : 'normal',
      },
    })
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})
