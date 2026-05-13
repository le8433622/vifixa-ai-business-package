// Health check endpoint for diagnosing deployment issues
import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    app_url: !!process.env.NEXT_PUBLIC_APP_URL,
    node_env: process.env.NODE_ENV,
  }

  const allOk = Object.entries(checks)
    .filter(([k]) => k !== 'node_env')
    .every(([, v]) => v === true)

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  })
}
