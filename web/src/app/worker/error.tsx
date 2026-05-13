'use client'

import { useEffect } from 'react'

export default function WorkerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[WorkerError] Caught by error boundary:', error)
    console.error('[WorkerError] Message:', error.message)
    console.error('[WorkerError] Stack:', error.stack)
    console.error('[WorkerError] Digest:', error.digest)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md text-center p-8">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Đã xảy ra lỗi</h2>
        <p className="text-gray-600 mb-2">{error.message || 'Không thể tải trang'}</p>
        <p className="text-xs text-gray-400 mb-6 font-mono break-all">{error.digest ? `Digest: ${error.digest}` : ''}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
