import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list_my_payment_intents'),
    payload: z.object({
      status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).default({}),
  }),
  z.object({
    action: z.literal('get_my_wallets'),
    payload: z.object({}).default({}),
  }),
  z.object({
    action: z.literal('list_my_ledger_entries'),
    payload: z.object({
      wallet_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).default({}),
  }),
  z.object({
    action: z.literal('list_my_transactions'),
    payload: z.object({
      status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'refunded']).optional(),
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

    if (parsed.action === 'list_my_payment_intents') {
      let query = supabase
        .from('payment_intents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parsed.payload.limit)
      if (parsed.payload.status) query = query.eq('status', parsed.payload.status)
      const { data, error } = await query
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    if (parsed.action === 'get_my_wallets') {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, wallet_type, balance, locked, currency, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    if (parsed.action === 'list_my_ledger_entries') {
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
      if (walletsError) throw walletsError
      const walletIds = (wallets || []).map((wallet: { id: string }) => wallet.id)
      if (parsed.payload.wallet_id && !walletIds.includes(parsed.payload.wallet_id)) {
        return json({ success: false, error: 'Wallet not found or forbidden' }, 403)
      }
      if (walletIds.length === 0) return json({ success: true, action: parsed.action, data: [] })
      let query = supabase.from('ledger').select('*').order('created_at', { ascending: false }).limit(parsed.payload.limit)
      query = parsed.payload.wallet_id ? query.eq('wallet_id', parsed.payload.wallet_id) : query.in('wallet_id', walletIds)
      const { data, error } = await query
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    if (parsed.action === 'list_my_transactions') {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parsed.payload.limit)
      if (parsed.payload.status) query = query.eq('status', parsed.payload.status)
      const { data, error } = await query
      if (error) throw error
      return json({ success: true, action: parsed.action, data })
    }

    return json({ success: false, error: 'Unsupported action' }, 400)
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unknown error' }, 400)
  }
})
