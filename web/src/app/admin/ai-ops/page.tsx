'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'blocked'

type AIActionRequest = {
  id: string
  action_type: string
  status: ActionStatus
  decision_reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type AuditLog = {
  id: string
  action: string
  tool: string | null
  mode: string
  risk: string
  decision: string
  status: string
  reason: string | null
  latency_ms: number | null
  created_at: string
}

type GatewayResponse<T> = {
  success: boolean
  action?: string
  data?: T
  error?: string
}

const statusOrder: ActionStatus[] = ['pending', 'approved', 'executed', 'rejected', 'blocked']

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusTone(status: string) {
  if (status === 'pending') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  if (status === 'approved' || status === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  if (status === 'executed') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
  if (status === 'rejected' || status === 'error') return 'border-red-500/30 bg-red-500/10 text-red-200'
  return 'border-slate-600 bg-slate-800 text-slate-300'
}

export default function AdminAIOpsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<AIActionRequest[]>([])
  const [audits, setAudits] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(() => {
    return statusOrder.reduce<Record<ActionStatus, number>>((acc, status) => {
      acc[status] = requests.filter((request) => request.status === status).length
      return acc
    }, { pending: 0, approved: 0, rejected: 0, executed: 0, blocked: 0 })
  }, [requests])

  const latestExecution = useMemo(() => {
    return audits.find((audit) => audit.mode === 'commerce_execution') || null
  }, [audits])

  const callGateway = useCallback(async <T,>(functionName: 'ai-approval' | 'ai-commerce-executor', body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Session expired. Please sign in again.')

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })

    const payload = await response.json() as GatewayResponse<T>
    if (!response.ok || !payload.success) throw new Error(payload.error || `${functionName} request failed`)
    return payload.data as T
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [actionRequests, auditResponse] = await Promise.all([
        callGateway<AIActionRequest[]>('ai-approval', {
          action: 'list_my_action_requests',
          payload: { limit: 100 },
        }),
        supabase
          .from('ai_orchestrator_audit_logs')
          .select('id, action, tool, mode, risk, decision, status, reason, latency_ms, created_at')
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (auditResponse.error) throw auditResponse.error
      setRequests(actionRequests || [])
      setAudits((auditResponse.data || []) as AuditLog[])
    } catch (err: any) {
      setError(err.message || 'Failed to load AI operations data')
    } finally {
      setLoading(false)
    }
  }, [callGateway])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">AI Operations</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Admin AI Operations Console</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Read-only console for AI proposal flow, approval state, execution status, and recent audit events.
                This page does not execute commerce, payment, wallet, ledger, refund, order, or admin mutations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push('/admin/ai-review')}
                className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Open Review Queue
              </button>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        )}

        <section className="grid gap-4 md:grid-cols-5">
          {statusOrder.map((status) => (
            <article key={status} className={`rounded-3xl border p-5 ${statusTone(status)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{status}</p>
              <p className="mt-3 text-3xl font-semibold">{counts[status]}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Gateway Status</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 p-3">
                <span className="text-slate-300">AI Approval</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">active</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 p-3">
                <span className="text-slate-300">Commerce Executor</span>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">bounded</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 p-3">
                <span className="text-slate-300">Payment/Wallet/Ledger</span>
                <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-300">blocked</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 p-3">
                <span className="text-slate-300">Latest Execution</span>
                <span className="text-xs text-slate-400">{latestExecution ? formatDate(latestExecution.created_at) : '-'}</span>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recent AI Requests</p>
              <button type="button" onClick={() => router.push('/admin/ai-review')} className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Review →</button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {requests.slice(0, 8).map((request) => (
                    <tr key={request.id} className="bg-slate-900/60">
                      <td className="max-w-md truncate px-4 py-3 text-slate-200">{request.action_type}</td>
                      <td className="px-4 py-3"><span className={`rounded-full border px-3 py-1 text-xs ${statusTone(request.status)}`}>{request.status}</span></td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(request.updated_at)}</td>
                    </tr>
                  ))}
                  {requests.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No AI action requests found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recent Audit Events</p>
          <div className="mt-4 grid gap-3">
            {audits.slice(0, 12).map((audit) => (
              <article key={audit.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm md:grid-cols-[1.4fr_1fr_1fr_0.7fr] md:items-center">
                <div>
                  <p className="font-semibold text-slate-100">{audit.action}</p>
                  <p className="mt-1 text-xs text-slate-500">{audit.tool || audit.mode}</p>
                </div>
                <div className="text-slate-300">{audit.mode}</div>
                <div><span className={`rounded-full border px-3 py-1 text-xs ${statusTone(audit.status)}`}>{audit.status}</span></div>
                <div className="text-xs text-slate-500 md:text-right">{audit.latency_ms ? `${audit.latency_ms}ms` : '-'} · {formatDate(audit.created_at)}</div>
              </article>
            ))}
            {audits.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-sm text-slate-500">No audit events available.</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
