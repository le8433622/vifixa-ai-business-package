'use client'

export default function WorkerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-100 flex items-center justify-center">
          <span className="text-3xl">🛠️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải trang thợ</h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Đã có lỗi xảy ra khi tải thông tin. Vui lòng thử lại sau.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => window.location.href = '/worker'}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}
