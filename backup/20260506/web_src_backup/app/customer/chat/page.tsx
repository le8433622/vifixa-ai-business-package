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
    loadOrCreateSession()
  }

  async function loadOrCreateSession() {
    try {
      // Try to get active session
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      if (sessions && sessions.length > 0) {
        setSession(sessions[0])
        await loadMessages(sessions[0].id)
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
        setMessages(msgs.map(msg => ({
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

  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session?.id || null,
          message: userMessage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      // Update session if new
      if (data.session_id && !session) {
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

      // Reload messages from server to get saved ones
      if (data.session_id) {
        await loadMessages(data.session_id)
      }

      // If session complete, show success
      if (data.session_complete) {
        setTimeout(() => {
          alert('Đơn dịch vụ đã được chốt thành công! Chúng tôi sẽ liên hệ sớm nhất.')
          router.push('/customer')
        }, 1000)
      }

    } catch (error: any) {
      console.error('Send message error:', error)
      alert(`Lỗi: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
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
                        {msg.actions.map((action, idx) => (
                          <div key={idx} className="text-xs bg-white bg-opacity-20 rounded px-2 py-1">
                            ⚡ {action.type}
                          </div>
                        ))}
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
              onKeyPress={handleKeyPress}
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
              onClick={sendMessage}
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
