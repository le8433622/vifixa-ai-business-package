'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/components/common/LanguageToggle'
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator'
import AgentPlanPreview from '@/components/companion/AgentPlanPreview'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const SERVICE_ACTIONS = [
  { emoji: '❄️', label: 'Sửa chữa', query: 'Máy lạnh nhà tôi không mát, giúp tôi kiểm tra' },
  { emoji: '🧹', label: 'Dọn dẹp', query: 'Tôi cần dọn dẹp nhà cửa' },
  { emoji: '📦', label: 'Giao hàng', query: 'Tôi cần giao một món đồ' },
  { emoji: '🚚', label: 'Chuyển nhà', query: 'Tôi muốn chuyển nhà' },
  { emoji: '👴', label: 'Chăm sóc', query: 'Tôi cần người chăm sóc người già' },
  { emoji: '👶', label: 'Trông trẻ', query: 'Tôi cần người trông trẻ' },
  { emoji: '🐾', label: 'Thú cưng', query: 'Tôi cần tắm cho chó mèo' },
  { emoji: '📚', label: 'Gia sư', query: 'Tôi cần gia sư dạy kèm' },
  { emoji: '💆', label: 'Massage', query: 'Tôi muốn đặt massage tại nhà' },
  { emoji: '📋', label: 'Đơn hàng', query: 'Xem đơn hàng của tôi' },
]

const ACTIONABLE_KEYWORDS = [
  'sửa', 'hỏng', 'hư', 'đặt', 'order', 'tạo đơn', 'gọi thợ',
  'đổi địa chỉ', 'đổi số', 'đổi điện thoại', 'đổi mật khẩu',
  'dọn', 'vệ sinh', 'lau', 'sạch', 'giao', 'ship', 'chuyển đồ',
  'chuyển nhà', 'chuyển văn phòng', 'massage', 'bấm huyệt',
  'gia sư', 'học', 'dạy', 'kèm', 'chó', 'mèo', 'thú cưng',
  'chăm sóc', 'người già', 'trẻ', 'có đơn', 'việc nào',
  'thu nhập', 'tiền', 'tóm tắt', 'daily', 'báo cáo', 'kyc',
  'duyệt', 'fraud', 'bất thường', 'anomaly', 'máy lạnh',
  'điều hòa', 'tủ lạnh', 'máy giặt', 'lạnh', 'nóng', 'rò rỉ',
  'sự cố', 'không chạy', 'chữa', 'giá', 'báo giá', 'chi phí',
]

