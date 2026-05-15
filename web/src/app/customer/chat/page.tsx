'use client'

import { useRouter } from 'next/navigation'
import CompanionChat from '@/components/companion/CompanionChat'
import ModeToggle, { type AppMode } from '@/components/common/ModeToggle'
import { useState } from 'react'

export default function CustomerChatPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AppMode>('auto')

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
        <h1 className="font-bold text-lg">💬 Chat với AI</h1>
        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} onChange={setMode} />
          <button onClick={() => router.push('/customer')}
            className="text-xs text-blue-600 hover:underline">← Home</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <CompanionChat persona="customer" onAction={(action) => {
          if (action.type === 'view_orders') router.push('/customer/orders')
          else if (action.type === 'process_payment' && action.data?.order_id) router.push(`/customer/orders/${action.data.order_id}`)
        }} />
      </div>
    </div>
  )
}
