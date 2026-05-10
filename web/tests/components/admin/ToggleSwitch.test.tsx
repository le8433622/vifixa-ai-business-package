import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ToggleSwitch from '@/components/admin/ToggleSwitch'

describe('ToggleSwitch', () => {
  it('renders toggle in enabled state', () => {
    render(<ToggleSwitch enabled={true} onToggle={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('renders toggle in disabled state', () => {
    render(<ToggleSwitch enabled={false} onToggle={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<ToggleSwitch enabled={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('does not call onToggle when disabled', () => {
    const onToggle = vi.fn()
    render(<ToggleSwitch enabled={false} onToggle={onToggle} disabled={true} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('shows loading spinner when loading', () => {
    render(<ToggleSwitch enabled={true} loading={true} onToggle={() => {}} />)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('does not show spinner when not loading', () => {
    render(<ToggleSwitch enabled={true} onToggle={() => {}} />)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).not.toBeInTheDocument()
  })
})