'use client'

import { AgentPlan } from '@/hooks/useAgentOrchestrator'

interface AgentPlanPreviewProps {
  plan: AgentPlan
  onApprove: () => void
  onReject: () => void
  loading: boolean
}

export default function AgentPlanPreview({ plan, onApprove, onReject, loading }: AgentPlanPreviewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'running': return '⏳'
      case 'waiting_approval': return '⏸️'
      case 'failed': return '❌'
      case 'skipped': return '⏭️'
      default: return '⏳'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'running': return 'text-blue-600'
      case 'waiting_approval': return 'text-yellow-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🤖</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">AI đã tạo kế hoạch</p>
          <p className="text-xs text-gray-500">{plan.goal_description}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          plan.status === 'completed' ? 'bg-green-100 text-green-700' :
          plan.status === 'running' ? 'bg-blue-100 text-blue-700' :
          plan.status === 'failed' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {plan.status === 'completed' ? 'Hoàn thành' :
           plan.status === 'running' ? 'Đang chạy' :
           plan.status === 'failed' ? 'Thất bại' :
           'Chờ duyệt'}
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-2 mb-4">
        {plan.plan.map((step, i) => {
          const result = plan.results.find(r => r.step_index === i)
          const status = result?.status || 'running'
          return (
            <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-xl">
              <span className={`text-sm mt-0.5 ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700">{step.description}</p>
                <p className="text-[10px] text-gray-400 font-mono">{step.action_id}</p>
                {result?.error && (
                  <p className="text-[10px] text-red-500 mt-1">{result.error}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Approval buttons */}
      {plan.needs_approval && (
        <div className="flex gap-2">
          <button
            onClick={onReject}
            disabled={loading}
            className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition"
          >
            ❌ Từ chối
          </button>
          <button
            onClick={onApprove}
            disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition shadow-sm"
          >
            {loading ? 'Đang xử lý...' : '✅ Duyệt'}
          </button>
        </div>
      )}

      {/* Results summary */}
      {plan.status === 'completed' && plan.results.length > 0 && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs text-green-700 font-medium">✅ Kế hoạch đã hoàn thành</p>
          {plan.results.some(r => r.output) && (
            <pre className="text-[10px] text-green-600 mt-1 overflow-x-auto">
              {JSON.stringify(plan.results.find(r => r.output)?.output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
