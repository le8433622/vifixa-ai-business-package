'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const ADMIN_ACTIONS = [
  { emoji: '📊', label: 'Dashboard', query: 'Xem dashboard tổng quan' },
  { emoji: '👥', label: 'Users', query: 'Xem danh sách users' },
  { emoji: '📋', label: 'Orders', query: 'Xem tất cả đơn hàng' },
  { emoji: '💳', label: 'Payments', query: 'Xem giao dịch thanh toán' },
  { emoji: '🔌', label: 'Integrations', query: 'Xem danh sách integrations' },
  { emoji: '🚨', label: 'Disputes', query: 'Xem khiếu nại cần xử lý' },
]

export default function AdminCompanionChat({ onAction }: { onAction?: (action: any) => void }) {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string; actions?: any[] }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [kpi, setKpi] = useState({ users: 0, workers: 0, orders: 0, revenue: 0, disputes: 0 })
  const [showQuick, setShowQuick] = useState(true)
  const [alertMsg, setAlertMsg] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { init(); loadKpi() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: sessions } = await supabase.from('companion_sessions').select('id').eq('user_id', session.user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1)
    if (sessions?.length) {
      setSessionId(sessions[0].id)
      const { data: msgs } = await supabase.from('companion_messages').select('*').eq('session_id', sessions[0].id).order('created_at', { ascending: true })
      if (msgs?.length) { setMessages(msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content, actions: m.metadata?.actions }))); setShowQuick(false); return }
    }
    setMessages([{ id: 'welcome', role: 'assistant', content: 'Chào admin! 🛡️ Tôi là AI Analyst của bạn.\n\nTôi đang theo dõi:\n• 📈 Doanh thu và KPI hôm nay\n• 🔔 Anomalies trong hệ thống\n• 👥 Hoạt động users và workers\n• ⚠️ Vấn đề cần xử lý\n\nBạn muốn xem gì trước?' }])
  }

  async function loadKpi() {
    const [u, w, o, d] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('workers').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('estimated_price,status'),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    const orders = (o.data || []) as any[]
    const revenue = orders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + (o.estimated_price || 0), 0)
    const disputes = d.count || 0
    setKpi({ users: u.count || 0, workers: w.count || 0, orders: orders.length, revenue, disputes })
    if (disputes > 0) setAlertMsg(`🚨 ${disputes} dispute cần xử lý`)
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
        body: JSON.stringify({ message: msg, session_id: sessionId, context: { user_id: session.user.id, persona: 'admin' } }),
      })
      const data = await res.json()
      setSessionId(data.session_id)
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m))
      if (data.actions) { for (const a of data.actions) { if (['view_users', 'view_orders', 'view_disputes'].includes(a.type)) onAction?.(a) } }
    } catch { setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối. Vui lòng thử lại.' } : m))
    } finally { setLoading(false) }
  }, [input, loading, sessionId, onAction])

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* KPI Cards */}
      <div className="px-3 pt-3">
        <div className="grid grid-cols-5 gap-1.5">
          <KpiCard label="Users" value={kpi.users} color="text-blue-400" bg="bg-blue-900/30" />
          <KpiCard label="Workers" value={kpi.workers} color="text-emerald-400" bg="bg-emerald-900/30" />
          <KpiCard label="Orders" value={kpi.orders} color="text-amber-400" bg="bg-amber-900/30" />
          <KpiCard label="Revenue" value={`${(kpi.revenue / 1000000).toFixed(1)}M`} color="text-violet-400" bg="bg-violet-900/30" />
          <KpiCard label="Disputes" value={kpi.disputes} color="text-rose-400" bg="bg-rose-900/30" />
        </div>
      </div>

      {/* Alert */}
      {alertMsg && (
        <div className="px-3 pt-2">
          <div className="bg-rose-900/50 border border-rose-700 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <span className="text-xs text-rose-200 font-medium">{alertMsg}</span>
            <button onClick={() => onAction?.({ type: 'view_disputes' })} className="ml-auto text-xs text-rose-300 hover:underline">Xử lý →</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm shadow-md' : 'bg-gray-800 border border-gray-700 rounded-bl-sm shadow-sm'}`}>
              {msg.role === 'assistant' && <div className="flex items-center gap-1.5 mb-1"><span className="text-lg">🛡️</span><span className="text-[10px] text-indigo-400 font-medium bg-indigo-900/50 px-2 py-0.5 rounded-full">AI Analyst</span></div>}
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-gray-200'}`}>{msg.content}</p>
              {msg.actions?.map((action, i) => (
                <button key={i} onClick={() => { onAction?.(action); sendMessage(action.label) }}
                  className={`mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold active:scale-[0.98] ${
                    action.type === 'view_users' || action.type === 'view_orders' ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : action.type === 'view_payments' ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : action.type === 'view_disputes' ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}>{action.label}</button>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {showQuick && (
        <div className="px-3 pb-2">
          <div className="grid grid-cols-3 gap-1.5">
            {ADMIN_ACTIONS.map(q => (
              <button key={q.label} onClick={() => sendMessage(q.query)}
                className="flex items-center gap-1.5 px-2 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition text-xs font-medium text-gray-300 hover:text-white shadow-sm">
                <span className="text-base">{q.emoji}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-700 bg-gray-800 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Nhập lệnh... (VD: Xem doanh thu hôm nay)"
            className="flex-1 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, bg }: { label: string; value: any; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-2 text-center`}>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
