// Admin AI Price Accuracy Dashboard
// Feedback loop comparing AI Chat estimates against completed order prices.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type DaysFilter = 7 | 30 | 90;

interface PriceAccuracySummary {
  completed_chat_orders: number;
  accurate_orders: number;
  minor_mismatch_orders: number;
  moderate_mismatch_orders: number;
  major_mismatch_orders: number;
  avg_mismatch_percent: number;
  avg_abs_mismatch_amount: number;
  acceptable_accuracy_rate: number;
}

interface PriceAccuracyDailyRow {
  day: string;
  completed_chat_orders: number;
  avg_mismatch_percent: number | null;
  avg_abs_mismatch_amount: number | null;
  accurate_orders: number;
  minor_mismatch_orders: number;
  moderate_mismatch_orders: number;
  major_mismatch_orders: number;
  acceptable_accuracy_rate: number | null;
}

interface PriceAccuracyCategoryRow {
  category: string;
  completed_chat_orders: number;
  avg_mismatch_percent: number | null;
  avg_abs_mismatch_amount: number | null;
  underpriced_orders: number;
  overpriced_orders: number;
  major_mismatch_orders: number;
  acceptable_accuracy_rate: number | null;
}

interface RecentFeedbackRow {
  id: string;
  order_id: string;
  chat_session_id?: string;
  category: string;
  estimated_price: number;
  actual_price: number;
  final_price?: number;
  mismatch_amount: number;
  mismatch_percent: number;
  mismatch_severity: 'accurate' | 'minor' | 'moderate' | 'major';
  mismatch_direction: 'underpriced' | 'overpriced' | 'accurate';
  mismatch_reason?: string;
  created_at: string;
  orders?: { status?: string; description?: string };
}

interface PriceAccuracyResponse {
  days: number;
  since: string;
  summary: PriceAccuracySummary;
  daily: PriceAccuracyDailyRow[];
  by_category: PriceAccuracyCategoryRow[];
  recent: RecentFeedbackRow[];
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value?: number | null) {
  if (!value) return '0.0%';
  return `${(value * 100).toFixed(1)}%`;
}

function compactNumber(value?: number | null) {
  return new Intl.NumberFormat('vi-VN').format(value || 0);
}

function severityClass(severity: RecentFeedbackRow['mismatch_severity']) {
  if (severity === 'accurate') return 'bg-green-100 text-green-800';
  if (severity === 'minor') return 'bg-blue-100 text-blue-800';
  if (severity === 'moderate') return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function directionLabel(direction: RecentFeedbackRow['mismatch_direction']) {
  if (direction === 'underpriced') return 'AI báo thấp';
  if (direction === 'overpriced') return 'AI báo cao';
  return 'Khớp giá';
}

function barWidth(value?: number | null) {
  return `${Math.min(Math.max((value || 0) * 100, 0), 100)}%`;
}

export default function AdminPriceAccuracyPage() {
  const router = useRouter();
  const [days, setDays] = useState<DaysFilter>(30);
  const [data, setData] = useState<PriceAccuracyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPriceAccuracy(days);
  }, [days]);

  async function fetchPriceAccuracy(nextDays: DaysFilter) {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/ai/admin-dashboard?action=price-accuracy&days=${nextDays}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tải được price accuracy');
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Không tải được price accuracy');
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
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">AI Pricing Feedback Loop</p>
          <h1 className="text-3xl font-bold">Chat Price Accuracy</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            So sánh giá AI Chat ước tính với giá thực tế/final khi đơn hoàn tất để phát hiện báo thấp,
            báo cao và cải thiện pricing policy.
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
        <p>Loading price accuracy...</p>
      ) : !summary ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-600">
          Chưa có dữ liệu đơn chat hoàn tất để đo giá.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Completed Chat Orders</p>
              <p className="text-3xl font-bold">{compactNumber(summary.completed_chat_orders)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Acceptable Accuracy</p>
              <p className="text-3xl font-bold text-green-700">{formatPercent(summary.acceptable_accuracy_rate)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Avg Mismatch</p>
              <p className="text-3xl font-bold text-orange-700">{formatPercent(summary.avg_mismatch_percent)}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-600">Avg Amount Gap</p>
              <p className="text-3xl font-bold text-purple-700">{formatCurrency(summary.avg_abs_mismatch_amount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              ['Accurate', summary.accurate_orders, 'bg-green-500'],
              ['Minor', summary.minor_mismatch_orders, 'bg-blue-500'],
              ['Moderate', summary.moderate_mismatch_orders, 'bg-yellow-500'],
              ['Major', summary.major_mismatch_orders, 'bg-red-500'],
            ].map(([label, count, color]) => (
              <div key={label as string} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="font-semibold">{compactNumber(count as number)}</p>
                </div>
                <div className="h-2 rounded bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full ${color}`}
                    style={{ width: barWidth((count as number) / Math.max(summary.completed_chat_orders, 1)) }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Daily Accuracy</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Day</th>
                      <th className="px-3 py-2 text-right">Orders</th>
                      <th className="px-3 py-2 text-right">Acceptable</th>
                      <th className="px-3 py-2 text-right">Avg Gap</th>
                      <th className="px-3 py-2 text-right">Major</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data.daily || []).map((row) => (
                      <tr key={row.day}>
                        <td className="px-3 py-2">{row.day}</td>
                        <td className="px-3 py-2 text-right">{compactNumber(row.completed_chat_orders)}</td>
                        <td className="px-3 py-2 text-right">{formatPercent(row.acceptable_accuracy_rate)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.avg_abs_mismatch_amount)}</td>
                        <td className="px-3 py-2 text-right text-red-700 font-semibold">{compactNumber(row.major_mismatch_orders)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Accuracy by Category</h2>
              <div className="space-y-3">
                {(data.by_category || []).slice(0, 10).map((row) => (
                  <div key={row.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{row.category}</span>
                      <span className="text-gray-600">
                        {compactNumber(row.completed_chat_orders)} orders · {formatPercent(row.acceptable_accuracy_rate)} acceptable
                      </span>
                    </div>
                    <div className="h-2 rounded bg-gray-100 overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: barWidth(row.acceptable_accuracy_rate) }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Báo thấp: {compactNumber(row.underpriced_orders)} · Báo cao: {compactNumber(row.overpriced_orders)} · Major: {compactNumber(row.major_mismatch_orders)}
                    </p>
                  </div>
                ))}
                {(data.by_category || []).length === 0 && <p className="text-gray-600">Chưa có dữ liệu theo danh mục.</p>}
              </div>
            </section>
          </div>

          <section className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Price Feedback</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Order</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-right">AI Estimate</th>
                    <th className="px-3 py-2 text-right">Actual</th>
                    <th className="px-3 py-2 text-right">Gap</th>
                    <th className="px-3 py-2 text-left">Severity</th>
                    <th className="px-3 py-2 text-left">Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.recent || []).map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 break-all">{row.order_id}</td>
                      <td className="px-3 py-2 capitalize">{row.category}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.estimated_price)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.actual_price)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.mismatch_amount)} ({formatPercent(row.mismatch_percent)})</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityClass(row.mismatch_severity)}`}>
                          {row.mismatch_severity}
                        </span>
                      </td>
                      <td className="px-3 py-2">{directionLabel(row.mismatch_direction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data.recent || []).length === 0 && <p className="text-gray-600 mt-4">Chưa có feedback gần đây.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
