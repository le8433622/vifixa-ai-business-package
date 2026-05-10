import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SettingsPage from '@/components/admin/SettingsPage'

describe('SettingsPage', () => {
  it('renders title and description', () => {
    render(
      <SettingsPage title="Test Title" description="Test Description">
        <div data-testid="content">Child content</div>
      </SettingsPage>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('renders back link to settings', () => {
    render(
      <SettingsPage title="Test" description="Desc">
        <div />
      </SettingsPage>
    )

    const backLink = screen.getByText('← Back to Settings')
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/admin/settings')
  })

  it('renders children content', () => {
    render(
      <SettingsPage title="Settings" description="Configure settings">
        <div>
          <button>Save</button>
          <input placeholder="Enter value" />
        </div>
      </SettingsPage>
    )

    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
  })
})