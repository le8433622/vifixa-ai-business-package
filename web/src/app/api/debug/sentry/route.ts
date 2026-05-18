import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return NextResponse.json({ ok: false, message: 'Sentry DSN not configured — set NEXT_PUBLIC_SENTRY_DSN' })
  }

  try {
    throw new Error('[Sentry test] Intentional error from /api/debug/sentry')
  } catch (e) {
    Sentry.captureException(e)
    await Sentry.flush(2000)
  }

  return NextResponse.json({ ok: true, message: 'Sentry test event sent successfully' })
}
