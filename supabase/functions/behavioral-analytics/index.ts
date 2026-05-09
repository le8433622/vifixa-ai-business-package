// Behavioral Analytics Edge Function
// Analyzes user behavior and generates smart suggestions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  // Verify admin (this is an admin function)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const user = await verifyAuth(req)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = supabaseAdmin

  const url = new URL(req.url)
  const userId = url.searchParams.get('user_id')

  try {
    if (req.method === 'POST') {
      // Trigger analysis for a user or all users
      const body = await req.json().catch(() => ({}))
      const targetUserId = body.user_id || userId
      
      if (targetUserId) {
        await analyzeUserBehavior(supabase, targetUserId)
        return jsonResponse({ success: true, message: `Analysis complete for user ${targetUserId}` })
      } else {
        // Analyze all active users (scheduled job)
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['worker', 'customer'])
        
        for (const user of users || []) {
          await analyzeUserBehavior(supabase, user.id)
        }
        return jsonResponse({ success: true, message: `Analysis complete for ${users?.length || 0} users` })
      }
    }

    // GET /?user_id=xxx → Get patterns for a user
    if (req.method === 'GET' && userId) {
      const { data: patterns } = await supabase
        .from('behavioral_patterns')
        .select('*')
        .eq('user_id', userId)

      const { data: suggestions } = await supabase
        .from('user_suggestions')
        .select('*')
        .eq('user_id', userId)
        .eq('dismissed', false)
        .eq('applied', false)

      return jsonResponse({
        patterns: patterns || [],
        pending_suggestions: suggestions || [],
      })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (error: any) {
    console.error('Behavioral analytics error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

async function analyzeUserBehavior(supabase: any, userId: string) {
  console.log(`Analyzing behavior for user: ${userId}`)

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile) return

  if (profile.role === 'worker') {
    await analyzeWorkerBehavior(supabase, userId)
  } else if (profile.role === 'customer') {
    await analyzeCustomerBehavior(supabase, userId)
  }
}

async function analyzeWorkerBehavior(supabase: any, userId: string) {
  // Get worker's orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('worker_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!orders || orders.length === 0) return

  // Analyze work hours (extract hour from created_at)
  const hourCounts: Record<number, number> = {}
  orders.forEach((o: any) => {
    const hour = new Date(o.created_at).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  const bestHours = Object.entries(hourCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour))

  // Analyze job types (from device_profiles or title)
  const jobTypeCounts: Record<string, number> = {}
  orders.forEach((o: any) => {
    const type = o.title || 'general'
    jobTypeCounts[type] = (jobTypeCounts[type] || 0) + 1
  })
  const topJobTypes = Object.entries(jobTypeCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type)

  // Calculate earnings by mode (if we had mode tracking)
  // For now, just calculate average earnings
  const totalEarnings = orders
    .filter((o: any) => o.payment_status === 'paid')
    .reduce((sum: number, o: any) => sum + (o.worker_payout_amount || 0), 0)
  const avgEarnings = orders.length > 0 ? totalEarnings / orders.length : 0

  // Update behavioral pattern
  const patternData = {
    best_work_hours: bestHours,
    top_job_types: topJobTypes,
    avg_earnings_per_job: avgEarnings,
    total_completed_jobs: orders.filter((o: any) => o.status === 'completed').length,
    dispute_rate: orders.length > 0 
      ? orders.filter((o: any) => o.status === 'disputed').length / orders.length 
      : 0,
  }

  await supabase
    .from('behavioral_patterns')
    .upsert({
      user_id: userId,
      pattern_type: 'work_pattern',
      pattern_data: patternData,
      confidence: Math.min(orders.length / 20, 1), // More data = higher confidence
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id, pattern_type' })

  // Generate suggestions
  await generateWorkerSuggestions(supabase, userId, patternData)
}

async function analyzeCustomerBehavior(supabase: any, userId: string) {
  // Get customer's orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!orders || orders.length === 0) return

  // Analyze service types
  const serviceTypes: Record<string, number> = {}
  orders.forEach((o: any) => {
    const type = o.title || 'general'
    serviceTypes[type] = (serviceTypes[type] || 0) + 1
  })

  // Analyze spending
  const totalSpent = orders
    .filter((o: any) => o.payment_status === 'paid')
    .reduce((sum: number, o: any) => sum + (o.actual_price || 0), 0)

  const patternData = {
    preferred_services: Object.entries(serviceTypes)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type),
    avg_spending: orders.length > 0 ? totalSpent / orders.length : 0,
    total_orders: orders.length,
    payment_methods: ['vnpay', 'momo'], // Would extract from payment_intents
  }

  await supabase
    .from('behavioral_patterns')
    .upsert({
      user_id: userId,
      pattern_type: 'service_preference',
      pattern_data: patternData,
      confidence: Math.min(orders.length / 10, 1),
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id, pattern_type' })
}

async function generateWorkerSuggestions(supabase: any, userId: string, patternData: any) {
  const suggestions = []

  // Suggestion 1: Work mode based on best hours + earnings
  if (patternData.best_work_hours?.length > 0 && patternData.avg_earnings_per_job > 0) {
    const bestHour = patternData.best_work_hours[0]
    const boost = Math.min(patternData.avg_earnings_per_job / 200000, 0.3) // Max 30% boost
    
    suggestions.push({
      user_id: userId,
      suggestion_type: 'work_mode',
      suggestion: {
        suggested_mode: 'active',
        reason: `Hour ${bestHour}h has the highest demand with avg ${Math.round(patternData.avg_earnings_per_job).toLocaleString()} VND/job`,
        confidence_boost: boost,
        time_slot: `${bestHour}:00-${bestHour + 2}:00`,
      },
      confidence: Math.min(0.5 + patternData.total_completed_jobs / 50, 0.95),
    })
  }

  // Suggestion 2: Focus on top job types with high success rate
  if (patternData.top_job_types?.length > 0) {
    const topType = patternData.top_job_types[0]
    suggestions.push({
      user_id: userId,
      suggestion_type: 'job_preference',
      suggestion: {
        preferred_types: patternData.top_job_types.slice(0, 3),
        reason: `${topType} has the highest success rate (${patternData.total_completed_jobs} completed jobs)`,
        confidence_boost: 0.2,
      },
      confidence: Math.min(0.6 + (1 - patternData.dispute_rate) * 0.3, 0.95),
    })
  }

  // Suggestion 3: AI Assistance Level based on dispute rate
  if (patternData.dispute_rate > 0.1) {
    suggestions.push({
      user_id: userId,
      suggestion_type: 'ai_assistance',
      suggestion: {
        suggested_level: 'assist',
        reason: `Your dispute rate (${(patternData.dispute_rate * 100).toFixed(1)}%) is above 10%. AI assistance can help reduce it`,
        confidence_boost: 0.15,
      },
      confidence: 0.85,
    })
  } else if (patternData.total_completed_jobs > 20) {
    suggestions.push({
      user_id: userId,
      suggestion_type: 'ai_assistance',
      suggestion: {
        suggested_level: 'learning',
        reason: `With ${patternData.total_completed_jobs} completed jobs, AI can learn your patterns`,
        confidence_boost: 0.1,
      },
      confidence: 0.75,
    })
  }

  // Upsert suggestions (replace old ones)
  for (const sug of suggestions) {
    await supabase
      .from('user_suggestions')
      .delete()
      .eq('user_id', userId)
      .eq('suggestion_type', sug.suggestion_type)
    
    await supabase
      .from('user_suggestions')
      .insert(sug)
  }
}
