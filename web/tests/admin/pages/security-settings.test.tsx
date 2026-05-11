import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SecuritySettings from '@/app/admin/settings/security/page.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('Security Settings Page Smoke Test', () => {
  it('renders without crashing', async () => {
    vi.mock('@/lib/supabase', () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        single: () => Promise.resolve({ data: {
          key: 'maintenance_message',
          value: 'System maintenance scheduled',
        }, error: null }),
      }
      return { supabase: { from: () => chain } }
    })

    vi.mock('@/components/Toast', () => ({
      useToast: () => ({ toast: vi.fn() }),
    }))

    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn() }),
    }))

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SecuritySettings />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Security Settings')).toBeInTheDocument()
      expect(screen.getByText('Configure security flags, maintenance mode, and rate limiting.')).toBeInTheDocument()
    })
  })
})