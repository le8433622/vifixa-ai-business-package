import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '../ThemeProvider'
import type { ReactNode } from 'react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

function TestConsumer() {
  const { theme, resolved, toggle } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolved}</span>
      <button data-testid="toggle" onClick={toggle}>Toggle</button>
    </div>
  )
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe('ThemeProvider', () => {
  beforeEach(() => localStorage.clear())

  it('resolves to light by default', async () => {
    render(<TestConsumer />, { wrapper })
    await waitFor(() => expect(screen.getByTestId('resolved').textContent).toBe('light'))
  })

  it('toggles theme on click', async () => {
    render(<TestConsumer />, { wrapper })
    await waitFor(() => expect(screen.getByTestId('resolved').textContent).toBe('light'))
    const btn = screen.getByTestId('toggle')
    await userEvent.click(btn)
    await waitFor(() => expect(screen.getByTestId('theme').textContent).toBe('dark'))
    expect(localStorage.getItem('vifixa-theme')).toBe('dark')
  })

  it('reads persisted theme from localStorage', async () => {
    localStorage.setItem('vifixa-theme', 'dark')
    render(<TestConsumer />, { wrapper })
    await waitFor(() => expect(screen.getByTestId('theme').textContent).toBe('dark'))
  })
})