export default function CustomerCompanionChat({ onAction }: { onAction?: (action: any) => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [messages, setMessages] = useState<{ id: string; role: string; content: string; actions?: any[]; planPreview?: any }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [showQuick, setShowQuick] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [activeWidgets, setActiveWidgets] = useState({ orders: 0, devices: 0 })
  const [pendingPlan, setPendingPlan] = useState<any>(null)
  const [autoMode, setAutoMode] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    invoke,
    approveAction,
    rejectAction,
    currentPlan,
    loading: orchestratorLoading,
    error: orchestratorError,
    clearPlan,
  } = useAgentOrchestrator(userId, 'customer')

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, pendingPlan])
  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    const { data: sessions } = await supabase
      .from('companion_sessions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessions?.length) {
      setSessionId(sessions[0].id)
      const { data: msgs } = await supabase
        .from('companion_messages')
        .select('*')
        .eq('session_id', sessions[0].id)
        .order('created_at', { ascending: true })
      if (msgs?.length) {
        setMessages(msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content, actions: m.metadata?.actions })))
        setShowQuick(false)
        return
      }
    }
    setMessages([{
      id: 'welcome', role: 'assistant',
      content: `${t('home.greeting.morning')}! 🏠 Tôi là AI Companion của bạn.\n\nHãy nói với tôi như người bạn: "Máy lạnh nhà mình không mát..."`,
    }])
  }

  async function loadWidgets() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [oRes, dRes] = await Promise.all([
      supabase.from('orders').select('status').eq('customer_id', session.user.id),
      supabase.from('device_profiles').select('id').eq('user_id', session.user.id),
    ])
    const activeOrders = (oRes.data || []).filter((o: any) => ['pending', 'matched', 'in_progress'].includes(o.status)).length
    setActiveWidgets({ orders: activeOrders, devices: (dRes.data || []).length })
  }

  useEffect(() => { loadWidgets() }, [])

  const isActionableMessage = (msg: string) => {
    const lower = msg.toLowerCase()
    return ACTIONABLE_KEYWORDS.some(kw => lower.includes(kw))
  }

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input
    if (!msg.trim() || loading) return
    setInput('')
    setShowQuick(false)
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg }])
    setLoading(true)
    const aiId = `ai-${Date.now()}`
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Auto mode: try agent orchestrator first for actionable messages
      if (autoMode && isActionableMessage(msg) && userId) {
        const plan = await invoke(msg)
        if (plan) {
          setPendingPlan(plan)
          setMessages(prev => prev.map(m =>
            m.id === aiId ? {
              ...m,
              content: `🤖 Tôi đã tạo kế hoạch cho bạn:\n\n**${plan.goal_description}**\n\n${plan.plan.length} bước thực thi${plan.needs_approval ? ' (cần xác nhận)' : ''}`,
              planPreview: plan,
            } : m
          ))
          setLoading(false)
          return
        }
      }

      // Fallback: use companion chat
      const res = await fetch(`${SUPABASE_URL}/functions/v1/companion/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          session_id: sessionId,
          context: { user_id: session.user.id, persona: 'customer' },
        }),
      })
      const data = await res.json()
      setSessionId(data.session_id)
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m
      ))
      if (data.actions) {
        for (const a of data.actions) {
          if (['view_orders', 'process_payment'].includes(a.type)) onAction?.(a)
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối. Vui lòng thử lại.' } : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId, onAction, autoMode, userId, invoke])

  const handleApprovePlan = useCallback(async () => {
    if (!pendingPlan) return
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-orchestrator/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_id: pendingPlan.run_id,
          decision: 'approved',
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: '✅ Kế hoạch đã được duyệt. AI đang thực thi...',
        }])
        setPendingPlan(null)
        clearPlan()
        loadWidgets()
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'system',
          content: `❌ Lỗi duyệt: ${data.error}`,
        }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `❌ Lỗi kết nối: ${err.message}`,
      }])
    } finally {
      setLoading(false)
    }
  }, [pendingPlan, clearPlan])

  const toggleVoice = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) { alert('Trình duyệt không hỗ trợ giọng nói'); return }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SR()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      setInput(prev => prev + ' ' + event.results[0][0].transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening])

  const handleRejectPlan = useCallback(async () => {
    if (!pendingPlan) return
    setPendingPlan(null)
    clearPlan()
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: '⛔ Kế hoạch đã bị từ chối.',
    }])
  }, [pendingPlan, clearPlan])

  const handleQuickAction = useCallback((query: string) => {
    sendMessage(query)
  }, [sendMessage])

  const handleActionClick = useCallback((action: any) => {
    if (action.type === 'view_orders') {
      router.push('/customer/orders')
    } else if (action.type === 'process_payment' && action.data?.order_id) {
      router.push(`/customer/payment?order_id=${action.data.order_id}`)
    } else {
      sendMessage(action.label)
    }
  }, [router, sendMessage])

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-50 to-white">
      {/* Auto/Manual toggle */}
      <div className="px-4 py-1.5 bg-white border-b flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase font-bold">Chế độ AI</span>
        <button
          onClick={() => setAutoMode(!autoMode)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
            autoMode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {autoMode ? '🤖 Auto' : '💬 Manual'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
            {msg.role === 'system' ? (
              <div className="max-w-[90%] py-1.5 px-3 bg-gray-100 rounded-full text-xs text-gray-500">
                {msg.content}
              </div>
            ) : (
              <div className={`max-w-[88%] p-3.5 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm shadow-md'
                  : 'bg-white border border-gray-100 rounded-bl-sm shadow-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-lg">🏠</span>
                    <span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded-full">AI Companion</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* Action buttons */}
                {msg.actions?.map((action, i) => (
                  <button key={i} onClick={() => handleActionClick(action)}
                    className={`mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold active:scale-[0.98] ${
                      ['diagnose', 'estimate_price'].includes(action.type) ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : ['create_order', 'confirmation_order'].includes(action.type) ? 'bg-violet-500 text-white hover:bg-violet-600'
                      : action.type === 'process_payment' ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : action.type === 'match_worker' ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>{action.label}</button>
                ))}

                {/* Plan preview inline */}
                {msg.planPreview && (
                  <div className="mt-3">
                    <AgentPlanPreview
                      plan={msg.planPreview}
                      onApprove={handleApprovePlan}
                      onReject={handleRejectPlan}
                      loading={loading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Pending plan (not yet in messages) */}
        {pendingPlan && !messages.some(m => m.planPreview) && (
          <div className="flex justify-start">
            <div className="max-w-[95%] w-full">
              <AgentPlanPreview
                plan={pendingPlan}
                onApprove={handleApprovePlan}
                onReject={handleRejectPlan}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Orchestrator error */}
        {orchestratorError && (
          <div className="flex justify-center">
            <div className="py-1.5 px-3 bg-red-50 rounded-full text-xs text-red-500">
              ⚠️ {orchestratorError}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {showQuick && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-5 gap-1.5">
            {SERVICE_ACTIONS.map(q => (
              <button key={q.label} onClick={() => handleQuickAction(q.query)}
                className="flex items-center gap-1.5 px-2 py-2.5 bg-white hover:bg-blue-50 hover:border-blue-200 border border-gray-100 rounded-xl transition text-xs font-medium text-gray-600 hover:text-blue-700 shadow-sm">
                <span className="text-base">{q.emoji}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Widgets */}
      {(activeWidgets.orders > 0 || activeWidgets.devices > 0) && (
        <div className="px-4 pb-2 flex gap-2">
          {activeWidgets.orders > 0 && (
            <button onClick={() => router.push('/customer/orders')}
              className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 transition shadow-sm">
              <span>📋</span> {activeWidgets.orders} đơn đang xử lý
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-xl shrink-0" title={t('ai.image')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button onClick={toggleVoice}
            className={`p-2 rounded-xl transition shrink-0 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title={t('ai.voice')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={t('home.chat.placeholder')}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
