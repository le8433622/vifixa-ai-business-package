import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedAuth = process.env.CRON_SECRET
  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const startedAt = new Date()

  const { data: logEntry } = await supabase.from('cron_job_log').insert({
    job_name: 'anomaly-detector',
    status: 'started',
    started_at: startedAt.toISOString(),
  }).select('id').single()

  try {
    const cronSecret = process.env.CRON_SECRET || ''
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-anomaly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({}),
    })
    const data = await res.json()

    const completedAt = new Date()
    await supabase.from('cron_job_log').update({
      status: data.success ? 'succeeded' : 'failed',
      completed_at: completedAt.toISOString(),
      duration_ms: completedAt.getTime() - startedAt.getTime(),
      result_summary: `${data.alerts_count || 0} alerts, ${data.high_severity_count || 0} high-severity`,
      error_message: data.error || null,
    }).eq('id', logEntry?.id)

    return NextResponse.json({ success: true, result: data })
  } catch (error: any) {
    const completedAt = new Date()
    await supabase.from('cron_job_log').update({
      status: 'failed',
      completed_at: completedAt.toISOString(),
      duration_ms: completedAt.getTime() - startedAt.getTime(),
      error_message: error.message,
    }).eq('id', logEntry?.id)

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
