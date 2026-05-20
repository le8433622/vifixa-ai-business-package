import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_income_source'),
    payload: z.object({
      type: z.enum(['asset', 'skill', 'time', 'location', 'relationship', 'inventory', 'service_capacity']),
      title: z.string().min(3).max(160),
      description: z.string().min(3).max(2000),
      capabilities: z.array(z.string().min(1)).default([]),
      location: z.record(z.unknown()).default({}),
      availability: z.record(z.unknown()).default({}),
      status: z.enum(['draft', 'active', 'paused']).default('draft'),
    }),
  }),
  z.object({
    action: z.literal('create_offer'),
    payload: z.object({
      income_source_id: z.string().uuid(),
      title: z.string().min(3).max(160),
      description: z.string().min(3).max(2000),
      target_customer: z.string().max(500).optional(),
      price_amount: z.number().nonnegative(),
      currency: z.enum(['VND', 'USD']).default('VND'),
      cost_estimate: z.record(z.unknown()).default({}),
      evidence: z.array(z.string()).default([]),
      constraints: z.record(z.unknown()).default({}),
      status: z.enum(['draft', 'testing', 'active', 'paused']).default('draft'),
    }),
  }),
  z.object({
    action: z.literal('create_demand'),
    payload: z.object({
      raw_text: z.string().min(3).max(2000),
      normalized_need: z.string().min(3).max(1000),
      location: z.record(z.unknown()).default({}),
      budget_amount: z.number().nonnegative().optional(),
      currency: z.enum(['VND', 'USD']).default('VND'),
      constraints: z.array(z.string()).default([]),
      status: z.enum(['new', 'qualified']).default('new'),
    }),
  }),
  z.object({
    action: z.literal('suggest_match'),
    payload: z.object({
      demand_id: z.string().uuid(),
      offer_id: z.string().uuid(),
      score: z.number().min(0).max(1),
      reasons: z.array(z.string()).default([]),
      status: z.enum(['suggested', 'accepted', 'rejected']).default('suggested'),
    }),
  }),
  z.object({
    action: z.literal('list_my_income_sources'),
    payload: z.object({
      status: z.enum(['draft', 'active', 'paused', 'verified', 'rejected']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).default({}),
  }),
  z.object({
    action: z.literal('list_active_offers'),
    payload: z.object({
      limit: z.number().int().min(1).max(100).default(50),
    }).default({}),
  }),
])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getBearer(req: Request): string | null {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) return json({ success: false, error: 'Missing Supabase env' }, 500)

  const token = getBearer(req)
  if (!token) return json({ success: false, error: 'Missing authorization bearer token' }, 401)

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return json({ success: false, error: 'Unauthorized' }, 401)

  const userId = userData.user.id

  try {
    const parsed = ActionSchema.parse(await req.json())

    if (parsed.action === 'create_income_source') {
      const { data, error } = await supabase.from('income_sources').insert({
        partner_id: userId,
        type: parsed.payload.type,
        title: parsed.payload.title,
        description: parsed.payload.description,
        capabilities: parsed.payload.capabilities,
        location: parsed.payload.location,
        availability: parsed.payload.availability,
        status: parsed.payload.status,
      }).select('*').single()
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    if (parsed.action === 'create_offer') {
      const { data: source, error: sourceError } = await supabase
        .from('income_sources')
        .select('id, partner_id')
        .eq('id', parsed.payload.income_source_id)
        .single()
      if (sourceError) throw sourceError
      if (!source || source.partner_id !== userId) return json({ success: false, error: 'Income source not found or forbidden' }, 403)

      const { data, error } = await supabase.from('commerce_offers').insert({
        partner_id: userId,
        income_source_id: parsed.payload.income_source_id,
        title: parsed.payload.title,
        description: parsed.payload.description,
        target_customer: parsed.payload.target_customer || null,
        price_amount: parsed.payload.price_amount,
        currency: parsed.payload.currency,
        cost_estimate: parsed.payload.cost_estimate,
        evidence: parsed.payload.evidence,
        constraints: parsed.payload.constraints,
        status: parsed.payload.status,
      }).select('*').single()
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    if (parsed.action === 'create_demand') {
      const { data, error } = await supabase.from('commerce_demands').insert({
        user_id: userId,
        raw_text: parsed.payload.raw_text,
        normalized_need: parsed.payload.normalized_need,
        location: parsed.payload.location,
        budget_amount: parsed.payload.budget_amount || null,
        currency: parsed.payload.currency,
        constraints: parsed.payload.constraints,
        status: parsed.payload.status,
      }).select('*').single()
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    if (parsed.action === 'suggest_match') {
      const { data: demand, error: demandError } = await supabase
        .from('commerce_demands')
        .select('id, user_id')
        .eq('id', parsed.payload.demand_id)
        .single()
      if (demandError) throw demandError
      if (!demand || demand.user_id !== userId) return json({ success: false, error: 'Demand not found or forbidden' }, 403)

      const { data: offer, error: offerError } = await supabase
        .from('commerce_offers')
        .select('id, status')
        .eq('id', parsed.payload.offer_id)
        .in('status', ['testing', 'active', 'scaled'])
        .single()
      if (offerError) throw offerError
      if (!offer) return json({ success: false, error: 'Offer not available' }, 404)

      const { data, error } = await supabase.from('commerce_matches').insert({
        demand_id: parsed.payload.demand_id,
        offer_id: parsed.payload.offer_id,
        score: parsed.payload.score,
        reasons: parsed.payload.reasons,
        status: parsed.payload.status,
      }).select('*').single()
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    if (parsed.action === 'list_my_income_sources') {
      let query = supabase.from('income_sources').select('*').eq('partner_id', userId).limit(parsed.payload.limit)
      if (parsed.payload.status) query = query.eq('status', parsed.payload.status)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    if (parsed.action === 'list_active_offers') {
      const { data, error } = await supabase
        .from('commerce_offers')
        .select('*')
        .in('status', ['testing', 'active', 'scaled'])
        .order('created_at', { ascending: false })
        .limit(parsed.payload.limit)
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    return json({ success: false, error: 'Unsupported action' }, 400)
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unknown error' }, 400)
  }
})
