'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator'
import { useWorkerAutoMode, WorkerIncomeStats, RankedJob } from '@/hooks/useWorkerAutoMode'
import WorkerJobRanker from '@/components/worker/WorkerJobRanker'
import WorkerIncomeDashboard from '@/components/worker/WorkerIncomeDashboard'
import WorkerRouteOptimizer from '@/components/worker/WorkerRouteOptimizer'
import WorkerCoach from '@/components/worker/WorkerCoach'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const JOB_ACTIONS = [
  { emoji: '📋', label: 'Việc mới', query: 'Cho tôi xem việc mới' },
  { emoji: '💰', label: 'Thu nhập hôm nay', query: 'Thu nhập hôm nay của tôi' },
  { emoji: '📊', label: 'Lịch sử', query: 'Xem lịch sử việc làm' },
  { emoji: '🔧', label: 'Kỹ năng', query: 'Cập nhật kỹ năng' },
  { emoji: '🎓', label: 'Học', query: 'Gợi ý cải thiện tay nghề' },
  { emoji: '⭐', label: 'Đánh giá', query: 'Xem đánh giá của tôi' },
  { emoji: '🗺️', label: 'Tối ưu route', query: 'Tối ưu lộ trình' },
]

const ACTIONABLE_KEYWORDS = [
  'việc', 'job', 'đơn', 'thu nhập', 'tiền', 'kiếm', 'lương',
  'hoàn thành', 'nhận việc', 'từ chối', 'kỹ năng', 'học',
  'đánh giá', 'xếp hạng', 'lịch sử', 'earnings', 'income',
  'route', 'lộ trình', 'tối ưu', 'đường', 'dẫn đường', 'bản đồ',
]

