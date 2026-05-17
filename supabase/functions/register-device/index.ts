// Register device push token
// POST: { token: string, platform: 'expo' | 'fcm' | 'apns' | 'web' }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const user = await verifyAuth(req)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { token, platform } = await req.json()
    if (!token || !platform) {
      return jsonResponse({ error: 'Missing token or platform' }, 400)
    }
    if (!['expo', 'fcm', 'apns', 'web'].includes(platform)) {
      return jsonResponse({ error: 'Invalid platform' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error } = await supabase.from('device_tokens').upsert({
      user_id: user.id,
      token,
      platform,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, token' })

    if (error) throw error
    return jsonResponse({ success: true })
  } catch (error: any) {
    console.error('[register-device] error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})