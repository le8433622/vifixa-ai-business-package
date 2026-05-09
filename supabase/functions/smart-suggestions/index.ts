// Smart Suggestions Edge Function
// Handles user applying/dismissing suggestions;
// Now supports A/B testing and enhanced suggestion logic.

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
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const suggestionId = url.searchParams.get('id')
  const action = url.searchParams.get('action')

  try {
    // GET / → Get user's pending suggestions (with A/B test filtering)
    if (req.method === 'GET' && !action) {
      // Get user's A/B test variant
      const { data: abTests } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('active', true)

      const userVariant = await getABTestVariant(supabase, user.id, abTests || [])

      const { data, error } = await supabase
        .from('user_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('applied', false)
        .eq('dismissed', false)
        .order('confidence', { ascending: false })

      if (error) throw error

      return jsonResponse({ suggestions: data || [], ab_test: userVariant })
    }

    // GET /ab-tests → Get active A/B tests (admin only)
    if (req.method === 'GET' && action === 'ab-tests') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return jsonResponse({ error: 'Forbidden' }, 403)
      }

      const { data, error } = await supabase
        .from('ab_tests')
        .select('*, user_suggestions(count)')
        .order('created_at', { ascending: false })

      if (error) throw error

      return jsonResponse({ ab_tests: data || [] })
    }

    // POST /ab-tests → Create A/B test (admin only)
    if (req.method === 'POST' && action === 'ab-tests') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return jsonResponse({ error: 'Forbidden' }, 403)
      }

      const body = await req.json()
      const { test_name, description, variant_a, variant_b, traffic_split } = body

      if (!test_name) {
        return jsonResponse({ error: 'Missing test_name' }, 400)
      }

      const { data, error } = await supabase
        .from('ab_tests')
        .insert({
          test_name,
          description,
          variant_a,
          variant_b,
          traffic_split: traffic_split || 50,
          active: true,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      return jsonResponse({ success: true, ab_test: data })
    }

    // PUT /apply?id=xxx → Apply suggestion (with A/B test tracking)
    if (req.method === 'PUT' && suggestionId && !action) {
      const { data: suggestion } = await supabase
        .from('user_suggestions')
        .select('*, ab_tests(*)')
        .eq('id', suggestionId)
        .eq('user_id', user.id)
        .single()

      if (!suggestion) {
        return jsonResponse({ error: 'Suggestion not found' }, 404)
      }

      // Apply the suggestion (update user preference)
      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preference_key: suggestion.suggestion_type,
          value: suggestion.suggestion,
          updated_at: new Date().toISOString(),
        })

      if (prefError) throw prefError

      // Mark suggestion as applied
      const { error: updateError } = await supabase
        .from('user_suggestions')
        .update({
          applied: true,
          applied_at: new Date().toISOString(),
        })
        .eq('id', suggestionId)

      if (updateError) throw updateError

      // Track A/B test conversion if applicable
      if (suggestion.ab_test_id) {
        await supabase
          .from('ab_test_conversions')
          .insert({
            ab_test_id: suggestion.ab_test_id,
            user_id: user.id,
            suggestion_id: suggestionId,
            converted_at: new Date().toISOString(),
          })
      }

      return jsonResponse({ success: true, message: 'Suggestion applied', ab_test: suggestion.ab_tests })
    }

    // PUT /dismiss?id=xxx&action=dismiss → Dismiss suggestion
    if (req.method === 'PUT' && suggestionId && action === 'dismiss') {
      const { data: suggestion } = await supabase
        .from('user_suggestions')
        .select('ab_test_id')
        .eq('id', suggestionId)
        .eq('user_id', user.id)
        .single()

      if (!suggestion) {
        return jsonResponse({ error: 'Suggestion not found' }, 404)
      }

      const { error } = await supabase
        .from('user_suggestions')
        .update({ dismissed: true })
        .eq('id', suggestionId)
        .eq('user_id', user.id)

      if (error) throw error

      // Track dismissal in A/B test if applicable
      if (suggestion.ab_test_id) {
        await supabase
          .from('ab_test_conversions')
          .insert({
            ab_test_id: suggestion.ab_test_id,
            user_id: user.id,
            suggestion_id: suggestionId,
            dismissed: true,
            converted_at: new Date().toISOString(),
          })
      }

      return jsonResponse({ success: true, message: 'Suggestion dismissed' })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (error: any) {
    console.error('Smart suggestions error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

// Helper: Get user's A/B test variant (deterministic based on user ID hash)
async function getABTestVariant(supabase: any, userId: string, abTests: any[]): Promise<any> {
  if (!abTests || abTests.length === 0) return null

  // For simplicity, assign user to a variant based on hash of user ID
  const encoder = new TextEncoder()
  const data = encoder.encode(userId)
  
  // Simple hash: sum of char codes
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = (hash + data[i]) % 100
  }

  for (const test of abTests) {
    const variant = hash < test.traffic_split ? 'a' : 'b'
    return {
      test_id: test.id,
      test_name: test.test_name,
      variant: `variant_${variant}`,
      config: variant === 'a' ? test.variant_a : test.variant_b,
    }
  }

  return null
}
