'use client'

import { WorkerIncomeStats } from '@/hooks/useWorkerAutoMode'

interface WorkerIncomeDashboardProps {
  stats: WorkerIncomeStats | null
  loading: boolean
}

export default function WorkerIncomeDashboard({ stats, loading }: WorkerIncomeDashboardProps) {
  if (loading || !stats) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-700 mb-3">💰 Thu nhập</h3>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-[10px] text-emerald-600 font-medium">Hôm nay</p>
          <p className="text-lg font-bold text-emerald-700">{stats.today.toLocaleString()}₫</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-[10px] text-blue-600 font-medium">Tuần này</p>
          <p className="text-lg font-bold text-blue-700">{stats.week.toLocaleString()}₫</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-3">
          <p className="text-[10px] text-violet-600 font-medium">Tháng này</p>
          <p className="text-lg font-bold text-violet-700">{stats.month.toLocaleString()}₫</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-[10px] text-amber-600 font-medium">Tổng cộng</p>
          <p className="text-lg font-bold text-amber-700">{stats.total.toLocaleString()}₫</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-xs font-bold text-gray-700">{stats.totalJobs}</p>
          <p className="text-[10px] text-gray-400">Việc hoàn thành</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-xs font-bold text-gray-700">{Math.round(stats.avgPerJob).toLocaleString()}₫</p>
          <p className="text-[10px] text-gray-400">TB / việc</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-xs font-bold text-gray-700">{stats.completionRate.toFixed(0)}%</p>
          <p className="text-[10px] text-gray-400">Hoàn thành</p>
        </div>
      </div>

      {/* Top category */}
      {stats.topCategory && stats.topCategory !== '—' && (
        <div className="mt-3 p-2 bg-emerald-50 rounded-xl">
          <p className="text-[10px] text-emerald-600 font-medium">Dịch vụ chính</p>
          <p className="text-sm font-bold text-emerald-700">{stats.topCategory}</p>
        </div>
      )}
    </div>
  )
}
