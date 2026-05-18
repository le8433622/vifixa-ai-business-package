'use client'

import { useState, useCallback } from 'react'
import CompanionChat from './CompanionChat'
import AgentPlanPreview from './AgentPlanPreview'
import { useAgentOrchestrator, AgentPlan } from '@/hooks/useAgentOrchestrator'

interface AgentCompanionChatProps {
  persona: 'customer' | 'worker' | 'admin'
  onAction?: (action: any) => void
}

export default function AgentCompanionChat({ persona, onAction }: AgentCompanionChatProps) {
  const [userId, setUserId] = useState<string>('')
  const [showAgentMode, setShowAgentMode] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<AgentPlan | null>(null)

  const {
    invoke,
    approveAction,
    rejectAction,
    currentPlan,
    loading,
    error,
    clearPlan,
  } = useAgentOrchestrator(userId, persona)

  const handleUserMessage = useCallback(async (message: string) => {
    const lower = message.toLowerCase()
    const actionableKeywords = [
      'sửa', 'hỏng', 'hư', 'đặt', 'order', 'tạo đơn', 'gọi thợ',
      'đổi địa chỉ', 'đổi số', 'đổi điện thoại', 'đổi mật khẩu',
      'dọn', 'vệ sinh', 'lau', 'sạch', 'giao', 'ship', 'chuyển đồ',
      'chuyển nhà', 'chuyển văn phòng', 'massage', 'bấm huyệt',
      'gia sư', 'học', 'dạy', 'kèm', 'chó', 'mèo', 'thú cưng',
      'chăm sóc', 'người già', 'trẻ', 'có đơn', 'việc nào',
      'thu nhập', 'tiền', 'tóm tắt', 'daily', 'báo cáo', 'kyc',
      'duyệt', 'fraud', 'bất thường', 'anomaly',
    ]

    const isActionable = actionableKeywords.some(kw => lower.includes(kw))
    if (isActionable && userId) {
      const plan = await invoke(message)
      if (plan) {
        setPendingPlan(plan)
        setShowAgentMode(true)
      }
    }
  }, [userId, invoke])

  const handleApprove = useCallback(async () => {
    if (!pendingPlan) return
    const success = await approveAction(pendingPlan.run_id)
    if (success) {
      clearPlan()
      setPendingPlan(null)
      setShowAgentMode(false)
    }
  }, [pendingPlan, approveAction, clearPlan])

  const handleReject = useCallback(async () => {
    if (!pendingPlan) return
    await rejectAction(pendingPlan.run_id, 'User rejected')
    clearPlan()
    setPendingPlan(null)
    setShowAgentMode(false)
  }, [pendingPlan, rejectAction, clearPlan])

  return (
    <div className="flex flex-col h-full">
      {/* Agent mode toggle */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">Chế độ AI</span>
        <button
          onClick={() => setShowAgentMode(!showAgentMode)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            showAgentMode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          {showAgentMode ? '🤖 Agent Mode' : '💬 Chat Mode'}
        </button>
      </div>

      {/* Agent plan preview */}
      {showAgentMode && pendingPlan && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
          <AgentPlanPreview
            plan={pendingPlan}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={loading}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-200">
          <p className="text-xs text-red-600">⚠️ {error}</p>
        </div>
      )}

      {/* Companion chat */}
      <div className="flex-1 min-h-0">
        <CompanionChat persona={persona} onAction={onAction} />
      </div>
    </div>
  )
}
