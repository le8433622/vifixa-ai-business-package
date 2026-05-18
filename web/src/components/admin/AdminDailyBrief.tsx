'use client'

import { DailyBrief } from '@/hooks/useAdminAutoMode'

interface AdminDailyBriefProps {
  brief: DailyBrief | null
  loading: boolean
}

export default function AdminDailyBrief({ brief, loading }: AdminDailyBriefProps) {
  if (loading || !brief) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-200">📊 Tóm tắt hôm nay</h3>
        <span className="text-[10px] text-gray-500">{new Date(brief.date).toLocaleDateString('vi-VN')}</span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-blue-900/30 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{brief.newUsers}</p>
          <p className="text-[10px] text-gray-500">Người dùng mới</p>
        </div>
        <div className="bg-emerald-900/30 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{brief.newWorkers}</p>
          <p className="text-[10px] text-gray-500">Thợ mới</p>
        </div>
        <div className="bg-amber-900/30 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{brief.newOrders}</p>
          <p className="text-[10px] text-gray-500">Đơn mới</p>
        </div>
        <div className="bg-green-900/30 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-400">{brief.completedOrders}</p>
          <p className="text-[10px] text-gray-500">Hoàn thành</p>
        </div>
        <div className="bg-violet-900/30 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-violet-400">{(brief.revenue / 1000000).toFixed(1)}M</p>
          <p className="text-[10px] text-gray-500">Doanh thu</p>
        </div>
        <div className="bg-cyan-900/30 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-cyan-400">{brief.topCategory}</p>
          <p className="text-[10px] text-gray-500">Dịch vụ chính</p>
        </div>
      </div>

      {/* Alerts */}
      {(brief.pendingDisputes > 0 || brief.pendingKyc > 0 || brief.flaggedTransactions > 0) && (
        <div className="space-y-2 mb-4">
          {brief.pendingDisputes > 0 && (
            <div className="bg-rose-900/40 border border-rose-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-sm">🚨</span>
              <span className="text-xs text-rose-200">{brief.pendingDisputes} khiếu nại chưa xử lý</span>
            </div>
          )}
          {brief.pendingKyc > 0 && (
            <div className="bg-amber-900/40 border border-amber-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-sm">🪪</span>
              <span className="text-xs text-amber-200">{brief.pendingKyc} KYC chờ duyệt</span>
            </div>
          )}
          {brief.flaggedTransactions > 0 && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span className="text-xs text-red-200">{brief.flaggedTransactions} giao dịch bất thường</span>
            </div>
          )}
        </div>
      )}

      {/* AI Insights */}
      {brief.insights.length > 0 && (
        <div className="bg-indigo-900/30 rounded-xl p-3">
          <p className="text-[10px] text-indigo-400 font-bold uppercase mb-2">🤖 AI Insights</p>
          <ul className="space-y-1">
            {brief.insights.map((insight, i) => (
              <li key={i} className="text-xs text-indigo-200 flex items-start gap-1.5">
                <span className="mt-1 w-1 h-1 bg-indigo-400 rounded-full shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
