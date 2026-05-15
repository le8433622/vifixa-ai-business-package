'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import CompanionChat from '@/components/companion/CompanionChat'

export default function WorkerCoachPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Check auth and set user ID
  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // In Next.js app router, we need to use navigation differently
      // For now, we'll just return and let the companion chat handle unauthenticated state
      return
    }
    setUserId(session.user.id)
    
    // Try to get or create a session
    try {
      const { data: sessions } = await supabase
        .from('companion_sessions')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (sessions && sessions.length > 0) {
        setSessionId(sessions[0].id)
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  // Handle actions from the companion chat
  const handleAction = async (action: { type: string; label: string; data?: any }) => {
    // For now, we'll handle basic actions
    // In a more complete implementation, we would navigate or perform other actions
    console.log('Action received:', action)
    
    // Handle specific actions that need navigation
    switch (action.type) {
      case 'view_jobs':
        // Navigate to worker jobs page
        break
      case 'view_profile':
        // Navigate to worker profile
        break
      case 'view_earnings':
        // Navigate to worker earnings
        break
      // Add more action handlers as needed
      default:
        // For other actions, we could send a message back to the chat
        // but for simplicity we'll just log them
        break
    }
  }

  // Initialize on load
  // For simplicity, we'll check on first render and rely on the companion chat to handle auth
  
  return (
    <div className="min-h-[600px]">
      <CompanionChat
        persona="worker"
        onAction={handleAction}
        placeholder="Hỏi AI Coach... (VD: Tôi cần tìm việc làm gần đây)"
      />
    </div>
  )
}