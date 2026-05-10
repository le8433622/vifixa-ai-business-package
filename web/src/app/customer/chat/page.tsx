// Vifixa AI v2.0 — Premium Chat Interface
// Gradient bubbles, rich action cards, typing animation, voice input

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ActionData {
  type: string
  label?: string
  value?: string
  data?: Record<string, unknown>
  items?: Array<{ item: string; cost: number }>
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ActionData[];
}

interface ChatSession {
  id: string;
  status: string;
  created_at: Date;
}

interface SpeechRecognitionLike {
  stop: () => void
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  onstart: (() => void) | null
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

export default function CustomerChatPage() {
  const router = useRouter()
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const idCounter = useRef(0)

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    loadOrCreateSession(session.user.id)
  }

  async function loadOrCreateSession(userId: string) {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions').select('*')
        .eq('user_id', userId).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1)
      if (error) throw error
      if (sessions && sessions.length > 0) {
        setSession(sessions[0] as unknown as ChatSession)
        await loadMessages((sessions[0] as unknown as ChatSession).id)
      } else {
        await startNewChat()
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { checkUser() }, [checkUser])
  useEffect(() => { scrollToBottom() }, [messages])

  async function loadMessages(sessionId: string) {
    try {
      const { data: msgs, error } = await supabase
        .from('chat_messages').select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      if (error) throw error
      if (msgs) {
        setMessages((msgs as Array<Record<string, unknown>>).map(msg => ({
          id: msg.id, role: msg.role, content: msg.content,
          timestamp: new Date(msg.created_at), actions: msg.metadata?.actions
        })))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  async function startNewChat() {
    setInputMessage('')
    setMessages([{
      id: 'welcome', role: 'assistant',
      content: 'Xin chào! 👋 Tôi là trợ lý AI của Vifixa. Bạn cần hỗ trợ sửa chữa gì? Mô tả sự cố, gửi ảnh, hoặc chọn dịch vụ bên dưới nhé!',
      timestamp: new Date()
    }])
    setSession(null)
  }

  async function sendMessage(messageOverride?: string, contextOverride?: Record<string, unknown>) {
    const textToSend = messageOverride || inputMessage
    if (!textToSend.trim() || isLoading) return

    const userMessage = textToSend.trim()
    setInputMessage('')
    setIsLoading(true)

    const tempUserMsg: Message = {
      id: `temp-${++idCounter.current}`, role: 'user', content: userMessage, timestamp: new Date()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) { router.push('/login'); return }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session?.id || null,
          message: userMessage,
          context: contextOverride,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      if (data.session_id && session?.id !== data.session_id) {
        setSession({ id: data.session_id, status: 'active', created_at: new Date() })
      }

      const aiMessage: Message = {
        id: `ai-${++idCounter.current}`, role: 'assistant',
        content: data.reply, timestamp: new Date(), actions: data.actions
      }
      setMessages(prev => [...prev, aiMessage])

      if (data.session_id) await loadMessages(data.session_id)

      if (data.session_complete) {
        setTimeout(() => {
          if (data.order_id) router.push(`/customer/orders/${data.order_id}`)
          else { alert('Đơn dịch vụ đã được chốt thành công!'); router.push('/customer') }
        }, 1000)
      }
    } catch (err) {
      console.error('Send message error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định'
      setMessages(prev => [...prev, {
        id: `err-${++idCounter.current}`, role: 'assistant',
        content: `⚠️ Xin lỗi, đã có lỗi xảy ra: ${errorMessage}. Vui lòng thử lại.`,
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleAction(action: ActionData) {
    if (action.type === 'share_location') {
      if (!navigator.geolocation) { alert('Trình duyệt không hỗ trợ vị trí'); return }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await sendMessage('Tôi đã gửi vị trí hiện tại', {
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
          })
        },
        () => alert('Không lấy được vị trí. Hãy nhập địa chỉ trong ô chat.'),
        { enableHighAccuracy: true, timeout: 10000 }
      )
      return
    }
    if (action.type === 'upload_media') { fileInputRef.current?.click(); return }
    if (action.type === 'confirmation_card') { await sendMessage(action.value || 'Tôi xác nhận tạo đơn dịch vụ'); return }
    if (action.type === 'view_order' && action.value) { router.push(`/customer/orders/${action.value}`); return }
    if (action.value) await sendMessage(action.value)
  }

  async function handleMediaUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return
    setIsLoading(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) { router.push('/login'); return }
      const mediaUrls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) throw new Error('Chỉ hỗ trợ ảnh hoặc video')
        if (file.size > 20 * 1024 * 1024) throw new Error('File quá lớn (max 20MB)')
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const fileName = `${authSession.user.id}/${session?.id || 'new'}/${++idCounter.current}-${safeName}`
        const { data, error } = await supabase.storage.from('service-media').upload(fileName, file, { upsert: false })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('service-media').getPublicUrl(data.path)
        mediaUrls.push(publicUrl)
      }
      await sendMessage(`Tôi đã gửi ${mediaUrls.length} ảnh/video sự cố`, { media_urls: mediaUrls })
    } catch (err) {
      alert(`Lỗi upload: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`)
    } finally {
      event.target.value = ''
      setIsLoading(false)
    }
  }

  function formatVnd(value?: number) {
    return typeof value === 'number' ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : 'Đang cập nhật'
  }

  function renderAction(action: ActionData, idx: number) {
    if (action.type === 'quote_card') {
      const quote = action.data || {}
      return (
        <div key={idx} className="mt-3 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-violet-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-sm">💰</span>
            <span className="font-bold text-sm text-[hsl(var(--vf-text))]">Báo giá dự kiến</span>
          </div>
          <div className="text-2xl font-bold text-[hsl(var(--vf-text))] mb-1">{formatVnd(quote.estimated_price)}</div>
          {typeof quote.confidence === 'number' && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-[hsl(var(--vf-text-muted))] mb-1">
                <span>Độ tin cậy</span>
                <span>{Math.round(quote.confidence * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[hsl(var(--vf-bg-muted))]">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style={{ width: `${quote.confidence * 100}%` }} />
              </div>
            </div>
          )}
          {Array.isArray(quote.price_breakdown) && quote.price_breakdown.length > 0 && (
            <div className="mt-3 space-y-1">
              {quote.price_breakdown.map((item: { item: string; cost: number }, i: number) => (
                <div key={i} className="flex justify-between text-xs text-[hsl(var(--vf-text-secondary))]">
                  <span>{item.item}</span>
                  <span className="font-medium">{formatVnd(item.cost)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-[hsl(var(--vf-text-muted))] italic">Giá cuối có thể thay đổi sau khảo sát thực tế.</p>
        </div>
      )
    }

    if (action.type === 'confirmation_card') {
      const data = action.data || {}
      return (
        <div key={idx} className="mt-3 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-sm">✅</span>
            <span className="font-bold text-sm text-[hsl(var(--vf-text))]">Xác nhận tạo đơn</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[hsl(var(--vf-text-muted))]">Dịch vụ:</span><span className="font-medium text-[hsl(var(--vf-text))]">{data.category || 'Đã ghi nhận'}</span></div>
            <div className="flex justify-between"><span className="text-[hsl(var(--vf-text-muted))]">Thời gian:</span><span className="font-medium text-[hsl(var(--vf-text))]">{data.preferred_time || 'Theo yêu cầu'}</span></div>
            {data.quote?.estimated_price && <div className="flex justify-between"><span className="text-[hsl(var(--vf-text-muted))]">Giá dự kiến:</span><span className="font-bold text-emerald-600">{formatVnd(data.quote.estimated_price)}</span></div>}
          </div>
          <button
            onClick={() => handleAction(action)}
            disabled={isLoading}
            className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            ✅ Xác nhận tạo đơn
          </button>
        </div>
      )
    }

    return (
      <button
        key={idx}
        onClick={() => handleAction(action)}
        disabled={isLoading}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text-secondary))] hover:bg-[hsl(var(--vf-bg-muted))] transition-all disabled:opacity-50"
      >
        ⚡ {action.label || action.type}
      </button>
    )
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Trình duyệt không hỗ trợ giọng nói'); return
    }
    isListening ? stopListening() : startListening()
  }

  function startListening() {
    const win = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike }
    const SpeechRecognition = win.webkitSpeechRecognition || win.SpeechRecognition
    if (!SpeechRecognition) { alert('Trình duyệt không hỗ trợ giọng nói'); return }
    const instance = new SpeechRecognition()
    instance.lang = 'vi-VN'
    instance.continuous = false
    instance.interimResults = false
    instance.onstart = () => setIsListening(true)
    instance.onresult = (e) => setInputMessage(prev => prev + e.results[0][0].transcript)
    instance.onerror = () => setIsListening(false)
    instance.onend = () => setIsListening(false)
    instance.start()
    recognitionRef.current = instance
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--vf-bg))] flex flex-col">
      {/* ====== HEADER ====== */}
      <div className="sticky top-0 z-40 glass-strong border-b border-[hsl(var(--vf-border))]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer')} className="text-[hsl(var(--vf-text-muted))] hover:text-[hsl(var(--vf-text))] transition-colors">
              ← 
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                🤖
              </div>
              <div>
                <h1 className="font-bold text-sm text-[hsl(var(--vf-text))]">Vifixa AI</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-[hsl(var(--vf-text-muted))]">Online</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={startNewChat} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text-secondary))] hover:bg-[hsl(var(--vf-bg-muted))] transition-all">
              + Mới
            </button>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaUpload} />

      {/* ====== MESSAGES ====== */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm mr-2 mt-1 shrink-0 shadow-md">
                  🤖
                </div>
              )}
              <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.actions && msg.actions.length > 0 && (
                  <div>{msg.actions.map((action, idx) => renderAction(action, idx))}</div>
                )}
                <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/50' : 'text-[hsl(var(--vf-text-muted))]'}`}>
                  {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">🤖</div>
              <div className="bubble-ai">
                <div className="flex items-center gap-2 py-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ====== QUICK CHIPS ====== */}
      {messages.length <= 1 && (
        <div className="border-t border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg))]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <p className="text-xs text-[hsl(var(--vf-text-muted))] mb-2">Chọn nhanh:</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { emoji: '❄️', label: 'Máy lạnh hư', query: 'Máy lạnh nhà tôi không lạnh' },
                { emoji: '⚡', label: 'Mất điện', query: 'Nhà tôi bị mất điện một phần' },
                { emoji: '🚿', label: 'Nước rò', query: 'Nước rò rỉ ở vòi bồn rửa' },
                { emoji: '📷', label: 'Lắp camera', query: 'Tôi muốn lắp camera an ninh' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => { setInputMessage(chip.query); inputRef.current?.focus() }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap bg-[hsl(var(--vf-bg-subtle))] border border-[hsl(var(--vf-border))] text-[hsl(var(--vf-text-secondary))] hover:bg-[hsl(var(--vf-bg-muted))] hover:border-blue-500/30 transition-all"
                >
                  <span>{chip.emoji}</span>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====== INPUT BAR ====== */}
      <div className="sticky bottom-0 glass-strong border-t border-[hsl(var(--vf-border))]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text-muted))] hover:bg-[hsl(var(--vf-bg-muted))] hover:text-[hsl(var(--vf-text))] transition-all shrink-0"
              title="Gửi ảnh/video"
            >
              📎
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Mô tả sự cố..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg-subtle))] text-sm text-[hsl(var(--vf-text))] placeholder:text-[hsl(var(--vf-text-muted))] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
              disabled={isLoading}
            />

            {/* Voice */}
            <button
              onClick={toggleVoiceInput}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all shrink-0 relative ${
                isListening
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text-muted))] hover:bg-[hsl(var(--vf-bg-muted))] hover:text-[hsl(var(--vf-text))]'
              }`}
              title="Giọng nói"
            >
              {isListening && <span className="absolute inset-0 rounded-xl bg-red-500 animate-ping opacity-30" />}
              {isListening ? '⏹️' : '🎤'}
            </button>

            {/* Send */}
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all disabled:opacity-30 disabled:shadow-none shrink-0"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-[hsl(var(--vf-text-muted))] mt-2 text-center">
            Enter để gửi • Hỗ trợ tiếng Việt • AI chẩn đoán & báo giá tự động
          </p>
        </div>
      </div>
    </div>
  )
}
