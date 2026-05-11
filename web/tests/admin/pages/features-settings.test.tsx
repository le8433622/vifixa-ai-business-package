import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FeaturesSettings from '@/app/admin/settings/features/page.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('Features Settings Page Smoke Test', () => {
  it('renders without crashing', async () => {
    vi.mock('@/lib/supabase', () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: [
          { key: 'test_feature', label: 'Test Feature', description: 'Test', enabled: true, category: 'general', requires_config: false, config_completed: true },
        ], error: null }),
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
        <FeaturesSettings />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Feature Flags')).toBeInTheDocument()
      expect(screen.getByText('Toggle features ON/OFF without code deployment. Safe for production.')).toBeInTheDocument()
    })
  })
})