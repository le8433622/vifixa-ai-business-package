// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: any[];
}

interface ChatSession {
  id: string;
  status: string;
  created_at: Date;
}

export default function CustomerChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setUser(session.user)
    loadOrCreateSession(session.user.id)
  }

  async function loadOrCreateSession(userId: string) {
    try {
      // Try to get active session
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      if (sessions && sessions.length > 0) {
        setSession(sessions[0] as any)
        await loadMessages((sessions[0] as any).id)
      } else {
        // Create new session on server
        await startNewChat()
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  async function loadMessages(sessionId: string) {
    try {
      const { data: msgs, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (msgs) {
        const msgsAny = msgs as any[]
        setMessages(msgsAny.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          actions: msg.metadata?.actions
        })))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  async function startNewChat() {
    setInputMessage('')
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý AI của Vifixa. Bạn cần hỗ trợ sửa chữa gì? Hãy mô tả sự cố bạn đang gặp phải nhé! 😊',
      timestamp: new Date()
    }])
    setSession(null)
  }

  async function sendMessage(messageOverride?: string, contextOverride?: Record<string, any>) {
    const textToSend = messageOverride || inputMessage
    if (!textToSend.trim() || isLoading) return

    const userMessage = textToSend.trim()
    setInputMessage('')
    setIsLoading(true)

    // Add user message to UI immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      // Call AI Chat API
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) {
        router.push('/login')
        return
      }

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

      // Update session if new
      if (data.session_id && session?.id !== data.session_id) {
        setSession({ id: data.session_id, status: 'active', created_at: new Date() })
      }

      // Add AI response to UI
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        actions: data.actions
      }
      setMessages(prev => [...prev, aiMessage])

      // Reload messages from server
      if (data.session_id) {
        await loadMessages(data.session_id)
      }

      // If session complete, navigate to order or dashboard
      if (data.session_complete) {
        setTimeout(() => {
          if (data.order_id) {
            router.push(`/customer/orders/${data.order_id}`)
          } else {
            alert('Đơn dịch vụ đã được chốt thành công! Chúng tôi sẽ liên hệ sớm nhất.')
            router.push('/customer')
          }
        }, 1000)
      }

    } catch (error: any) {
      console.error('Send message error:', error)
      alert(`Lỗi: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }


  async function handleAction(action: any) {
    if (action.type === 'share_location') {
      if (!navigator.geolocation) {
        alert('Trình duyệt không hỗ trợ gửi vị trí. Vui lòng nhập địa chỉ/khu vực trong ô chat.')
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await sendMessage('Tôi đã gửi vị trí hiện tại', {
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          })
        },
        () => alert('Không lấy được vị trí. Bạn có thể nhập địa chỉ/khu vực trong ô chat.'),
        { enableHighAccuracy: true, timeout: 10000 },
      )
      return
    }

    if (action.type === 'upload_media') {
      fileInputRef.current?.click()
      return
    }

    if (action.type === 'confirmation_card') {
      await sendMessage(action.value || 'Tôi xác nhận tạo đơn dịch vụ')
      return
    }

    if (action.type === 'view_order' && action.value) {
      router.push(`/customer/orders/${action.value}`)
      return
    }

    if (action.value) {
      await sendMessage(action.value)
    }
  }

  async function handleMediaUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsLoading(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) {
        router.push('/login')
        return
      }

      const mediaUrls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          throw new Error('Chỉ hỗ trợ ảnh hoặc video')
        }
        if (file.size > 20 * 1024 * 1024) {
          throw new Error('File quá lớn. Vui lòng chọn file dưới 20MB')
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const fileName = `${authSession.user.id}/${session?.id || 'new-chat'}/${Date.now()}-${safeName}`
        const { data, error } = await supabase.storage
          .from('service-media')
          .upload(fileName, file, { upsert: false })

        if (error) throw error
        const { data: { publicUrl } } = supabase.storage
          .from('service-media')
          .getPublicUrl(data.path)
        mediaUrls.push(publicUrl)
      }

      await sendMessage(`Tôi đã gửi ${mediaUrls.length} ảnh/video sự cố`, { media_urls: mediaUrls })
    } catch (error: any) {
      alert(`Lỗi upload: ${error.message}`)
    } finally {
      event.target.value = ''
      setIsLoading(false)
    }
  }

  function formatVnd(value?: number) {
    return typeof value === 'number' ? `${value.toLocaleString('vi-VN')}đ` : 'Đang cập nhật'
  }

  function renderAction(action: any, idx: number) {
    if (action.type === 'quote_card') {
      const quote = action.data || {}
      return (
        <div key={idx} className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
          <div className="font-semibold text-sm mb-1">💰 Báo giá dự kiến</div>
          <div className="text-lg font-bold">{formatVnd(quote.estimated_price)}</div>
          {typeof quote.confidence === 'number' && (
            <div className="mt-1">Độ tin cậy: {Math.round(quote.confidence * 100)}%</div>
          )}
          {Array.isArray(quote.price_breakdown) && quote.price_breakdown.length > 0 && (
            <ul className="mt-2 list-disc pl-4 space-y-1">
              {quote.price_breakdown.map((item: any, itemIdx: number) => (
                <li key={itemIdx}>{item.item}: {formatVnd(item.cost)}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-blue-700">Giá cuối có thể thay đổi sau khảo sát thực tế và vật tư phát sinh.</p>
        </div>
      )
    }

    if (action.type === 'confirmation_card') {
      const data = action.data || {}
      return (
        <div key={idx} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
          <div className="font-semibold text-sm mb-2">✅ Xác nhận tạo đơn</div>
          <div className="space-y-1">
            <div><span className="font-medium">Dịch vụ:</span> {data.category || 'Đã ghi nhận trong chat'}</div>
            <div><span className="font-medium">Thời gian:</span> {data.preferred_time || 'Theo thông tin đã cung cấp'}</div>
            <div><span className="font-medium">Vị trí:</span> {typeof data.location === 'string' ? data.location : data.location ? 'Đã gửi tọa độ' : 'Đã ghi nhận'}</div>
            {data.quote?.estimated_price && <div><span className="font-medium">Giá dự kiến:</span> {formatVnd(data.quote.estimated_price)}</div>}
          </div>
          <p className="mt-2 text-emerald-700">Bạn cần xác nhận rõ trước khi Vifixa tạo đơn và ghép thợ.</p>
          <button
            type="button"
            onClick={() => handleAction(action)}
            disabled={isLoading}
            className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Tôi xác nhận tạo đơn
          </button>
        </div>
      )
    }

    return (
      <button
        key={idx}
        type="button"
        onClick={() => handleAction(action)}
        disabled={isLoading}
        className="block text-left text-xs bg-white/20 rounded px-2 py-1 hover:bg-white/30 disabled:opacity-50"
      >
        ⚡ {action.label || action.type}
      </button>
    )
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Voice input with Web Speech API
  function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Trình duyệt không hỗ trợ nhận diện giọng nói')
      return
    }

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  function startListening() {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.lang = 'vi-VN'
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false

    recognitionRef.current.onstart = () => {
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInputMessage(prev => prev + transcript)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current.start()
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">💬 Chat với AI - Vifixa</h1>
            <p className="text-sm text-gray-600 mt-1">Mô tả sự cố, AI sẽ chẩn đoán và hỗ trợ chốt đơn</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={startNewChat}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              🆕 Chat mới
            </button>
            <Link
              href="/customer/service-request"
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              📝 Dùng form cũ
            </Link>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleMediaUpload}
      />

      {/* Chat Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" style={{ height: '600px' }}>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {msg.role === 'assistant' && <span className="text-xl">🤖</span>}
                  {msg.role === 'user' && <span className="text-xl">👤</span>}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.actions.map((action, idx) => renderAction(action, idx))}
                      </div>
                    )}
                  </div>
                </div>
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🤖</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập tin nhắn... (VD: Máy lạnh không mát)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={toggleVoiceInput}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Nhập bằng giọng nói"
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Gửi
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Nhấn Enter để gửi • Hỗ trợ tiếng Việt • AI sẽ chẩn đoán và báo giá
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { emoji: '❄️', label: 'Máy lạnh', query: 'Máy lạnh không mát' },
          { emoji: '💡', label: 'Điện nước', query: 'Bị mất điện một phần' },
          { emoji: '🚿', label: 'Nước rò rỉ', query: 'Nước rò rỉ ở vòi' },
          { emoji: '📷', label: 'Camera', query: 'Lắp đặt camera an ninh' },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => setInputMessage(action.query)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <div className="text-2xl mb-1">{action.emoji}</div>
            <div className="text-sm font-medium text-gray-700">{action.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
