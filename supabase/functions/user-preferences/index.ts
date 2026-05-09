// User Preferences Edge Function
// Manages user preferences for the smart system

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  // Verify auth
  let user: any
  try {
    // verifyAuth returns { id, email }
    const auth = await verifyAuth(req)
    user = auth
  } catch (error) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const preferenceKey = url.searchParams.get('key')

  try {
    // GET /?key=xxx → Get single preference
    if (req.method === 'GET' && preferenceKey) {
      return await handleGetPreference(supabase, user.id, preferenceKey)
    }

    // GET / → Get all preferences
    if (req.method === 'GET') {
      return await handleGetAllPreferences(supabase, user.id)
    }

    // PUT / → Update preference
    if (req.method === 'PUT' && preferenceKey) {
      return await handleUpdatePreference(req, supabase, user.id, preferenceKey)
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (error: any) {
    console.error('User preferences error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

async function handleGetPreference(supabase: any, userId: string, key: string): Promise<Response> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('preference_key', key)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  // Return default if not found
  if (!data) {
    const defaultPref = getDefaultPreference(key)
    return jsonResponse({ key, value: defaultPref, is_default: true })
  }

  return jsonResponse({ key: data.preference_key, value: data.value, is_default: false })
}

async function handleGetAllPreferences(supabase: any, userId: string): Promise<Response> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error

  const prefs: Record<string, any> = {}
  ;(data || []).forEach((p: any) => {
    prefs[p.preference_key] = p.value
  })

  return jsonResponse({ preferences: prefs })
}

async function handleUpdatePreference(req: Request, supabase: any, userId: string, key: string): Promise<Response> {
  const body = await req.json()
  const { value } = body

  if (value === undefined) {
    return jsonResponse({ error: 'Missing value' }, 400)
  }

  // Upsert preference
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      preference_key: key,
      value,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  return jsonResponse({ success: true, preference: data })
}

function getDefaultPreference(key: string): any {
  const defaults: Record<string, any> = {
    'work_mode': 'selective',
    'job_filters': {
      min_pay: 0,
      max_distance: 10,
      preferred_types: [],
      min_customer_rating: 0,
      urgency_levels: ['normal', 'flexible'],
    },
    'ai_assistance_level': 'learning',
    'notification_preferences': {
      emergency_only: false,
      frequency: 'immediate',
      channels: ['app'],
    },
    'service_preferences': {
      preferred_worker_skills: [],
      min_worker_rating: 4.0,
      budget_range: { min: 0, max: 1000000 },
      scheduling_preference: 'flexible',
      communication_channel: 'app',
    },
  }

  return defaults[key] || null
}

// Types for reference (not used at runtime)
interface UserPreference {
  user_id: string
  preference_key: string
  value: any
  updated_at: string
}
