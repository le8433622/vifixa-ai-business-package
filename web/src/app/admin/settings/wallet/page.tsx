// Wallet Settings Page - Stub
// Will be implemented in Step 3

'use client'

import Link from 'next/link'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

export default function WalletSettings() {
  const { isEnabled } = useFeatureFlags()

  if (!isEnabled('internal_wallet')) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Cài đặt Ví</h1>
            <p className="text-gray-600 mt-1">Cấu hình ví nội bộ và cài đặt thanh toán</p>
          </div>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
            ← Quay lại Cài đặt
          </Link>
        </div>
        <FeatureDisabled
          feature="Ví Nội bộ"
          message="Tính năng ví nội bộ hiện đang tắt. Vui lòng bật trong Cài đặt Tính năng."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Thiết lập nhanh</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Vào <Link href="/admin/settings/features" className="underline">Tính năng</Link> và bật "Ví Nội bộ"</li>
            <li>Đặt tỷ lệ phí nền tảng trong Cài đặt Chung</li>
            <li>Cấu hình giới hạn thanh toán (tối thiểu/tối đa)</li>
            <li>Thiết lập tích hợp chuyển khoản ngân hàng</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt Ví</h1>
          <p className="text-gray-600 mt-1">Cấu hình ví nội bộ và cài đặt thanh toán</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Quay lại Cài đặt
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Cấu hình Ví</h2>
        <p className="text-gray-600 mb-4">Cài đặt cho hệ thống ví nội bộ sẽ được triển khai tại đây.</p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Cài đặt Phí Nền tảng</h3>
            <p className="text-sm text-gray-600">Cấu hình phí áp dụng trên giao dịch</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Giới hạn Thanh toán</h3>
            <p className="text-sm text-gray-600">Đặt số tiền rút tối thiểu và tối đa</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Quy tắc Ký quỹ</h3>
            <p className="text-sm text-gray-600">Cấu hình cách giữ tiền cho các công việc</p>
          </div>
        </div>
      </div>
    </div>
  )
}
