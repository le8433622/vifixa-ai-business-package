import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoadingSkeleton from '@/components/admin/LoadingSkeleton'

describe('LoadingSkeleton', () => {
  it('renders default number of skeleton rows', () => {
    const { container } = render(<LoadingSkeleton />)
    const rows = container.querySelectorAll('.animate-pulse > div')
    expect(rows).toHaveLength(4)
  })

  it('renders custom number of rows', () => {
    const { container } = render(<LoadingSkeleton rows={8} />)
    const rows = container.querySelectorAll('.animate-pulse > div')
    expect(rows).toHaveLength(8)
  })

  it('applies custom height class', () => {
    render(<LoadingSkeleton height="h-32" />)
    const rows = screen.getAllByRole('generic').filter(
      el => el.className.includes('h-32')
    )
    expect(rows.length).toBeGreaterThan(0)
  })

  it('renders zero rows when rows=0', () => {
    const { container } = render(<LoadingSkeleton rows={0} />)
    const rows = container.querySelectorAll('.animate-pulse > div')
    expect(rows).toHaveLength(0)
  })
})