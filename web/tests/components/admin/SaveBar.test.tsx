import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SaveBar from '@/components/admin/SaveBar'

describe('SaveBar', () => {
  it('renders nothing when pendingCount is 0', () => {
    const { container } = render(
      <SaveBar pendingCount={0} saving={false} onSave={() => {}} onCancel={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders save bar with pending count', () => {
    render(
      <SaveBar pendingCount={3} saving={false} onSave={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('3 change(s) pending')).toBeInTheDocument()
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows saving state', () => {
    render(
      <SaveBar pendingCount={2} saving={true} onSave={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByText('Saving...')).toBeDisabled()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('calls onSave when save button clicked', () => {
    const onSave = vi.fn()
    render(
      <SaveBar pendingCount={1} saving={false} onSave={onSave} onCancel={() => {}} />
    )
    fireEvent.click(screen.getByText('Save Changes'))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(
      <SaveBar pendingCount={1} saving={false} onSave={() => {}} onCancel={onCancel} />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})