'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/components/common/LanguageToggle'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  actions?: Action[]
  type?: 'diagnosis' | 'quote' | 'confirmation' | 'tracking' | 'payment' | 'search'
}

interface Action {
  type: string
  label: string
  data?: any
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function useQuickActions() {
  const { t } = useLanguage()
  return [
    { emoji: '❄️', label: t('ai.quick.ac'), query: 'Máy lạnh nhà tôi không mát, giúp tôi kiểm tra' },
    { emoji: '💡', label: t('ai.quick.electric'), query: 'Nhà tôi bị mất điện, cần thợ gấp' },
    { emoji: '🚿', label: t('ai.quick.plumbing'), query: 'Vòi nước bị rò rỉ, giúp tôi sửa' },
    { emoji: '📷', label: t('ai.quick.camera'), query: 'Tôi muốn lắp camera an ninh' },
    { emoji: '💰', label: 'Báo giá', query: 'Báo giá cho tôi dịch vụ sửa máy lạnh' },
    { emoji: '📋', label: 'Đơn hàng', query: 'Xem đơn hàng của tôi' },
  ]
}

export default function CompanionChat({ persona = 'customer', onAction }: {
  persona?: 'customer' | 'worker' | 'admin'
  onAction?: (action: Action) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isListening, setIsListening] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const quickActions = useQuickActions()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    // Get user location for context-aware service
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      )
    }

    loadOrCreateSession(session.user.id)
  }

  async function loadOrCreateSession(uid: string) {
    const { data: sessions } = await supabase
      .from('companion_sessions')
      .select('id')
      .eq('user_id', uid)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessions?.length) {
      setSessionId(sessions[0].id)
      const hasMessages = await loadMessages(sessions[0].id)
      if (!hasMessages) showWelcome()
    } else {
      showWelcome()
    }
  }

  async function loadMessages(sid: string): Promise<boolean> {
    const { data: msgs } = await supabase
      .from('companion_messages')
      .select('*')
      .eq('session_id', sid)
      .order('created_at', { ascending: true })

    if (msgs?.length) {
      setMessages(msgs.map((m: any) => ({
        id: m.id, role: m.role,
        content: m.content,
        actions: m.metadata?.actions,
      })))
      return true
    }
    return false
  }

  function showWelcome() {
    const hour = new Date().getHours()
    const greet = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
    
    setMessages([{
      id: 'welcome', role: 'assistant',
      content: `${greet}! 🏠 Tôi là AI Companion của riêng bạn.\n\nTôi có thể giúp gì cho bạn hôm nay?\n\n• 🔍 Chẩn đoán sự cố — gửi ảnh hoặc mô tả\n• 💰 Báo giá — nhận báo giá ngay lập tức\n• 🔧 Tìm thợ — thợ gần bạn nhất\n• 🗺️ Theo dõi — xem thợ đang đến đâu\n\nHãy thử nói: "Máy lạnh không mát" hoặc chọn 1 ô bên dưới 👇`,
    }])
  }

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input
    if (!msg.trim() || loading) return
    setInput('')

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg }])
    setLoading(true)

    const aiId = `ai-${Date.now()}`
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/companion/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msg,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
          session_id: sessionId,
          context: { user_id: session.user.id, persona, location: userLocation },
        }),
      })

      setImageUrls([])
      const data = await response.json()
      setSessionId(data.session_id)

      setMessages(prev => prev.map(m =>
        m.id === aiId ? {
          ...m,
          content: data.reply || 'Xin lỗi, chưa hiểu.',
          actions: data.actions || [],
        } : m
      ))

      // Auto-trigger navigation actions
      if (data.actions) {
        for (const a of data.actions) {
          if (['view_orders', 'process_payment', 'track_order'].includes(a.type)) {
            onAction?.(a)
          }
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối. Vui lòng thử lại.' } : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, imageUrls, sessionId, userLocation, onAction])

  // Voice input
  function toggleVoice() {
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

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      setInput(prev => prev + ' ' + event.results[0][0].transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  // Share location
  function shareLocation() {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        sendMessage(`Vị trí của tôi: ${pos.coords.latitude}, ${pos.coords.longitude}`)
      },
      () => alert('Không lấy được vị trí'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[88%] p-3.5 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm shadow-md'
                : 'bg-white border border-gray-100 rounded-bl-sm shadow-sm'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-lg">🤖</span>
                  <span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded-full">AI Companion</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              
              {/* Action buttons */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {msg.actions.map((action, i) => (
                    <button key={i} onClick={() => { onAction?.(action); sendMessage(action.label) }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                        action.type === 'diagnose' ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                        : action.type === 'estimate_price' ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                        : action.type === 'create_order' || action.type === 'confirmation_order' ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-sm'
                        : action.type === 'process_payment' ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                        : action.type === 'match_worker' ? 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-sm'
                        : action.type === 'track_order' ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />

        {/* Loading dots */}
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
      </div>

      {/* Image previews */}
      {imageUrls.length > 0 && (
        <div className="px-3 pb-2 flex gap-2 overflow-x-auto">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative shrink-0">
              <img src={url} alt="" className="w-14 h-14 object-cover rounded-xl border-2 border-blue-200" />
              <button onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-gray-100 bg-white px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {/* Camera */}
          <button onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition shrink-0" title="Gửi ảnh">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => {
              const files = e.target.files
              if (!files?.length) return
              for (const f of Array.from(files)) {
                const reader = new FileReader()
                reader.onload = ev => ev.target?.result && setImageUrls(prev => [...prev, ev.target.result as string])
                reader.readAsDataURL(f)
              }
            }} />

          {/* Voice */}
          <button onClick={toggleVoice}
            className={`p-2 rounded-xl transition shrink-0 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Nhập bằng giọng nói">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>

          {/* Location */}
          <button onClick={shareLocation}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition shrink-0" title="Gửi vị trí">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>

          {/* Text input */}
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />

          {/* Send */}
          <button onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>

      {/* Quick actions (only on first message) */}
      {messages.length <= 1 && (
        <div className="px-3 pt-0 pb-3 bg-white border-t border-gray-50">
          <div className="grid grid-cols-3 gap-1.5">
            {quickActions.map(q => (
              <button key={q.label} onClick={() => sendMessage(q.query)}
                className="flex items-center gap-1.5 px-2 py-2.5 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-xl transition text-xs font-medium text-gray-600 hover:text-blue-700">
                <span className="text-base">{q.emoji}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
