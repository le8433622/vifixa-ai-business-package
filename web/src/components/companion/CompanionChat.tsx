'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: Action[]
}

interface Action {
  type: string
  label: string
  data?: any
}

interface CompanionChatProps {
  persona: 'customer' | 'worker' | 'admin'
  onAction?: (action: Action) => void
  placeholder?: string
}

export default function CompanionChat({ persona, onAction, placeholder }: CompanionChatProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: getWelcomeMessage(persona),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
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

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/companion/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msg,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
          session_id: sessionId,
        }),
      })

      setImageUrls([])

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      setSessionId(data.session_id)

      setMessages(prev => prev.map(m =>
        m.id === aiId ? {
          ...m,
          content: data.reply || 'Xin lỗi, chưa hiểu.',
          actions: data.actions || [],
        } : m
      ))

      if (data.redirect) {
        setTimeout(() => { window.location.href = data.redirect }, 1500)
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối. Vui lòng thử lại.' } : m
      ))
    }
    setLoading(false)
  }

  function handleAction(action: Action) {
    if (onAction) {
      onAction(action)
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    for (const file of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageUrls(prev => [...prev, ev.target.result as string])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-white border rounded-bl-md shadow-sm'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{persona === 'customer' ? '🤖' : persona === 'worker' ? '🔧' : '🛡️'}</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.actions?.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(a)}
                  className={`mt-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    a.type === 'diagnose' || a.type === 'estimate_price'
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : a.type === 'match_worker' || a.type === 'process_payment'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : a.type === 'view_orders'
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Image previews */}
      {imageUrls.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="Upload" className="w-16 h-16 object-cover rounded-lg border" />
              <button
                onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
            title="Gửi ảnh"
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={placeholder || 'Nhập tin nhắn...'}
            className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? '...' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  )
}

function getWelcomeMessage(persona: string): string {
  switch (persona) {
    case 'worker':
      return 'Xin chào! 👋 Tôi là AI Co-pilot của bạn.\n\nTôi có thể:\n• 🔍 Tìm job phù hợp\n• 🗺️ Dẫn đường tối ưu\n• 💡 Hướng dẫn sửa chữa\n• 📊 Phân tích thu nhập\n\nBạn cần tôi hỗ trợ gì hôm nay?'
    case 'admin':
      return 'Chào admin! 🛡️ Tôi là AI Analyst.\n\nTôi đang theo dõi:\n• 📈 Doanh thu hôm nay\n• 🔔 Anomalies hệ thống\n• 👥 Hoạt động users\n• ⚠️ Vấn đề cần xử lý\n\nBạn muốn xem gì trước?'
    default:
      return 'Xin chào! 🏠 Tôi là AI Companion của bạn.\n\nTôi có thể:\n• 🔍 Chẩn đoán sự cố (gửi ảnh hoặc mô tả)\n• 💰 Báo giá dịch vụ\n• 🔧 Tìm thợ gần bạn\n• 📋 Theo dõi đơn hàng\n\nHãy thử nói: "Máy lạnh không lạnh"'
  }
}