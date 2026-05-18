// Admin User Actions Edge Function
// Handles: lock_user, unlock_user
// POST /functions/v1/admin/user-actions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth, jsonResponse, handleOptions } from '../../_shared/auth-helper.ts'

export async function handler(req: Request) {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const auth = await verifyAuth(req)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.id).single()
    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Admin only' }, 403)
    }

    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/admin/user-actions', '')

    if (path === '/lock-user' && req.method === 'POST') {
      return await handleLockUser(req, supabase, auth.id)
    }
    if (path === '/unlock-user' && req.method === 'POST') {
      return await handleUnlockUser(req, supabase, auth.id)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (error: any) {
    console.error('[VIFIXA] admin/user-actions:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}

async function handleLockUser(req: Request, supabase: any, adminId: string): Promise<Response> {
  const body = await req.json()
  const { user_id, reason } = body
  if (!user_id) return jsonResponse({ error: 'Missing user_id' }, 400)

  const { error } = await supabase
    .from('user_locks')
    .insert({
      user_id,
      locked_by: adminId,
      reason: reason || 'Vi phạm điều khoản',
      locked_at: new Date().toISOString(),
    })

  if (error) return jsonResponse({ error: error.message }, 400)

  await supabase.from('profiles').update({ locked: true }).eq('id', user_id)
  return jsonResponse({ success: true, user_id, status: 'locked' })
}

async function handleUnlockUser(req: Request, supabase: any, adminId: string): Promise<Response> {
  const body = await req.json()
  const { user_id, reason } = body
  if (!user_id) return jsonResponse({ error: 'Missing user_id' }, 400)

  const { error } = await supabase
    .from('user_locks')
    .update({ unlocked_by: adminId, unlocked_at: new Date().toISOString(), unlock_reason: reason })
    .eq('user_id', user_id)
    .is('unlocked_at', null)

  if (error) return jsonResponse({ error: error.message }, 400)

  await supabase.from('profiles').update({ locked: false }).eq('id', user_id)
  return jsonResponse({ success: true, user_id, status: 'unlocked' })
}