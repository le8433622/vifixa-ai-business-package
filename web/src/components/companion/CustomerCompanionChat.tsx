'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/components/common/LanguageToggle'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const SERVICE_ACTIONS = [
  { emoji: '❄️', label: 'Máy lạnh', query: 'Máy lạnh nhà tôi không mát, giúp tôi kiểm tra' },
  { emoji: '💡', label: 'Điện', query: 'Nhà tôi bị mất điện, cần thợ gấp' },
  { emoji: '🚿', label: 'Nước', query: 'Vòi nước bị rò rỉ, giúp tôi sửa' },
  { emoji: '📷', label: 'Camera', query: 'Tôi muốn lắp camera an ninh' },
  { emoji: '💰', label: 'Báo giá', query: 'Báo giá sửa máy lạnh' },
  { emoji: '📋', label: 'Đơn hàng', query: 'Xem đơn hàng của tôi' },
]

export default function CustomerCompanionChat({ onAction }: { onAction?: (action: any) => void }) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<{ id: string; role: string; content: string; actions?: any[] }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showQuick, setShowQuick] = useState(true)
  const [activeWidgets, setActiveWidgets] = useState({ orders: 0, devices: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { init(); loadWidgets() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    // Load session
    const { data: sessions } = await supabase.from('companion_sessions').select('id').eq('user_id', session.user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1)
    if (sessions?.length) {
      setSessionId(sessions[0].id)
      const { data: msgs } = await supabase.from('companion_messages').select('*').eq('session_id', sessions[0].id).order('created_at', { ascending: true })
      if (msgs?.length) {
        setMessages(msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content, actions: m.metadata?.actions })))
        setShowQuick(false)
        return
      }
    }
    setMessages([{ id: 'welcome', role: 'assistant', content: `${t('home.greeting.morning')}! 🏠 Tôi là AI Companion của bạn.\n\nHãy nói với tôi như người bạn: "Máy lạnh nhà mình không mát..."` }])
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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/companion/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: sessionId, context: { user_id: session.user.id, persona: 'customer' } }),
      })
      const data = await res.json()
      setSessionId(data.session_id)
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m))
      if (data.actions) {
        for (const a of data.actions) { if (['view_orders', 'process_payment'].includes(a.type)) onAction?.(a) }
      }
    } catch { setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối. Vui lòng thử lại.' } : m))
    } finally { setLoading(false) }
  }, [input, loading, sessionId, onAction])

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-50 to-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm shadow-md' : 'bg-white border border-gray-100 rounded-bl-sm shadow-sm'}`}>
              {msg.role === 'assistant' && <div className="flex items-center gap-1.5 mb-1"><span className="text-lg">🏠</span><span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded-full">AI Companion</span></div>}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.actions?.map((action, i) => (
                <button key={i} onClick={() => { onAction?.(action); sendMessage(action.label) }}
                  className={`mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold active:scale-[0.98] ${
                    ['diagnose', 'estimate_price'].includes(action.type) ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : ['create_order', 'confirmation_order'].includes(action.type) ? 'bg-violet-500 text-white hover:bg-violet-600'
                    : action.type === 'process_payment' ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : action.type === 'match_worker' ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>{action.label}</button>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm"><div className="flex gap-1.5"><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (only on first visit) */}
      {showQuick && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-1.5">
            {SERVICE_ACTIONS.map(q => (
              <button key={q.label} onClick={() => sendMessage(q.query)}
                className="flex items-center gap-1.5 px-2 py-2.5 bg-white hover:bg-blue-50 hover:border-blue-200 border border-gray-100 rounded-xl transition text-xs font-medium text-gray-600 hover:text-blue-700 shadow-sm">
                <span className="text-base">{q.emoji}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Widgets (Auto mode) */}
      {(activeWidgets.orders > 0 || activeWidgets.devices > 0) && (
        <div className="px-4 pb-2 flex gap-2">
          {activeWidgets.orders > 0 && (
            <button onClick={() => onAction?.({ type: 'view_orders' })}
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-xl shrink-0" title={t('ai.voice')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={t('home.chat.placeholder')}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
