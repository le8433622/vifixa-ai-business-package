import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from '../EmptyState'

vi.mock('next/link', () => ({ default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a> }))

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Không có đơn hàng" description="Bạn chưa có đơn hàng nào" />)
    expect(screen.getByText('Không có đơn hàng')).toBeDefined()
    expect(screen.getByText('Bạn chưa có đơn hàng nào')).toBeDefined()
  })

  it('renders action link when actionHref provided', () => {
    render(<EmptyState title="Trống" actionLabel="Tạo mới" actionHref="/new" />)
    const link = screen.getByText('Tạo mới')
    expect(link).toBeDefined()
    expect(link.closest('a')?.getAttribute('href')).toBe('/new')
  })

  it('renders in compact mode', () => {
    const { container } = render(<EmptyState title="Trống" compact />)
    expect(container.querySelector('.py-4')).toBeDefined()
  })
})
