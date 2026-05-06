"use client"

import { useEffect, useState } from 'react'
// @ts-ignore
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function WorkerCoachPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assitant', content: 'Xin chao! Toi la AI Coach cua Vifixa. Toi co the giup ban.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    fetchStats(session.user.id)
  }

  async function fetchStats(userId: string) {
    // Simplified - just load data
  }

  async function sendMessage() {
    if (!input.trim()) return
    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are AI Coach.' },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ],
          session_id: `coach-${session.user.id}`,
        }),
      })

      if (!response.ok) throw new Error('AI error')
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assitant', content: data.message || 'Reply' }])
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assitant', content: 'Loi ket noi' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🤖 AI Coach</h1>
        <Link href="/worker" className="text-sm text-blue-600 hover:underline">← Quay lại</Link>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200" style={{ height: '500px' }}>
        <div className="p-6 overflow-y-auto" style={{ height: '400px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-gray-500">AI dang tra loi...</div>}
        </div>
        <div className="border-t p-4 flex gap-2">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Hoi AI Coach..." 
            className="flex-1 border rounded-lg px-4 py-2"
          />
          <button onClick={sendMessage} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            Gui
          </button>
        </div>
      </div>
    </div>
  )
}
