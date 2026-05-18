import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../ErrorBoundary'

function BrokenComponent(): React.ReactNode {
  throw new Error('Test error')
}

const Fallback = () => <div data-testid="fallback">Something went wrong</div>

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">OK</div>
      </ErrorBoundary>
    )
    expect(screen.getByTestId('child').textContent).toBe('OK')
  })

  it('renders default fallback on error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Không thể tải trang')).toBeDefined()
    expect(screen.getByText('Thử lại')).toBeDefined()
    vi.restoreAllMocks()
  })

  it('renders custom fallback when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary fallback={<Fallback />}>
        <BrokenComponent />
      </ErrorBoundary>
    )
    expect(screen.getByTestId('fallback').textContent).toBe('Something went wrong')
    vi.restoreAllMocks()
  })
})
