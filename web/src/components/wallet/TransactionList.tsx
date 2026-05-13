'use client'

import { Badge } from '@/components/ui/badge'

interface LedgerEntry {
  id?: string
  transaction_id?: string
  description?: string
  account?: string
  direction: 'debit' | 'credit'
  amount: number
  reference_type?: string
  created_at?: string
}

interface TransactionListProps {
  entries: LedgerEntry[]
  loading?: boolean
  currency?: string
}

export default function TransactionList({ entries, loading, currency = 'VND' }: TransactionListProps) {
  const fmt = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(v)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">Chưa có giao dịch nào</p>
      </div>
    )
  }

  const accountLabel: Record<string, string> = {
    'wallet.deposit': 'Nạp tiền',
    'wallet.withdrawal': 'Rút tiền',
    'fee.payout': 'Phí rút tiền',
    'platform.revenue': 'Thanh toán đơn hàng',
    'escrow.held': 'Tạm giữ',
    'platform.fee': 'Phí nền tảng',
    'order.payment': 'Thanh toán đơn hàng',
    'referral.reward': 'Thưởng giới thiệu',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
      {entries.map((entry, idx) => (
        <div key={entry.id || idx} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {entry.description || accountLabel[entry.account || ''] || entry.account || 'Giao dịch'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {entry.created_at ? new Date(entry.created_at).toLocaleString('vi-VN') : ''}
                </span>
                {entry.reference_type && (
                  <Badge className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                    {entry.reference_type}
                  </Badge>
                )}
              </div>
            </div>
            <div className={`text-right font-bold text-lg ${entry.direction === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
              {entry.direction === 'credit' ? '+ ' : '- '}{fmt(entry.amount)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