export default function WorkerCompanionChat({ onAction }: { onAction?: (action: any) => void }) {
  const router = useRouter()
  const [messages, setMessages] = useState<{ id: string; role: string; content: string; actions?: any[] }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [stats, setStats] = useState({ pendingJobs: 0, todayEarnings: 0, totalJobs: 0, rating: 0, trustScore: 0 })
  const [showQuick, setShowQuick] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [autoMode, setAutoMode] = useState(true)
  const [showJobRanker, setShowJobRanker] = useState(false)
  const [showIncome, setShowIncome] = useState(false)
  const [showRouteOpt, setShowRouteOpt] = useState(false)
  const [showCoach, setShowCoach] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    invoke,
    currentPlan,
    loading: orchestratorLoading,
  } = useAgentOrchestrator(userId, 'worker')

  const {
    rankedJobs,
    incomeStats,
    loading: workerLoading,
    error: workerError,
    acceptJob,
    findAndRankJobs,
    loadIncomeStats,
  } = useWorkerAutoMode(userId)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
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
      content: 'Chào bạn! 🔧 Tôi là AI Co-pilot của bạn.\n\nTôi có thể:\n• 🔍 Tìm job phù hợp với kỹ năng\n• 🗺️ Tối ưu lộ trình nhiều điểm\n• 💡 Gợi ý cải thiện tay nghề\n• 📊 Phân tích thu nhập\n\nHãy nói: "Có job nào gần đây không?" hoặc "Tối ưu lộ trình"',
    }])
  }

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [oRes, wRes] = await Promise.all([
      supabase.from('orders').select('status,estimated_price').eq('worker_id', session.user.id),
      supabase.from('workers').select('trust_score,rating_avg').eq('user_id', session.user.id).single().catch(() => ({ data: null })),
    ])
    const orders = (oRes.data || []) as any[]
    setStats({
      pendingJobs: orders.filter((o: any) => o.status === 'pending').length,
      todayEarnings: orders.filter((o: any) => o.status === 'completed' && new Date(o.created_at).toDateString() === new Date().toDateString()).reduce((s: number, o: any) => s + (o.estimated_price || 0), 0),
      totalJobs: orders.filter((o: any) => o.status === 'completed').length,
      rating: (wRes.data as any)?.rating_avg || 0,
      trustScore: (wRes.data as any)?.trust_score || 0,
    })
  }

  useEffect(() => { loadStats() }, [])

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

      // Auto mode: try agent orchestrator for actionable messages
      if (autoMode && isActionableMessage(msg) && userId) {
        const lower = msg.toLowerCase()

        // Job search intent
        if (lower.includes('việc') || lower.includes('job') || lower.includes('đơn') || lower.includes('có đơn')) {
          const plan = await invoke(msg)
          if (plan) {
            setShowJobRanker(true)
            setShowIncome(false)
            setMessages(prev => prev.map(m =>
              m.id === aiId ? {
                ...m,
                content: `🤖 Tôi đã tìm thấy ${rankedJobs.length} việc phù hợp với bạn. Xem danh sách bên dưới 👇`,
              } : m
            ))
            setLoading(false)
            return
          }
        }

        // Income intent
        if (lower.includes('thu nhập') || lower.includes('tiền') || lower.includes('earnings') || lower.includes('income')) {
          await loadIncomeStats()
          setShowIncome(true)
          setShowJobRanker(false)
          setShowRouteOpt(false)
          setMessages(prev => prev.map(m =>
            m.id === aiId ? {
              ...m,
              content: '💰 Đây là thống kê thu nhập của bạn:',
            } : m
          ))
          setLoading(false)
          return
        }

        // Coaching intent
        if (lower.includes('học') || lower.includes('cải thiện') || lower.includes('tay nghề') || lower.includes('kỹ năng') || lower.includes('skill') || lower.includes('coach') || lower.includes('gợi ý')) {
          setShowCoach(true)
          setShowJobRanker(false)
          setShowIncome(false)
          setShowRouteOpt(false)
          setMessages(prev => prev.map(m =>
            m.id === aiId ? {
              ...m,
              content: '🎓 Dưới đây là các gợi ý cải thiện dành riêng cho bạn:',
            } : m
          ))
          setLoading(false)
          return
        }

        // Route optimization intent
        if (lower.includes('route') || lower.includes('lộ trình') || lower.includes('tối ưu') || lower.includes('dẫn đường') || lower.includes('bản đồ')) {
          setShowRouteOpt(true)
          setShowJobRanker(false)
          setShowIncome(false)
          setMessages(prev => prev.map(m =>
            m.id === aiId ? {
              ...m,
              content: '🗺️ Chọn các việc bạn muốn ghé để tối ưu lộ trình:',
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
          context: { user_id: session.user.id, persona: 'worker' },
        }),
      })
      const data = await res.json()
      setSessionId(data.session_id)
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m
      ))
      if (data.actions) {
        for (const a of data.actions) {
          if (['view_jobs', 'view_earnings', 'view_profile'].includes(a.type)) onAction?.(a)
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối. Vui lòng thử lại.' } : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId, onAction, autoMode, userId, invoke, rankedJobs.length, loadIncomeStats])

  const handleAcceptJob = useCallback(async (jobId: string) => {
    const success = await acceptJob(jobId)
    if (success) {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: '✅ Đã nhận việc thành công! AI đang cập nhật...',
      }])
      loadStats()
    }
  }, [acceptJob])

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

  const handleQuickAction = useCallback((query: string) => {
    sendMessage(query)
  }, [sendMessage])

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-emerald-50 to-white">
      {/* Auto/Manual toggle */}
      <div className="px-4 py-1.5 bg-white border-b flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase font-bold">Chế độ AI</span>
        <button
          onClick={() => setAutoMode(!autoMode)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
            autoMode ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
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
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-br-sm shadow-md'
                  : 'bg-white border border-gray-100 rounded-bl-sm shadow-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-lg">🔧</span>
                    <span className="text-[10px] text-emerald-500 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">AI Co-pilot</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.actions?.map((action, i) => (
                  <button key={i} onClick={() => { onAction?.(action); sendMessage(action.label) }}
                    className={`mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold active:scale-[0.98] ${
                      action.type === 'find_jobs' || action.type === 'match_worker' ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : action.type === 'view_earnings' ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : action.type === 'navigate' ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                      : action.type === 'complete_job' ? 'bg-violet-500 text-white hover:bg-violet-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>{action.label}</button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Job Ranker widget */}
        {showJobRanker && rankedJobs.length > 0 && (
          <div className="animate-fade-in">
            <WorkerJobRanker
              jobs={rankedJobs as RankedJob[]}
              onAccept={handleAcceptJob}
              loading={workerLoading}
            />
          </div>
        )}

        {/* Income Dashboard widget */}
        {showIncome && incomeStats && (
          <div className="animate-fade-in">
            <WorkerIncomeDashboard stats={incomeStats} loading={workerLoading} />
          </div>
        )}

        {/* Route Optimizer widget */}
        {showRouteOpt && userId && (
          <div className="animate-fade-in">
            <WorkerRouteOptimizer workerId={userId} />
          </div>
        )}

        {/* Coach widget */}
        {showCoach && userId && (
          <div className="animate-fade-in">
            <WorkerCoach workerId={userId} />
          </div>
        )}

        {workerError && (
          <div className="flex justify-center">
            <div className="py-1.5 px-3 bg-red-50 rounded-full text-xs text-red-500">
              ⚠️ {workerError}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Stats Panel */}
      <div className="px-4 pb-2">
        <div className="grid grid-cols-5 gap-1.5">
          <StatCard icon="📋" value={stats.pendingJobs} label="Việc mới" color="text-emerald-600" />
          <StatCard icon="💰" value={`${(stats.todayEarnings / 1000).toFixed(0)}k`} label="Hôm nay" color="text-amber-600" />
          <StatCard icon="✔️" value={stats.totalJobs} label="Hoàn thành" color="text-blue-600" />
          <StatCard icon="⭐" value={stats.rating ? `${stats.rating}/5` : '—'} label="Đánh giá" color="text-yellow-600" />
          <StatCard icon="🛡️" value={stats.trustScore} label="Tin cậy" color="text-purple-600" />
        </div>
      </div>

      {/* Quick Actions */}
      {showQuick && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-1.5">
            {JOB_ACTIONS.map(q => (
              <button key={q.label} onClick={() => handleQuickAction(q.query)}
                className="flex items-center gap-1.5 px-2 py-2.5 bg-white hover:bg-emerald-50 hover:border-emerald-200 border border-gray-100 rounded-xl transition text-xs font-medium text-gray-600 hover:text-emerald-700 shadow-sm">
                <span className="text-base">{q.emoji}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <button onClick={toggleVoice}
            className={`p-2 rounded-xl transition shrink-0 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Nhập bằng giọng nói">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Nhập tin nhắn... (VD: Có job nào không?)"
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color }: { icon: string; value: any; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-2 text-center shadow-sm">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}
