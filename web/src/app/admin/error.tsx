'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
          <span className="text-3xl">⚙️</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Không thể tải trang quản trị</h1>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => window.location.href = '/admin'}
            className="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}
