'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface InvoiceButtonProps {
  orderId: string
  label?: string
  className?: string
  compact?: boolean
}

export default function InvoiceButton({ orderId, label = '📄 Hóa đơn', className = '', compact }: InvoiceButtonProps) {
  const [loading, setLoading] = useState(false)

  async function downloadInvoice() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        method: 'GET',
        body: { order_id: orderId },
      })

      if (error) throw error

      // Open invoice in new tab for print
      if (data?.html) {
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(data.html)
          win.document.close()
          win.focus()
          setTimeout(() => win.print(), 500)
        }
      }
    } catch (err) {
      console.error('Error downloading invoice:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={downloadInvoice}
      disabled={loading}
      className={`${compact ? 'text-xs px-2 py-1' : 'text-sm px-4 py-2'} rounded-xl font-medium transition ${
        loading ? 'bg-gray-200 text-gray-500 cursor-wait' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm'
      } ${className}`}
    >
      {loading ? '⏳ Đang tạo...' : label}
    </button>
  )
}
