'use client'

import Skeleton from '@/components/ui/Skeleton'

interface WalletCardProps {
  balance: number
  locked: number
  available?: number
  currency?: string
  loading?: boolean
}

export default function WalletCard({ balance, locked, available, currency = 'VND', loading }: WalletCardProps) {
  const fmt = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(v)
  const avail = available ?? balance - locked

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <Skeleton variant="text" width="96px" className="mb-4" />
        <Skeleton variant="rect" width="160px" height="32px" className="mb-3 rounded" />
        <Skeleton variant="text" width="128px" />
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white">
      <p className="text-blue-200 text-sm font-medium mb-1">Số dư ví</p>
      <p className="text-3xl font-bold mb-4">{fmt(balance)}</p>
      <div className="flex gap-6 text-sm">
        <div>
          <p className="text-blue-200">Khả dụng</p>
          <p className="font-semibold">{fmt(avail)}</p>
        </div>
        <div>
          <p className="text-blue-200">Đang khóa</p>
          <p className="font-semibold">{fmt(locked)}</p>
        </div>
      </div>
    </div>
  )
}
