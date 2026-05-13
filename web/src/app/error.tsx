'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)] px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Không thể tải trang</h1>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          Đã có lỗi xảy ra. Vui lòng thử lại sau.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 border border-white/20 text-white rounded-xl font-semibold text-sm hover:bg-white/10 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left">
            <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-400">Chi tiết lỗi</summary>
            <pre className="mt-2 p-4 bg-black/40 rounded-lg text-red-400 text-xs overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
