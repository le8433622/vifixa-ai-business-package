// Security Settings Page - Stub
// Will be implemented in Step 3.

'use client'

import Link from 'next/link'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

export default function SecuritySettings() {
  const { isEnabled } = useFeatureFlags()

  if (!isEnabled('maintenance_mode') && !isEnabled('debug_mode') && !isEnabled('rate_limit_strict')) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Cài đặt Bảo mật</h1>
            <p className="text-gray-600 mt-1">Cấu hình bảo mật, giới hạn tốc độ và chế độ bảo trì</p>
          </div>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
            ← Quay lại Cài đặt
          </Link>
        </div>
        <FeatureDisabled
          feature="Tính năng Bảo mật"
          message="Tất cả tính năng bảo mật hiện đang tắt. Vui lòng bật trong Cài đặt Tính năng."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Thiết lập nhanh</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Vào <Link href="/admin/settings/features" className="underline">Tính năng</Link> và bật các cờ bảo mật</li>
            <li>Cấu hình ngưỡng giới hạn tốc độ</li>
            <li>Thiết lập thông báo chế độ bảo trì</li>
            <li>Bật chế độ debug để khắc phục sự cố</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt Bảo mật</h1>
          <p className="text-gray-600 mt-1">Cấu hình bảo mật, giới hạn tốc độ và chế độ bảo trì</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Quay lại Cài đặt
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Chế độ Bảo trì</h2>
          <p className="text-gray-600 mb-4">Hiển thị banner bảo trì cho tất cả người dùng.</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled('maintenance_mode')}
              readOnly
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Chế độ Bảo trì {isEnabled('maintenance_mode') ? 'BẬT' : 'TẮT'}</span>
          </label>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Giới hạn Tốc độ</h2>
          <p className="text-gray-600 mb-4">Cấu hình giới hạn tốc độ API để ngăn lạm dụng.</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled('rate_limit_strict')}
              readOnly
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Giới hạn Tốc độ Nghiêm ngặt {isEnabled('rate_limit_strict') ? 'BẬT' : 'TẮT'}</span>
          </label>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Chế độ Debug</h2>
          <p className="text-gray-600 mb-4">Hiển thị thông tin debug chỉ cho admin.</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled('debug_mode')}
              readOnly
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Chế độ Debug {isEnabled('debug_mode') ? 'BẬT' : 'TẮT'}</span>
          </label>
        </div>
      </div>
    </div>
  )
}
