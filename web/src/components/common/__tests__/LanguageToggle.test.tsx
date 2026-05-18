import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider, useLanguage } from '../LanguageToggle'
import type { ReactNode } from 'react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

function TestConsumer() {
  const { locale, setLocale, t } = useLanguage()
  return (
    <div>
      <span data-testid="lang">{locale}</span>
      <span data-testid="key">{t('common.loading')}</span>
      <button data-testid="toggle" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Toggle</button>
    </div>
  )
}

function wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe('LanguageToggle', () => {
  it('defaults to Vietnamese', () => {
    render(<TestConsumer />, { wrapper })
    expect(screen.getByTestId('lang').textContent).toBe('vi')
  })

  it('returns Vietnamese translation for common.loading', () => {
    render(<TestConsumer />, { wrapper })
    const keyEl = screen.getByTestId('key')
    expect(keyEl.textContent).toBe('Đang tải...')
  })

  it('toggles language on click', () => {
    render(<TestConsumer />, { wrapper })
    expect(screen.getByTestId('lang').textContent).toBe('vi')
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('en')
  })
})
