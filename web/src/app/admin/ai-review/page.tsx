'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'blocked'

type AIActionRequest = {
  id: string
  request_id: string
  user_id: string
  action_type: string
  action_payload: Record<string, unknown>
  status: RequestStatus
  approval_mode: string
  decision_reason: string | null
  approved_by: string | null
  approved_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type GatewayResponse<T> = {
  success: boolean
  action?: string
  data?: T
  error?: string
}

const statusOptions: Array<RequestStatus | 'all'> = ['pending', 'approved', 'rejected', 'executed', 'blocked', 'all']

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function compactJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

export default function AdminAIReviewPage() {
  const [requests, setRequests] = useState<AIActionRequest[]>([])
  const [status, setStatus] = useState<RequestStatus | 'all'>('pending')
  const [loading, setLoading] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const pendingCount = useMemo(() => requests.filter((request) => request.status === 'pending').length, [requests])
  const approvedCount = useMemo(() => requests.filter((request) => request.status === 'approved').length, [requests])

  const callGateway = useCallback(async <T,>(functionName: 'ai-approval' | 'ai-commerce-executor', body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Session expired. Please sign in again.')

    const { data, error } = await supabase.functions.invoke<GatewayResponse<T>>(functionName, {
      body,
    })

    if (error) throw new Error(error.message || `${functionName} request failed`)
    if (!data?.success) throw new Error(data?.error || `${functionName} request failed`)
    return data.data as T
  }, [])

  const callApprovalGateway = useCallback(async <T,>(body: Record<string, unknown>) => {
    return callGateway<T>('ai-approval', body)
  }, [callGateway])

  const callCommerceExecutor = useCallback(async <T,>(body: Record<string, unknown>) => {
    return callGateway<T>('ai-commerce-executor', body)
  }, [callGateway])

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await callApprovalGateway<AIActionRequest[]>({
        action: 'list_my_action_requests',
        payload: {
          status: status === 'all' ? undefined : status,
          limit: 100,
        },
      })
      setRequests(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load AI action requests')
    } finally {
      setLoading(false)
    }
  }, [callApprovalGateway, status])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const decide = useCallback(async (requestId: string, decision: 'approve_action_request' | 'reject_action_request') => {
    const defaultReason = decision === 'approve_action_request'
      ? 'Approved for later bounded execution.'
      : 'Rejected by admin review.'
    const reason = window.prompt('Decision reason', defaultReason)
    if (!reason) return

    try {
      setActingId(requestId)
      setError(null)
      setMessage(null)
      await callApprovalGateway<AIActionRequest>({
        action: decision,
        payload: {
          request_id: requestId,
          decision_reason: reason,
        },
      })
      setMessage(decision === 'approve_action_request' ? 'Request approved. It can now be executed through the bounded commerce executor.' : 'Request rejected.')
      await loadRequests()
    } catch (err: any) {
      setError(err.message || 'Failed to update request')
    } finally {
      setActingId(null)
    }
  }, [callApprovalGateway, loadRequests])

  const executeRequest = useCallback(async (requestId: string) => {
    const confirmed = window.confirm('Execute this approved commerce request now? This will write to commerce tables, but not payment, wallet, ledger, refund, order, or admin mutation.')
    if (!confirmed) return

    const reason = window.prompt('Execution reason', 'Executed approved commerce proposal from admin review queue.')
    if (!reason) return

    try {
      setActingId(requestId)
      setError(null)
      setMessage(null)
      await callCommerceExecutor<unknown>({
        action: 'execute_approved_request',
        payload: {
          request_id: requestId,
          reason,
        },
      })
      setMessage('Approved commerce request executed successfully.')
      await loadRequests()
    } catch (err: any) {
      setError(err.message || 'Failed to execute request')
    } finally {
      setActingId(null)
    }
  }, [callCommerceExecutor, loadRequests])

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">AI Approval Policy</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Admin AI Review Queue</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Review AI proposal-only commerce actions, approve or reject them, then execute only approved commerce requests through the bounded executor.
                Payment, wallet, ledger, refund, order, and admin mutations remain out of scope.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm md:min-w-96">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-slate-400">Loaded</p>
                <p className="mt-1 text-2xl font-semibold text-white">{requests.length}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-amber-200">Pending</p>
                <p className="mt-1 text-2xl font-semibold text-amber-100">{pendingCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-emerald-200">Executable</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-100">{approvedCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${status === option ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        )}
        {message && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div>
        )}

        <section className="grid gap-4">
          {requests.length === 0 && !loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-10 text-center text-slate-400">
              No AI action requests found for this filter.
            </div>
          ) : null}

          {requests.map((request) => (
            <article key={request.id} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">{request.action_type}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'pending' ? 'bg-amber-500/15 text-amber-200' : request.status === 'approved' ? 'bg-emerald-500/15 text-emerald-200' : request.status === 'rejected' ? 'bg-red-500/15 text-red-200' : 'bg-slate-700 text-slate-200'}`}>
                      {request.status}
                    </span>
                    <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">{request.approval_mode}</span>
                  </div>
                  <h2 className="mt-3 break-all text-lg font-semibold text-white">{request.id}</h2>
                  <p className="mt-2 text-sm text-slate-400">Created {formatDate(request.created_at)} · Updated {formatDate(request.updated_at)}</p>
                  {request.decision_reason ? <p className="mt-3 text-sm leading-6 text-slate-300">{request.decision_reason}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={request.status !== 'pending' || actingId === request.id}
                    onClick={() => void decide(request.id, 'approve_action_request')}
                    className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={request.status !== 'pending' || actingId === request.id}
                    onClick={() => void decide(request.id, 'reject_action_request')}
                    className="rounded-full bg-red-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={request.status !== 'approved' || actingId === request.id}
                    onClick={() => void executeRequest(request.id)}
                    className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Execute
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Payload</p>
                  <pre className="max-h-72 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                    {compactJson(request.action_payload)}
                  </pre>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Metadata</p>
                  <pre className="max-h-72 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                    {compactJson(request.metadata)}
                  </pre>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
