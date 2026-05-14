import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 30 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { request_id, agent_type, rating, is_correct, correction, comment } = await req.json()

    if (!agent_type) {
      return jsonResponse({ error: 'Missing required field: agent_type' }, 400)
    }

    if (rating && (rating < 1 || rating > 5)) {
      return jsonResponse({ error: 'Rating must be 1-5' }, 400)
    }

    const { data, error } = await supabase
      .from('ai_feedback')
      .insert({
        user_id: user.id,
        request_id: request_id || null,
        agent_type,
        rating: rating || null,
        is_correct: is_correct !== undefined ? is_correct : null,
        correction: correction || null,
        comment: comment || null,
      })
      .select()
      .single()

    if (error) throw error

    return jsonResponse({ success: true, feedback_id: data.id })
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Feedback error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})