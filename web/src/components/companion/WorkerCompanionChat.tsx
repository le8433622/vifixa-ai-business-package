'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const JOB_ACTIONS = [
  { emoji: '📋', label: 'Việc mới', query: 'Cho tôi xem việc mới' },
  { emoji: '💰', label: 'Thu nhập hôm nay', query: 'Thu nhập hôm nay của tôi' },
  { emoji: '📊', label: 'Lịch sử', query: 'Xem lịch sử việc làm' },
  { emoji: '🔧', label: 'Kỹ năng', query: 'Cập nhật kỹ năng' },
  { emoji: '🎓', label: 'Học', query: 'Gợi ý cải thiện tay nghề' },
  { emoji: '⭐', label: 'Đánh giá', query: 'Xem đánh giá của tôi' },
]

export default function WorkerCompanionChat({ onAction }: { onAction?: (action: any) => void }) {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string; actions?: any[] }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [stats, setStats] = useState({ pendingJobs: 0, todayEarnings: 0, totalJobs: 0, rating: 0, trustScore: 0 })
  const [showQuick, setShowQuick] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { init(); loadStats() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: sessions } = await supabase.from('companion_sessions').select('id').eq('user_id', session.user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1)
    if (sessions?.length) {
      setSessionId(sessions[0].id)
      const { data: msgs } = await supabase.from('companion_messages').select('*').eq('session_id', sessions[0].id).order('created_at', { ascending: true })
      if (msgs?.length) { setMessages(msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content, actions: m.metadata?.actions }))); setShowQuick(false); return }
    }
    setMessages([{ id: 'welcome', role: 'assistant', content: 'Chào bạn! 🔧 Tôi là AI Co-pilot của bạn.\n\nTôi có thể:\n• 🔍 Tìm job phù hợp với kỹ năng\n• 🗺️ Dẫn đường tối ưu\n• 💡 Hướng dẫn sửa chữa\n• 📊 Phân tích thu nhập\n\nHãy nói: "Có job nào gần đây không?"' }])
  }

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [oRes, wRes] = await Promise.all([
      supabase.from('orders').select('status,estimated_price').eq('worker_id', session.user.id),
      supabase.from('workers').select('trust_score,rating_avg').eq('id', session.user.id).single().catch(() => ({ data: null })),
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

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input
    if (!msg.trim() || loading) return
    setInput(''); setShowQuick(false)
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg }])
    setLoading(true)
    const aiId = `ai-${Date.now()}`
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${SUPABASE_URL}/functions/v1/companion/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: sessionId, context: { user_id: session.user.id, persona: 'worker' } }),
      })
      const data = await res.json()
      setSessionId(data.session_id)
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m))
      if (data.actions) { for (const a of data.actions) { if (['view_jobs', 'view_earnings', 'view_profile'].includes(a.type)) onAction?.(a) } }
    } catch { setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối. Vui lòng thử lại.' } : m))
    } finally { setLoading(false) }
  }, [input, loading, sessionId, onAction])

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-emerald-50 to-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-br-sm shadow-md' : 'bg-white border border-gray-100 rounded-bl-sm shadow-sm'}`}>
              {msg.role === 'assistant' && <div className="flex items-center gap-1.5 mb-1"><span className="text-lg">🔧</span><span className="text-[10px] text-emerald-500 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">AI Co-pilot</span></div>}
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
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm"><div className="flex gap-1.5"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div>
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
          <StatCard icon="🛡️" value={stats.trustScore} label="Tin cậy" color="text-purple-600" suffix="" />
        </div>
      </div>

      {/* Quick Actions */}
      {showQuick && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-1.5">
            {JOB_ACTIONS.map(q => (
              <button key={q.label} onClick={() => sendMessage(q.query)}
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
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Nhập tin nhắn... (VD: Có job nào không?)"
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color, suffix = '' }: { icon: string; value: any; label: string; color: string; suffix?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-2 text-center shadow-sm">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`text-sm font-bold ${color}`}>{value}{suffix}</div>
      <div className="text-[8px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}
