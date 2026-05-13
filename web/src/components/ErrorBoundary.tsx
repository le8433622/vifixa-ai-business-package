'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
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
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
