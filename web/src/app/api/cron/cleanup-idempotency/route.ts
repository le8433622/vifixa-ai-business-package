import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedAuth = process.env.CRON_SECRET
  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const startedAt = new Date()

  const { data: logEntry } = await supabase.from('cron_job_log').insert({
    job_name: 'cleanup-idempotency',
    status: 'started',
    started_at: startedAt.toISOString(),
  }).select('id').single()

  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data, error } = await supabase
      .from('idempotency_keys')
      .delete()
      .lt('created_at', sevenDaysAgo.toISOString())

    if (error) throw error

    const deleted = data?.length || 0
    const completedAt = new Date()

    await supabase.from('cron_job_log').update({
      status: 'succeeded',
      completed_at: completedAt.toISOString(),
      duration_ms: completedAt.getTime() - startedAt.getTime(),
      result_summary: `deleted ${deleted} expired idempotency keys`,
    }).eq('id', logEntry?.id)

    return NextResponse.json({ success: true, deleted })
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
