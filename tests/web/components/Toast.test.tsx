import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToastProvider, useToast } from '@/components/Toast'
import { useEffect } from 'react'

const TestComponent = ({ message, type }: { message: string, type?: 'success' | 'error' | 'warning' | 'info' }) => {
  const { toast } = useToast()
  
  useEffect(() => {
    toast(message, type)
  }, [message, type, toast])

  return <div>Test Component</div>
}

describe('Toast Component', () => {
  it('renders a toast message', () => {
    render(
      <ToastProvider>
        <TestComponent message="Operation successful!" type="success" />
      </ToastProvider>
    )
    
    expect(screen.getByText('Operation successful!')).toBeInTheDocument()
  })

  it('removes toast after timeout', () => {
    vi.useFakeTimers()
    
    render(
      <ToastProvider>
        <TestComponent message="Auto dismiss" />
      </ToastProvider>
    )
    
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument()
    
    act(() => {
      vi.advanceTimersByTime(4500)
    })
    
    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument()
    
    vi.useRealTimers()
  })
})
