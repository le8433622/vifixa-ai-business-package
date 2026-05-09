// Feature Flag Edge Function
// Provides server-side feature flag checks + admin toggle endpoint
// GET /?key=xxx → Check single flag (server-side guard)
// GET / → List all flags (admin only)
// POST → Toggle flag on/off (admin only)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// ========== TYPES ==========
interface ToggleRequest {
  key: string
  enabled: boolean
}

// ========== HANDLER ==========
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  // Verify authentication
  let user: any
  try {
    // verifyAuth returns { id, email }
    const auth = await verifyAuth(req)
    user = auth
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // Initialize Supabase client with service role
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Route handling
  const url = new URL(req.url)
  const key = url.searchParams.get('key')

  try {
    // GET /?key=xxx → Check single flag (server-side guard)
    if (req.method === 'GET' && key) {
      return await handleGetFlag(supabase, key)
    }

    // GET / → List all flags (admin only)
    if (req.method === 'GET') {
      return await handleListFlags(supabase, user.id)
    }

    // POST → Toggle flag (admin only)
    if (req.method === 'POST') {
      return await handleToggleFlag(supabase, user.id, req)
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (error: unknown) {
    console.error('Feature flag error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})

// ========== HANDLER FUNCTIONS ==========

async function handleGetFlag(supabase: any, key: string): Promise<Response> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, enabled, requires_config, config_completed')
    .eq('key', key)
    .single()

  if (error) {
    return jsonResponse({ error: 'Feature flag not found' }, 404)
  }

  return jsonResponse({
    key: data.key,
    enabled: data.enabled,
    requires_config: data.requires_config,
    config_completed: data.config_completed,
  })
}

async function handleListFlags(supabase: any, userId: string): Promise<Response> {
  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, label, description, enabled, category, requires_config, config_completed')
    .order('category', { ascending: true })
    .order('label', { ascending: true })

  if (error) {
    return jsonResponse({ error: 'Failed to fetch flags' }, 500)
  }

  return jsonResponse({ flags: data })
}

async function handleToggleFlag(supabase: any, userId: string, req: Request): Promise<Response> {
  // 1. Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  // 2. Parse request body
  const body: ToggleRequest = await req.json()
  const { key, enabled } = body

  if (!key || enabled === undefined) {
    return jsonResponse({ error: 'Missing key or enabled' }, 400 )
  }

  // 3. Check if flag exists
  const { data: existing } = await supabase
    .from('feature_flags')
    .select('requires_config, config_completed, label')
    .eq('key', key)
    .single()

  if (!existing) {
    return jsonResponse({ error: 'Feature flag not found' }, 404 )
  }

  // 4. Validate: cannot enable if requires_config && !config_completed
  if (enabled && existing.requires_config && !existing.config_completed) {
    return jsonResponse({
      error: 'Cannot enable: configuration required',
      requires_config: true,
      config_completed: existing.config_completed,
      flag_label: existing.label,
    }, 400)
  }

  // 5. Update
  const { data, error } = await supabase
    .from('feature_flags')
    .update({
      enabled,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)
    .select()
    .single()

  if (error) {
    console.error('Update error:', error)
    return jsonResponse({ error: 'Failed to update flag' }, 500 )
  }

  return jsonResponse({ success: true, flag: data })
}
