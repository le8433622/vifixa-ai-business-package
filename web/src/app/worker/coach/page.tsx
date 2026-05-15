"use client"

import { useEffect, useState } from "react"
// @ts-ignore
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function WorkerCoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Xin chào! Tôi là AI Companion của Vifixa cho thợ. Tôi có thể giúp bạn tìm việc, tối ưu thu nhập và phát triển kỹ năng.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }
    // We don't need to fetch stats here for now, but we could load companion data if needed
  }

  async function sendMessage() {
    if (!input.trim()) return
    const userMessage = input.trim()
    setInput("")
    setLoading(true)
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) {
        router.push("/login")
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/companion/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            user_id: authSession.user.id,
            persona: "worker",
            session_id: sessionId,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to send message")
      }

      const data = await response.json()

      // Update session if new
      if (data.session_id && sessionId !== data.session_id) {
        setSessionId(data.session_id)
      }

      // Add AI response to UI
      const aiMessage: Message = {
        role: "assistant",
        content: data.reply,
      }
      setMessages((prev) => [...prev, aiMessage])

      // Note: We could also handle actions here if we wanted to show buttons or trigger navigation
      // For now, we just show the reply as text.
    } catch (error: any) {
      console.error("Send message error:", error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lỗi kết nối. Vui lòng thử lại." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          🤖 AI Coach (Worker)
        </h1>
        <Link href="/worker" className="text-sm text-blue-600 hover:underline">
          ← Quay lại
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200" style={{ height: "500px" }}>
        <div className="p-6 overflow-y-auto" style={{ height: "400px" }}>
          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <div className={`inline-block p-3 rounded-lg ${
                msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-gray-500">AI đang trả lời...</div>}
        </div>
        <div className="border-t p-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Hỏi AI Coach..."
            className="flex-1 border rounded-lg px-4 py-2"
          />
          <button onClick={sendMessage} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            Gửi
          </button>
        </div>
      </div>
    </div>
  )
}