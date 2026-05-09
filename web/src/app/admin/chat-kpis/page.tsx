// Admin Chat Funnel KPI Dashboard
// Measures AI Chat Service Closer conversion, drop-off, escalation and fallback rates.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type DaysFilter = 7 | 30 | 90;

interface ChatKpiSummary {
  total_sessions: number;
  started_sessions: number;
  qualified_sessions: number;
  quoted_sessions: number;
  confirmation_shown_sessions: number;
  confirmation_clicked_sessions: number;
  approval_requested_sessions: number;
  order_created_sessions: number;
  escalated_sessions: number;
  fallback_sessions: number;
  chat_to_order_rate: number;
  quote_to_confirm_rate: number;
  quote_to_order_rate: number;
  escalation_rate: number;
  fallback_rate: number;
}

interface DailyFunnelRow extends ChatKpiSummary {
  day: string;
}

interface DropoffRow {
  day: string;
  missing_slot: string;
  occurrences: number;
  sessions: number;
}

interface QuoteAcceptanceRow {
  day: string;
  quoted_sessions: number;
  confirmation_clicked_sessions: number;
  order_created_sessions: number;
  quote_to_confirm_rate: number | null;
  quote_to_order_rate: number | null;
}

interface FallbackRateRow {
  day: string;
  total_sessions: number;
  fallback_sessions: number;
  fallback_rate: number | null;
}

interface ChatKpiResponse {
  days: number;
  since: string;
  summary: ChatKpiSummary;
  daily: DailyFunnelRow[];
  dropoff: DropoffRow[];
  quote_acceptance: QuoteAcceptanceRow[];
  fallback_rate: FallbackRateRow[];
}

function formatPercent(value?: number | null) {
  if (!value) return '0.0%';
  return `${(value * 100).toFixed(1)}%`;
}

function compactNumber(value?: number) {
  return new Intl.NumberFormat('vi-VN').format(value || 0);
}

function barWidth(value?: number | null) {
  return `${Math.min(Math.max((value || 0) * 100, 0), 100)}%`;
}

export default function AdminChatKpisPage() {
  const router = useRouter();
  const [days, setDays] = useState<DaysFilter>(30);
  const [data, setData] = useState<ChatKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKpis(days);
  }, [days]);

  async function fetchKpis(nextDays: DaysFilter) {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/ai/admin-dashboard?action=chat-kpis&days=${nextDays}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tải được chat KPI');
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Không tải được chat KPI');
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.summary;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <button
        onClick={() => router.push('/admin')}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to Dashboard
      </button>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">AI Chat Service Closer</p>
          <h1 className="text-3xl font-bold">Chat Funnel KPI Dashboard</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Theo dõi conversion, quote acceptance, approval, escalation và AI fallback để biết AI chốt đơn
            đang vận hành tự trị tốt đến đâu.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((item) => (
            <button
              key={item}
              onClick={() => setDays(item as DaysFilter)}
              className={`px-4 py-2 rounded-full border ${days === item ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              {item} ngày
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading chat KPIs...</p>
      ) : !summary ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-600">
          Chưa có dữ liệu chat funnel.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Chat Started</p>
              <p className="text-3xl font-bold">{compactNumber(summary.started_sessions)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Quoted</p>
              <p className="text-3xl font-bold text-blue-700">{compactNumber(summary.quoted_sessions)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Orders Created</p>
              <p className="text-3xl font-bold text-green-700">{compactNumber(summary.order_created_sessions)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Approval Requests</p>
              <p className="text-3xl font-bold text-purple-700">{compactNumber(summary.approval_requested_sessions)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Escalated</p>
              <p className="text-3xl font-bold text-red-700">{compactNumber(summary.escalated_sessions)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {[
              ['Chat → Order', summary.chat_to_order_rate, 'bg-green-500'],
              ['Quote → Confirm', summary.quote_to_confirm_rate, 'bg-blue-500'],
              ['Quote → Order', summary.quote_to_order_rate, 'bg-emerald-500'],
              ['Escalation Rate', summary.escalation_rate, 'bg-red-500'],
              ['AI Fallback Rate', summary.fallback_rate, 'bg-orange-500'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="bg-white border rounded-lg p-4">
                <p className="text-sm text-gray-600">{label}</p>
                <p className="text-2xl font-bold">{formatPercent(value as number)}</p>
                <div className="mt-3 h-2 rounded bg-gray-100 overflow-hidden">
                  <div className={`h-full ${color}`} style={{ width: barWidth(value as number) }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Daily Funnel</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Day</th>
                      <th className="px-3 py-2 text-right">Started</th>
                      <th className="px-3 py-2 text-right">Quoted</th>
                      <th className="px-3 py-2 text-right">Confirmed</th>
                      <th className="px-3 py-2 text-right">Orders</th>
                      <th className="px-3 py-2 text-right">Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data.daily || []).map((row) => (
                      <tr key={row.day}>
                        <td className="px-3 py-2">{row.day}</td>
                        <td className="px-3 py-2 text-right">{compactNumber(row.started_sessions)}</td>
                        <td className="px-3 py-2 text-right">{compactNumber(row.quoted_sessions)}</td>
                        <td className="px-3 py-2 text-right">{compactNumber(row.confirmation_clicked_sessions)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-700">{compactNumber(row.order_created_sessions)}</td>
                        <td className="px-3 py-2 text-right">{formatPercent(row.chat_to_order_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Drop-off by Missing Slot</h2>
              <div className="space-y-3">
                {(data.dropoff || []).slice(0, 10).map((row) => (
                  <div key={`${row.day}-${row.missing_slot}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{row.missing_slot}</span>
                      <span className="text-gray-600">{compactNumber(row.sessions)} sessions · {row.day}</span>
                    </div>
                    <div className="h-2 rounded bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${Math.min((row.sessions / Math.max(summary.started_sessions, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(data.dropoff || []).length === 0 && <p className="text-gray-600">Không có missing slot drop-off.</p>}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quote Acceptance</h2>
              <div className="space-y-3">
                {(data.quote_acceptance || []).slice(0, 14).map((row) => (
                  <div key={row.day} className="grid grid-cols-4 gap-2 text-sm items-center">
                    <span>{row.day}</span>
                    <span className="text-right">Quote: {compactNumber(row.quoted_sessions)}</span>
                    <span className="text-right">Confirm: {compactNumber(row.confirmation_clicked_sessions)}</span>
                    <span className="text-right font-semibold">{formatPercent(row.quote_to_confirm_rate)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">AI Fallback Rate</h2>
              <div className="space-y-3">
                {(data.fallback_rate || []).slice(0, 14).map((row) => (
                  <div key={row.day}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{row.day}</span>
                      <span>{compactNumber(row.fallback_sessions)} / {compactNumber(row.total_sessions)} · {formatPercent(row.fallback_rate)}</span>
                    </div>
                    <div className="h-2 rounded bg-gray-100 overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: barWidth(row.fallback_rate) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
